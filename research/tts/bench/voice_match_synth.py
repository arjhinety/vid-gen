"""Synthesize the Experimental Labs film's first sentences with every Kokoro English female voice.
Run with py/tts/kokoro/.venv python. Writes <out>/<voice>/<i>.wav (24 kHz)."""
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
from kokoro import KPipeline

out = Path(sys.argv[1])
segs = json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))["segments"][:7]
VOICES = ["af_alloy", "af_aoede", "af_bella", "af_heart", "af_jessica", "af_kore", "af_nicole", "af_nova", "af_river", "af_sarah", "af_sky", "bf_alice", "bf_emma", "bf_isabella", "bf_lily"]
pipes = {"a": KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M", device="cuda"), "b": KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M", device="cuda")}
for v in VOICES:
    d = out / v
    d.mkdir(parents=True, exist_ok=True)
    pipe = pipes[v[0]]
    for s in segs:
        torch.manual_seed(0)
        audio = np.concatenate([np.asarray(r.audio) for r in pipe(s["text"].strip(), voice=v, speed=1.0)])
        sf.write(d / f"{s['id']}.wav", audio, 24000)
    print(v, flush=True)
