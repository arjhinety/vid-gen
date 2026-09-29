"""Qwen3-TTS adapter (Apache-2.0 weights) on faster-qwen3-tts (MIT; CUDA-graph decoding, ~same sampling).
Runs inside py/tts/qwen3/.venv.

Voice params:
  model:      HF id, e.g. Qwen/Qwen3-TTS-12Hz-0.6B-Base | -1.7B-Base | -1.7B-CustomVoice | -1.7B-VoiceDesign
  mode:       clone (Base) | custom (CustomVoice) | design (VoiceDesign)
  clone:      ref_wav (synthetic/licensed only), ref_text (exact transcript, any language; ICL mode),
              xvec_only (speaker embedding only: no transcript, less prosody/accent bleed)
  custom:     speaker (Serena, Ono_Anna, Vivian, ...), instruct (1.7B only; 0.6B ignores it).
              A per-item `instruct` (job item field) overrides the voice-level one: per-line direction.
  design:     instruct (voice description)
  language:   default from item `lang` (en -> English, ja -> Japanese)
  temperature (0.9), top_k (50), top_p (1.0), repetition_penalty (1.05), max_new_tokens (2048)
Per item `seed` -> torch.manual_seed (Qwen3 has no seed argument). bf16 only (fp16 gives NaNs upstream).
Text is sent as-is (no front-end): send the normalised spoken form.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from _protocol import run_job  # noqa: E402

LANGS = {"en": "English", "ja": "Japanese", "zh": "Chinese", "ko": "Korean"}


def _abs(p: str) -> str:
    q = Path(p)
    return str(q if q.is_absolute() else _REPO / q)


def load(voice: dict[str, Any], device: str):
    import numpy as np
    import torch
    from faster_qwen3_tts import FasterQwen3TTS

    model = FasterQwen3TTS.from_pretrained(voice["model"], device=device, dtype=torch.bfloat16,
                                           attn_implementation="sdpa", max_seq_len=int(voice.get("max_seq_len", 2048)))
    mode = voice.get("mode", "clone")
    sampling = {k: voice[k] for k in ("temperature", "top_k", "top_p", "repetition_penalty", "max_new_tokens") if k in voice}

    ref_wav = _abs(voice["ref_wav"]) if mode == "clone" else None
    xvec = bool(voice.get("xvec_only", False))

    def generate(text: str, lang: str, instruct: str | None = None):
        language = voice.get("language") or LANGS.get(lang, "English")
        if mode == "clone":
            # faster-qwen3-tts caches the clone prompt (speaker embedding [+ ICL reference codes]) per reference.
            return model.generate_voice_clone(text=text, language=language, ref_audio=ref_wav,
                                              ref_text="" if xvec else voice["ref_text"], xvec_only=xvec, **sampling)
        if mode == "custom":
            return model.generate_custom_voice(text=text, speaker=voice["speaker"], language=language,
                                               instruct=instruct or voice.get("instruct"), **sampling)
        if mode == "design":
            return model.generate_voice_design(text=text, instruct=instruct or voice["instruct"], language=language, **sampling)
        raise ValueError(f"unknown mode {mode!r}")

    # Warm-up captures the CUDA graphs so item timings are steady-state.
    torch.manual_seed(0)
    generate("This is a short warm-up sentence." if voice.get("language", "en") != "Japanese" else "ウォームアップです。", "en")

    def synth(item: dict[str, Any]):
        torch.manual_seed(int(item.get("seed", voice.get("seed", 0))))
        wavs, sr = generate(item["text"], item.get("lang", "en"), item.get("instruct"))
        audio = np.concatenate([np.asarray(w, dtype=np.float32).reshape(-1) for w in wavs])
        return audio, int(sr)

    return synth


if __name__ == "__main__":
    raise SystemExit(run_job("qwen3", load))
