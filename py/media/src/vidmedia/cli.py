"""vidmedia command line. Invoked by the Node CLI (`pnpm video ...`) or directly via `uv run`."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


def extract_audio(src: Path, dst: Path, rate: int = 16000) -> Path:
    dst.parent.mkdir(parents=True, exist_ok=True)
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return dst
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-vn", "-ac", "1", "-ar", str(rate), "-c:a", "pcm_s16le", str(dst)]
    subprocess.run(cmd, check=True)
    return dst


def cmd_transcribe(a: argparse.Namespace) -> int:
    from .transcribe import transcribe, write_outputs

    src = Path(a.input)
    out = Path(a.out)
    audio = src
    if src.suffix.lower() not in {".wav", ".flac"}:
        audio = extract_audio(src, out / "audio.16k.wav")
    result = transcribe(audio, model_name=a.model, language=a.language, device=a.device, initial_prompt=a.prompt)
    result["source"] = str(src)
    for p in write_outputs(result, out):
        print(p)
    print(json.dumps({"device": result["device"], **result["timing"], "duration": result["duration"]}), file=sys.stderr)
    return 0


def cmd_refscan(a: argparse.Namespace) -> int:
    from .refscan import run

    r = run(Path(a.input), Path(a.out), max_keyframes=a.max_keyframes, fps=a.scan_fps)
    print(json.dumps({k: r[k] for k in ("duration_s", "n_hard_cuts", "n_segments", "segment_stats", "still_fraction")}, indent=1))
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="vidmedia")
    sub = p.add_subparsers(dest="cmd", required=True)

    t = sub.add_parser("transcribe", help="timestamped transcript (json/srt/vtt/md) of an audio or video file")
    t.add_argument("input")
    t.add_argument("--out", required=True)
    t.add_argument("--model", default="large-v3-turbo")
    t.add_argument("--language", default="en")
    t.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"])
    t.add_argument("--prompt", default=None, help="initial prompt with domain vocabulary")
    t.set_defaults(fn=cmd_transcribe)

    for kind, help_ in (("prep", "trim/resample/loudness-match narration lines"), ("align", "word-align narration lines to known text"), ("mix", "mix narration lines onto the timeline")):
        j = sub.add_parser(kind, help=f"{help_} (JSON job file; writes <job>.results.json)")
        j.add_argument("job")
        j.set_defaults(fn=lambda a, k=kind: (__import__("vidmedia.audio", fromlist=["run_job_file"]).run_job_file(k, a.job), 0)[1])

    r = sub.add_parser("refscan", help="sparse visual scan: cuts, composition segments, activity, keyframes")
    r.add_argument("input")
    r.add_argument("--out", required=True)
    r.add_argument("--max-keyframes", type=int, default=60)
    r.add_argument("--scan-fps", type=float, default=4.0, help="analysis frame rate (raise for short, fast videos)")
    r.set_defaults(fn=cmd_refscan)

    a = p.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    raise SystemExit(main())
