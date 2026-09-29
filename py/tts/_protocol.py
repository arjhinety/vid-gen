"""Engine-agnostic TTS job protocol shared by every adapter in py/tts/<engine>/run.py.

Each engine lives in its own Python environment (CUDA/torch pins differ between
engines), so adapters are separate processes. The orchestrator writes a job file:

    {
      "engine": "irodori",
      "voice": {...engine-specific voice params...},
      "device": "cuda" | "cpu",
      "items": [{"id": "b01#0", "text": "...", "out": "C:/abs/path.wav", "seed": 1234, "lang": "en"}]
    }

and the adapter writes <job>.results.json:

    {"engine", "device", "load_s", "peak_vram_mb", "load_peak_vram_mb", "synth_peak_vram_mb",
     "gpu": {...nvidia-smi / WDDM sampler...}, "flags": [...],
     "items": [{"id", "out", "ok", "error", "sample_rate", "duration_s", "gen_s", "rtf", "peak_vram_mb", "info"}]}

`rtf` is seconds of compute per second of audio (lower is faster).

VRAM is measured three ways because Windows WDDM silently spills to shared
(system) memory instead of raising OOM:
  * torch.cuda.max_memory_reserved (allocator view; load and synthesis phases separately),
  * an nvidia-smi sampler (device-wide dedicated memory in use; per-process figures are N/A under WDDM),
  * on Windows, the "GPU Adapter Memory" performance counters (dedicated + shared usage of the NVIDIA
    adapter), so a spill shows up as shared usage growing during the job.
The job is flagged `vram_ceiling` when dedicated use comes within 200 MiB of the card size,
`shared_spill` when adapter shared usage grows by >256 MiB, and `throughput_collapse`
when an item is >3x slower (s/s) than the job median and slower than real time, and `host_ram_growth` when the process's private
memory grows by >2 GB after loading (a host-RAM leak makes Windows page and every engine slow down).

Adapters must load the model once, process all items, never abort the whole job
on one failed item, and exit non-zero only if nothing could be produced.
`load(voice, device)` returns `synth(item) -> (audio, sr)` or `(audio, sr, info_dict)`.
"""

from __future__ import annotations

import json
import os
import statistics
import subprocess
import sys
import threading
import time
import traceback
from collections.abc import Callable
from pathlib import Path
from typing import Any

Synth = Callable[[dict[str, Any]], tuple]  # item -> (float32 mono numpy array, sample_rate[, info])

_NO_WINDOW = 0x08000000 if os.name == "nt" else 0  # CREATE_NO_WINDOW


