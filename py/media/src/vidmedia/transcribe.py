"""Timestamped transcription with faster-whisper (word-level timestamps)."""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path

from .cuda import pick_device

DEFAULT_MODEL = "large-v3-turbo"


@dataclass
class Word:
    start: float
    end: float
    word: str
    prob: float


@dataclass
class Segment:
    id: int
    start: float
    end: float
    text: str
    words: list[Word] = field(default_factory=list)


def transcribe(
    audio: Path,
    model_name: str = DEFAULT_MODEL,
    language: str | None = "en",
    device: str = "auto",
    initial_prompt: str | None = None,
    vad: bool = True,
) -> dict:
    from faster_whisper import WhisperModel

    dev, compute = pick_device(device)
    t0 = time.perf_counter()
    model = WhisperModel(model_name, device=dev, compute_type=compute)
    load_s = time.perf_counter() - t0

    t1 = time.perf_counter()
    segments_iter, info = model.transcribe(
        str(audio),
        language=language,
        word_timestamps=True,
        vad_filter=vad,
        initial_prompt=initial_prompt,
        beam_size=5,
        condition_on_previous_text=False,
    )
    segments: list[Segment] = []
    for i, s in enumerate(segments_iter):
        words = [Word(round(w.start, 3), round(w.end, 3), w.word, round(w.probability, 3)) for w in (s.words or [])]
        segments.append(Segment(i, round(s.start, 3), round(s.end, 3), s.text.strip(), words))
    run_s = time.perf_counter() - t1

    return {
        "audio": str(audio),
        "model": model_name,
        "device": dev,
        "compute_type": compute,
        "language": info.language,
        "duration": round(info.duration, 3),
        "timing": {"load_s": round(load_s, 2), "transcribe_s": round(run_s, 2)},
        "segments": [asdict(s) for s in segments],
    }


def write_outputs(result: dict, out_dir: Path, stem: str = "transcript") -> list[Path]:
    from .captions import to_srt, to_vtt

    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    p = out_dir / f"{stem}.json"
    p.write_text(json.dumps(result, indent=1, ensure_ascii=False), encoding="utf-8")
    paths.append(p)
    cues = [(s["start"], s["end"], s["text"]) for s in result["segments"]]
    for ext, fn in (("srt", to_srt), ("vtt", to_vtt)):
        p = out_dir / f"{stem}.{ext}"
        p.write_text(fn(cues), encoding="utf-8")
        paths.append(p)
    p = out_dir / f"{stem}.md"
    lines = [f"# Transcript: {Path(result['audio']).name}", "", f"model `{result['model']}` on {result['device']}", ""]
    for s in result["segments"]:
        lines.append(f"`{_mmss(s['start'])}` {s['text']}")
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
    paths.append(p)
    return paths


def _mmss(t: float) -> str:
    m, s = divmod(t, 60)
    return f"{int(m):02d}:{s:05.2f}"
