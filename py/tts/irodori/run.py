"""Irodori-TTS adapter (Japanese only). Runs inside third_party/irodori-tts/.venv.

Voice params (voices/<id>.yaml -> params):
  checkpoint:  HF repo id (default Aratako/Irodori-TTS-v4.1-Small)
  caption:     Japanese caption. Caption-only mode designs the voice (re-sampled per call, so the
               timbre drifts between chunks). With a reference, describe only style, not the voice.
  per_item_caption: true -> each job item may carry its own `caption` (style direction per line)
  ref_wav:     reference clip (synthetic/licensed only), or ref_wavs: [clip, ...] (multi-clip, up to 120 s)
  precision:   fp32 | bf16 (default bf16 to fit 6 GB comfortably)
  num_steps (40), cfg_scale_text (3), cfg_scale_caption (3), cfg_scale_speaker (5), duration_scale (1),
  truncation_factor, speaker_kv_scale, seed (per item `seed` wins)
  cache_ref_latent: true (default) encodes the reference once at load instead of on every call
               (saves ~2-4 s per call for an ~18 s reference; identical conditioning)

Text is sent as-is: Irodori has no number/Latin/G2P front-end, so the caller must send kana-normalised
text (see research/tts/benchmark.md). Output is 48 kHz and carries Irodori's SilentCipher watermark.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
# Irodori's pyproject has no build backend, so its package is not installed into
# its venv; import it from the pinned checkout instead.
sys.path.insert(0, str(_REPO / "third_party" / "irodori-tts"))
from _protocol import run_job  # noqa: E402

DEFAULT_CKPT = "Aratako/Irodori-TTS-v4.1-Small"


def _abs(p: str) -> str:
    q = Path(p)
    return str(q if q.is_absolute() else _REPO / q)


def load(voice: dict[str, Any], device: str):
    from irodori_tts.inference_runtime import (
        InferenceRuntime,
        RuntimeKey,
        SamplingRequest,
        download_hf_checkpoint,
        resolve_cfg_scales,
    )

    precision = voice.get("precision", "bf16")
    ckpt = download_hf_checkpoint(voice.get("checkpoint", DEFAULT_CKPT))
    runtime = InferenceRuntime.from_key(
        RuntimeKey(
            checkpoint=str(ckpt),
            model_device=device,
            codec_repo=voice.get("codec_repo", "Aratako/Semantic-DACVAE-Japanese-32dim"),
            model_precision=precision,
            codec_device=device,
            codec_precision=voice.get("codec_precision", "fp32"),
            codec_deterministic_encode=True,
            codec_deterministic_decode=True,
            compile_model=False,  # needs triton; unavailable on Windows
            compile_dynamic=False,
        )
    )
    caption = voice.get("caption") or None
    # per_item_caption: enable the caption condition even when the voice has no fixed caption, so each job item can
    # carry its own style caption (item["caption"]); used for per-line direction alongside a reference clip.
    per_item_caption = bool(voice.get("per_item_caption"))
    ref_wavs = [_abs(p) for p in (voice.get("ref_wavs") or ([voice["ref_wav"]] if voice.get("ref_wav") else []))]
    use_speaker = bool(runtime.model_cfg.use_speaker_condition_resolved and ref_wavs)
    cfg_text, cfg_caption, cfg_speaker, _ = resolve_cfg_scales(
        cfg_guidance_mode="independent",
        cfg_scale_text=float(voice.get("cfg_scale_text", 3.0)),
        cfg_scale_caption=float(voice.get("cfg_scale_caption", 3.0)),
        cfg_scale_speaker=float(voice.get("cfg_scale_speaker", 5.0)),
        cfg_scale=None,
        use_caption_condition=bool(runtime.model_cfg.use_caption_condition and (caption or per_item_caption)),
        use_speaker_condition=use_speaker,
    )

    ref_latents: list[str] = []
    if use_speaker and voice.get("cache_ref_latent", True):
        import hashlib
        import tempfile

        import torch
        from irodori_tts.inference_runtime import _load_audio

        cache_dir = Path(tempfile.gettempdir()) / "irodori-ref-latents"
        cache_dir.mkdir(exist_ok=True)
        for w in ref_wavs:
            key = hashlib.sha256(Path(w).read_bytes()).hexdigest()[:16]
            lat = cache_dir / f"{key}-{Path(ckpt).parent.name[:8]}.pt"
            if not lat.exists():
                wav, sr = _load_audio(w)
                with torch.no_grad():  # same call and loudness settings Irodori uses for ref_wav
                    piece = runtime.codec.encode_waveform(wav.unsqueeze(0), sample_rate=int(sr), normalize_db=-16.0,
                                                          ensure_max=True).cpu()
                torch.save(piece[0].float().contiguous(), lat)
            ref_latents.append(str(lat))

    def synth(item: dict[str, Any]):
        req = SamplingRequest(
            text=item["text"],
            caption=item.get("caption") or caption,
            ref_wav=ref_wavs[0] if use_speaker and not ref_latents and len(ref_wavs) == 1 else None,
            ref_wavs=ref_wavs if use_speaker and not ref_latents and len(ref_wavs) > 1 else None,
            ref_latent=ref_latents[0] if len(ref_latents) == 1 else None,
            ref_latents=ref_latents if len(ref_latents) > 1 else None,
            no_ref=not use_speaker,
            ref_normalize_db=-16.0,
            ref_ensure_max=True,
            num_candidates=1,
            decode_mode="sequential",
            seconds=item.get("seconds"),
            duration_scale=float(voice.get("duration_scale", 1.0)),
            num_steps=voice.get("num_steps"),
            cfg_scale_text=cfg_text,
            cfg_scale_caption=cfg_caption,
            cfg_scale_speaker=cfg_speaker,
            cfg_guidance_mode="independent",
            cfg_min_t=0.5,
            cfg_max_t=1.0,
            truncation_factor=voice.get("truncation_factor"),
            context_kv_cache=True,
            speaker_kv_scale=voice.get("speaker_kv_scale") if use_speaker else None,
            speaker_uncond_mode="mask",
            seed=int(item.get("seed", voice.get("seed", 0))),
            t_schedule_mode="linear",
            trim_tail=True,
        )
        result = runtime.synthesize(req, log_fn=None)
        audio = result.audio
        if hasattr(audio, "detach"):
            audio = audio.detach().float().cpu().numpy()
        info = {"seed": result.used_seed}
        if result.messages:
            info["messages"] = result.messages
        return audio, int(result.sample_rate), info

    return synth


if __name__ == "__main__":
    raise SystemExit(run_job("irodori", load))
