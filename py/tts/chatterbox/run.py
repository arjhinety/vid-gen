"""Chatterbox adapter (Resemble AI, MIT code + weights). Runs inside py/tts/chatterbox/.venv.

Voice params:
  variant:       turbo (EN, 350M) | multilingual (23 langs incl. ja) | english (original 0.5B)
  t3_model:      multilingual checkpoint: v3 (default) | v2
  ref_wav:       reference clip (synthetic/licensed only; > 5 s; first ~10 s are used)
  exaggeration:  0.5 (multilingual/english only; Turbo ignores it)
  cfg_weight:    0.5 (multilingual/english only). 0 = the README's fix for accent carry-over when the
                 reference language differs from the output language.
  temperature (0.8), repetition_penalty (1.2), min_p, top_p, top_k (turbo)
Language: item `lang` -> language_id (multilingual). Per item `seed` -> torch.manual_seed.
Outputs 24 kHz and always carry the PerTh watermark (upstream applies it unconditionally).
Text is sent as-is (only punctuation is normalised upstream): send the normalised spoken form.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _protocol import run_job  # noqa: E402


def _abs(p: str) -> str:
    q = Path(p)
    return str(q if q.is_absolute() else _REPO / q)


def load(voice: dict[str, Any], device: str):
    import torch

    variant = voice.get("variant", "turbo")
    if variant == "turbo":
        from chatterbox.tts_turbo import REPO_ID, ChatterboxTurboTTS
        from huggingface_hub import snapshot_download

        # Upstream from_pretrained also fetches the unused non-meanflow s3gen (~1 GB); fetch only what Turbo loads.
        ckpt = snapshot_download(REPO_ID, allow_patterns=["ve.safetensors", "t3_turbo_v1.safetensors", "s3gen_meanflow.safetensors",
                                                          "*.json", "*.txt", "*.model", "conds.pt"])
        model = ChatterboxTurboTTS.from_local(ckpt, device)
    elif variant == "multilingual":
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS

        model = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model=voice.get("t3_model", "v3"))
    elif variant == "english":
        from chatterbox.tts import ChatterboxTTS

        model = ChatterboxTTS.from_pretrained(device=device)
    else:
        raise ValueError(f"unknown variant {variant!r}")

    ex = float(voice.get("exaggeration", 0.5))
    if voice.get("ref_wav"):  # compute the speaker conditionals once, reuse for every chunk
        if variant == "turbo":
            model.prepare_conditionals(_abs(voice["ref_wav"]), exaggeration=0.0)
        else:
            model.prepare_conditionals(_abs(voice["ref_wav"]), exaggeration=ex)

    common = {k: voice[k] for k in ("temperature", "repetition_penalty", "min_p", "top_p") if k in voice}

    def synth(item: dict[str, Any]):
        torch.manual_seed(int(item.get("seed", voice.get("seed", 0))))
        with torch.inference_mode():
            if variant == "turbo":
                extra = {"top_k": voice["top_k"]} if "top_k" in voice else {}
                wav = model.generate(item["text"], **{k: v for k, v in common.items() if k != "min_p"}, **extra)
            elif variant == "multilingual":
                wav = model.generate(item["text"], language_id=item.get("lang", "en"), exaggeration=ex,
                                     cfg_weight=float(voice.get("cfg_weight", 0.5)), **common)
            else:
                wav = model.generate(item["text"], exaggeration=ex, cfg_weight=float(voice.get("cfg_weight", 0.5)), **common)
        return wav.squeeze(0).float().cpu().numpy(), int(model.sr)

    # Warm-up (kernel autotune / first-call allocations) so item timings are steady-state.
    synth({"text": "This is a short warm-up sentence for the benchmark.", "lang": "en", "seed": 0})
    return synth


if __name__ == "__main__":
    raise SystemExit(run_job("chatterbox", load))
