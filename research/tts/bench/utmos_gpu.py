"""UTMOS22-strong (SpeechMOS, MIT) on the GPU for benchmark runs. UTMOS is ~1x real time on CPU, so it
runs here in an existing CUDA torch env (the Qwen3 env has torch 2.10+cu128, torchaudio and librosa):

    py/tts/qwen3/.venv/Scripts/python research/tts/bench/utmos_gpu.py build/tts-bench/<engine>/<voice> ...

Writes <run>/utmos.json {stem: score}. MOS predictors penalise high-pitched voices, so scores are only
compared within one voice (artefact detection), never across voices.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
import torch


def main(dirs: list[str]) -> None:
    model = torch.hub.load("tarepan/SpeechMOS:v1.2.0", "utmos22_strong", trust_repo=True).cuda().eval()
    for d in map(Path, dirs):
        wavs = sorted((d / "wav").glob("*.wav"))
        out = {}
        for w in wavs:
            x, sr = sf.read(w, dtype="float32", always_2d=True)
            x = librosa.resample(x.mean(axis=1), orig_sr=sr, target_sr=16000) if sr != 16000 else x.mean(axis=1)
            if x.size < 8000:
                continue
            with torch.no_grad():
                out[w.stem] = round(float(model(torch.from_numpy(np.ascontiguousarray(x))[None].cuda(), 16000).item()), 3)
        (d / "utmos.json").write_text(json.dumps(out, indent=0), encoding="utf-8")
        print(f"utmos {d.name}: {len(out)} clips, median {np.median(list(out.values())) if out else None}", flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
