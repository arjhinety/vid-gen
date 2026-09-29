"""VoxCPM2 adapter (Apache-2.0; 2B params, 30 languages incl. en/ja, 48 kHz). Runs inside py/tts/voxcpm/.venv.

Style/voice control is a parenthetical prefix on the text: "(description)text". The prefix is a model input,
not spoken (verify with the ASR round trip; see research/tts/emotion-tags.md).
Voice params:
  mode:        design (voice from a description; timbre re-sampled per call, fix with the seed) |
               clone  (controllable cloning: reference_wav_path timbre + optional style prefix)
  voice_desc:  design mode: prepended to every item's style ("A young woman, calm clear narrator voice")
  ref_wav:     clone mode: synthetic/licensed reference clip
  cfg_value (2.0), inference_timesteps (10), optimize (false: torch.compile needs triton, unavailable on Windows)
Item fields: text, style (optional per-line direction), seed, lang.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _protocol import run_job  # noqa: E402


def load(voice: dict[str, Any], device: str):
    import numpy as np
    import torch
    from voxcpm import VoxCPM

    model = VoxCPM.from_pretrained(voice.get("model", "openbmb/VoxCPM2"), load_denoiser=False, optimize=bool(voice.get("optimize", False)))
    sr = int(model.tts_model.sample_rate)
    mode = voice.get("mode", "design")
    ref = None
    if mode == "clone":
        ref = voice["ref_wav"]
        ref = ref if Path(ref).is_absolute() else str(_REPO / ref)

    def synth(item: dict[str, Any]):
        torch.manual_seed(int(item.get("seed", voice.get("seed", 0))))
        style = item.get("style") or ""
        if mode == "design":
            desc = ", ".join(x for x in (voice.get("voice_desc"), style) if x)
            text = f"({desc}){item['text']}" if desc else item["text"]
            kw = {}
        else:
            text = f"({style}){item['text']}" if style else item["text"]
            kw = {"reference_wav_path": ref}
        wav = model.generate(text=text, cfg_value=float(voice.get("cfg_value", 2.0)),
                             inference_timesteps=int(voice.get("inference_timesteps", 10)), **kw)
        return np.asarray(wav, dtype=np.float32).reshape(-1), sr, {"sent_text": text}

    torch.manual_seed(0)
    synth({"text": "This is a short warm-up sentence.", "style": ""})
    return synth


if __name__ == "__main__":
    raise SystemExit(run_job("voxcpm", load))
