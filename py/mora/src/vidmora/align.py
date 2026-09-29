"""Phoneme-CTC forced alignment of Japanese speech, grouped into morae for lip-sync.

Model: prj-beatrice/japanese-hubert-base-phoneme-ctc-v4 (OpenJTalk phoneme labels).
Targets: pyopenjtalk-plus G2P of the spoken text.  Only analyses our own audio; generates no voice.

    python -m vidmora.align <job.json>
    job:     {"device": "cpu"|"cuda", "items": [{"id", "wav", "text"}]}
    results: <job>.results.json  (job "x.json" -> "x.results.json")

Each result item: {"id", "ok", "error"?, "morae": [[t0, t1, mora, vowel], ...],
"phones": [[t0, t1, ph], ...], "greedy", "g2p", "greedy_per", "run_s"}. Times are seconds from the
WAV start. `vowel` is a i u e o N cl pau; devoiced I/U map to i/u but the `mora` string keeps the
upper-case letter ("sI"), so a devoiced mora is recognisable from it. A mora's onset is the CTC start
of its first phoneme; its end is the next entry's onset (the last entry ends at the end of voiced
audio). CTC end times are not used: they are one spike wide and unreliable.
"""
from __future__ import annotations

import json
import re
import sys
import time
from math import gcd
from pathlib import Path

import numpy as np

from .viterbi import ctc_force_align, path_to_spans

MODEL_ID = "prj-beatrice/japanese-hubert-base-phoneme-ctc-v4"
SR = 16000
PAD_S = 0.5  # zero padding on both sides, so the first/last phones are not at the receptive-field edge
VOWELS = {"a", "i", "u", "e", "o", "I", "U", "N", "cl"}  # a phoneme that ends a mora
PAUSES = {"pau", "sil"}
SILENCE_DB = 35.0  # end of voiced audio: last 10 ms frame within this many dB of the peak
SILENT_PEAK = 1e-4

# Irodori tone tags and other pictographs; Japanese punctuation (U+3000..) is untouched.
_EMOJI = re.compile("[\U0001F000-\U0001FAFF←-⯿☀-➿︀-️‍⃣]")


def strip_tags(text: str) -> str:
    return re.sub(r"\s+", " ", _EMOJI.sub("", text)).strip()


def g2p(text: str) -> list[str]:
    import pyopenjtalk

    t = strip_tags(text)
    return pyopenjtalk.g2p(t).split() if t else []


def group_morae(phones: list[str]) -> list[tuple[str, str, int, int]]:
    """Group OpenJTalk phonemes into morae.

    Returns (mora, vowel, first_phone_index, last_phone_index) per mora. `mora` is the phoneme letters
    joined ("ko"; devoiced vowels stay upper-case, "sI"); `vowel` is one of a i u e o N cl pau
    (devoiced I/U -> i/u). A long vowel is its own mora; a pause is its own entry.
    """
    out: list[tuple[str, str, int, int]] = []
    start: int | None = None
    for i, p in enumerate(phones):
        if p in PAUSES:
            if start is not None:  # dangling consonants before a pause: keep them, vowel unknown
                out.append(("".join(phones[start:i]), "", start, i - 1))
                start = None
            out.append(("pau", "pau", i, i))
            continue
        if start is None:
            start = i
        if p in VOWELS:
            out.append(("".join(phones[start : i + 1]), p.lower() if p in ("I", "U") else p, start, i))
            start = None
    if start is not None:
        out.append(("".join(phones[start:]), "", start, len(phones) - 1))
    return out


def edit_distance(a: list[str], b: list[str]) -> int:
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]


def voiced_end(x: np.ndarray, sr: int) -> float:
    h = int(sr * 0.01)
    n = len(x) // h
    if n == 0:
        return 0.0
    db = 20 * np.log10(np.sqrt((x[: n * h].reshape(n, h) ** 2).mean(1)) + 1e-12)
    idx = np.nonzero(db >= db.max() - SILENCE_DB)[0]
    return float((idx[-1] + 1) * 0.01)


