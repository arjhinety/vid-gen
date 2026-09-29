"""Procedural sound effects: synthesised from seeded noise and sines, so they carry no
licence and render identically every time. Deliberately quiet, short and dry: they mark
an event (a stamp landing, a panel arriving), they are not a soundtrack.

    tick    ~40 ms  a soft paper tick (pen, counter step)
    thump   ~220 ms low body with a pitch drop (stamp, slam)
    whoosh  ~500 ms band-limited noise swell (a panel or camera glide)
    stamp   thump + tick
    impact  ~1.2 s deep sub hit (a scene cut)
"""

from __future__ import annotations

import numpy as np

SR = 48000


def _env(n: int, attack: float, decay: float) -> np.ndarray:
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(0, t - attack) / max(decay, 1e-4))


def _lowpass(x: np.ndarray, hz: float) -> np.ndarray:
    from scipy.signal import butter, sosfilt

    return sosfilt(butter(2, hz, "low", fs=SR, output="sos"), x)


def _bandpass(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    from scipy.signal import butter, sosfilt

    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def tick(rng: np.random.Generator) -> np.ndarray:
    n = int(0.04 * SR)
    t = np.arange(n) / SR
    body = 0.6 * np.sin(2 * np.pi * 1850 * t) * _env(n, 0.0008, 0.006)
    grain = _bandpass(rng.standard_normal(n), 2500, 7000) * _env(n, 0.0005, 0.004) * 0.5
    return body + grain


def thump(rng: np.random.Generator) -> np.ndarray:
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    f = 50 + 45 * np.exp(-t / 0.04)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.002, 0.07)
    knock = _lowpass(rng.standard_normal(n), 900) * _env(n, 0.001, 0.012) * 0.6
    return body + knock


def whoosh(rng: np.random.Generator) -> np.ndarray:
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    lo, hi = _lowpass(noise, 700), _lowpass(noise, 3200)
    sweep = np.sin(np.pi * t / t[-1]) ** 2  # brighter in the middle
    shaped = lo * (1 - sweep) + hi * sweep
    return shaped * np.sin(np.pi * t / t[-1]) ** 1.5


def stamp(rng: np.random.Generator) -> np.ndarray:
    a, b = thump(rng), tick(rng)
    out = a.copy()
    out[: len(b)] += 0.7 * b
    return out


def impact(rng: np.random.Generator) -> np.ndarray:
    """A deep, soft hit for a cut: sub sweep 70 -> 34 Hz with a long tail, plus a muffled knock."""
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    f = 34 + 36 * np.exp(-t / 0.09)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(n, 0.003, 0.32)
    knock = _lowpass(rng.standard_normal(n), 420) * _env(n, 0.001, 0.035) * 0.5
    return body + knock


SOUNDS = {"tick": tick, "thump": thump, "whoosh": whoosh, "stamp": stamp, "impact": impact}


def render(name: str, seed: int = 0) -> np.ndarray:
    """Peak-normalised (to 1.0) mono float64 at 48 kHz."""
    if name not in SOUNDS:
        raise KeyError(f"unknown procedural sound '{name}'. Known: {', '.join(SOUNDS)}")
    x = SOUNDS[name](np.random.default_rng(seed))
    x = x - np.mean(x)
    fade = min(len(x), int(0.004 * SR))
    x[-fade:] *= np.linspace(1, 0, fade)
    return x / (np.max(np.abs(x)) + 1e-12)