class GpuSampler:
    """Background sampler for device memory (nvidia-smi) and WDDM adapter shared memory."""

    def __init__(self, interval: float = 0.2):
        self.interval = interval
        self.total_mb: float | None = None
        self.baseline_mb: float | None = None
        self.peak_mb: float | None = None
        self.shared_baseline_mb: float | None = None
        self.shared_peak_mb: float | None = None
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []
        self._typeperf: subprocess.Popen | None = None

    def _smi(self) -> tuple[float, float] | None:
        try:
            out = subprocess.run(
                ["nvidia-smi", "--query-gpu=memory.used,memory.total", "--format=csv,noheader,nounits"],
                capture_output=True, text=True, timeout=5, creationflags=_NO_WINDOW,
            ).stdout.strip().splitlines()[0]
            used, total = (float(x) for x in out.split(","))
            return used, total
        except Exception:
            return None

    def _smi_loop(self) -> None:
        while not self._stop.is_set():
            r = self._smi()
            if r:
                self.peak_mb = max(self.peak_mb or 0.0, r[0])
            self._stop.wait(self.interval)

    def _typeperf_loop(self) -> None:
        # Adapter-level counters: instances are static, so one long-running typeperf works.
        cmd = ["typeperf", r"\GPU Adapter Memory(*)\Dedicated Usage", r"\GPU Adapter Memory(*)\Shared Usage", "-si", "1"]
        try:
            self._typeperf = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
                                              creationflags=_NO_WINDOW)
        except Exception:
            return
        header: list[str] | None = None
        nv_idx: tuple[int, int] | None = None
        assert self._typeperf.stdout is not None
        for line in self._typeperf.stdout:
            if self._stop.is_set():
                break
            cells = [c.strip('"') for c in line.strip().split('","')]
            if len(cells) < 3:
                continue
            if header is None:
                header = cells
                continue
            try:
                vals = [float(c) for c in cells[1:]]
            except ValueError:
                continue
            if nv_idx is None:
                # The discrete NVIDIA adapter is the one with dedicated memory in use (iGPUs report 0).
                ded = [(v, i) for i, (h, v) in enumerate(zip(header[1:], vals)) if h.endswith("Dedicated Usage")]
                if not ded:
                    continue
                _, di = max(ded)
                luid = header[1 + di].split("(")[1].split(")")[0]
                si = next((i for i, h in enumerate(header[1:]) if luid in h and h.endswith("Shared Usage")), None)
                if si is None:
                    continue
                nv_idx = (di, si)
            shared = vals[nv_idx[1]] / 2**20
            if self.shared_baseline_mb is None:
                self.shared_baseline_mb = shared
            self.shared_peak_mb = max(self.shared_peak_mb or 0.0, shared)

    def start(self) -> GpuSampler:
        r = self._smi()
        if r:
            self.baseline_mb, self.total_mb = r
            self.peak_mb = r[0]
        for fn in (self._smi_loop,) + ((self._typeperf_loop,) if os.name == "nt" else ()):
            t = threading.Thread(target=fn, daemon=True)
            t.start()
            self._threads.append(t)
        return self

    def stop(self) -> dict[str, Any]:
        self._stop.set()
        if self._typeperf is not None:
            self._typeperf.kill()
        for t in self._threads:
            t.join(timeout=3)
        rnd = lambda v: None if v is None else round(v, 1)  # noqa: E731
        return {
            "smi_total_mb": rnd(self.total_mb),
            "smi_baseline_used_mb": rnd(self.baseline_mb),
            "smi_peak_used_mb": rnd(self.peak_mb),
            "smi_peak_delta_mb": rnd(None if self.peak_mb is None or self.baseline_mb is None else self.peak_mb - self.baseline_mb),
            "wddm_shared_baseline_mb": rnd(self.shared_baseline_mb),
            "wddm_shared_peak_mb": rnd(self.shared_peak_mb),
        }


def process_private_mb() -> float | None:
    """Private (committed) memory of this process in MB: catches host-RAM leaks that make Windows page."""
    try:
        if os.name == "nt":
            import ctypes
            from ctypes import wintypes

            class PMC(ctypes.Structure):
                _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD)] + [
                    (n, ctypes.c_size_t) for n in ("PeakWorkingSetSize", "WorkingSetSize", "QuotaPeakPagedPoolUsage",
                                                   "QuotaPagedPoolUsage", "QuotaPeakNonPagedPoolUsage",
                                                   "QuotaNonPagedPoolUsage", "PagefileUsage", "PeakPagefileUsage",
                                                   "PrivateUsage")]

            c = PMC()
            c.cb = ctypes.sizeof(PMC)
            k32 = ctypes.WinDLL("kernel32")
            k32.GetCurrentProcess.restype = wintypes.HANDLE
            fn = k32.K32GetProcessMemoryInfo
            fn.argtypes = [wintypes.HANDLE, ctypes.POINTER(PMC), wintypes.DWORD]
            fn.restype = wintypes.BOOL
            if fn(k32.GetCurrentProcess(), ctypes.byref(c), c.cb):
                return round(c.PrivateUsage / 2**20, 1)
            return None
        import resource

        return round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024, 1)
    except Exception:
        return None


def _torch_cuda():
    try:
        import torch

        if torch.cuda.is_available():
            return torch
    except Exception:
        pass
    return None


