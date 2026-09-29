"""Kokoro-82M adapter (Apache-2.0 weights; preset voices, no cloning). Runs inside py/tts/kokoro/.venv.

Voice params:
  voice:     preset (af_heart, af_bella, ...) or a weighted blend "af_heart:0.7,af_bella:0.3"
  speed:     1.0
  lang_code: a (American English, default) | b (British)
  lexicon:   {"SFT": "<phonemes>", ...} pronunciation overrides added to misaki's gold lexicon
Kokoro auto-chunks long input internally (<= 510 phoneme tokens per pass); chunks are concatenated.

Per-item direction (`prosody`, from a line's tone): Kokoro predicts each line's durations and
pitch contour (F0) from the text and the voice's prosody style, then decodes them with the
voice's timbre style. Direction edits those predictions before decoding, so the timbre is the
preset's exactly:
  speed  (x, multiplies the voice speed)
  pitch  (semitones added to every voiced frame)
  range  (x, scales each voiced frame's distance from the line's median pitch, in semitones:
          > 1 livelier, < 1 flatter)
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _protocol import run_job  # noqa: E402

SR = 24000
VOICED_HZ = 50.0  # F0 predictions below this are unvoiced frames; left untouched


def _direct_f0(f0, pitch: float, rng: float):
    """Shift and widen/narrow a predicted F0 contour (Hz) in the log domain, voiced frames only."""
    import torch

    voiced = f0 > VOICED_HZ
    if not bool(voiced.any()) or (pitch == 0 and rng == 1):
        return f0
    lf = torch.log2(f0.clamp(min=1.0)) * 12  # semitones
    med = lf[voiced].median()
    out = med + rng * (lf - med) + pitch
    return torch.where(voiced, torch.pow(2.0, out / 12), f0)


def load(voice: dict[str, Any], device: str):
    import numpy as np
    import torch
    from kokoro import KPipeline

    pipe = KPipeline(lang_code=voice.get("lang_code", "a"), repo_id="hexgrad/Kokoro-82M", device=device)
    for word, phon in (voice.get("lexicon") or {}).items():
        pipe.g2p.lexicon.golds[word] = phon

    spec = voice.get("voice", "af_heart")
    if ":" in spec:  # weighted blend
        parts = [p.split(":") for p in spec.split(",")]
        vpack = sum(float(w) * pipe.load_single_voice(n.strip()) for n, w in parts)
    else:
        vpack = spec
    speed = float(voice.get("speed", 1.0))

    # The current item's pitch direction, read by the patched forward pass below.
    direction = {"pitch": 0.0, "range": 1.0}
    model = pipe.model
    predictor = model.predictor
    f0ntrain = predictor.F0Ntrain

    def directed_f0ntrain(en, s):
        f0, n = f0ntrain(en, s)
        return _direct_f0(f0, direction["pitch"], direction["range"]), n

    predictor.F0Ntrain = directed_f0ntrain

    def synth(item: dict[str, Any]):
        pro = item.get("prosody") or {}
        direction["pitch"] = float(pro.get("pitch", 0.0))
        direction["range"] = float(pro.get("range", 1.0))
        sp = speed * float(pro.get("speed", 1.0))
        chunks = [np.asarray(r.audio, dtype=np.float32) for r in pipe(item["text"], voice=vpack, speed=sp)
                  if r.audio is not None]
        if not chunks:
            raise RuntimeError("kokoro produced no audio")
        return np.concatenate(chunks), SR, {"chunks": len(chunks), **({"prosody": pro} if pro else {})}

    torch.manual_seed(0)
    synth({"text": "This is a short warm-up sentence."})
    return synth


if __name__ == "__main__":
    raise SystemExit(run_job("kokoro", load))
