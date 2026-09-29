"""Sparse visual scan of a reference video.

Decodes the video once at low resolution (grayscale, a few fps) and derives:

- hard cuts: consecutive-frame differences above a threshold;
- composition segments: a new segment starts when the frame has drifted far
  enough from the segment's first frame. This also catches slow morphs and
  camera moves, which cut detectors miss in animation-heavy videos;
- an activity curve (mean absolute frame difference per second);
- a small set of keyframes (middle of the longest/most distinct segments) and
  contact sheets for fast human/agent review.

The aim is to characterise pacing and composition, not to dump every frame.
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np

W, H = 160, 90


@dataclass
class CompSegment:
    start: float
    end: float
    kind: str  # "cut" if it began at a hard cut, else "drift"

    @property
    def dur(self) -> float:
        return self.end - self.start


def decode_lowres(video: Path, fps: float) -> np.ndarray:
    cmd = [
        "ffmpeg", "-v", "error", "-i", str(video),
        "-vf", f"fps={fps},scale={W}:{H}:flags=area,format=gray",
        "-f", "rawvideo", "-",
    ]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W).astype(np.int16)


def scan(video: Path, fps: float = 4.0, cut_thresh: float = 28.0, drift_thresh: float = 14.0, min_seg: float = 1.0) -> dict:
    frames = decode_lowres(video, fps)
    n = len(frames)
    step = np.abs(np.diff(frames, axis=0)).mean(axis=(1, 2))  # len n-1
    cuts = [round((i + 1) / fps, 2) for i, d in enumerate(step) if d > cut_thresh]

    segments: list[CompSegment] = []
    anchor = 0
    kind = "cut"
    for i in range(1, n):
        t = i / fps
        is_cut = step[i - 1] > cut_thresh
        drift = np.abs(frames[i] - frames[anchor]).mean()
        if (is_cut or drift > drift_thresh) and (t - anchor / fps) >= min_seg:
            segments.append(CompSegment(round(anchor / fps, 2), round(t, 2), kind))
            anchor, kind = i, ("cut" if is_cut else "drift")
    segments.append(CompSegment(round(anchor / fps, 2), round(n / fps, 2), kind))

    per_sec = int(round(fps))
    activity = [round(float(step[i : i + per_sec].mean()), 2) for i in range(0, len(step), per_sec)]
    durs = np.array([s.dur for s in segments])
    duration = n / fps
    return {
        "video": str(video),
        "scan_fps": fps,
        "duration_s": round(duration, 2),
        "hard_cuts": cuts,
        "n_hard_cuts": len(cuts),
        "segments": [asdict(s) | {"dur": round(s.dur, 2)} for s in segments],
        "n_segments": len(segments),
        "segment_stats": {
            "mean_s": round(float(durs.mean()), 2),
            "median_s": round(float(np.median(durs)), 2),
            "p10_s": round(float(np.percentile(durs, 10)), 2),
            "p90_s": round(float(np.percentile(durs, 90)), 2),
            "changes_per_min": round(len(segments) / (duration / 60), 2),
        },
        "activity_per_s": activity,
        "still_fraction": round(float((np.array(activity) < 0.5).mean()), 3),
    }


def pick_keyframes(segments: list[dict], max_n: int) -> list[float]:
    """Middle of each segment; if too many, keep the longest plus even coverage."""
    mids = [(s["start"] + s["end"]) / 2 for s in segments if s["dur"] >= 1.5]
    if len(mids) <= max_n:
        return [round(m, 2) for m in mids]
    by_len = sorted(segments, key=lambda s: -s["dur"])[: max_n // 2]
    chosen = {round((s["start"] + s["end"]) / 2, 2) for s in by_len}
    rest = [m for m in mids if round(m, 2) not in chosen]
    k = max_n - len(chosen)
    idx = np.linspace(0, len(rest) - 1, k).round().astype(int) if k > 0 and rest else []
    chosen |= {round(rest[i], 2) for i in idx}
    return sorted(chosen)


def extract_keyframes(video: Path, times: list[float], out_dir: Path, width: int = 640) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for t in times:
        m, s = divmod(t, 60)
        p = out_dir / f"kf_{int(m):02d}m{s:05.2f}s.jpg"
        if not p.exists():
            subprocess.run(
                ["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(video), "-frames:v", "1",
                 "-vf", f"scale={width}:-2", "-q:v", "4", str(p)],
                check=True,
            )
        paths.append(p)
    return paths


def contact_sheets(frames: list[Path], out_dir: Path, per_sheet: int = 20, cols: int = 5) -> list[Path]:
    """Tile keyframes (with timestamps burned in by filename order) into sheets."""
    sheets = []
    for k in range(0, len(frames), per_sheet):
        chunk = frames[k : k + per_sheet]
        listfile = out_dir / f"_sheet{k // per_sheet:02d}.txt"
        listfile.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in chunk), encoding="utf-8")
        rows = (len(chunk) + cols - 1) // cols
        out = out_dir / f"sheet_{k // per_sheet:02d}.jpg"
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
             "-vf", f"scale=320:-2,tile={cols}x{rows}:padding=4:color=white", "-frames:v", "1", "-q:v", "4", str(out)],
            check=True,
        )
        listfile.unlink()
        sheets.append(out)
    return sheets


def run(video: Path, out: Path, max_keyframes: int = 60, fps: float = 4.0) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    result = scan(video, fps=fps)
    times = pick_keyframes(result["segments"], max_keyframes)
    kfs = extract_keyframes(video, times, out / "keyframes")
    sheets = contact_sheets(kfs, out / "keyframes")
    result["keyframes"] = [p.name for p in kfs]
    result["contact_sheets"] = [p.name for p in sheets]
    (out / "visual-scan.json").write_text(json.dumps(result, indent=1), encoding="utf-8")
    return result
