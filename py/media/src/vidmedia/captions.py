"""SRT / WebVTT serialisation. Cues are (start_s, end_s, text)."""

from __future__ import annotations

from collections.abc import Iterable

Cue = tuple[float, float, str]


def _ts(t: float, sep: str) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def to_srt(cues: Iterable[Cue]) -> str:
    out = []
    for i, (a, b, text) in enumerate(cues, 1):
        out.append(f"{i}\n{_ts(a, ',')} --> {_ts(b, ',')}\n{text.strip()}\n")
    return "\n".join(out)


def to_vtt(cues: Iterable[Cue]) -> str:
    out = ["WEBVTT", ""]
    for a, b, text in cues:
        out.append(f"{_ts(a, '.')} --> {_ts(b, '.')}\n{text.strip()}\n")
    return "\n".join(out)
