"""Run See-through on the public Hugging Face demo (ZeroGPU; uses the saved HF login for quota).

    python py/cast/seethrough_space.py <image.png> <out-dir> [--resolution 1280] [--seed 42]

Used when the local 6 GB GPU cannot fit the pipeline. Copies the layered PSD to <out-dir>/<stem>.psd.
Runs in third_party/see-through/.venv (gradio_client).
"""
import argparse
import shutil
import sys
from pathlib import Path

from gradio_client import Client, handle_file

p = argparse.ArgumentParser()
p.add_argument("image")
p.add_argument("out")
p.add_argument("--resolution", type=int, default=1280)
p.add_argument("--seed", type=int, default=42)
a = p.parse_args()
out = Path(a.out)
out.mkdir(parents=True, exist_ok=True)
c = Client("24yearsold/see-through-demo")
psd, layers = c.predict(handle_file(a.image), a.resolution, a.seed, True, api_name="/inference")
dst = out / (Path(a.image).stem + ".psd")
shutil.copy(psd, dst)
print(dst, f"{len(layers)} layers:", ", ".join((l.get("caption") or "?") for l in layers))
sys.exit(0)
