"""Which Kokoro voice is the Experimental Labs narrator, and how monotone is each voice?
Run with build/venv-ttsqa python (speechbrain, librosa). Prints a table sorted by similarity."""
import json
import sys
from pathlib import Path

import librosa
import numpy as np

sys.path.insert(0, str(Path(sys.argv[4]) / "py" / "media" / "src"))
from vidmedia.ttsqa import SpeakerEmbedder, cosine  # noqa: E402

root = Path(sys.argv[1])  # scratch voiceid dir
ref_wav, transcript = sys.argv[2], sys.argv[3]
repo = Path(sys.argv[4])
segs = json.loads(Path(transcript).read_text(encoding="utf-8"))["segments"][:7]


def load16(p):
    x, _ = librosa.load(p, sr=16000, mono=True)
    return x.astype(np.float32)


def pitch(x):
    """Semitone spread of F0 over loud voiced frames: std and the 10-90 % range."""
    f0 = librosa.yin(x, fmin=70, fmax=600, sr=16000, frame_length=1024, hop_length=160)
    rms = librosa.feature.rms(y=x, frame_length=1024, hop_length=160)[0][: f0.size]
    db = 20 * np.log10(rms + 1e-9)
    keep = (db[: f0.size] > db.max() - 22) & (f0 > 80) & (f0 < 560)
    f = f0[keep]
    if f.size < 20:
        return None, None, None
    st = 12 * np.log2(f / np.median(f))
    p10, p90 = np.percentile(st, [10, 90])
    return float(np.std(st)), float(p90 - p10), float(np.median(f))


emb = SpeakerEmbedder(savedir=str(repo / ".cache" / "speechbrain-ecapa"))
full = load16(ref_wav)
ref_clips = [full[int(s["start"] * 16000) : int(s["end"] * 16000)] for s in segs]
ref_e = [emb.embed(c) for c in ref_clips]
ref_c = np.mean(ref_e, axis=0)


def summarize(name, clips, words=None, secs=None):
    es = [emb.embed(c) for c in clips]
    c = np.mean(es, axis=0)
    ps = [pitch(x) for x in clips]
    ps = [p for p in ps if p[0] is not None]
    wpm = 60 * words / secs if words and secs else None
    return {
        "voice": name,
        "sim_centroid": cosine(c, ref_c),
        "sim_clip_mean": float(np.mean([cosine(e, r) for e, r in zip(es, ref_e)])) if len(es) == len(ref_e) else None,
        "pitch_std_st": float(np.mean([p[0] for p in ps])),
        "pitch_range_st": float(np.mean([p[1] for p in ps])),
        "f0_median": float(np.mean([p[2] for p in ps])),
        "wpm": wpm,
    }


rows = []
n_words = sum(len(s["text"].split()) for s in segs)
rows.append(summarize("REFERENCE (film)", ref_clips, n_words, sum(s["end"] - s["start"] for s in segs)))
for d in sorted((root / "kokoro").iterdir()):
    clips = [load16(d / f"{s['id']}.wav") for s in segs]
    clips = [librosa.effects.trim(c, top_db=35)[0] for c in clips]
    rows.append(summarize(d.name, clips, n_words, sum(len(c) / 16000 for c in clips)))

# Our current narration: the first 7 lines of each language (not the same text; pitch only).
for lang in ("en", "ja"):
    lines = sorted((repo / "build" / "opengrad-study-001" / lang / "audio" / "lines").glob("b0*.wav"))[:7]
    clips = [load16(p) for p in lines]
    r = summarize(f"OURS {lang} (current)", clips)
    r["sim_clip_mean"] = None
    rows.append(r)

rows.sort(key=lambda r: -r["sim_centroid"] if not r["voice"].startswith(("REF", "OURS")) else (-9 if r["voice"].startswith("REF") else 9))
print(f"{'voice':22} {'sim':>6} {'simclip':>8} {'pitchSD':>8} {'range':>7} {'F0':>6} {'wpm':>5}")
for r in rows:
    fmt = lambda v, f: (f % v) if v is not None else "-"  # noqa: E731
    print(f"{r['voice']:22} {fmt(r['sim_centroid'], '%.3f'):>6} {fmt(r['sim_clip_mean'], '%.3f'):>8} {fmt(r['pitch_std_st'], '%.2f'):>8} {fmt(r['pitch_range_st'], '%.2f'):>7} {fmt(r['f0_median'], '%.0f'):>6} {fmt(r['wpm'], '%.0f'):>5}")
Path(root / "scores.json").write_text(json.dumps(rows, indent=1), encoding="utf-8")
