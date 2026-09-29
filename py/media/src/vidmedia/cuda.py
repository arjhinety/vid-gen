"""Make CUDA libraries shipped as pip wheels visible to ctranslate2 on Windows.

faster-whisper runs on ctranslate2, which needs cuBLAS 12 and cuDNN 9 DLLs. We
install them as `nvidia-cublas-cu12` / `nvidia-cudnn-cu12` wheels (the `cuda`
extra) instead of requiring a system CUDA toolkit, then register their `bin`
directories before ctranslate2 is imported. If the wheels are missing we fall
back to CPU.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_registered = False


def register_cuda_dlls() -> bool:
    """Register nvidia/*/bin directories. Returns True if any were found."""
    global _registered
    if _registered:
        return True
    found = False
    for base in map(Path, sys.path):
        nv = base / "nvidia"
        if not nv.is_dir():
            continue
        for bin_dir in nv.glob("*/bin"):
            if os.name == "nt":
                os.add_dll_directory(str(bin_dir))
            os.environ["PATH"] = str(bin_dir) + os.pathsep + os.environ.get("PATH", "")
            found = True
    _registered = found
    return found


def pick_device(requested: str = "auto") -> tuple[str, str]:
    """Return (device, compute_type) for faster-whisper."""
    if requested == "cpu":
        return "cpu", "int8"
    has_dlls = register_cuda_dlls()
    try:
        import ctranslate2

        if ctranslate2.get_cuda_device_count() > 0 and has_dlls:
            return "cuda", "float16"
    except Exception:  # pragma: no cover - diagnostic path
        pass
    if requested == "cuda":
        raise RuntimeError(
            "CUDA requested but unavailable. Run `uv sync --extra cuda` in py/media "
            "and check that the NVIDIA driver is installed."
        )
    return "cpu", "int8"