def run_job(engine: str, load: Callable[[dict[str, Any], str], Synth], argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 1:
        print("usage: run.py <job.json>", file=sys.stderr)
        return 2
    job_path = Path(argv[0])
    job = json.loads(job_path.read_text(encoding="utf-8"))
    device = job.get("device", "cuda")
    sampler = GpuSampler().start() if device.startswith("cuda") else None
    torch = _torch_cuda() if device.startswith("cuda") else None
    mb = lambda b: round(b / 2**20, 1)  # noqa: E731

    if torch:
        torch.cuda.reset_peak_memory_stats()
    t0 = time.perf_counter()
    synth = load(job.get("voice", {}), device)
    load_s = time.perf_counter() - t0
    load_peak = None
    if torch:
        load_peak = mb(torch.cuda.max_memory_reserved())
        torch.cuda.empty_cache()  # drop load-time transients (e.g. fp32 weights before a bf16 cast)
        torch.cuda.reset_peak_memory_stats()
    ram_after_load = process_private_mb()
    print(f"[{engine}] loaded in {load_s:.1f}s (load peak reserved {load_peak} MB, host private {ram_after_load} MB)", flush=True)

    import numpy as np
    import soundfile as sf

    results = []
    for item in job["items"]:
        rec: dict[str, Any] = {"id": item["id"], "out": item["out"], "ok": False}
        if torch:
            torch.cuda.reset_peak_memory_stats()
        t1 = time.perf_counter()
        try:
            ret = synth(item)
            audio, sr = ret[0], ret[1]
            info = ret[2] if len(ret) > 2 else None
            audio = np.asarray(audio, dtype=np.float32).reshape(-1)
            if audio.size == 0 or not np.isfinite(audio).all():
                raise RuntimeError("engine returned empty or non-finite audio")
            gen_s = time.perf_counter() - t1
            out = Path(item["out"])
            out.parent.mkdir(parents=True, exist_ok=True)
            sf.write(out, audio, sr, subtype="PCM_16")
            dur = audio.size / sr
            rec.update(ok=True, sample_rate=sr, duration_s=round(dur, 3), gen_s=round(gen_s, 3), rtf=round(gen_s / dur, 3))
            if info:
                rec["info"] = info
        except Exception as e:  # keep going; the orchestrator reports failures
            rec.update(error=f"{type(e).__name__}: {e}", trace=traceback.format_exc(limit=3))
        if torch:
            rec["peak_vram_mb"] = mb(torch.cuda.max_memory_reserved())
        rec["private_mb"] = process_private_mb()
        results.append(rec)
        status = f"ok {rec.get('duration_s')}s rtf {rec.get('rtf')}" if rec["ok"] else f"FAILED {rec.get('error')}"
        print(f"[{engine}] {item['id']}: {status}", flush=True)

    gpu = sampler.stop() if sampler else {}
    synth_peak = max((r.get("peak_vram_mb") or 0 for r in results), default=None) if torch else None
    flags = []
    if gpu.get("smi_total_mb") and gpu.get("smi_peak_used_mb") and gpu["smi_peak_used_mb"] >= gpu["smi_total_mb"] - 200:
        flags.append("vram_ceiling")
    if gpu.get("wddm_shared_peak_mb") is not None and gpu["wddm_shared_peak_mb"] - (gpu.get("wddm_shared_baseline_mb") or 0) > 256:
        flags.append("shared_spill")
    ram_max = max((r.get("private_mb") or 0 for r in results), default=0)
    if ram_after_load and ram_max - ram_after_load > 2048:
        flags.append("host_ram_growth")
    rtfs = [r["rtf"] for r in results[1:] if r.get("ok")]  # first item includes warm-up
    if len(rtfs) >= 3:
        med = statistics.median(rtfs)
        slow = [r["id"] for r in results[1:] if r.get("ok") and r["rtf"] > max(3 * med, 1.0)]
        if slow:
            flags.append("throughput_collapse")
            gpu["slow_items"] = slow

    summary = {
        "engine": engine,
        "device": device,
        "load_s": round(load_s, 2),
        "peak_vram_mb": max(load_peak or 0, synth_peak or 0) if torch else None,
        "load_peak_vram_mb": load_peak,
        "synth_peak_vram_mb": synth_peak,
        "private_mb_after_load": ram_after_load,
        "private_mb_max": max((r.get("private_mb") or 0 for r in results), default=None),
        "gpu": gpu,
        "flags": flags,
        "items": results,
    }
    job_path.with_suffix(".results.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"[{engine}] done: {sum(r['ok'] for r in results)}/{len(results)} ok, flags={flags}, gpu={gpu}", flush=True)
    return 0 if any(r["ok"] for r in results) else 1
