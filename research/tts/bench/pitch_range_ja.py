import sys
from pathlib import Path
import librosa, numpy as np

def pitch(x):
    f0 = librosa.yin(x, fmin=70, fmax=600, sr=16000, frame_length=1024, hop_length=160)
    rms = librosa.feature.rms(y=x, frame_length=1024, hop_length=160)[0][: f0.size]
    db = 20 * np.log10(rms + 1e-9)
    keep = (db[: f0.size] > db.max() - 22) & (f0 > 80) & (f0 < 560)
    f = f0[keep]
    st = 12 * np.log2(f / np.median(f))
    p10, p90 = np.percentile(st, [10, 90])
    return float(np.std(st)), float(p90 - p10), float(np.median(f))

repo = Path(sys.argv[1])
sets = {
  "irodori ja-ref-soft (current)": repo/"research/tts/samples/irodori/ja-ref-soft",
  "irodori ja-ref-heroine": repo/"research/tts/samples/irodori/ja-ref-heroine",
  "irodori ja-caption-soft": repo/"research/tts/samples/irodori/ja-caption-soft",
  "qwen3 0.6B clone soft -> ja": repo/"research/tts/samples/qwen3/base06b-icl-soft-ja",
  "chatterbox mtl-v3 soft -> ja": repo/"research/tts/samples/chatterbox/mtl-v3-soft-ja",
}
print(f"{'set':32} {'pitchSD':>8} {'range':>7} {'F0':>5}")
for name, d in sets.items():
    files = [p for p in sorted(d.glob("*.mp3")) if "_raw" not in p.name]
    ps = [pitch(librosa.load(p, sr=16000)[0]) for p in files]
    print(f"{name:32} {np.mean([p[0] for p in ps]):8.2f} {np.mean([p[1] for p in ps]):7.2f} {np.mean([p[2] for p in ps]):5.0f}  ({len(files)} passages)")
for m in ("soft", "bright", "heroine"):
    x = librosa.load(repo/f"research/tts/voices/ja-master-{m}.wav", sr=16000)[0]
    p = pitch(x)
    print(f"{'master ' + m:32} {p[0]:8.2f} {p[1]:7.2f} {p[2]:5.0f}")
