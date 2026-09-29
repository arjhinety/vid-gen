"""Kokoro's own phoneme timings for lines it already spoke (lip sync). Runs in py/tts/kokoro/.venv.

Kokoro predicts a duration for every phoneme before it decodes any audio, and the decoder turns
each predicted frame into exactly 600 samples at 24 kHz (25 ms). Those durations are therefore the
audio's timing. The TTS adapter (run.py) keeps only the audio, and editing it would change the
cache key of every line already synthesised, so this separate script re-predicts the durations for
the same text, voice and speed. They are deterministic; each item's total is checked against the
length of its existing WAV and a mismatch is reported, never smoothed over.

    python timings.py <job.json>

    job = {"voice": {...the tts job's voice...}, "device": "cpu" | "cuda",
           "items": [{"id", "text", "prosody"?: {"speed"}, "wav"?: <the item's raw WAV>}]}

writes <job>.results.json:

    {"unit_s": 0.025, "items": [{"id", "ok", "phones": [[t0, t1, phoneme], ...], "words": [[text, t0, t1], ...],
                                 "samples", "wav_samples", "match", "error"?}]}

Times are seconds from the start of the item's raw WAV. A phone's t0 is where its frames start
in the decoded audio (after the BOS frames); Kokoro's own word times start 3 frames earlier by an
empirical offset, and are passed through as it reports them.
"""

from __future__ import annotations

import json
import sys
import traceback
from pathlib import Path

SR = 24000
HOP = 600  # samples per predicted duration frame
UNIT = HOP / SR


def main(argv: list[str]) -> int:
    job_path = Path(argv[0])
    job = json.loads(job_path.read_text(encoding="utf-8"))
    import soundfile as sf
    from kokoro import KPipeline

    voice = job.get("voice", {})
    pipe = KPipeline(lang_code=voice.get("lang_code", "a"), repo_id="hexgrad/Kokoro-82M", device=job.get("device", "cpu"))
    for word, phon in (voice.get("lexicon") or {}).items():
        pipe.g2p.lexicon.golds[word] = phon
    spec = voice.get("voice", "af_heart")
    vpack = sum(float(w) * pipe.load_single_voice(n.strip()) for n, w in (p.split(":") for p in spec.split(","))) if ":" in spec else spec
    speed = float(voice.get("speed", 1.0))

    out = []
    for item in job["items"]:
        rec: dict = {"id": item["id"], "ok": False}
        try:
            sp = speed * float((item.get("prosody") or {}).get("speed", 1.0))
            phones, words, t_off, samples = [], [], 0.0, 0
            for r in pipe(item["text"], voice=vpack, speed=sp):
                if r.audio is None:
                    continue
                pd = [int(x) for x in r.pred_dur.tolist()]
                ps = r.phonemes
                n = len(r.audio)
                if len(pd) != len(ps) + 2:  # BOS + one per phoneme character + EOS
                    raise RuntimeError(f"{len(pd)} durations for {len(ps)} phonemes: cannot pair them")
                if sum(pd) * HOP != n:
                    raise RuntimeError(f"durations cover {sum(pd) * HOP} samples, audio has {n}")
                t = t_off + pd[0] * UNIT
                for p, d in zip(ps, pd[1:-1]):
                    phones.append([round(t, 4), round(t + d * UNIT, 4), p])
                    t += d * UNIT
                words += [[tk.text, round(t_off + tk.start_ts, 4), round(t_off + tk.end_ts, 4)] for tk in r.tokens
                          if tk.start_ts is not None and tk.end_ts is not None]
                t_off += n / SR
                samples += n
            rec.update(ok=True, phones=phones, words=words, samples=samples)
            if item.get("wav") and Path(item["wav"]).exists():
                info = sf.info(item["wav"])
                rec["wav_samples"] = int(info.frames) if info.samplerate == SR else None
                rec["match"] = rec["wav_samples"] == samples
        except Exception as e:  # keep going; the caller reports failures
            rec.update(error=f"{type(e).__name__}: {e}", trace=traceback.format_exc(limit=3))
        out.append(rec)
        print(f"[kokoro-timings] {item['id']}: {'ok' if rec['ok'] else rec['error']}"
              + (f", matches its WAV: {rec['match']}" if "match" in rec else ""), flush=True)
    job_path.with_suffix(".results.json").write_text(json.dumps({"unit_s": UNIT, "items": out}, ensure_ascii=False, indent=1), encoding="utf-8")
    return 0 if any(r["ok"] for r in out) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
