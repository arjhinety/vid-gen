"""Metrics for the emotion test. Run with build/venv-ttsqa python. Output: research/tts/emotion/results.json
Per wav: F0 (librosa.yin, same as research/tts/bench/voice_match_score.py pitch()), ASR round trip
(faster-whisper large-v3-turbo, beam 5, fixed language), WER (EN) / kana CER (JA) against the CLEAN text
(no emoji / instruction), speaking rate, duration.  Per condition: pooled pitch SD + 10-90 range.
"""
import json, sys, wave
from pathlib import Path
import numpy as np, librosa, soundfile as sf
REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "py" / "media" / "src")); sys.path.insert(0, str(Path(__file__).parent))
from vidmedia.ttsqa import en_wer, ja_cer, ja_mora_count, load_mono
from lines import LINES
OUT = REPO / "build" / "emotion"


def st_track(x):
    f0 = librosa.yin(x, fmin=70, fmax=600, sr=16000, frame_length=1024, hop_length=160)
    rms = librosa.feature.rms(y=x, frame_length=1024, hop_length=160)[0][: f0.size]
    db = 20 * np.log10(rms + 1e-9)
    keep = (db[: f0.size] > db.max() - 22) & (f0 > 80) & (f0 < 560)
    f = f0[keep]
    if f.size < 20:
        return np.array([]), None
    return 12 * np.log2(f / np.median(f)), float(np.median(f))


def sources():
    """(group, cond, lang, {line_id: wav})"""
    out = []
    for d in sorted(OUT.glob("*/*")):
        if d.is_dir() and any(d.glob("L*.wav")):
            lang = "ja" if ("-ja" in d.parent.name) else "en"
            out.append((d.parent.name, d.name, lang, {L["id"]: d / f"{L['id']}.wav" for L in LINES if (d / f"{L['id']}.wav").exists()}))
    for lang in ("ja",):  # EN baseline = kokoro-en config (the launch-script wording differs from the test lines)
        b = REPO / "build" / "opengrad-study-001" / lang / "audio" / "lines"
        out.append(("baseline-" + ("kokoro-af_heart" if lang == "en" else "irodori-heroine"), "baseline", lang,
                    {L["id"]: b / f"{L['stem']}.wav" for L in LINES}))
    return out


def main():
    import torch
    from faster_whisper import WhisperModel
    cache_f = Path(__file__).parent / "asr_cache.json"
    cache = json.loads(cache_f.read_text(encoding="utf-8")) if cache_f.exists() else {}
    model = WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")
    res = []
    for group, cond, lang, wavs in sources():
        pooled, rows = [], []
        for L in LINES:
            w = wavs.get(L["id"])
            if not w or not w.exists():
                continue
            x, sr = load_mono(str(w), 16000)
            st, med = st_track(x)
            key = f"{w}|{w.stat().st_mtime}"
            if key not in cache:
                segs, _ = model.transcribe(str(w), language=lang, beam_size=5, vad_filter=False, condition_on_previous_text=False)
                cache[key] = ("" if lang == "ja" else " ").join(s.text.strip() for s in segs).strip()
            hyp = cache[key]
            ref = L[lang]
            err = en_wer(ref, hyp)["wer"] if lang == "en" else ja_cer(ref, hyp)["cer"]
            dur = len(x) / 16000
            # speech span for rate: frames above -40 dB of peak
            e = librosa.feature.rms(y=x, frame_length=400, hop_length=160)[0]
            act = np.where(20 * np.log10(e + 1e-9) > 20 * np.log10(e.max()) - 35)[0]
            span = (act[-1] - act[0]) * 0.01 if act.size else dur
            units = ja_mora_count(ref) if lang == "ja" else len(ref.split())
            rows.append(dict(line=L["id"], dur_s=round(dur, 2), span_s=round(span, 2), hyp=hyp, err=err,
                             rate=round(units / span, 2), sd_st=round(float(np.std(st)), 2) if st.size else None,
                             f0_med=round(med, 0) if med else None))
            if st.size: pooled.append(st)
        if not rows: continue
        P = np.concatenate(pooled)
        p10, p90 = np.percentile(P, [10, 90])
        errs = [r["err"] for r in rows if r["err"] is not None]
        res.append(dict(group=group, cond=cond, lang=lang, n=len(rows),
                        pooled_sd_st=round(float(np.std(P)), 2), range_10_90_st=round(float(p90 - p10), 2),
                        mean_line_sd_st=round(float(np.mean([r["sd_st"] for r in rows if r["sd_st"] is not None])), 2),
                        err_mean=round(float(np.mean(errs)), 3), err_max=round(float(max(errs)), 3),
                        rate_mean=round(float(np.mean([r["rate"] for r in rows])), 2),
                        f0_med=round(float(np.median([r["f0_med"] for r in rows if r["f0_med"]])), 0), rows=rows))
        print(group, cond, res[-1]["pooled_sd_st"], res[-1]["range_10_90_st"], res[-1]["err_mean"], res[-1]["rate_mean"], flush=True)
    cache_f.write_text(json.dumps(cache, ensure_ascii=False, indent=0), encoding="utf-8")
    (Path(__file__).parent / "results.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")


main()
