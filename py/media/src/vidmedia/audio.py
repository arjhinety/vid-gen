"""Narration audio: per-line prep, word alignment against known text, and mixdown.

All three operate on JSON job files written by the Node orchestrator
(packages/cli/src/audio.ts) so one Python process handles every line.
"""

from __future__ import annotations

import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 48000


# --------------------------------------------------------------------------- prep

def _to_mono_48k(path: Path) -> np.ndarray:
    audio, sr = sf.read(str(path), dtype="float32", always_2d=True)
    audio = audio.mean(axis=1)
    if sr != SR:
        from math import gcd

        from scipy.signal import resample_poly

        g = gcd(SR, sr)
        audio = resample_poly(audio, SR // g, sr // g).astype(np.float32)
    return audio


def trim_silence(audio: np.ndarray, thresh_db: float = -45.0, pad_s: float = 0.04) -> tuple[np.ndarray, float, float]:
    """Trim leading/trailing silence using a 10 ms RMS envelope. Returns (audio, trimmed_head_s, trimmed_tail_s)."""
    win = int(SR * 0.01)
    if len(audio) < win * 3:
        return audio, 0.0, 0.0
    frames = len(audio) // win
    rms = np.sqrt(np.mean(audio[: frames * win].reshape(frames, win) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms)
    voiced = np.where(db > thresh_db)[0]
    if voiced.size == 0:
        return audio, 0.0, 0.0
    pad = int(pad_s * SR)
    a = max(0, voiced[0] * win - pad)
    b = min(len(audio), (voiced[-1] + 1) * win + pad)
    return audio[a:b], a / SR, (len(audio) - b) / SR


def loudness_match(audio: np.ndarray, target_lufs: float) -> tuple[np.ndarray, float]:
    import pyloudnorm as pyln

    meter = pyln.Meter(SR)
    try:
        lufs = meter.integrated_loudness(audio)
    except ValueError:  # too short for gating
        lufs = 20 * np.log10(np.sqrt(np.mean(audio**2)) + 1e-12) - 0.691
    if not np.isfinite(lufs):
        return audio, float("nan")
    gain = 10 ** ((target_lufs - lufs) / 20)
    out = audio * gain
    peak = np.max(np.abs(out)) + 1e-12
    if peak > 0.89:  # keep ~1 dB headroom for the final mix
        out *= 0.89 / peak
    return out.astype(np.float32), float(lufs)


def _tempo(src: Path, tempo: float) -> np.ndarray:
    """Speed speech up (or down) without changing its pitch or formants: FFmpeg's rubberband
    filter, high-quality pitch mode, formants preserved. Returns mono 48 kHz."""
    import subprocess
    import tempfile

    with tempfile.TemporaryDirectory() as d:
        out = Path(d) / "t.wav"
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
               "-af", f"rubberband=tempo={tempo}:formant=preserved:pitchq=quality", "-ar", str(SR), "-ac", "1", str(out)]
        subprocess.run(cmd, check=True)
        return _to_mono_48k(out)


def prep_lines(job: dict) -> list[dict]:
    """job = {"target_lufs": -19, "tempo": 1.0, "items": [{"id", "src", "out"}]}

    `tempo` (a voice setting) speeds every line up by that factor before trimming, pitch kept."""
    res = []
    tempo = float(job.get("tempo", 1.0))
    for it in job["items"]:
        audio = _tempo(Path(it["src"]), tempo) if abs(tempo - 1.0) > 1e-6 else _to_mono_48k(Path(it["src"]))
        audio, head, tail = trim_silence(audio)
        audio, lufs_in = loudness_match(audio, job.get("target_lufs", -19.0))
        Path(it["out"]).parent.mkdir(parents=True, exist_ok=True)
        sf.write(it["out"], audio, SR, subtype="PCM_16")
        res.append({"id": it["id"], "out": it["out"], "duration": round(len(audio) / SR, 3), "lufs_in": round(lufs_in, 2),
                    "trimmed_head": round(head, 3), "trimmed_tail": round(tail, 3)})
    return res


# --------------------------------------------------------------------------- align

_PUNCT = re.compile(r"[\s\W_]+", re.UNICODE)


def _norm_chars(s: str) -> tuple[str, list[int]]:
    """Lowercased, punctuation/space-free characters of s, with their indices in s."""
    out, idx = [], []
    for i, ch in enumerate(s):
        c = unicodedata.normalize("NFKC", ch).lower()
        if not c or _PUNCT.fullmatch(c):
            continue
        out.append(c)
        idx.append(i)
    return "".join(out), idx


def map_words_to_text(words: list[dict], text: str) -> list[dict]:
    """Map recognised words (with times) onto character spans of the known `text`.

    Recognised characters are aligned to the text's characters with difflib; each
    word takes the span of the text characters its own characters matched. Words
    that match nothing get a span interpolated from their neighbours, so every
    word keeps a time and a (possibly approximate) position.
    """
    ref, ref_idx = _norm_chars(text)
    hyp_chars: list[str] = []
    owner: list[int] = []
    for wi, w in enumerate(words):
        c, _ = _norm_chars(w["w"])
        hyp_chars.extend(c)
        owner.extend([wi] * len(c))
    hyp = "".join(hyp_chars)
    spans: list[list[int]] = [[] for _ in words]
    sm = SequenceMatcher(None, hyp, ref, autojunk=False)
    for blk in sm.get_matching_blocks():
        for k in range(blk.size):
            spans[owner[blk.a + k]].append(ref_idx[blk.b + k])
    out = []
    for w, sp in zip(words, spans):
        out.append({**w, "s0": min(sp) if sp else None, "s1": (max(sp) + 1) if sp else None, "matched": len(sp)})
    # Interpolate unmatched words between matched neighbours.
    for i, w in enumerate(out):
        if w["s0"] is not None:
            continue
        prev_end = next((out[j]["s1"] for j in range(i - 1, -1, -1) if out[j]["s1"] is not None), 0)
        next_start = next((out[j]["s0"] for j in range(i + 1, len(out)) if out[j]["s0"] is not None), len(text))
        w["s0"], w["s1"], w["interpolated"] = prev_end, max(prev_end, next_start), True
    return out


def error_rate(hyp: str, ref: str) -> float:
    """Character error rate on normalised characters (works for EN and JA).

    The long-vowel mark 「ー」 is ignored: an emotion tag can stretch a vowel ("消えましたー!")
    without changing a word, and a stretched vowel is not a misreading."""
    h, _ = _norm_chars(hyp)
    r, _ = _norm_chars(ref)
    h, r = h.replace("ー", ""), r.replace("ー", "")
    if not r:
        return 0.0
    # Levenshtein distance, O(len(h) * len(r)) with two rows.
    prev = list(range(len(r) + 1))
    for i, hc in enumerate(h, 1):
        cur = [i] + [0] * len(r)
        for j, rc in enumerate(r, 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (hc != rc))
        prev = cur
    return prev[-1] / len(r)


def align_lines(job: dict) -> list[dict]:
    """job = {"lang": "en", "model": "...", "items": [{"id", "wav", "text"}]}; text = spoken text."""
    from faster_whisper import WhisperModel

    from .cuda import pick_device

    dev, compute = pick_device(job.get("device", "auto"))
    model = WhisperModel(job.get("model", "large-v3-turbo"), device=dev, compute_type=compute)
    res = []
    for it in job["items"]:
        segs, _ = model.transcribe(
            it["wav"], language=job["lang"], word_timestamps=True, vad_filter=False, beam_size=5,
            initial_prompt=it["text"], condition_on_previous_text=False,
        )
        words = [{"w": w.word, "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 3)} for s in segs for w in (s.words or [])]
        hyp = "".join(w["w"] for w in words)
        mapped = map_words_to_text(words, it["text"])
        res.append({"id": it["id"], "words": mapped, "hyp": hyp.strip(), "cer": round(error_rate(hyp, it["text"]), 4)})
    return res


# --------------------------------------------------------------------------- mix

def duck_envelope(n: int, speech: list[list[float]], duck_db: float, pad_before: float = 0.25, pad_after: float = 0.45, ramp: float = 0.35) -> np.ndarray:
    """Per-sample music gain: 1.0 in the clear, `duck_db` under speech (padded), with
    `ramp`-second linear transitions. Driven by the timeline, so it never pumps."""
    rate = 200  # control rate (Hz)
    m = int(np.ceil(n / SR * rate)) + 1
    mask = np.zeros(m)
    for s0, s1 in speech:
        a, b = max(0, int((s0 - pad_before) * rate)), min(m, int(np.ceil((s1 + pad_after) * rate)))
        mask[a:b] = 1.0
    k = max(1, int(ramp * rate))
    smooth = np.convolve(np.pad(mask, (k, k), mode="edge"), np.ones(k) / k, mode="same")[k:-k]
    gain = 1.0 + (10 ** (duck_db / 20) - 1.0) * np.clip(smooth, 0, 1)
    return np.interp(np.arange(n) / SR, np.arange(m) / rate, gain)


def _music_bed(spec: dict, n: int, target_lufs: float, meter) -> tuple[np.ndarray, float]:
    """The bed at `gain_db` LU under the voice target: mono for a file or the procedural
    bed, stereo (n, 2) for fitted tracks (their own fades; no film-edge fades added)."""
    if spec.get("tracks"):
        from vidmedia import tracks

        bed_lufs = target_lufs + spec.get("gain_db", -24)
        x, placed = tracks.place(spec["tracks"], n, bed_lufs, meter, spec.get("xfade", 3.0))
        spec["_placed"] = placed
        return x, bed_lufs
    if spec.get("procedural"):
        from vidmedia import bed

        x = bed.render_bed(n / SR, spec.get("sections") or [], bpm=spec.get("bpm", 96), seed=spec.get("seed", 0))[:n]
    else:
        x = _to_mono_48k(Path(spec["path"])).astype(np.float64)
        if len(x) < SR:
            raise ValueError(f"music file is shorter than 1 s: {spec['path']}")
        reps = int(np.ceil(n / len(x)))
        x = np.tile(x, reps)[:n]
    bed_lufs = target_lufs + spec.get("gain_db", -24)
    x *= 10 ** ((bed_lufs - meter.integrated_loudness(x)) / 20)
    fi, fo = int(spec.get("fade_in", 1.5) * SR), int(spec.get("fade_out", 3.0) * SR)
    x[:fi] *= np.linspace(0, 1, fi) ** 2
    x[n - fo :] *= np.linspace(1, 0, fo) ** 2
    return x, bed_lufs


def mix(job: dict) -> dict:
    """Mix narration lines onto the timeline, then (optionally) a ducked music bed and SFX.

    job = {"duration": s, "target_lufs": -16, "out": path, "items": [{"wav", "start"}],
           "speech": [[s0, s1], ...]?,           # defaults to the items' spans
           "music": {"path" | "procedural" (+ "sections", "bpm", "seed") | "tracks" ([{"path", "start", "end", "align"}], "xfade"),
                     "gain_db", "duck_db", "fade_in", "fade_out"}?,
           "sfx": [{"sound"|"path", "start", "gain_db", "seed"}]?,
           "ceiling_dbfs": -1}
    The voice bus is normalised to target_lufs; the bed sits `gain_db` LU under it before ducking.
    With `tracks` the bed is stereo, so the output is stereo (voice and SFX centred).
    """
    import pyloudnorm as pyln

    from vidmedia import sfx as sfxlib

    n = int(round(job["duration"] * SR))
    voice = np.zeros(n + SR, dtype=np.float64)
    spans = []
    for it in job["items"]:
        a, sr = sf.read(it["wav"], dtype="float32")
        assert sr == SR, f"{it['wav']} is {sr} Hz; run prep first"
        if a.ndim > 1:
            a = a.mean(axis=1)
        s = int(round(it["start"] * SR))
        seg = a[: max(0, len(voice) - s)]
        voice[s : s + len(seg)] += seg
        spans.append([it["start"], it["start"] + len(a) / SR])
    voice = voice[:n]
    meter = pyln.Meter(SR)
    lufs_before = meter.integrated_loudness(voice)
    voice *= 10 ** ((job["target_lufs"] - lufs_before) / 20)
    bus = voice.copy()
    info: dict = {}

    if job.get("music"):
        spec = job["music"]
        bed, bed_lufs = _music_bed(spec, n, job["target_lufs"], meter)
        env = duck_envelope(n, job.get("speech") or spans, spec.get("duck_db", -10))
        if bed.ndim == 2:
            bus = np.repeat(bus[:, None], bed.shape[1], axis=1) + bed * env[:, None]
        else:
            bus += bed * env
        source = spec.get("path") or (f"procedural:{spec['procedural']}" if spec.get("procedural") else "tracks")
        info["music"] = {"source": source, "bed_lufs": round(bed_lufs, 2), "duck_db": spec.get("duck_db", -10)}
        if spec.get("_placed"):
            info["music"]["tracks"] = spec["_placed"]

    placed = []
    for i, fx in enumerate(job.get("sfx") or []):
        x = sfxlib.render(fx["sound"], fx.get("seed", i)) if "sound" in fx else _to_mono_48k(Path(fx["path"])).astype(np.float64)
        x = x / (np.max(np.abs(x)) + 1e-12) * 10 ** (fx.get("gain_db", -20) / 20)
        s = int(round(fx["start"] * SR))
        if s >= n:
            continue
        seg = x[: n - s]
        bus[s : s + len(seg)] += seg[:, None] if bus.ndim == 2 else seg
        placed.append({"what": fx.get("sound") or fx.get("path"), "start": fx["start"]})
    if placed:
        info["sfx"] = placed

    # Loudness on target AND peaks under the ceiling. Scaling the whole bus down to fit its
    # loudest peak would cost every second of the film that peak's overshoot (speech crest
    # factors put it ~2 dB under target), so only the peaks are limited, the bus is re-levelled,
    # and the two steps repeat until the loudness settles.
    ceiling = 10 ** (job.get("ceiling_dbfs", -1.0) / 20)
    target = job["target_lufs"]
    max_reduction = 0.0
    def peak_gain(b: np.ndarray) -> np.ndarray:
        g = limiter_gain(np.max(np.abs(b), axis=1) if b.ndim == 2 else b, ceiling)
        return g[:, None] if b.ndim == 2 else g

    for _ in range(4):
        g = peak_gain(bus)
        max_reduction = max(max_reduction, float(-20 * np.log10(np.min(g))))
        bus = bus * g
        err = target - meter.integrated_loudness(bus)
        if abs(err) < 0.1:
            break
        bus *= 10 ** (err / 20)
    bus *= peak_gain(bus)
    sf.write(job["out"], bus.astype(np.float32), SR, subtype="PCM_24")
    return {"out": job["out"], "lufs_before": round(lufs_before, 2), "lufs_after": round(meter.integrated_loudness(bus), 2),
            "peak_dbfs": round(20 * np.log10(np.max(np.abs(bus)) + 1e-12), 2), "limited": max_reduction > 0.01,
            "max_reduction_db": round(max_reduction, 2), **info}


def limiter_gain(x: np.ndarray, ceiling: float, attack: float = 0.002, release: float = 0.08, block: int = 48) -> np.ndarray:
    """Per-sample gain (<= 1) that keeps |x * gain| <= ceiling, touching only the peaks.

    Works on 1 ms blocks: each block's required gain is min-filtered with its neighbours
    (so linear interpolation between block centres can never exceed any block's need),
    then smoothed backward in time (the gain ramps down over `attack` before a peak: the
    lookahead) and forward (it recovers over `release` after), each pass only lowering it.
    """
    from scipy.ndimage import minimum_filter1d

    n = len(x)
    nb = int(np.ceil(n / block))
    a = np.zeros(nb * block)
    a[:n] = np.abs(x)
    need = np.minimum(1.0, ceiling / np.maximum(a.reshape(nb, block).max(axis=1), 1e-12))
    if need.min() >= 1.0:
        return np.ones(n)
    g = minimum_filter1d(need, size=3, mode="nearest")
    k_att = np.exp(-block / (attack * SR))
    k_rel = np.exp(-block / (release * SR))
    cur = 1.0
    for i in range(nb - 1, -1, -1):
        cur = min(g[i], 1.0 - (1.0 - cur) * k_att)
        g[i] = cur
    cur = 1.0
    for i in range(nb):
        cur = min(g[i], 1.0 - (1.0 - cur) * k_rel)
        g[i] = cur
    centres = (np.arange(nb) + 0.5) * block
    return np.interp(np.arange(n), centres, g)


def run_job_file(kind: str, path: str) -> None:
    job = json.loads(Path(path).read_text(encoding="utf-8"))
    fn = {"prep": prep_lines, "align": align_lines, "mix": mix}[kind]
    out = fn(job)
    Path(path).with_suffix(".results.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