def load_wav(path: str, sr_out: int = SR) -> np.ndarray:
    """Mono float32 at sr_out."""
    import soundfile as sf
    from scipy.signal import resample_poly

    x, sr = sf.read(path, dtype="float32", always_2d=True)
    x = x.mean(axis=1)
    if sr != sr_out:
        g = gcd(sr, sr_out)
        x = resample_poly(x, sr_out // g, sr // g).astype(np.float32)
    return x


class Aligner:
    def __init__(self, device: str = "cpu"):
        import torch
        from huggingface_hub import hf_hub_download
        from transformers import AutoFeatureExtractor, HubertForCTC

        self.torch, self.device = torch, device
        self.fe = AutoFeatureExtractor.from_pretrained(MODEL_ID)
        self.model = HubertForCTC.from_pretrained(MODEL_ID).to(device).eval()
        self.vocab = json.loads(Path(hf_hub_download(MODEL_ID, "vocab.json")).read_text(encoding="utf-8"))
        self.inv = {v: k for k, v in self.vocab.items()}
        self.blank = self.vocab["PAD"]
        self.revision = getattr(self.model.config, "_commit_hash", None)

    def logprobs(self, x16: np.ndarray) -> np.ndarray:
        x = np.pad(x16, int(PAD_S * SR))
        iv = self.fe(x, sampling_rate=SR, return_tensors="pt").input_values.to(self.device)
        with self.torch.inference_mode():
            lg = self.model(iv).logits.float()
        return self.torch.log_softmax(lg, -1)[0].cpu().numpy()

    def align_one(self, wav: str, text: str) -> dict:
        phones = g2p(text)
        if not phones:
            return {"ok": True, "morae": [], "phones": [], "greedy": "", "g2p": ""}
        x16 = load_wav(wav)
        dur = len(x16) / SR
        if len(x16) == 0 or float(np.abs(x16).max()) < SILENT_PEAK:
            return {"ok": False, "error": "silent or empty audio", "morae": [], "phones": [],
                    "greedy": "", "g2p": " ".join(phones)}
        unknown = [p for p in phones if p not in self.vocab]
        if unknown:
            raise ValueError(f"phonemes not in model vocab: {sorted(set(unknown))}")
        lp = self.logprobs(x16)
        fs = (dur + 2 * PAD_S) / lp.shape[0]
        path = ctc_force_align(lp, [self.vocab[p] for p in phones], self.blank)
        spans = path_to_spans(path, len(phones), self.blank)
        onset = [round(max(0.0, a * fs - PAD_S), 3) for a, _ in spans]
        end = round(min(dur, max(voiced_end(x16, SR), onset[-1] + fs)), 3)
        g = lp.argmax(-1).tolist()
        greedy = [self.inv[a] for i, a in enumerate(g) if a != self.blank and (i == 0 or a != g[i - 1])]
        phones_out = [[onset[i], onset[i + 1] if i + 1 < len(phones) else end, p] for i, p in enumerate(phones)]
        morae = group_morae(phones)
        m_out = []
        for k, (m, v, a, _b) in enumerate(morae):
            t1 = onset[morae[k + 1][2]] if k + 1 < len(morae) else end
            m_out.append([onset[a], max(t1, onset[a]), m, v])
        strip = lambda s: [p for p in s if p not in PAUSES]  # noqa: E731
        per = edit_distance(strip(phones), strip(greedy)) / max(1, len(strip(phones)))
        return {"ok": True, "morae": m_out, "phones": phones_out, "greedy": " ".join(greedy),
                "g2p": " ".join(phones), "greedy_per": round(per, 3)}


def run_job(job: dict) -> dict:
    al = Aligner(job.get("device", "cpu"))
    items = []
    for it in job["items"]:
        t = time.perf_counter()
        try:
            r = al.align_one(it["wav"], it["text"])
        except Exception as e:  # report per item; one bad line must not lose the rest
            r = {"ok": False, "error": f"{type(e).__name__}: {e}", "morae": [], "phones": [], "greedy": "", "g2p": ""}
        items.append({"id": it["id"], **r, "run_s": round(time.perf_counter() - t, 3)})
    return {"model": MODEL_ID, "revision": al.revision, "device": al.device, "items": items}


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 1:
        print("usage: python -m vidmora.align <job.json>", file=sys.stderr)
        return 2
    job_path = Path(argv[0])
    res = run_job(json.loads(job_path.read_text(encoding="utf-8")))
    out = job_path.with_suffix(".results.json")
    out.write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    bad = [i["id"] for i in res["items"] if not i["ok"]]
    print(f"{len(res['items']) - len(bad)}/{len(res['items'])} ok -> {out}" + (f"; failed: {bad}" if bad else ""))
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
