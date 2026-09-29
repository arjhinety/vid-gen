"""Licensed music tracks as the film's bed: each track is fitted to its stretch of the film.

A track plays from its scene to the next track's scene (or the film's end), and the two
cross-fade across the cut. A track that is too long is trimmed from its end (align
"start") or from its start (align "end", so a composed ending lands on the last frame). A
track that is too short is lengthened by repeating a stretch from its middle, spliced
where the music repeats itself: the same bar position, the same harmony, so the splice is
a cross-fade between two nearly identical moments rather than a jump.
"""

from __future__ import annotations

from math import ceil, gcd
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48000
HOP = 1024  # analysis hop (~21 ms)


def read_48k(path: Path, channels: int = 2) -> np.ndarray:
    """(n, channels) float64 at 48 kHz. Mono files are duplicated; extra channels dropped."""
    x, sr = sf.read(str(path), dtype="float64", always_2d=True)
    if sr != SR:
        from scipy.signal import resample_poly

        g = gcd(SR, sr)
        x = resample_poly(x, SR // g, sr // g, axis=0)
    if x.shape[1] < channels:
        x = np.repeat(x[:, :1], channels, axis=1)
    return x[:, :channels]


def _features(mono: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per-frame harmony (12 pitch classes, unit norm) and rhythm (onset strength, z-scored)."""
    from scipy.signal import stft

    _, _, z = stft(mono, fs=SR, nperseg=4096, noverlap=4096 - HOP, boundary=None, padded=False)
    mag = np.abs(z)  # (bins, frames)
    freqs = np.fft.rfftfreq(4096, 1 / SR)
    keep = (freqs > 55) & (freqs < 4000)
    pc = np.round(12 * np.log2(freqs[keep] / 440.0)).astype(int) % 12
    chroma = np.zeros((12, mag.shape[1]))
    np.add.at(chroma, pc, mag[keep] ** 2)
    chroma = np.sqrt(chroma)
    chroma /= np.linalg.norm(chroma, axis=0, keepdims=True) + 1e-9
    logm = np.log1p(mag * 100)
    flux = np.maximum(0, np.diff(logm, axis=1, prepend=logm[:, :1])).sum(axis=0)
    flux = (flux - flux.mean()) / (flux.std() + 1e-9)
    return chroma.T, flux


def loop_points(x: np.ndarray, window_s: float = 8.0) -> tuple[int, int, float]:
    """Samples (a, b), a < b, where the music at b sounds like the music at a, for a
    splice b -> a: the same harmony (pitch-class profile) and the same rhythm (onset
    pattern, so beats line up). Searched in the middle of the track (a in 20-50 %, b in
    50-85 %) so the intro and the composed ending are never repeated. Returns the harmony
    similarity at the chosen splice (0..1) too."""
    mono = x.mean(axis=1)
    chroma, flux = _features(mono)
    nf = len(chroma)
    w = max(4, int(window_s * SR / HOP))

    def windowed(d: np.ndarray) -> np.ndarray:
        c = np.concatenate([[0.0], np.cumsum(d)])
        return (c[w:] - c[:-w]) / w  # mean over the window starting at frame i

    best = (-np.inf, 0, 0, 0.0)
    for lag in range(int(0.12 * nf), int(0.6 * nf)):
        harm = windowed((chroma[:-lag] * chroma[lag:]).sum(axis=1))
        rhythm = windowed(flux[:-lag] * flux[lag:])
        score = harm + 0.5 * rhythm
        lo, hi = int(0.2 * nf), min(int(0.5 * nf), len(score) - 1)
        if hi <= lo:
            continue
        i = lo + int(np.argmax(score[lo:hi]))
        if i + lag > 0.85 * nf or i + lag < 0.5 * nf:
            continue
        if score[i] > best[0]:
            best = (float(score[i]), i + w // 2, i + w // 2 + lag, float(harm[i]))
    if best[0] == -np.inf:
        raise ValueError("track too short to find loop points")
    _, fa, fb, sim = best
    a, b = fa * HOP, fb * HOP
    # Beat-align at sample resolution: shift b by up to +-60 ms to match the onset pattern at a.
    env = np.abs(np.diff(mono, prepend=mono[0]))
    k = int(0.8 * SR)
    ref = env[a - k : a + k] if a - k >= 0 else env[: 2 * k]
    best_d, best_c = 0, -np.inf
    for dlt in range(-int(0.06 * SR), int(0.06 * SR) + 1, 48):
        seg = env[b + dlt - k : b + dlt + k]
        if len(seg) != len(ref):
            continue
        c = float(np.dot(seg - seg.mean(), ref - ref.mean()))
        if c > best_c:
            best_c, best_d = c, dlt
    return a, b + best_d, sim


def _eq_power(n: int) -> tuple[np.ndarray, np.ndarray]:
    t = np.linspace(0, 1, n)[:, None]
    return np.cos(t * np.pi / 2), np.sin(t * np.pi / 2)


def fit(x: np.ndarray, need: int, align: str = "start", splice_s: float = 1.5) -> tuple[np.ndarray, dict]:
    """Exactly `need` samples of the track (see module doc)."""
    L = len(x)
    if need <= L:
        return (x[:need] if align == "start" else x[L - need :]).copy(), {"trimmed_s": round((L - need) / SR, 2), "loops": 0}
    a, b, sim = loop_points(x)
    k = int(ceil((need - L) / (b - a)))
    xf = int(splice_s * SR)
    h = xf // 2
    ranges = [(0, b)] + [(a, b)] * (k - 1) + [(a, L)]
    out = x[0 : b + h].copy()
    for s, e in ranges[1:]:
        fo, fi = _eq_power(xf)
        nxt = x[s - h : e + (h if e < L else 0)]
        out[-xf:] = out[-xf:] * fo + nxt[:xf] * fi
        out = np.concatenate([out, nxt[xf:]])
    out = out[:need] if align == "start" else out[len(out) - need :]
    return out, {"loops": k, "loop_s": [round(a / SR, 2), round(b / SR, 2)], "loop_similarity": round(sim, 3)}


def place(tracks: list[dict], n: int, bed_lufs: float, meter, xfade_s: float = 3.0) -> tuple[np.ndarray, list[dict]]:
    """tracks: [{"path", "start", "end", "align"}] in film seconds, in order and contiguous.
    Returns the stereo bed (n, 2), each track at `bed_lufs`, cross-faded across each boundary."""
    bed = np.zeros((n, 2))
    xf = int(xfade_s * SR)
    info = []
    for i, tr in enumerate(tracks):
        s0 = int(round(tr["start"] * SR))
        s1 = min(n, int(round(tr["end"] * SR)))
        first, last = i == 0, i == len(tracks) - 1
        lo = s0 if first else max(0, s0 - xf // 2)
        hi = s1 if last else min(n, s1 + xf // 2)
        y, how = fit(read_48k(Path(tr["path"])), hi - lo, tr.get("align", "end" if last else "start"))
        y *= 10 ** ((bed_lufs - meter.integrated_loudness(y)) / 20)
        edge = int(0.05 * SR)
        fin = edge if first else xf
        fout = edge if last else xf
        y[:fin] *= np.sin(np.linspace(0, 1, fin) * np.pi / 2)[:, None]
        y[len(y) - fout :] *= np.cos(np.linspace(0, 1, fout) * np.pi / 2)[:, None]
        bed[lo:hi] += y
        info.append({"path": tr["path"], "from_s": round(lo / SR, 2), "to_s": round(hi / SR, 2), **how})
    return bed, info
