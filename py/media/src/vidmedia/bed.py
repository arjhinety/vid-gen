"""Procedural music bed ("pulse"): license-free, deterministic, deliberately plain.

A soft minor-key pad, a sub pulse on beats 1 and 3, and a quiet off-beat tick, in the
register the house film's bed sits in (a continuous low bed with a clock-like top).
The bar grid is fitted per section so every section start (a scene cut) is a downbeat:
each section gets a whole number of bars as close to the requested tempo as its length
allows, and the chord changes on the cut. The last section drops the pulse and resolves
to the tonic, so the film ends on a held chord.
"""

from __future__ import annotations

import numpy as np

SR = 48000

# A minor, as MIDI notes low to high: Am9, Fmaj7, Cmaj9, Em7.
PROGRESSION = [
    [45, 52, 55, 59, 60],
    [41, 48, 52, 57, 60],
    [48, 55, 59, 62, 64],
    [40, 47, 50, 55, 59],
]
BARS_PER_CHORD = 2


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def bar_grid(duration: float, sections: list[float], bpm: float) -> list[tuple[float, float, int]]:
    """Bars as (start, length, section index). Every section start begins a bar."""
    bounds = sorted({0.0, *[float(s) for s in sections if 0 < s < duration]}) + [float(duration)]
    nominal = 4 * 60 / bpm
    bars: list[tuple[float, float, int]] = []
    for si, (s0, s1) in enumerate(zip(bounds, bounds[1:])):
        k = max(1, round((s1 - s0) / nominal))
        length = (s1 - s0) / k
        bars += [(s0 + j * length, length, si) for j in range(k)]
    return bars


def _lowpass(x: np.ndarray, hz: float, order: int = 2) -> np.ndarray:
    from scipy.signal import butter, sosfilt

    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def _bandpass(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    from scipy.signal import butter, sosfilt

    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def _chord(notes: list[int], length: float, attack: float, release: float) -> np.ndarray:
    """A soft pad chord: two slightly detuned band-limited saws per note, slow attack."""
    n = int((length + release) * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for i, m in enumerate(notes):
        amp = 0.8 if i == 0 else 0.5
        for cents in (-5.0, 5.0):
            f = midi_hz(m + cents / 100)
            ph = 2 * np.pi * f * t
            out += amp * sum(np.sin(k * ph) / k for k in range(1, 5))
    env = np.clip(t / attack, 0, 1) ** 2
    rel = np.clip((t - length) / release, 0, 1)
    env *= np.cos(rel * np.pi / 2) ** 2
    return out * env


def _sub(root_midi: int, rng: np.random.Generator) -> np.ndarray:
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f0 = midi_hz(root_midi - 12)
    f = f0 * (1 + 1.0 * np.exp(-t / 0.025))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR)
    env = np.clip(t / 0.004, 0, 1) * np.exp(-t / 0.16)
    return body * env * rng.uniform(0.9, 1.0)


def _tick(rng: np.random.Generator) -> np.ndarray:
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return _bandpass(rng.standard_normal(n), 3500, 9000) * np.exp(-t / 0.006) * rng.uniform(0.55, 1.0)


def _place(out: np.ndarray, x: np.ndarray, t: float, gain: float = 1.0) -> None:
    s = int(round(t * SR))
    if s >= len(out):
        return
    seg = x[: len(out) - s]
    out[s : s + len(seg)] += gain * seg


def render_bed(duration: float, sections: list[float], bpm: float = 96, seed: int = 0) -> np.ndarray:
    """Mono float64 at 48 kHz, `duration` seconds long, peak-normalised to 1."""
    rng = np.random.default_rng(seed)
    n = int(round(duration * SR))
    pad = np.zeros(n)
    pulse = np.zeros(n)
    ticks = np.zeros(n)
    bars = bar_grid(duration, sections, bpm)
    last = bars[-1][2]

    # Chords: change every BARS_PER_CHORD bars and on every section start; the last section resolves.
    chord_i, run_start, run_len = 0, 0, 0
    segs: list[tuple[float, float, int]] = []
    for bi, (b0, bl, si) in enumerate(bars):
        new_section = bi == 0 or si != bars[bi - 1][2]
        if bi > 0 and (new_section or run_len == BARS_PER_CHORD):
            segs.append((bars[run_start][0], b0 - bars[run_start][0], chord_i))
            chord_i = 0 if si == last else (chord_i + 1) % len(PROGRESSION)
            run_start, run_len = bi, 0
        run_len += 1
    segs.append((bars[run_start][0], duration - bars[run_start][0], chord_i))
    for t0, length, ci in segs:
        _place(pad, _chord(PROGRESSION[ci], length, attack=min(0.9, length / 3), release=1.1), t0)
    pad = _lowpass(pad, 1000)  # stay under the voice band

    # Pulse: sub on beats 1 and 3 (root of the sounding chord), tick on the off-beat eighths.
    seg_at = lambda t: next(ci for t0, length, ci in reversed(segs) if t >= t0 - 1e-6)  # noqa: E731
    for b0, bl, si in bars:
        if si == last:
            continue
        beat = bl / 4
        root = PROGRESSION[seg_at(b0)][0]
        for k in (0, 2):
            _place(pulse, _sub(root, rng), b0 + k * beat)
        for k in range(4):
            _place(ticks, _tick(rng), b0 + (k + 0.5) * beat)

    def unit(x: np.ndarray) -> np.ndarray:
        return x / (np.max(np.abs(x)) + 1e-12)

    out = unit(pad) + 0.55 * unit(pulse) + 0.2 * unit(ticks)
    out -= np.mean(out)
    return out / (np.max(np.abs(out)) + 1e-12)
