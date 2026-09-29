# Local TTS + alignment landscape for the research-video pipeline

*Research snapshot: 2026-09-28. Nothing below has been installed or run on the target machine. Every claim cites its source inline. **UNVERIFIED** marks claims that come from a single weak source, from inference, or that no primary source confirms. "s/s" means seconds of compute per second of audio (lower is faster, < 1 = faster than real time). Different projects define "RTF" in opposite directions, so all speeds here are normalised to s/s.*

**Target machine:** Windows 11, RTX 4050 Laptop (6 GB VRAM, Ada sm_89, bf16 OK, driver 595.97 = CUDA 12.8/13-capable), no CUDA toolkit/nvcc, 16 GB RAM, Python 3.12 + uv 0.12, ~35 GB free disk.

**Voice brief (as updated by the owner):**
- **Voice:** a female, youthful, anime-style timbre, with calm, clear, documentary delivery (not hyperactive).
- **Two language versions:** every video ships in **English** and **Japanese** (Japanese with English subtitles). Ideally both share **one voice identity**.
- **Owner's plan:**
  1. Design a synthetic voice with **Irodori-TTS** (Japanese only).
  2. Use Irodori for the Japanese narration.
  3. Clone that synthetic Irodori clip **cross-lingually** into English with another engine.
  4. Keep preset or designed voices (Qwen3 CustomVoice / VoiceDesign, Kokoro) as fallbacks.
- **Legal constraints:**
  - No cloning of real voice actors or anime/game characters.
  - No models whose weights or outputs are non-commercial.

---

## 0. Executive summary

**Benchmark set.** A–F are the core; G and H are stretch goals.

| # | Engine | Role in the plan | Why |
|---|---|---|---|
| A | **Irodori-TTS v4.1-Small** (0.8B, MIT) | Japanese narration + designs the master voice | Caption-based voice design, emoji style tags, reference cloning. About 5 GB peak in fp32, and fits comfortably in bf16 or int8. Japanese only, 30 s max per call, no text front-end. |
| B | **Qwen3-TTS 12Hz 1.7B-Base / 0.6B-Base** (Apache-2.0) | English cross-lingual clone of the Irodori clip | Only engine with a published ja→en cross-lingual cloning score: WER 3.04 for 1.7B-Base vs 4.20 for CosyVoice3 ([tech report](https://arxiv.org/html/2601.15621v1)). The same venv also gives CustomVoice presets (Serena / Ono_Anna / Vivian) and 1.7B VoiceDesign as fallbacks. It can also do the Japanese side (JA WER 3.8). |
| C | **Chatterbox Multilingual V3 + original + Turbo** (MIT/MIT) | English clone (alternative) | Documented cross-language accent mitigation (`cfg_weight=0`). One reference clip covers en and ja. Reusable conditionals. Always-on PerTh watermark. |
| D | **Fun-CosyVoice3-0.5B-2512** (Apache/Apache) | English clone (alternative) | Purpose-built `inference_cross_lingual` mode drops the prompt transcript and prompt speech tokens, so less Japanese prosody should leak. Painful and slow on Windows. |
| E | **GPT-SoVITS v2ProPlus** (MIT/MIT, pretraining data undisclosed) | English clone (anime-community option) | Zero-shot from a 3–10 s reference with `prompt_lang=ja` and `text_lang=en`. Fast. A Windows 7z package exists. |
| F | **Kokoro-82M** (Apache/Apache) | Preset English fallback (no cloning) | af_heart (A) and af_bella (A-) are good calm female voices. Tiny and fast, CPU-capable. Its **pronunciation lexicon** is the best way to force ML acronyms. |
| G | IndexTTS-2.5 (bilibili licence) | Stretch English/Japanese clone | Reports cross-lingual transfer and has Japanese. About 6 GB (edge). Custom licence. |
| H | VoxCPM2 (2B, Apache) | Stretch design + clone, EN + JA | Official figure about 8 GB, one third-party 5.5 GB peak. Has voice design. |

**Biggest risks.** Each is detailed in §10.
1. **Japanese accent leaking into English (unmeasured everywhere).**
   - No source measures accent or naturalness for a *Japanese reference cloned into English*.
   - Qwen3's 3.04 WER covers intelligibility only.
   - Mitigations to benchmark:
     - Qwen3 `x_vector_only_mode=True`.
     - Chatterbox `cfg_weight=0`.
     - CosyVoice cross-lingual mode.
     - **Bootstrapping:** generate many English takes from the Japanese clip, then pick the best English take as the English reference.
2. **6 GB VRAM is unmeasured for most candidates.**
   - Qwen3 1.7B is about 4.3 GB after load (L4), with the peak on 6 GB UNVERIFIED.
   - Chatterbox original: community reports of "6–7 GB".
   - IndexTTS-2.5: "roughly 6 GB".
   - VoxCPM2: about 8 GB official.
3. **Windows speed.**
   - The official Qwen3 package runs at about 4 s/s on a 4060-class card. The `faster-qwen3-tts` project gets 0.44–0.55 s/s.
   - CosyVoice3 on Windows reported **2.4–3.3 s/s on an RTX 4090**.
   - IndexTTS-2 reported 13 s/s on a 3060 under Windows.
4. **Text normalisation is on us.**
   - No candidate reliably reads SFT / DPO / F1 / 0.771 / 41.3% / JSON.
   - **Irodori has no G2P or number reading at all.** It also deletes U+2212 minus signs.
   - We need our own English and Japanese normaliser plus an ML lexicon (§9).
5. **Dependency pins are mutually incompatible.**

   | Engine | Pins |
   |---|---|
   | qwen-tts | `transformers==4.57.3` |
   | chatterbox-tts | `torch==2.6.0`, `transformers==5.2.0` |
   | CosyVoice | Python 3.10, `torch==2.3.1` |
   | Irodori | Python 3.10, `torch 2.10+cu128`, `transformers>=5.12` |
   | qwen-asr | `transformers==4.57.6` |

   So each engine needs **one venv, run as a subprocess**, and the models must never be co-resident on the GPU. The **~35 GB free disk is tight** for several torch builds plus about 25 GB of checkpoints (§5.0).
6. **Provenance and licences.**
   - Training-data provenance is undisclosed for Irodori and for GPT-SoVITS pretraining.
   - The SilentCipher *weights* licence is unstated.
   - IndexTTS-2.5 used some Emilia (CC-BY-NC) data.
   - Excluded outright:
     - AivisSpeech "Anneli" (trained on a voice actor without consent).
     - Genie-TTS game-character presets.
     - Higgs' bundled character clips.
     - The `Irodori-TTS-v4.1-Anime` community fine-tune (undisclosed "anime-style" data).
7. **Long-form drift.**
   - Qwen3 cadence and emotion drift between chunks ([Discussion #220](https://github.com/QwenLM/Qwen3-TTS/discussions/220)).
   - Qwen3 speed-up after about 100 characters ([#239](https://github.com/QwenLM/Qwen3-TTS/issues/239)).
   - Irodori's 30 s cap, with hallucination near it ([#13](https://github.com/Aratako/Irodori-TTS/issues/13)).
   - Chatterbox Turbo produces gibberish above about 300 characters ([#424](https://github.com/resemble-ai/chatterbox/issues/424)).
   - Plan on **sentence-level chunks**, a fixed reference or prompt, and per-chunk ASR QA.

**Alignment recommendation** (§7):
- **Forced-align the *spoken form* of the known script per TTS chunk.** Use **Qwen3-ForcedAligner-0.6B** (Apache-2.0, English + Japanese, ≤5 min per call). Fallbacks: torchaudio `forced_align` with the MIT `WAV2VEC2_ASR_BASE_960H` model for English, or MFA for Japanese.
- Map the aligned words back to display tokens (e.g. "41.3%") through a token map.
- Use faster-whisper transcription only for **QA** (the ASR round trip), not as the timing source.
- Sentence and subtitle timings come free from chunk boundaries.

---

## 1. Candidate table

Legend:
- **Preset?** Y = named speakers usable without cloning; D = text-described voice design; C = clone-only.
- **VRAM:** *meas* = a measured runtime figure; *ckpt* = checkpoint size; *claim* = vendor or blog figure.
- **Risk:** Windows install risk.

| Model | Params | Code lic | Weights lic | Preset? | Est. VRAM | Win risk | EN / JA | Notes |
|---|---|---|---|---|---|---|---|---|
| **Irodori-TTS v4.1-Small** ([HF](https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small)) | 0.77B | MIT | MIT (+ Ethical Restrictions) | D (caption) + emoji + clone | fp32 4.9–5.4 GB *meas* (4090); int8 3.2 GB *meas* ([fixit](https://fixit.co.jp/insights/irodori-tts/)) | Med | JA only | 30 s/call cap. No G2P. SilentCipher watermark. Python 3.10 by default. |
| **Qwen3-TTS 1.7B** Base / CustomVoice / VoiceDesign ([repo](https://github.com/QwenLM/Qwen3-TTS)) | ~2B incl. codec | Apache-2.0 | Apache-2.0 | Y (9 speakers) + D (VoiceDesign) + C | 3.83 GB bf16 *ckpt* + 0.68 GB codec; ~4.3 GB after load *meas* on L4 ([zenn](https://zenn.dev/kun432/scraps/102b890a0956a1)); 6 GB fit UNVERIFIED | Med | EN + JA + 8 more | flash-attn optional (use `sdpa`). Official package slow on Windows. `faster-qwen3-tts` gives ~8× speed. |
| **Qwen3-TTS 0.6B** Base / CustomVoice | ~0.9B | Apache-2.0 | Apache-2.0 | Y (no instruct) + C | 1.81 GB *ckpt*; ~2.5 GB est. | Med | EN + JA | **No VoiceDesign at 0.6B; `instruct` silently dropped.** JA WER 6.4 vs 3.8 (1.7B) |
| **Chatterbox** (original) ([repo](https://github.com/resemble-ai/chatterbox)) | 0.5B | MIT | MIT | 1 default voice (undocumented origin) + C | "6–7 GB" community *claim* ([#44](https://github.com/resemble-ai/chatterbox/issues/44)) | Med | EN | `exaggeration` and `cfg_weight`. ~40 s max per call. PerTh watermark always on. |
| **Chatterbox Multilingual V3** | 0.5B | MIT | MIT | default + C | ≈ original (UNVERIFIED) | Med | 23 langs incl. JA | One reference for EN and JA via `language_id`. `cfg_weight=0` for cross-language. V3 may need a git install. |
| **Chatterbox-Turbo / Nano** | 350M / 110M | MIT | MIT | default + C | "lower" (Turbo, UNVERIFIED); Nano CPU 3× realtime *claim* | Low–Med | EN | Paralinguistic tags. **No `cfg_weight`**, so no accent knob. Turbo ≤300 chars/call. |
| **Kokoro-82M** ([HF](https://huggingface.co/hexgrad/Kokoro-82M)) / kokoro-onnx | 82M | Apache-2.0 / MIT (onnx) | Apache-2.0 | Y (54 voices) | < 1 GB; CPU fine | Low (EN), Med (JA) | EN A-grade; JA C-grade | No cloning. **Lexicon and inline IPA overrides.** Dormant since Apr 2025. |
| **Fun-CosyVoice3-0.5B-2512** ([HF](https://huggingface.co/FunAudioLLM/Fun-CosyVoice3-0.5B-2512)) | 0.5B | Apache-2.0 | Apache-2.0 | C only (+ instruct) | ~2.5 GB *meas* on GTX 1650 ([blog](https://doupoa.site/archives/912/cosyvoice-3-deployed-on-windows)) | **High** | EN + JA (kana input) | Python 3.10, torch 2.3.1. CPU onnxruntime on Windows. 2.4–3.3 s/s on a 4090 under Windows ([#1927](https://github.com/QwenAudio/CosyVoice/issues/1927)). |
| **GPT-SoVITS v2ProPlus** ([repo](https://github.com/RVC-Boss/GPT-SoVITS)) | ~230M | MIT | MIT (data undisclosed) | C (3–10 s ref) | 4–6 GB guide *claim* (UNVERIFIED) | Med (7z pkg: Low) | EN + JA + ZH + KO + Yue | 0.028 s/s on a 4060 Ti (README). API server on port 9880. |
| **IndexTTS-2.5** ([HF](https://huggingface.co/IndexTeam/IndexTTS-2.5)) | ~0.8B | bilibili Model Use License | same | C only | "roughly 6 GB" *claim*; fp32 9.7 GB *meas* ([#2374](https://github.com/debpalash/VoiceStudio/issues/2374)) | Med–High | EN, ZH, **JA**, ES, AR | Python <3.12. Commercial use OK below 100M MAU / RMB 1B revenue. Emilia provenance caveat. |
| **VoxCPM2** ([HF](https://huggingface.co/openbmb/VoxCPM2)) | 2B | Apache-2.0 | Apache-2.0 | D ("(desc)text") + C | ~8 GB official; 5.5 GB peak third-party | Med | 30 langs incl. JA | Varies between runs. No prompt-cache API documented. |
| **Style-Bert-VITS2** JP-Extra / RikkaBotan ([repo](https://github.com/litagin02/Style-Bert-VITS2)) | small (VITS-class; not stated) | AGPL-3.0 + LGPL | Base AGPL; voices CC BY-SA or per-voice terms | Y (JVNV, Amitaro, RikkaBotan) | small; CPU OK | Low (bat installer) | JA (JP-Extra); RikkaBotan EN + JA | Fallback JA engine, and a consented EN + JA single-speaker voice ([RikkaBotan EN](https://huggingface.co/RikkaBotan/style_bert_vits2_english_original)). |
| **AivisSpeech** (official Mao / Kohaku) / **VOICEVOX** | small | LGPL / engine terms | ACML 1.0 / per-character terms | Y | small; CPU OK | Low (apps) | JA only | Credit "VOICEVOX:名前" is required for VOICEVOX. Avoid community Aivis models. |
| **Pocket TTS** (Kyutai) ([HF](https://huggingface.co/kyutai/pocket-tts)) | 100M | MIT | CC-BY-4.0 (gated) | Y (21 EN) + C | CPU (~6× realtime on M4) | Low | EN only | Some presets come from CC-BY-NC datasets (Expresso/EARS); check each one. |
| **Kitten TTS** v0.8 ([repo](https://github.com/KittenML/KittenTTS)) | 15/40/80M | Apache-2.0 | Apache-2.0 | Y (8) | CPU | Low | EN only | Built-in number normaliser. Preview-quality fallback. |
| **Supertonic 3** ([HF](https://huggingface.co/Supertone/supertonic-3)) | ~99M | MIT | OpenRAIL-M | Y (F1–F5, M1–M5) | CPU/ONNX | Low | 31 langs incl. JA | **Repo archived 2026-09-09.** No cloning. |
| **MOSS-TTS-Nano** ([repo](https://github.com/OpenMOSS/MOSS-TTS-Nano)) | 0.1B | Apache-2.0 | Apache-2.0 | C | CPU realtime | Low–Med | 20 langs incl. JA | Secondary cloning option. Cross-lingual behaviour undocumented. |
| **NVIDIA Magpie-TTS Multilingual 357M** ([HF](https://huggingface.co/nvidia/magpie_tts_multilingual_357m)) | 357M | NeMo Apache | NVIDIA Open Model License | Y (5; Aria and Sofia female) | small | **High** (NeMo = Linux/WSL2) | EN + JA (CER 1.4%) | English→katakana code-switching built in. Cloning removed. |

**Dropped** (one line each):
- **F5-TTS / E2-TTS**: weights CC-BY-NC-4.0, and the maintainer says they are non-commercial even after fine-tuning ([#997](https://github.com/SWivid/F5-TTS/discussions/997)).
- **Spark-TTS 0.5B**: weights CC BY-NC-SA 4.0. Its gender/pitch voice-creation mode is otherwise attractive.
- **Zonos v0.1 / ZONOS2**: Linux-only (the Windows fork needs VS2022 + CUDA toolkit). ZONOS2 is an 8B MoE.
- **Dia / Dia2**: English-only dialogue model with a random voice per generation; no stable narrator.
- **Sesame CSM-1B**: gated, needs gated Llama-3.2-1B and triton-windows; random voices; English.
- **Orpheus 3B**: Llama-3.2-derived terms; vLLM is Linux-only; no Japanese; the smaller sizes were never released.
- **OuteTTS 1.0**: the 1B model is CC-BY-NC-SA. The project is stale (0.4.4, May 2025), and its docs say it **keeps the reference's accent** across languages.
- **NeuTTS Air / Nano / 2E**: no Japanese. Nano and 2E use the NeuTTS Open License, which limits outputs to companies under $5M revenue.
- **VibeVoice**: the TTS code was pulled in September 2025. Realtime-0.5B cannot clone, and the card says it embeds an audible AI disclaimer. The model card says research purposes only.
- **Higgs Audio v2 / v3**: 24 GB / 16 GB VRAM. v3 is non-commercial apart from a creator grant.
- **MOSS-TTS 8B / MOSS-TTSD**: 8B, far over the VRAM budget.
- **Fish S2 Pro / OpenAudio S1-mini**: the Fish Research License requires a separate licence for commercial *outputs*. S1-mini is CC-BY-NC-SA.
- **Breeze TTS 2** (top of the Artificial Analysis open leaderboard): outputs non-commercial; 12 GB.
- **Voxtral TTS**: CC BY-NC; 16 GB; no Japanese.
- **Step-Audio-EditX**: 12 GB.
- **Maya1**: 16 GB.
- **Kyutai TTS 1.6B**: English and French only.
- **OmniVoice**: CC-BY-NC.
- **AuK (Tencent)**: needs the Qwen2.5-Omni-3B encoder; VRAM unknown.
- **Kani-TTS-2**: English and Portuguese only; `lfm1.0` licence per the HF card.
- **StyleTTS2**: superseded by Kokoro and Kitten. Its pretrained weights require telling listeners the speech is synthesised.
- **Piper**: GPL-3.0; per-voice licences vary, some NC. No official ja_JP voice.
- **Soprano 80M**: single English voice; no pronunciation control.
- **MeloTTS**: tested on Python 3.9 only; Docker suggested on Windows; MeCab/tokenizers builds fail on Python 3.12.
- **Parler-TTS**: stale (Aug 2024); English only; its audiobook-style data is unlikely to give anime timbre.
- **XTTS-v2**: CPML non-commercial, and Coqui has shut down, so no commercial licence is available.
- **Bert-VITS2**: unmaintained; AGPL.
- **Genie-TTS**: its bundled presets are game characters.
- **Chatterbox-Flash**: English only, ships no default voice; worth a later look for speed.
- **Dramabox**: 3.3B, LTX-2 licence.

Sources for the dropped list: the group reports cited in §4 and the [Artificial Analysis open-weights leaderboard](https://artificialanalysis.ai/text-to-speech/leaderboard/open-weights).

---

## 2. Voice identity plan: female anime-style narrator, legally clean

### 2.1 Which preset or designable voices plausibly fit

| Engine | Plausible voices for "youthful anime-style female, calm" | Evidence / caveat |
|---|---|---|
| Irodori v4.1-Small | Caption design (see §3.6 for Japanese captions) | Official example: 「若く元気な女性の声…少し高めのトーン」. Whether 「アニメ風」 is understood is UNVERIFIED. |
| Qwen3-TTS 1.7B CustomVoice | **Serena** ("Warm, gentle young female", Chinese-native), **Ono_Anna** ("Playful Japanese female… light, nimble timbre", Japanese-native), **Vivian** ("Bright, slightly edgy young female", Chinese-native). Add `instruct` to calm them down. | README; **no English-native female speaker exists**. Users report a "too strong a Chinese accent" in English ([ocdevel](https://ocdevel.com/blog/20260302-qwen-tts-voice-cloning)). Ono_Anna's English is UNVERIFIED. |
| Qwen3-TTS 0.6B CustomVoice | Same speakers, but **no `instruct`**. The code sets `instruct=None` for the 0.6B model. | [qwen3_tts_model.py](https://raw.githubusercontent.com/QwenLM/Qwen3-TTS/main/qwen_tts/inference/qwen3_tts_model.py) |
| Qwen3-TTS 1.7B VoiceDesign | Text-described voice. Example prompt (ours): *"Young adult female voice, early twenties, light, clear and slightly high-pitched with a soft anime-heroine timbre, but calm and composed; unhurried, even pace; gentle warmth; precise articulation; suited to narrating a science documentary."* | VoiceDesign is 1.7B only. English and Chinese instructions work better than Japanese ([zenn](https://zenn.dev/kun432/scraps/102b890a0956a1)). |
| Kokoro | **af_heart** (A), **af_bella** (A-, 10–100 h of training data), **af_nicole** (B-, soft/ASMR), bf_emma (B-). Blends such as `'af_heart,jf_alpha'`. | [VOICES.md](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md). jf_* voices *can* be driven by the English G2P (`lang_code='a'` + `voice='jf_alpha'`; Kokoro only logs a mismatch warning), but the quality is unknown and likely accented or unstable. jf_* are C+/C/C- grade and trained on 1–10 h or less. |
| Chatterbox | Default voice ("a default female voice with an American english accent", [third-party](https://mybyways.com/blog/chatterbox-turbo-tts-with-mlx-audio/)); otherwise clone. | Origin of the default voice is undocumented. |
| CosyVoice3 / IndexTTS-2.5 / GPT-SoVITS | Clone only | Use the synthetic reference. |
| VoxCPM2 | `"(A young woman, gentle and sweet voice)Hello…"` prefix design | Anime quality claimed by third parties (UNVERIFIED). |
| Pocket TTS / Kitten / Supertonic | Female presets (Pocket: alba, anna, eve, jane, mary, vera…; Kitten: Bella, Luna, Rosie, Kiki; Supertonic F1–F5) | No descriptions. None is anime-style; audition only. |
| RikkaBotan (Style-Bert-VITS2) | "Childish, gentle" young female, **same speaker in English and Japanese** (JP "cool version suitable for reading explanatory text") | CC BY-SA 4.0, trained on the researcher's own voice ([card](https://huggingface.co/RikkaBotan/style_bert_vits2_english_original/blob/main/README.md)) |
| VOICEVOX / AivisSpeech | Many anime-style Japanese characters; Aivis official **Kohaku** (narration) / **Mao** | Japanese only. Per-voice terms apply (§2.3). |

### 2.2 Legally clean route for clone-only engines

1. **Design** the master voice synthetically in Irodori-TTS v4.1-Small, caption only (`--no-ref`). Alternative: design in Qwen3 1.7B VoiceDesign.
   - **Never** put real people's or characters' names in captions.
   - The Irodori card warns designed voices "may coincidentally resemble real people", so spot-check the result.
2. **Pick and freeze a reference clip.** Choose a take with good CER and a calm style. Master it:
   - trim silence
   - normalise to about −16 LUFS and −1 dBFS peak
   - export as 48 kHz 16-bit PCM
   - make one **8–15 s single clip** and one **~30 s multi-clip set** (for Irodori's own `--ref-wavs`)

   Store it with its exact Japanese transcript, the seed, the caption and the checkpoint hash.
3. **Japanese narration** is Irodori with `--ref-wav master.wav`, plus an optional style-only caption. Do not use caption-only generation per chunk; the voice would be re-sampled every call.
4. **English narration** is the cross-lingual clone of `master.wav` (engines B–E, G–H).
   - Optional **bootstrap step**: generate 10–20 English takes from the Japanese reference and score them (WER, speaker similarity to the master, listening). Freeze the best 8–15 s English take as `master_en.wav`, then clone all English chunks from it. This came from the GPT-SoVITS research, applies to all cloners, and is UNVERIFIED as a gain.
5. Log provenance per video: engine, checkpoint, seed and reference hash.

**Terms that attach to generated audio.** The Irodori clip is MIT plus Ethical Restrictions. The English output then also carries the cloner's terms.

| Engine producing the audio | Terms on outputs |
|---|---|
| Irodori | MIT. Ethical Restrictions: no cloning or impersonation without consent, no deepfakes or misleading speech. The maintainer confirmed commercial use and monetised video are OK ([#32](https://github.com/Aratako/Irodori-TTS/issues/32)). No AI-disclosure requirement. |
| Qwen3-TTS | Apache-2.0, no output clauses. (Alibaba's *API* guide says to describe voice qualities rather than imitate individuals; follow it anyway.) |
| Chatterbox | MIT, no output clauses. PerTh watermark is embedded; removing it is not prohibited by the licence, but we recommend keeping it. |
| CosyVoice3 / VoxCPM2 / Kokoro | Apache-2.0, none. (Kokoro: crediting the CC BY Koniwa data if jf_gongitsune / jf_nezumi / jf_tebukuro are used is prudent.) |
| GPT-SoVITS | MIT, plus a WebUI disclaimer: users are "solely responsible" for exported audio. An AI-disclosure "user agreement" was not found (UNVERIFIED). |
| IndexTTS-2.5 | bilibili licence: prohibited-use list; commercial use OK below 100M MAU / RMB 1B; must not be used to improve other AI models except non-commercial ones ([LICENSE](https://raw.githubusercontent.com/index-tts/index-tts/main/LICENSE)). |
| VOICEVOX | Credit required, e.g. "VOICEVOX:ずんだもん"; per-character terms ([zunko terms](https://zunko.jp/con_ongen_kiyaku.html)). |
| AivisSpeech official | ACML 1.0: commercial OK, credit optional, no impersonation, no political/religious propaganda ([ACML](https://raw.githubusercontent.com/Aivis-Project/ACML/master/ACML-1.0.md)). |
| Style-Bert-VITS2 defaults | JVNV voices CC BY-SA 4.0. Amitaro voices need a credit line and have content restrictions ([TERMS](https://raw.githubusercontent.com/litagin02/Style-Bert-VITS2/master/docs/TERMS_OF_USE.md)). |

YouTube's own synthetic-content disclosure rules are outside this research. Check the current policy before publishing (UNVERIFIED).

### 2.3 Explicit exclusions

- **No cloning or fine-tuning on real voice actors or anime/game characters.** This includes "anime" community datasets built from ripped game or anime audio.
- **AivisSpeech "Anneli"**, the former default voice, was trained on a voice actor's visual-novel audio without consent. Its creator admitted it and deleted the model on 2025-09-08 ([ASCII](https://ascii.jp/elem/000/004/318/4318182/)). Do not use anything built from it.
- **Genie-TTS** presets are Blue Archive, Reverse:1999 and Wuthering Waves characters ([repo](https://github.com/High-Logic/Genie-TTS)).
- **Higgs Audio** bundled clips (`bigbang_amy`, `shrek_fiona`, …) are copyrighted characters.
- **`phasefield-audio/Irodori-TTS-v4.1-Anime`**: a fine-tune on "anime-style speech data" of undisclosed source ([HF](https://huggingface.co/phasefield-audio/Irodori-TTS-v4.1-Anime)). Treat it as excluded unless its provenance is documented.
- **Pocket TTS** presets derived from Expresso or EARS (CC-BY-NC).
- **RVC as a timbre post-process** is legally plausible *only* with a model trained exclusively on our own Irodori outputs. Irodori's licence does not forbid training on its outputs. RVC changes timbre, not accent, so it cannot fix Japanese-accented English ([RVC README](https://raw.githubusercontent.com/RVC-Project/Retrieval-based-Voice-Conversion-WebUI/main/README.md)). Keep it as a last resort.

### 2.4 Watermarks in the chain

| Engine | Watermark | Can it be turned off? |
|---|---|---|
| Irodori | SilentCipher, payload "IRDTS", always applied ([watermark.py](https://github.com/Aratako/Irodori-TTS/blob/main/irodori_tts/watermark.py)) | No flag. It silently skips if the import fails. |
| Chatterbox (all) | PerTh, always applied | No flag. Source edit only. |
| NeuTTS | PerTh | — |
| VibeVoice | Audible disclaimer plus watermark | — |

Whether the Irodori watermark survives into the cloned English audio is UNVERIFIED; it likely does not, because the cloners regenerate the waveform. Either way it does not block the plan.

---

## 3. Irodori-TTS (Japanese engine and master-voice designer)

### 3.1 What it is
- **Architecture:** a rectified-flow diffusion transformer (RF-DiT) over continuous DACVAE latents; design follows Echo-TTS ([README](https://github.com/Aratako/Irodori-TTS)).
- **v4 / v4.1-Small components:**
  - shared ModernBERT-ja text and caption encoder
  - reference-latent encoder, up to 120 s of reference
  - joint-attention DiT
  - integrated duration predictor
  - codec `Aratako/Semantic-DACVAE-Japanese-32dim` at 48 kHz
- **Size:** ~766M parameters ([v4-Small card](https://huggingface.co/Aratako/Irodori-TTS-v4-Small)); the v4.1 `model.safetensors` is 3.06 GB in F32.
- **Language:** **Japanese only.** "This model currently supports Japanese text input only" ([card](https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small)). English is not on the roadmap ([#21](https://github.com/Aratako/Irodori-TTS/issues/21)).
- **Checkpoints:**

  | Checkpoint | Notes |
  |---|---|
  | `Aratako/Irodori-TTS-v4.1-Small` | **Recommended.** Text + reference + caption in one model. |
  | `…-v4.1-Small-MF` | MeanFlow, 4 steps; runtime CFG ignored. |
  | `…-v4.1-Small-Quantized/{int8-weight-only,int8-dynamic,int4-weight-only,float8-weight-only,float8-dynamic}` | 813–906 MiB. FP8 needs sm_89; the 4050 is sm_89. ([HF](https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small-Quantized)) |
  | `Aratako/Irodori-TTS-v4-Large` | 3.29B, **Gemma Terms of Use** (not MIT); too big anyway. |
  | Legacy | `Irodori-TTS-600M-v3-VoiceDesign`, `-500M-v3`, `-500M-v2-VoiceDesign` |

- **Training data:** an undisclosed "expanded, high-quality Japanese speech dataset". Captions and emoji labels were generated by Qwen3-Omni and rephrased by Qwen3.5. **Provenance is undisclosed; treat it as a residual risk.**

### 3.2 Licences
- **Code:** MIT ([LICENSE](https://github.com/Aratako/Irodori-TTS/blob/main/LICENSE)).
- **Weights:** v4.1-Small, MF, Quantized and 500M/600M are MIT. v4-Large uses the Gemma ToU.
- **Text encoder:** `sbintuitions/modernbert-ja-310m`, MIT.
- **Codec:** `Semantic-DACVAE-Japanese-32dim` is MIT, derived from Meta `facebook/dacvae-watermarked`. That card is tagged Apache-2.0 but its README text says "SAM License", which is inconsistent. Irodori disables DACVAE's AudioSeal watermark (`decoder.alpha = 0.0`, [codec.py](https://github.com/Aratako/Irodori-TTS/blob/main/irodori_tts/codec.py)).
- **SilentCipher:**
  - Code is MIT ([sony/silentcipher LICENSE](https://github.com/sony/silentcipher/blob/master/LICENSE)). The installed fork is SesameAILabs', MIT, pinned to a commit.
  - The **`Sony/SilentCipher` HF weights carry no licence**, and three clarification issues are unanswered ([#9](https://github.com/sony/silentcipher/issues/9)). Licence **UNVERIFIED**; there is no evidence it is NC.
  - Irodori applies it automatically and has no disable flag. PR #38 proposed `--no-watermark` and was closed unmerged.
- **Usage terms:** the Ethical Restrictions in §2.2. The maintainer confirmed commercial and monetised use; watermark removal is "not recommended" but not prohibited ([#32](https://github.com/Aratako/Irodori-TTS/issues/32)).

### 3.3 Windows install (see recipe R1 in §5)
- **Python:** `requires-python >=3.10`, but `.python-version` = `3.10`, so uv fetches a managed 3.10 unless told otherwise (3.12 is untested).
- **Pins:**
  - `torch 2.10.0+cu128`, `torchaudio >=2.10,<2.11`, `torchcodec >=0.10,<0.11`, `torchao >=0.16,<0.17`
  - `transformers>=5.12.1,<6`, `sentencepiece<0.2`
  - `dacvae` and `silentcipher` installed from git, **so Git is required**
  - `gradio`, `peft`, `datasets`, `wandb`, `numba`
- **Not needed:** flash-attn (FA3 optional, falls back to SDPA — [parameters.md](https://github.com/Aratako/Irodori-TTS/blob/main/docs/parameters.md)), triton, pyopenjtalk, MeCab, sox. The CUDA runtime comes from the wheels, so nvcc is not needed.
- **Pitfalls:**
  - uv may pull CPU torch. Fix: `uv sync --extra cu128 --reinstall-package torch --reinstall-package torchaudio` ([Qiita](https://qiita.com/gatuwo_jp/items/5e7e7bc1125c3a70762a)).
  - torchcodec needs FFmpeg "full-shared" DLLs on Windows. This breaks only training data prep ([#40](https://github.com/Aratako/Irodori-TTS/issues/40)); inference falls back to soundfile.
  - Output WAVs don't play in the new Windows Media Player ([#33](https://github.com/Aratako/Irodori-TTS/issues/33)); re-export as PCM16.
  - `0xC0000005` crash when RAM is exhausted during the 3 GB mmap load; close other model processes first.
  - PowerShell mangles Japanese arguments in `-ArgumentList` arrays, and `.ps1` files must be UTF-8 with BOM ([mosfet](https://mosfet.hatenablog.com/entry/2026/09/10/222733)). **Prefer passing text via a UTF-8 file or the Python API.**
  - `--compile-model` needs triton, which is not available on Windows cu128. Don't use it.

### 3.4 VRAM and speed evidence
| Setup | Figure | Type | Source |
|---|---|---|---|
| RTX 4090, fp32 | 4913 MiB in use | meas (after run) | [zenn](https://zenn.dev/kun432/scraps/12f2b10a9d5e3e) |
| RTX 4090, fp32, 40 steps | 5.4 GB peak; 7.8 s of audio in 1.07 s (0.137 s/s) | meas peak | [fixit](https://fixit.co.jp/insights/irodori-tts/) |
| RTX 4090, int8 | 3.2 GB; 1.36 s | meas | same |
| RTX 3080 Windows, bf16 | 2884 MiB steady (5457 MiB during compile setup) | meas | [note/rosso](https://note.com/rosso_blog/n/n3eaee67d2c70) |
| CPU (Ryzen AI 5 340, older 500M) | ~10 s of audio in 143 s | meas | [note/asagi](https://note.com/asagi_ai_lab/n/nc4b439f7cb2a) |
| SilentCipher step | ~0.9 GB peak, ~half of request latency (ROCm) | meas | PR #38 |

- **6 GB verdict:** fp32 is borderline once the Windows display is counted. Use **`--model-precision bf16`** or the **int8-weight-only** checkpoint. `--codec-device cpu` saves more.
- **Estimated speed on the 4050:** ~0.5–1.0 s/s at 40 steps (UNVERIFIED extrapolation). `--num-steps 16` with `--t-schedule-mode sway` trades quality for speed.
- **MF at 4 steps** keeps speaker similarity (0.74 vs 0.75); plain RF at 4 steps collapses it (0.38).

### 3.5 Usage (verbatim from the [README](https://github.com/Aratako/Irodori-TTS))
```bash
# (a) caption voice design
uv run --no-sync python infer.py \
  --hf-checkpoint Aratako/Irodori-TTS-v4.1-Small \
  --text "こんにちは、私はAIです。これは音声合成のテストです。" \
  --caption "落ち着いた、近い距離感の女性話者" \
  --no-ref \
  --output-wav outputs/sample_voice_design.wav

# (b) reference cloning
uv run --no-sync python infer.py \
  --hf-checkpoint Aratako/Irodori-TTS-v4.1-Small \
  --text "こんにちは、私はAIです。これは音声合成のテストです。" \
  --ref-wav path/to/reference.wav \
  --output-wav outputs/sample.wav
```

**Key flags** ([parameters.md](https://github.com/Aratako/Irodori-TTS/blob/main/docs/parameters.md)):

| Flag | Default / meaning |
|---|---|
| `--num-steps` | 40 (RF) / 4 (MF) |
| `--cfg-scale-text` / `--cfg-scale-caption` / `--cfg-scale-speaker` | 3.0 / 3.0 / 5.0 |
| `--seed` | random if unset |
| `--seconds` | clamped to ≤30 |
| `--duration-scale` | 1.0 (pace) |
| `--truncation-factor` | 0.8–0.9 reduces variation |
| `--speaker-kv-scale` | strengthens identity |
| `--num-candidates` | takes per call |
| `--model-precision` / `--codec-precision` | `fp32` or `bf16` |
| `--ref-wavs a.wav b.wav …` | multi-clip reference |
| `--ref-latent` | cached reference; "fastest path when the same speaker reference is reused" |
| `--max-ref-seconds` | 120 |

**Other entry points:**
- Gradio apps: `gradio_app.py` (clone), `gradio_app_voicedesign.py` (caption + emoji palette).
- Python API (from reading `infer.py`; UNVERIFIED): `InferenceRuntime.from_key(RuntimeKey(...)).synthesize(SamplingRequest(text=..., caption=..., no_ref=True, seed=...))`. Load the model once per process.

### 3.6 Writing captions for voice design
- **Official style:** 1–2 natural Japanese sentences covering age and gender, pitch and timbre, manner or situation, and sometimes recording quality.
  - Official examples: 「若く元気な女性の声。カフェの店員のように、明るくハキハキとした少し高めのトーンで話している。」 and 「落ち着いた、近い距離感の女性話者」.
  - **With a reference clip, the caption should describe only emotion, style or environment**; conflicting descriptions destabilise output ([card](https://huggingface.co/Aratako/Irodori-TTS-v4-Small)).
- **Proposals (untested)** for the master voice:
  1. 落ち着いた若い女性の声。アニメのキャラクターのような透明感のある少し高めの声で、はっきりとした発音で穏やかにナレーションしている。クリアな音質。
  2. 二十歳前後の女性が、落ち着いた優しいトーンで、丁寧にゆっくりと解説している。澄んだ明るい声で、感情の起伏は控えめ。ノイズのないクリアな音質。
  3. 若い女性の声優が、ドキュメンタリーのナレーションのように、落ち着いて聞き取りやすい声で淡々と読み上げている。やや高めで柔らかい声質、クリアな音質。
  4. 穏やかで知的な雰囲気の若い女性。講義で説明するように、滑舌よくはっきりと、落ち着いたペースで話している。息づかいは控えめで、クリアな音質。
  5. Style-only, for use with the reference: 落ち着いたトーンで、はっきりと丁寧にナレーションしている。
- **Known bug ([#41](https://github.com/Aratako/Irodori-TTS/issues/41), open):** *narration text* that itself reads like a caption (e.g. 「落ち着いた口調で話している。」) collapses v4/v4.1 into silence or gibberish. Add a subject or change punctuation.

### 3.7 Emoji style tags
- There are 45 tags ([EMOJI_ANNOTATIONS.md](https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small/blob/main/EMOJI_ANNOTATIONS.md)); repeating a tag strengthens it.
- **For calm narration, use sparingly:** ⏸️ pause, 🫶 gently, 🐢 slowly, 😌 relieved.
- **Avoid:** 😮‍💨 breath, 🌬️ heavy breathing, 👂 whisper, 📢 reverb, 📞 phone effect.
- 📖 (narration) is last in the list and low-frequency in training, so it is probably weak ([#35](https://github.com/Aratako/Irodori-TTS/issues/35)).
- Tags shift durations by about 0.8–1.0 s ([mosfet](https://mosfet.hatenablog.com/entry/2026/09/10/222733)); account for that in timing.

### 3.8 Length, chunking, consistency
- **Hard limits:** **30 s of audio per call** (`max_seconds = 30.0`, [inference_runtime.py](https://github.com/Aratako/Irodori-TTS/blob/main/irodori_tts/inference_runtime.py)) and a 256-token text cap (longer is truncated).
- **Near the cap:** training clips are all ≤30 s, so outputs near 30 s hallucinate. Chunk at punctuation ([#13](https://github.com/Aratako/Irodori-TTS/issues/13)).
- **Chunk size:** practitioners use about **≤70 characters (~13 s)** per chunk, with about 150 characters as the ceiling. No long-text mode has been merged (PR #26).
- **Consistency:** a fixed seed only reproduces identical inputs. **Always clone from the frozen master reference**, ideally a 30 s `--ref-wavs` set: speaker similarity is 0.661 with 1 clip and 0.752 with about 30 s.
- **Reuse:** `--ref-latent` caches the reference. Speaker Inversion (`--ref-embed`) learns a reusable embedding.

### 3.9 Text front-end: acronyms and numbers
- `normalize_text` does the following ([text_normalization.py](https://github.com/Aratako/Irodori-TTS/blob/main/irodori_tts/text_normalization.py)):
  - NFKC normalisation (full-width to half-width)
  - `？！` → `?!`, `～` → `ー`
  - **deletes U+2010–2015 and U+2212 (minus)**
  - strips `;`, ①–⑥ and outer brackets
- **No number, English or G2P handling.** Raw text goes to the ModernBERT-ja Unigram tokenizer. As tokenised by the Irodori researcher (not re-run here):
  - "SFT" → `S|FT`
  - "0.771" → `0|.|7|7|1`
  - "41.3%" → `4|1|.|3|%`

  Readings are left to chance.
- **Mandatory pre-normalisation to kana** (see §9 for the full lexicon):

  | Input | Kana | Note |
  |---|---|---|
  | SFT | エスエフティー | |
  | DPO | ディーピーオー | |
  | F1 | エフワン | |
  | JSON | ジェイソン | |
  | 0.771 | れいてんなななないち | digits after the point are read one by one: れい・てん・なな・なな・いち |
  | 41.3% | よんじゅういってんさんパーセント | |

- **Never emit "−"** (it is deleted). Write マイナス.
- Consider hiragana for specialist kanji: the v4.1 card still reports misreadings of specialist terms.

### 3.10 Known issues
| Issue | Status | Problem |
|---|---|---|
| [#41](https://github.com/Aratako/Irodori-TTS/issues/41) | open | caption-like narration text collapses output |
| [#13](https://github.com/Aratako/Irodori-TTS/issues/13) | — | hallucination, repetition and noise near 30 s |
| [#9](https://github.com/Aratako/Irodori-TTS/issues/9) | open | output pitch higher than the reference (mostly low male voices) |
| [#35](https://github.com/Aratako/Irodori-TTS/issues/35) | — | 🤐 produces laughter |
| [#40](https://github.com/Aratako/Irodori-TTS/issues/40) | — | torchcodec / FFmpeg DLLs |
| [#33](https://github.com/Aratako/Irodori-TTS/issues/33) | — | WAV playback in the new Windows Media Player |
| — | — | outputs often peak at 1.0: check clipping and re-normalise |

---

## 4. Per-candidate details (English cloners, fallbacks, Japanese alternatives)

### 4.1 Qwen3-TTS (Alibaba, 2026-01-22)

**Repos** ([collection](https://huggingface.co/collections/Qwen/qwen3-tts)):
- `Qwen/Qwen3-TTS-12Hz-1.7B-{CustomVoice,VoiceDesign,Base}`
- `Qwen/Qwen3-TTS-12Hz-0.6B-{CustomVoice,Base}`
- `Qwen/Qwen3-TTS-Tokenizer-12Hz` (0.2B causal ConvNet, 12.5 Hz, 16×2048 codebooks, 24 kHz — [tech report](https://arxiv.org/html/2601.15621v1))

The 25 Hz tokenizer and models are described in the report but **not released** ([#369](https://github.com/QwenLM/Qwen3-TTS/issues/369)). Newer "Flash" and Qwen-Audio-3.0-TTS are API-only.

**Licence:** Apache-2.0 code ([LICENSE](https://raw.githubusercontent.com/QwenLM/Qwen3-TTS/main/LICENSE)) and Apache-2.0 on every model card.

**VRAM:**
- No official numbers.
- Measured: ~4.3 GB after loading 1.7B bf16 on an L4 ([zenn](https://zenn.dev/kun432/scraps/102b890a0956a1)).
- Estimated peak: ~5 GB. The KV cache is ~115 KB per position, so ~287 MB for 200 s of audio. **Fit on 6 GB is UNVERIFIED.**
- **Use bf16, not fp16:** fp16 gives NaN / CUDA asserts ([#43](https://github.com/QwenLM/Qwen3-TTS/issues/43)).
- bitsandbytes 4-bit fails to load ([#260](https://github.com/QwenLM/Qwen3-TTS/issues/260)).
- **GGUF fallback:** [HaujetZhao/Qwen3-TTS-GGUF](https://github.com/HaujetZhao/Qwen3-TTS-GGUF) (MIT) uses ~1.8 GB for 1.7B and runs at 0.35 s/s on an RTX 5050. Alternative: [qwentts.cpp](https://github.com/ServeurpersoCom/qwentts.cpp).
- Design-then-clone on 6 GB means **VoiceDesign then Base in separate processes**. Use one process per stage; there is a memory-leak report ([#242](https://github.com/QwenLM/Qwen3-TTS/issues/242)).

**Install:**
- `qwen-tts` 0.1.1, Python ≥3.9 (3.12 recommended). Pins `transformers==4.57.3`, `accelerate==1.12.0`; **torch is unpinned, so install CUDA torch first** ([pyproject](https://raw.githubusercontent.com/QwenLM/Qwen3-TTS/main/pyproject.toml)).
- flash-attn is optional: the models declare `_supports_sdpa`, so pass `attn_implementation="sdpa"`. FA2 gave no speed-up on an RTX 5070 Ti ([HF disc](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base/discussions/5)).
- The "SoX could not be found" message comes from the unused 25 Hz path and is harmless for 12 Hz models (inferred).

**Voices:**
- 9 CustomVoice speakers (§2.1). The README says each speaker "can speak any language supported by the model" but native language is best.
- VoiceDesign is 1.7B only.
- `instruct` works on 1.7B CustomVoice and VoiceDesign, but not Base, and not 0.6B.

**Cloning** ([qwen3_tts_model.py](https://raw.githubusercontent.com/QwenLM/Qwen3-TTS/main/qwen_tts/inference/qwen3_tts_model.py)):
- `ref_audio` plus `ref_text`. In ICL mode, `ref_text` must be the exact (here, **Japanese**) transcript.
- `x_vector_only_mode=True` needs no transcript but "cloning quality may be reduced". A community claim says it avoids accent bleed (UNVERIFIED).
- **`create_voice_clone_prompt()` is computed once and reused** for every chunk.
- Reference length: officially 3 s; community sweet spot 10–15 s; >60 s causes hangs (UNVERIFIED).

**Length and failure modes:**
- The model's `generation_config.json` sets `max_new_tokens` 8192 (~655 s); the package default is 2048.
- The report's long-form English WER for the *released* 12 Hz 1.7B is 2.81, vs 1.23 for the unreleased 25 Hz model.
- Reported problems:
  - speed-up after ~100 characters ([#239](https://github.com/QwenLM/Qwen3-TTS/issues/239))
  - final words swallowed at ~300 words ([#181](https://github.com/QwenLM/Qwen3-TTS/issues/181))
  - loops ([#258](https://github.com/QwenLM/Qwen3-TTS/issues/258))
  - speaker change ([#80](https://github.com/QwenLM/Qwen3-TTS/issues/80))
  - distorted first token on cold start ([#219](https://github.com/QwenLM/Qwen3-TTS/issues/219))
  - numbers misread in cross-lingual clone ([#151](https://github.com/QwenLM/Qwen3-TTS/issues/151))
  - nondeterminism ([#298](https://github.com/QwenLM/Qwen3-TTS/issues/298)): no seed parameter, use `torch.manual_seed`
  - cross-chunk cadence drift ([#220](https://github.com/QwenLM/Qwen3-TTS/discussions/220))
- **Chunk by sentence (≤ ~300 characters), prepend a short silence or discard the first frames if #219 appears, and QA every chunk.**

**Speed:**
- Official package: RTX 4060 Windows 4.3 s/s; 3080 Laptop 4.0 s/s; 4090 1.2 s/s. GPU utilisation is 10–16% because Python overhead per step dominates.
- **[faster-qwen3-tts](https://github.com/andimarafioti/faster-qwen3-tts)** (MIT, CUDA graphs, no flash-attn, Windows `.bat` scripts): RTX 4060 Windows **1.7B at 0.55 s/s (TTFA 460 ms), 0.6B at 0.44 s/s**. It reports "RTF 1.83 / 2.26" with RTF >1 meaning faster than real time. It supports Base, CustomVoice and VoiceDesign and has streaming generators. A ~29 s cutoff was reported ([#83](https://github.com/andimarafioti/faster-qwen3-tts/issues/83)).
- The official package does **not** truly stream. vLLM-Omni does, but on Linux only.
- CPU: only the GGUF port at 1.3 s/s is known.

**Controllability:**
- No SSML, IPA, phoneme, speed or pitch parameters.
- Style only via `instruct` (1.7B CustomVoice / VoiceDesign). Pauses come from punctuation.
- No text normaliser: **respell acronyms and numbers yourself.**

**Japanese:**
- One of 10 languages. JA error rate: 1.7B **3.82**, 0.6B 6.40 (MiniMax 3.52, ElevenLabs 10.65).
- Ono_Anna is the Japanese-native speaker.
- Cross-lingual: **ja→en WER 3.04** (1.7B-Base); en→ja CER 7.21 vs CosyVoice3 6.80.
- No Windows Japanese dependencies. Users report misreadings of specialist terms and mixed Latin text ([crystal-method](https://crystal-method.com/blog/qwen-tts/)), and last-word cut-off in Japanese ([#55](https://github.com/QwenLM/Qwen3-TTS/issues/55)).

### 4.2 Chatterbox family (Resemble AI)

**Models** ([model zoo](https://github.com/resemble-ai/chatterbox)): original 0.5B (EN), **Multilingual V3** (May 2026; 23 languages incl. `ja`; V2 still selectable), Turbo 350M (EN), Nano 110M (EN, added Jun–Jul 2026), Flash 520M (EN, block-diffusion), Dramabox 3.3B (LTX-2 licence).

**Licence:** MIT code ([LICENSE](https://github.com/resemble-ai/chatterbox/blob/master/LICENSE)) and MIT weights (HF). The only extra text is "Don't use this model to do bad things."

**Install:**
- `chatterbox-tts` 0.1.7 (2026-03-26), Python ≥3.10. Pins `torch==2.6.0`, `torchaudio==2.6.0`, `transformers==5.2.0`, `diffusers==0.29.0`, `numpy<2`, `librosa==0.11.0`, `pykakasi==2.3.0`, `spacy-pkuseg`, `resemble-perth>=1.0.0`, `gradio==6.8.0` ([PyPI](https://pypi.org/project/chatterbox-tts/)).
- Nano and V3 postdate 0.1.7, so they **probably need a git install** (UNVERIFIED).
- **Windows pitfalls:**
  1. The PyPI torch 2.6.0 Windows wheel is CPU-only, so use the cu124 index ([#159](https://github.com/resemble-ai/chatterbox/issues/159)).
  2. The old pkuseg build failure was fixed by switching to `spacy-pkuseg` (a cp312 wheel exists).
  3. **`perth.PerthImplicitWatermarker()` → `TypeError: 'NoneType' object is not callable`.** `resemble-perth` 1.0.1 imports `pkg_resources`, which setuptools 82 removed. Fix: pin **`setuptools<82`**, or install Perth from git ([Perth #7](https://github.com/resemble-ai/Perth/issues/7), [#198](https://github.com/resemble-ai/chatterbox/issues/198)).

**VRAM:**
- Original: "around 6-7gb locally" (community, relayed in [#44](https://github.com/resemble-ai/chatterbox/issues/44)). **Borderline on 6 GB.**
- bf16 is not native (dtype errors, [#564](https://github.com/resemble-ai/chatterbox/issues/564)).
- Turbo: "lower compute and VRAM" (unmeasured).

**Controls:**
- `exaggeration` (0.5), `cfg_weight` (0.5), `temperature` (0.8), `repetition_penalty` (1.2), `min_p` (0.05).
- For a calm narrator: keep `exaggeration` ≤0.5; a lower `cfg_weight` (~0.3) slows pacing.
- **Turbo and Nano ignore `exaggeration` and `cfg_weight`.**
- Turbo has 19 tags (`[laugh] [chuckle] [sigh] … [narration] [advertisement]`, [added_tokens.json](https://huggingface.co/ResembleAI/chatterbox-turbo/blob/main/added_tokens.json)). Only the sound tags are reported to work audibly ([#557](https://github.com/resemble-ai/chatterbox/issues/557)).

**Reference clip:**
- Original and Multilingual use the first 6 s for style and 10 s for timbre. Turbo asserts the clip is >5 s.
- Use a clean 10–15 s clip.
- **Reuse across chunks:** `model.prepare_conditionals("ref.wav", exaggeration=0.5)` once, then `generate(chunk)`. Save and reload with `Conditionals.save/load`. Seed each chunk with `torch.manual_seed`.

**Cross-lingual, official README tip:** "Ensure that the reference clip matches the specified language tag. Otherwise, language transfer outputs may inherit the accent of the reference clip's language. To mitigate this, set `cfg_weight` to `0`."
- **So for a Japanese reference with English output: Multilingual V3, `language_id="en"`, `cfg_weight=0`.** The original English model also has `cfg_weight`.
- No Japanese→English quality reports exist (UNVERIFIED).

**Limits and failures:**
- `max_new_tokens=1000` speech tokens, about **40 s per call**.
- **Turbo produces gibberish above ~300–350 characters** ([#424](https://github.com/resemble-ai/chatterbox/issues/424), [#385](https://github.com/resemble-ai/chatterbox/issues/385)).
- Short segments of fewer than ~20 characters hallucinate ([#97](https://github.com/resemble-ai/chatterbox/issues/97)); merge them into neighbours.
- No text normaliser beyond punctuation mapping, and no IPA ([#550](https://github.com/resemble-ai/chatterbox/issues/550)).

**Speed:**
- ~2.75× real time (0.36 s/s) on a 3090 ([#71](https://github.com/resemble-ai/chatterbox/issues/71)). The 4050 is unmeasured; expect roughly real time for the original model.
- Nano runs at 3× real time on an 8-core CPU (the only practical CPU fallback in the family).
- Flash's RTF is 0.107.
- No official streaming (community forks only).

**PerTh:** see §2.4. The code is MIT ([Perth](https://github.com/resemble-ai/Perth)). The watermark is applied unconditionally in `generate()`, and its audible impact at 24 kHz is UNVERIFIED.

**Japanese (Multilingual):**
- `pykakasi` converts kanji to hiragana with context-free dictionary lookups, so misreadings are likely. pykakasi is GPL-3.0; that matters only if the code is redistributed.
- Katakana passes through. Latin text and numbers are not normalised, so **pre-convert them to kana.**
- No Japanese quality evaluation found.

### 4.3 Kokoro-82M / kokoro-onnx

**Model and licence:** 82M, StyleTTS2 + ISTFTNet, Apache-2.0 weights ([card](https://huggingface.co/hexgrad/Kokoro-82M)). Some voices come from CC BY data: jf_gongitsune, jf_nezumi, jf_tebukuro and jm_kumo from Koniwa CC BY 3.0.

**Versions:**
- `kokoro` 0.9.4 (2025-04-05) and `misaki` 0.9.4, both `>=3.10,<3.13`, so **Python 3.12 works and 3.13 does not** (unreleased).
- There is no newer English model. `Kokoro-82M-v1.1-zh` is Chinese-focused and "not a strict upgrade".

**English voices:** see §2.1.

**Pronunciation control** (the best among the candidates):
- Inline: `[Kokoro](/kˈOkəɹO/)`.
- Persistent: `pipeline.g2p.lexicon.golds['SFT'] = '…'`. All-caps keys must be added exactly as written. This is maintainer-endorsed ([#156](https://github.com/hexgrad/kokoro/issues/156)).
- Tip: generate the phoneme string with `g2p('ess eff tee')`, then paste it in.

**Default text handling** (misaki [en.py](https://github.com/hexgrad/misaki/blob/main/misaki/en.py)):
- Numbers go through `num2words`: 0.771 becomes "zero point seven seven one", and % becomes "percent".
- All-caps words not in the lexicon are spelled out only if spaCy tags them as proper nouns, so **SFT, DPO and JSON are unpredictable. Override them.**
- User reports: Roman numerals, "10m", "24th" misread ([#108](https://github.com/hexgrad/kokoro/issues/108)).

**Chunking and limits:**
- 510 phoneme tokens per forward pass. English auto-chunks on `\n+`, then at `!.?…`, `:;`, `,—`.
- The sweet spot is 100–200 tokens. Voices get weak below 10–20 tokens and rush above 400.
- Non-English languages truncate silently (logging is disabled, [#367](https://github.com/hexgrad/kokoro/issues/367)), so **put one sentence per line.**

**Windows notes:**
- `misaki[en]` pulls `espeakng-loader`, a win_amd64 wheel that bundles espeak-ng, so the MSI is not strictly needed. Without espeak, out-of-dictionary words are *skipped*.
- **spaCy `en_core_web_sm` auto-download fails in uv venvs, which have no pip** ([#160](https://github.com/hexgrad/kokoro/issues/160)). Fix: `uv pip install pip`, or preinstall the model wheel.
- Set `HF_HUB_DISABLE_SYMLINKS_WARNING=1`.

**Speed:** 36–96× real time on T4/A10G/L4 GPUs and ~5× on a 32-vCPU CPU ([gist](https://gist.github.com/efemaer/23d9a3b949b751dde315192b4dcf0653)).

**kokoro-onnx 0.6.1** (2026-08-19, MIT, Python 3.10–3.13):
- Model files: 310 MB fp32, 155 MB fp16, 108 MB int8, plus `voices-v1.0.bin` 26 MB.
- `[gpu]` extra for onnxruntime-gpu. Its README recommends misaki G2P.

**Japanese (`misaki[ja]`):**
- `pyopenjtalk` 0.4.1 is sdist-only, so it needs MSVC and CMake to build. **Use `pyopenjtalk-plus` 0.4.1.post9, which has cp310–cp314 win_amd64 wheels** ([PyPI](https://pypi.org/project/pyopenjtalk-plus/)).
- `fugashi` and `mojimoji` have wheels. `unidic` needs `python -m unidic download` (~1 GB); `unidic-lite` is 47 MB.
- The cutlet path passes **ASCII through unchanged**, and "0.771" becomes ゼロ + "." + ななひゃくななじゅういち, with the "." acting as a sentence break. **Kana pre-normalisation is required.**
- Japanese voice quality is C-grade.

### 4.4 Fun-CosyVoice3-0.5B-2512 (FunAudioLLM)

**Licence and releases:** Apache-2.0 for code and weights. CV3 was released 2025-12. CV3.5 was announced but not released ([#1840](https://github.com/FunAudioLLM/CosyVoice/issues/1840)).

**Install** ([requirements.txt](https://raw.githubusercontent.com/FunAudioLLM/CosyVoice/main/requirements.txt)):
- Officially Python 3.10 via conda, with `torch==2.3.1` (cu121) and `transformers==4.51.3`.
- **pynini is no longer needed:** `wetext==0.0.4` is a pure-Python runtime ([PyPI](https://pypi.org/project/wetext/)).
- deepspeed and TensorRT are Linux-only. Windows gets **CPU `onnxruntime==1.18.0`** for the speech tokenizer and speaker embedding; speaker caching amortises that cost.
- Import cosyvoice before gradio (DLL init error otherwise).

**VRAM and speed:**
- ~2.5 GB used on a GTX 1650 4 GB, at 10–100 s per output ([blog](https://doupoa.site/archives/912/cosyvoice-3-deployed-on-windows)).
- **Windows 4090 report: 2.4–3.3 s/s. fp16 caused runaway token generation, so the user ran fp32** ([#1927](https://github.com/QwenAudio/CosyVoice/issues/1927)).

**Voices:** none without a prompt. Only the old CosyVoice-300M-SFT has presets, and none are anime-style.

**Controls:**
- `speed=` and `text_frontend=` parameters on every inference call.
- Instruct prompts and `[breath]` tags.
- CMU-phoneme / pinyin "inpainting" for pronunciation.

**Input length:** unlimited per call; the frontend splits into segments of ~60–80 tokens.

**Cross-lingual:**
- `inference_cross_lingual(tts_text, prompt_wav, zero_shot_spk_id='', …)`.
- In this mode the frontend **deletes `prompt_text` and `llm_prompt_speech_token`**, so identity comes only from the speaker embedding and flow prompt, and less Japanese prosody should leak ([frontend.py](https://raw.githubusercontent.com/FunAudioLLM/CosyVoice/main/cosyvoice/cli/frontend.py)).
- Prompt must be ≤30 s.
- **Cache the speaker** with `add_zero_shot_spk(prompt_text, prompt_wav, spk_id)` and `save_spkinfo()`.
- CV3 text must be prefixed with `You are a helpful assistant.<|endofprompt|>`.
- The ja→en score is not extracted: CV3 is 4.20 per the Qwen report. Accent leakage is unknown.

**Japanese input:**
- CV3 was trained with kana. **Any CJK ideograph routes text down the Chinese normalisation path, and kana-only text goes down the English path** (where `inflect` spells digits in English) ([frontend_utils.py](https://raw.githubusercontent.com/FunAudioLLM/CosyVoice/main/cosyvoice/utils/frontend_utils.py)).
- So for Japanese: **pass fully kana-normalised text with `text_frontend=False`.**

### 4.5 GPT-SoVITS v2ProPlus (RVC-Boss)

**Licence:** MIT code and MIT weights ([HF](https://huggingface.co/lj1995/GPT-SoVITS)). **Pretraining data sources are undisclosed** (~7k h for v2Pro/v3/v4) ([wiki](https://github.com/RVC-Boss/GPT-SoVITS/wiki/GPT%E2%80%90SoVITS%E2%80%90features-(%E5%90%84%E7%89%88%E6%9C%AC%E7%89%B9%E6%80%A7))). The WebUI disclaimer puts responsibility for exported audio on the user.

**Versions:** v2ProPlus (2025-06) is recommended. On a Chinese test set its SIM is 0.737 vs 0.735 for v4, at v2 cost. The last changelog entry is 2026-04-18, and there is no v5 ([changelog](https://raw.githubusercontent.com/RVC-Boss/GPT-SoVITS/main/docs/en/Changelog_EN.md)).

**English front end:**
- CMU dictionary plus neural G2P.
- **Unknown words of ≤3 letters are spelled out letter by letter, so SFT, DPO and F1 are safe. Unknown words of ≥4 letters go to neural G2P**, so respell "JSON" and "logits" ([english.py](https://raw.githubusercontent.com/RVC-Boss/GPT-SoVITS/main/GPT_SoVITS/text/english.py)).
- Numbers are normalised (decimals, %) ([expend.py](https://raw.githubusercontent.com/RVC-Boss/GPT-SoVITS/main/GPT_SoVITS/text/en_normalization/expend.py)).

**Japanese front end:**
- pyopenjtalk, with a user dictionary (`ja_userdic/userdict.csv`).
- No number normalisation. Pitch accent is not modelled, so some intonation is off ([japanese.py](https://raw.githubusercontent.com/RVC-Boss/GPT-SoVITS/main/GPT_SoVITS/text/japanese.py)).

**API:**
- `api_v2.py` serves `/tts` on port 9880 ([api_v2.py](https://raw.githubusercontent.com/RVC-Boss/GPT-SoVITS/main/api_v2.py)).
- Parameters: `text, text_lang, ref_audio_path, prompt_text, prompt_lang, aux_ref_audio_paths, text_split_method, batch_size, speed_factor, seed, streaming_mode, top_k, top_p, temperature, repetition_penalty`.
- Cross-lingual use: `prompt_lang=ja`, `text_lang=en`.
- Split modes: 4 sentences, 50 characters, or punctuation.

**Speed and VRAM:** 0.028 s/s on a 4060 Ti (README). Guides say 4–6 GB VRAM (UNVERIFIED).

**Failure modes:**
- Drift between chunks: fix `seed` and lower `temperature` / `top_k`.
- Reference defects are copied into the output.
- Transcript mismatch causes artefacts.
- Repetition on long inputs.
- The similarity ceiling (~0.74) means the output is "related, not identical" to Irodori.

### 4.6 Stretch candidates: IndexTTS-2.5 and VoxCPM2

**IndexTTS-2.5:**
- Specs ([HF](https://huggingface.co/IndexTeam/IndexTTS-2.5); paper [2601.03888](https://arxiv.org/html/2601.03888)): ~0.8B; zh/en/ja/es/ar; "roughly 6 GB of VRAM for inference" (unclear whether that is a measured peak); 0.21 s/s on a 4090 in bf16; "cross-lingual voice transfer and emotion control disentangled from timbre". Japanese→English is not reported.
- Install: uv project, Python `>=3.10,<3.12`, `torch==2.8.*` cu128, `transformers==4.52.1`, `wetext` (no pynini), `fugashi[unidic-lite]` ([pyproject](https://raw.githubusercontent.com/index-tts/index-tts/main/pyproject.toml)). On Windows, **skip `--all-extras`** (DeepSpeed) and keep `use_cuda_kernel=False`.
- Controls: kana overrides `<上手|じょうず>`, `duration_factor`, `emo_text`.
- Japanese: numbers must be written out ([vLLM recipe](https://recipes.vllm.ai/IndexTeam/IndexTTS-2.5)).
- Known issues: contraction misreads ([#380](https://github.com/index-tts/index-tts/issues/380)); memory growth over long batch runs ([#364](https://github.com/index-tts/index-tts/issues/364)); IndexTTS-2 ran at 13 s/s on a 3060 under Windows ([#585](https://github.com/index-tts/index-tts/issues/585)).
- Licence: the bilibili licence (§2.2), plus the Emilia provenance caveat.

**VoxCPM2:**
- 2B, Apache-2.0, 48 kHz, 30 languages incl. Japanese ([HF](https://huggingface.co/openbmb/VoxCPM2)).
- VRAM "~8 GB" officially, 5.5 GB peak per a third party. Needs Python ≥3.10, torch ≥2.5, CUDA ≥12.
- Voice design via a `(description)` prefix. Three cloning modes; "ultimate" cloning uses `prompt_wav_path` + `prompt_text`.
- Output varies between runs, and no prompt-cache API is documented. A portable Windows build exists ([VoxCPM2_portable](https://github.com/timoncool/VoxCPM2_portable)).

### 4.7 Japanese-only and anime-community engines (fallbacks for the Japanese track)

**Style-Bert-VITS2** ([repo](https://github.com/litagin02/Style-Bert-VITS2)):
- Licence: AGPL-3.0 + LGPL-3.0. Latest release 2.7.0 (2025-08).
- Install: Windows `.bat` installer. It pins `torch<2.4` and uses the prebuilt `pyopenjtalk-dict`, so no compiler is needed. The install path must not contain Japanese or spaces.
- Japanese (JP-Extra) quality is high.
- The Japanese normaliser **strips `%`**, so write パーセント yourself. It has a user-dictionary editor ([normalizer.py](https://raw.githubusercontent.com/litagin02/Style-Bert-VITS2/master/style_bert_vits2/nlp/japanese/normalizer.py)).
- A custom voice requires training, e.g. on our own Irodori outputs (legally plausible under MIT).

**RikkaBotan** (Style-Bert-VITS2 models):
- Consented single-speaker English + Japanese models, CC BY-SA 4.0. Commercial use is OK and use as training material is allowed.
- No redistribution of the model and no impersonation. Credit is requested.
- A ready-made "one identity in both languages" fallback, but not our designed voice. English quality is UNVERIFIED.

**AivisSpeech:**
- Engine is LGPL-3.0 and Japanese-only. `enable_katakana_english` defaults to true.
- `/user_dict` API ([engine](https://github.com/Aivis-Project/AivisSpeech-Engine)).
- **Only the official Mao and Kohaku voices** (ACML 1.0).

**VOICEVOX:**
- Japanese only. Credit is required. English→katakana conversion (added mid-2025) and a user dictionary ([API](https://voicevox.github.io/voicevox_engine/api/)).
- Whether acronyms come out as letter names is UNVERIFIED.

---

## 5. Install recipes for the benchmark set

### 5.0 Cross-cutting rules (Windows, 6 GB, 35 GB disk)

**1. One environment per engine.** Each engine gets its own uv project or venv, and a small CLI wrapper that reads a JSON job (text chunks, reference, seed) and writes WAVs plus a JSON sidecar. The `vidmedia` harness calls these as subprocesses. This is required because the pins conflict:

| Env | Python | torch | transformers |
|---|---|---|---|
| irodori | 3.10 (repo default) | 2.10.0+cu128 | >=5.12.1,<6 |
| qwen3tts | 3.12 | (unpinned) → use 2.10.0+cu128 | ==4.57.3 |
| chatterbox | 3.12 | ==2.6.0 (cu124) | ==5.2.0 |
| cosyvoice | 3.10 | ==2.3.1 (cu121) | ==4.51.3 |
| gpt-sovits | 7z package runtime, or 3.10–3.12 | 2.5–2.8 | (own) |
| kokoro | 3.12 | any → 2.10.0+cu128 | — |
| align (qwen-asr) | 3.12 | 2.10.0+cu128 | ==4.57.6 |
| vidmedia (faster-whisper) | 3.12 | none (ctranslate2) | — |

**2. Sequential GPU use.** Never keep two TTS models loaded. Use one process per engine per run, and one process per stage for design-then-clone.

**3. Disk budget** (all sizes approximate, UNVERIFIED unless cited):
- **Torch:** each *distinct* torch build costs ~3–5 GB installed. uv hard-links from its cache on the same drive, so **reusing `torch==2.10.0+cu128`** in irodori, qwen3tts, kokoro and align makes those ~free after the first.
- **Checkpoints:**

  | Checkpoint | Size |
  |---|---|
  | Irodori v4.1-Small | 3.06 GB + 0.43 GB codec (+0.9 GB int8) |
  | Qwen3 1.7B | ~4.5 GB each; 3 variants = 13.5 GB, so **download Base + VoiceDesign first**, CustomVoice only if needed |
  | Qwen3 0.6B | ~2.5 GB each |
  | Chatterbox original / multilingual / turbo | a few GB (UNVERIFIED) |
  | CosyVoice3 | UNVERIFIED |
  | GPT-SoVITS Windows 7z | 8.19 GB compressed, more extracted ([HF](https://huggingface.co/lj1995/GPT-SoVITS-windows-package/tree/main)) |
  | Kokoro | 0.3 GB |

- **Set `HF_HOME` to one known folder** and delete per-engine caches after scoring.
- Suggested order: Irodori → Qwen3 → Chatterbox → Kokoro → GPT-SoVITS → CosyVoice (last, highest risk).

**4. Always install CUDA torch from the PyTorch index *before* the engine package.** On Windows, PyPI torch wheels are CPU-only. Verify with `python -c "import torch; print(torch.__version__, torch.cuda.is_available())"`.

**5. Environment variables:** `HF_HUB_DISABLE_SYMLINKS_WARNING=1` and `PYTHONUTF8=1` (Japanese text in files and args). Pass Japanese text through UTF-8 files, not PowerShell arguments.

**6. Measure VRAM with** `torch.cuda.reset_peak_memory_stats()` / `torch.cuda.max_memory_allocated()` inside the process, *and* sample `nvidia-smi --query-gpu=memory.used --format=csv -lms 200` externally. The allocator's reserved memory and the Windows display take extra.

### R1. Irodori-TTS v4.1-Small (Japanese + master-voice design)
```powershell
git clone https://github.com/Aratako/Irodori-TTS.git
cd Irodori-TTS
uv sync --extra cu128                                   # README
# if torch came out CPU-only:
uv sync --extra cu128 --reinstall-package torch --reinstall-package torchaudio
uv run --no-sync python -c "import torch;print(torch.__version__, torch.cuda.is_available())"
```
**Usage:** the README snippets are in §3.5. For the benchmark, add `--model-precision bf16 --seed <n>`. Also compare `Aratako/Irodori-TTS-v4.1-Small-Quantized` int8-weight-only against bf16, and `-MF` at 4 steps.

**Pitfalls:** see §3.3 (CPU torch, FFmpeg DLLs, Windows Media Player, PowerShell Japanese args, no torch.compile). The default is Python 3.10; `uv sync --python 3.12 --extra cu128` is permitted by the lockfile but untested.

### R2. Qwen3-TTS (official) and faster-qwen3-tts
```powershell
uv venv --python 3.12 .venv-qwen3tts
uv pip install --python .venv-qwen3tts torch==2.10.0 torchaudio==2.10.0 --index-url https://download.pytorch.org/whl/cu128
uv pip install --python .venv-qwen3tts qwen-tts            # README: pip install -U qwen-tts
# optional speed path (MIT, CUDA graphs); separate venv if it conflicts (UNVERIFIED):
uv pip install --python .venv-qwen3tts faster-qwen3-tts
```
Whether torch 2.10 works with qwen-tts is untested (torch is unpinned there). Fall back to the torch version the README environment uses if errors appear.

**README snippets** ([source](https://github.com/QwenLM/Qwen3-TTS)). **On Windows replace `attn_implementation="flash_attention_2"` with `"sdpa"`.**
```python
import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel

model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
    device_map="cuda:0",
    dtype=torch.bfloat16,
    attn_implementation="flash_attention_2",
)

# single inference
wavs, sr = model.generate_custom_voice(
    text="其实我真的有发现，我是一个特别善于观察别人情绪的人。",
    language="Chinese",
    speaker="Vivian",
    instruct="用特别愤怒的语气说",
)
sf.write("output_custom_voice.wav", wavs[0], sr)
```
```python
# VoiceDesign (same from_pretrained with "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign")
wavs, sr = model.generate_voice_design(
    text="哥哥，你回来啦，人家等了你好久好久了，要抱抱！",
    language="Chinese",
    instruct="体现撒娇稚嫩的萝莉女声，音调偏高且起伏明显，营造出黏人、做作又刻意卖萌的听觉效果。",
)
sf.write("output_voice_design.wav", wavs[0], sr)
```
```python
# Base clone + reusable prompt (README)
prompt_items = model.create_voice_clone_prompt(
    ref_audio=ref_audio,
    ref_text=ref_text,
    x_vector_only_mode=False,
)
wavs, sr = model.generate_voice_clone(
    text=["Sentence A.", "Sentence B."],
    language=["English", "English"],
    voice_clone_prompt=prompt_items,
)
```
The README also has an official **"Voice Design then Clone"** example: `design_model.generate_voice_design(...)`, then `clone_model.create_voice_clone_prompt(ref_audio=(ref_wavs[0], sr), ref_text=ref_text)`, then `generate_voice_clone(..., voice_clone_prompt=...)`.

**Our adaptation (not in the README): the Irodori clip into English.** Test both modes.
```python
torch.manual_seed(1234)
p_icl = model.create_voice_clone_prompt(ref_audio="master_ja.wav", ref_text=JA_TRANSCRIPT, x_vector_only_mode=False)
p_xv  = model.create_voice_clone_prompt(ref_audio="master_ja.wav", x_vector_only_mode=True)
for name, p in (("icl", p_icl), ("xvec", p_xv)):
    wavs, sr = model.generate_voice_clone(text=EN_CHUNKS, language=["English"] * len(EN_CHUNKS), voice_clone_prompt=p)
```

**faster-qwen3-tts** ([README](https://github.com/andimarafioti/faster-qwen3-tts)):
```python
from faster_qwen3_tts import FasterQwen3TTS

model = FasterQwen3TTS.from_pretrained("Qwen/Qwen3-TTS-12Hz-0.6B-Base")
audio_list, sr = model.generate_voice_clone(
    text="Hello world!", language="English",
    ref_audio="ref_audio.wav", ref_text="reference text",
)
```
It also ships `setup_windows.bat` and `benchmark_windows.bat`.

**Pitfalls:**
- bf16 only.
- The 1.7B variants need separate processes on 6 GB.
- `transformers==4.57.3` is a hard pin.
- `torch.manual_seed` per chunk.
- Watch the speed-up after ~100 characters and the first-token distortion.

### R3. Chatterbox (original, Multilingual V3, Turbo)
```powershell
uv venv --python 3.12 .venv-chatterbox
uv pip install --python .venv-chatterbox chatterbox-tts "setuptools<82" --extra-index-url https://download.pytorch.org/whl/cu124 --index-strategy unsafe-best-match
# V3 multilingual / Nano may need the git version (UNVERIFIED):
# uv pip install --python .venv-chatterbox "chatterbox-tts @ git+https://github.com/resemble-ai/chatterbox.git" "setuptools<82" --extra-index-url https://download.pytorch.org/whl/cu124 --index-strategy unsafe-best-match
```
**README snippets** ([source](https://github.com/resemble-ai/chatterbox)):
```python
import torchaudio as ta
import torch
from chatterbox.tts_turbo import ChatterboxTurboTTS

# Load the Turbo model
model = ChatterboxTurboTTS.from_pretrained(device="cuda")

# Generate with Paralinguistic Tags
text = "Hi there, Sarah here from MochaFone calling you back [chuckle], have you got one minute to chat about the billing issue?"

# Generate audio (requires a reference clip for voice cloning)
wav = model.generate(text, audio_prompt_path="your_10s_ref_clip.wav")

ta.save("test-turbo.wav", wav, model.sr)
```
```python
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

device = "cuda"  # or "cpu" / "mps"

# English example
model = ChatterboxTTS.from_pretrained(device=device)

text = "Ezreal and Jinx teamed up with Ahri, Yasuo, and Teemo to take down the enemy's Nexus in an epic late-game pentakill."
wav = model.generate(text)
ta.save("test-english.wav", wav, model.sr)

# Multilingual V3 examples
multilingual_model = ChatterboxMultilingualTTS.from_pretrained(device=device, t3_model="v3")
# To use the legacy V2 multilingual checkpoint, omit t3_model or pass t3_model="v2".

french_text = "Bonjour, comment ça va? Ceci est le modèle de synthèse vocale multilingue Chatterbox, il prend en charge 23 langues."
wav_french = multilingual_model.generate(french_text, language_id="fr")
ta.save("test-french.wav", wav_french, multilingual_model.sr)
```
**Our adaptation (not in the README):** Japanese reference into English with one conditioning.
```python
multilingual_model.prepare_conditionals("master_ja.wav", exaggeration=0.4)
for i, chunk in enumerate(EN_CHUNKS):
    torch.manual_seed(1234 + i)
    wav = multilingual_model.generate(chunk, language_id="en", cfg_weight=0.0)
```
**Pitfalls:**
- `setuptools<82`.
- cu124 torch.
- **VRAM "6–7 GB" for the original model: measure first.** If it OOMs, try Turbo (no accent control) or the original on CPU (slow).
- Turbo chunks must stay ≤300 characters.
- Merge fragments shorter than 20 characters.

### R4. Fun-CosyVoice3-0.5B
```powershell
git clone --recursive https://github.com/FunAudioLLM/CosyVoice.git
cd CosyVoice
git submodule update --init --recursive
# README uses conda python=3.10 + `pip install -r requirements.txt`; uv adaptation (UNVERIFIED):
uv venv --python 3.10
uv pip install -r requirements.txt --index-strategy unsafe-best-match
uv run hf download FunAudioLLM/Fun-CosyVoice3-0.5B-2512 --local-dir pretrained_models/Fun-CosyVoice3-0.5B
```
**Snippet** (verbatim, [example.py](https://raw.githubusercontent.com/FunAudioLLM/CosyVoice/main/example.py); imports `AutoModel` from `cosyvoice.cli.cosyvoice` and `torchaudio`):
```python
cosyvoice = AutoModel(model_dir='pretrained_models/Fun-CosyVoice3-0.5B')
for i, j in enumerate(cosyvoice.inference_cross_lingual('You are a helpful assistant.<|endofprompt|>[breath]因为他们那一辈人[breath]在乡里面住的要习惯一点，[breath]邻居都很活络，[breath]嗯，都很熟悉。[breath]', './asset/zero_shot_prompt.wav', stream=False)):
    torchaudio.save('fine_grained_control_{}.wav'.format(i), j['tts_speech'], cosyvoice.sample_rate)
```
**Our adaptation, following the verified signatures but never run:**
1. Once: `cosyvoice.add_zero_shot_spk('You are a helpful assistant.<|endofprompt|>' + JA_TRANSCRIPT, 'master_ja.wav', 'narrator')`.
2. Per chunk: `cosyvoice.inference_cross_lingual('You are a helpful assistant.<|endofprompt|>' + en_chunk, '', zero_shot_spk_id='narrator', text_frontend=False, stream=False)`.

**Pitfalls:**
- Python 3.10.
- CPU onnxruntime on Windows.
- **Use fp32 at first** (fp16 runaway generation).
- Import cosyvoice before gradio.
- Expect well below real time.
- Japanese input must be kana with `text_frontend=False`.

### R5. GPT-SoVITS v2ProPlus
- **Option A (lowest risk, heavy disk):** the Windows integrated package `GPT-SoVITS-v2pro-20250604.7z` (8.19 GB) from [lj1995/GPT-SoVITS-windows-package](https://huggingface.co/lj1995/GPT-SoVITS-windows-package/tree/main). HF flags three 7z files "Unsafe", probably because they contain pickled checkpoints. It bundles the runtime and avoids building pyopenjtalk.
- **Option B (source):** `git clone https://github.com/RVC-Boss/GPT-SoVITS.git`, then `pwsh -File install.ps1 --Device CU128` (README; tested on Python 3.10–3.12 with torch 2.5.1–2.8). The source path needs `pyopenjtalk`, which is sdist-only and needs MSVC + CMake. Whether `pyopenjtalk-plus` is a drop-in replacement there is UNVERIFIED.

**Run the API server** (header of `api_v2.py`): `python api_v2.py -a 127.0.0.1 -p 9880 -c GPT_SoVITS/configs/tts_infer.yaml`. Set the v2ProPlus weights in `tts_infer.yaml` (the exact key names are UNVERIFIED).

**Our request, following the documented parameters:**
```python
import requests
r = requests.post("http://127.0.0.1:9880/tts", json={
    "text": en_chunk, "text_lang": "en",
    "ref_audio_path": "master_ja.wav", "prompt_text": JA_TRANSCRIPT, "prompt_lang": "ja",
    "text_split_method": "cut5", "seed": 1234, "temperature": 0.7, "top_k": 10,
    "repetition_penalty": 1.35, "media_type": "wav"})
open("out.wav", "wb").write(r.content)
```
The `cut5` method name and `media_type` are UNVERIFIED; check the parameter list in `api_v2.py`.

**Pitfalls:**
- No Japanese characters or spaces in install paths.
- Keep the reference 3–10 s and the transcript exact.
- Fix the seed.

### R6. Kokoro (preset fallback)
```powershell
uv venv --python 3.12 .venv-kokoro
uv pip install --python .venv-kokoro torch==2.10.0 --index-url https://download.pytorch.org/whl/cu128
uv pip install --python .venv-kokoro "kokoro>=0.9.4" soundfile pip   # pip: lets misaki's spaCy model auto-download (#160)
# Japanese extras (skip misaki[ja] to avoid the pyopenjtalk source build):
uv pip install --python .venv-kokoro misaki==0.9.4 fugashi jaconv mojimoji unidic pyopenjtalk-plus
.venv-kokoro\Scripts\python -m unidic download       # ~1 GB
```
**README snippet** ([source](https://github.com/hexgrad/kokoro)); the IPython display lines are dropped:
```py
from kokoro import KPipeline
import soundfile as sf
import torch
pipeline = KPipeline(lang_code='a')
text = '''
[Kokoro](/kˈOkəɹO/) is an open-weight TTS model with 82 million parameters. Despite its lightweight architecture, it delivers comparable quality to larger models while being significantly faster and more cost-efficient. With Apache-licensed weights, [Kokoro](/kˈOkəɹO/) can be deployed anywhere from production environments to personal projects.
'''
generator = pipeline(text, voice='af_heart')
for i, (gs, ps, audio) in enumerate(generator):
    print(i, gs, ps)
    sf.write(f'{i}.wav', audio, 24000)
```
**Blends:**
- Equal average: `voice='af_heart,jf_alpha'`.
- Weighted: `v = 0.7*pipeline.load_single_voice('af_heart') + 0.3*pipeline.load_single_voice('jf_alpha')`, then `voice=v` ([PR #127](https://github.com/hexgrad/kokoro/pull/127)).
- Lexicon: `pipeline.g2p.lexicon.golds['SFT'] = <phonemes from g2p('ess eff tee')>`.

**kokoro-onnx** ([save.py](https://github.com/thewh1teagle/kokoro-onnx/blob/main/examples/save.py)):
```python
import soundfile as sf

from kokoro_onnx import Kokoro

kokoro = Kokoro("kokoro-v1.0.onnx", "voices-v1.0.bin")
samples, sample_rate = kokoro.create(
    "Hello. This audio generated by kokoro!", voice="af_sarah", speed=1.0, lang="en-us"
)
sf.write("audio.wav", samples, sample_rate)
print("Created audio.wav")
```

### R7 (stretch). IndexTTS-2.5 and VoxCPM2
**IndexTTS-2.5** (README / [HF](https://huggingface.co/IndexTeam/IndexTTS-2.5)). On Windows, `uv sync` without `--all-extras`.
```bash
git clone https://github.com/index-tts/index-tts.git && cd index-tts
pip install -U uv
uv sync --all-extras
```
```python
from indextts.infer_v2_5 import IndexTTS2
tts = IndexTTS2(cfg_path="checkpoints/config.yaml", model_dir="checkpoints")
tts.infer(spk_audio_prompt="prompt.wav", text="Hello", lang="EN")
```
Add `use_bf16=True` for 6 GB (per the report). Weights: `hf download IndexTeam/IndexTTS-2.5 --local-dir=checkpoints`.

**VoxCPM2** (`pip install voxcpm`, [HF](https://huggingface.co/openbmb/VoxCPM2)):
```python
from voxcpm import VoxCPM
import soundfile as sf

model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False)
wav = model.generate(text="Your text here", cfg_value=2.0, inference_timesteps=10)
sf.write("output.wav", wav, model.tts_model.sample_rate)
```

---

## 6. Japanese support matrix

| Engine | JA quality (evidence) | JA text front-end | Latin acronyms / numbers inside JA | Extra Windows deps | One voice for EN + JA? |
|---|---|---|---|---|---|
| Irodori v4.1-Small | Native JA; designed for it | NFKC only; raw ModernBERT-ja tokens | **No handling; must pre-normalise to kana** | none | JA only, so pair it with an EN cloner |
| Qwen3-TTS 1.7B | JA WER 3.82 (report) | none (LM reads raw text) | LM guesses; pre-normalise | none | **Yes**: same speaker, or same clone prompt with `language=` switched |
| Chatterbox Multilingual V3 | untested | pykakasi kanji→hiragana (GPL) | not normalised; pre-normalise | none (pure-Python) | **Yes**: same reference, switch `language_id` |
| CosyVoice3 | JA CER ~5–9% (paper) | kana-trained; CJK → Chinese path | English path spells digits in English; **kana + `text_frontend=False`** | none | Yes (cross-lingual) |
| IndexTTS-2.5 | 42K h JA training | fugashi (kana during training) | numbers must be written out | `fugashi[unidic-lite]` | Yes (cross-lingual claimed) |
| GPT-SoVITS | good timbre, pitch accent off (UNVERIFIED rating) | pyopenjtalk + user dict | letters lowercased only; no number normalisation | pyopenjtalk (7z avoids the build) | Yes (`prompt_lang` / `text_lang`) |
| Kokoro | C-grade voices | misaki[ja] (cutlet / pyopenjtalk) | ASCII passed through raw; "0.771" splits | pyopenjtalk-plus, unidic (1 GB) | technically, same voicepack (quality unknown) |
| Style-Bert-VITS2 JP-Extra | high | pyopenjtalk-dict + num2words(ja) | Latin left raw; **`%` stripped** | none (bat) | RikkaBotan only |
| VOICEVOX / Aivis | very clear / high | OpenJTalk + katakana-English | EN words → katakana; acronyms UNVERIFIED; user dict | none (apps) | JA only |
| Magpie 357M | CER 1.40% | built-in TN + EN→katakana | handled | NeMo (Linux / WSL2) | Yes (presets), no cloning |

**Conclusion:** the best *single-engine* one-identity options are **Qwen3-TTS 1.7B** (clone prompt or speaker reused across languages) and **Chatterbox Multilingual V3**. The owner's split (Irodori for JA plus a cloner for EN) puts identity at the mercy of cross-lingual similarity. Benchmark both.

**Alternative worth one experiment:** design in Qwen3 VoiceDesign, then clone that clip into Japanese with both Irodori and Qwen3. Irodori's reference encoder was trained on JA speech only, so an English reference is out-of-domain (UNVERIFIED).

---

## 7. Alignment recommendation

### 7.1 Principle: forced alignment of known text beats transcribe-and-fuzzy-match
- **Benchmark evidence** on hand-labelled speech: mean word-boundary error was 110.90 ms for WhisperX vs **25.35 ms for MFA** ([MFA 2026 benchmark](https://arxiv.org/html/2606.18466v1)).
- **Known faster-whisper timing problems:**
  - first word after a long silence placed "10 seconds early" ([#125](https://github.com/SYSTRAN/faster-whisper/issues/125))
  - a word's start after its end ([#294](https://github.com/SYSTRAN/faster-whisper/issues/294))
  - hotwords shift timings ([#853](https://github.com/SYSTRAN/faster-whisper/issues/853))
- **Qwen3-ForcedAligner** reports 42.9 ms average absolute error, and 37.5 ms on English vs 92.1 ms for WhisperX. Its reference labels are MFA-derived ([card](https://huggingface.co/Qwen/Qwen3-ForcedAligner-0.6B)).
- **We already know the text** (the TTS input). Transcription is useful as QA (§8) and as a coverage cross-check, not as the timing source.
- **Sentence-level timing is free.** Each TTS call is one or a few sentences, so concatenating chunk WAVs, with their durations and inserted pauses, gives exact sentence and subtitle spans. Word-level alignment only runs *within* ≤30 s chunks. That keeps memory trivial and bounds any error to one chunk.

### 7.2 Recommended stack
| Need | Primary | Fallback | Licences |
|---|---|---|---|
| EN word timings | **Qwen3-ForcedAligner-0.6B** (`pip install -U qwen-asr`, own venv: pins `transformers==4.57.6`) | torchaudio `forced_align` + `WAV2VEC2_ASR_BASE_960H` (character CTC; window emissions for long audio) | Apache-2.0 / torchaudio BSD + **MIT** weights ([doc](https://docs.pytorch.org/audio/stable/generated/torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H.html)) |
| JA char/phrase timings | **Qwen3-ForcedAligner-0.6B** (JA supported; nagisa segmentation) | MFA `japanese_mfa` v3.0.0 via conda (+ sudachipy); or faster-whisper char-level word timestamps + fuzzy mapping | Apache-2.0 / MFA MIT + model CC BY 4.0 |
| QA transcription | faster-whisper `large-v3` (int8_float16) or `large-v3-turbo` (fp16) | kotoba-whisper v2.0 for JA (Apache-2.0, faster-whisper build) | MIT / Apache-2.0 |

**Qwen3-ForcedAligner usage** ([card](https://huggingface.co/Qwen/Qwen3-ForcedAligner-0.6B)):
```python
import torch
from qwen_asr import Qwen3ForcedAligner
model = Qwen3ForcedAligner.from_pretrained(
    "Qwen/Qwen3-ForcedAligner-0.6B",
    dtype=torch.bfloat16,
    device_map="cuda:0",
)
results = model.align(audio=path, text=script, language="English")   # results[0][i].text/.start_time/.end_time
```
- ≤5 min per call.
- FlashAttention 2 is "recommended" but optional. Running without it on Windows is UNVERIFIED; use sdpa.

**torchaudio fallback:**
- `forced_align` **survived the torchaudio maintenance cuts**. The 2026-01-22 update lists "lfilter, RNNTLoss, CUCT, forced_align, and overdrive … preserved" ([#3902](https://github.com/pytorch/audio/issues/3902)). torchaudio 2.11 tracks torch ≥2.11.
- Load audio with `soundfile`, not `torchaudio.load` (which now depends on TorchCodec).
- Recipe: [forced-alignment tutorial](https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_tutorial.html). Emission memory grows with length, so window it to about 30 s, or just align per TTS chunk.

**Do not use (non-commercial or copyleft):**
- `torchaudio.pipelines.MMS_FA` (**CC-BY-NC 4.0**).
- `ctc-forced-aligner`'s default `MahmoudAshraf/mms-300m-1130-forced-aligner` (**CC-BY-NC 4.0**, [HF](https://huggingface.co/MahmoudAshraf/mms-300m-1130-forced-aligner)). The PyPI package of the same name is a different fork, partly under DOSL-1.0.
- whisper-timestamped (**AGPL-3.0**).
- CrisperWhisper (**CC-BY-NC**).

**Other options:**
- **stable-ts:** MIT, but **archived 2026-05-30** ([repo](https://github.com/jianfch/stable-ts)).
- **WhisperX:** 3.8.6, BSD-2. Pins torch ~2.8 and pyannote ≥4 ([pyproject](https://raw.githubusercontent.com/m-bain/whisperX/main/pyproject.toml)), which is heavier than needed. Its JA model is `jonatasgrosman/wav2vec2-large-xlsr-53-japanese`, Apache-2.0, character-level, 20% CER.
- **NeMo Forced Aligner:** WSL2 only.
- **MFA:** conda; best accuracy; needs G2P for out-of-vocabulary words (`--use_g2p`).

### 7.3 Script handling: display form vs spoken form
1. **Keep the script as a list of display tokens** (what appears on screen: "41.3%", "SFT", "F1").
2. **The normaliser (§9) emits the spoken form**, i.e. exactly the string sent to the TTS ("forty-one point three percent", "S F T", "F one"), plus a map `display_idx → [spoken word idx…]`.
3. **Align the spoken form.** A display token spans from the start of its first spoken word to the end of its last.
4. **For Japanese:** align kana spoken text, map back to the display sentence, and show English subtitles per sentence ID. Keep shared sentence IDs across the English and Japanese scripts. **Don't attempt English-to-Japanese word alignment.**
5. **Cross-check with ASR:** `jiwer.process_words(ref_spoken, asr_hyp).alignments` gives equal / substitute / insert / delete spans. Flag spans where the aligner scores low *and* the ASR disagrees. rapidfuzz is already a `vidmedia` dependency, for fuzzy token matching.

### 7.4 faster-whisper CUDA on Windows (for `vidmedia`)
- **Versions:** faster-whisper 1.2.1 ([PyPI](https://pypi.org/project/faster-whisper/)); ctranslate2 4.8.2 (2026-08-31, cp312 Windows wheels built against CUDA 12.4, [PyPI](https://pypi.org/project/ctranslate2/)).
- **Which DLLs are needed:**
  - The README still says "cuBLAS for CUDA 12 and cuDNN 9". But ctranslate2 **4.6.3 made cuDNN optional** ("Conv1d pure CUDA implementation…", [CHANGELOG](https://github.com/OpenNMT/CTranslate2/blob/master/CHANGELOG.md), [PR #1949](https://github.com/OpenNMT/CTranslate2/pull/1949)).
  - A third-party inspection of the 4.8.0 wheel found only cuBLAS references ([Castwright PR](https://github.com/dudarenok-maker/Castwright/pull/2864)).
  - Likely needed: `cublas64_12.dll`, `cublasLt64_12.dll`, plus the CUDA runtime `cudart64_12.dll`. This is strongly suggested, not maintainer-documented. **Test by removing the cuDNN bin folder from PATH.**
- **Wheel DLL folders:** the `nvidia-*-cu12` wheels put DLLs in `site-packages/nvidia/<lib>/bin`. **`os.add_dll_directory` alone was insufficient in a 2026 report; prepend the folders to `PATH` before importing faster_whisper** ([backtalk #28](https://github.com/jaredrhod/backtalk/issues/28)). Another fix used `nvidia-cublas-cu12` + `nvidia-cuda-runtime-cu12` ([hermes #103793](https://github.com/NousResearch/hermes-agent/issues/103793)).
- **Suggested `vidmedia` change:** add `nvidia-cuda-runtime-cu12` to the `cuda` extra. Keep `nvidia-cudnn-cu12` until the test above proves it unnecessary.
- **Glue code** (ours):
```python
import os, importlib.util, pathlib
for pkg in ("nvidia.cublas", "nvidia.cuda_runtime", "nvidia.cudnn"):
    spec = importlib.util.find_spec(pkg)
    if spec and spec.submodule_search_locations:
        b = pathlib.Path(list(spec.submodule_search_locations)[0]) / "bin"
        if b.is_dir():
            os.add_dll_directory(str(b))
            os.environ["PATH"] = str(b) + os.pathsep + os.environ["PATH"]
from faster_whisper import WhisperModel   # import only after PATH is set
```
- **Alternative DLL source:** Purfview's `CUDA12_v3` DLL bundle (cuBLAS 12.8.4.1 + cuDNN 9.8.0.87) ([releases](https://github.com/Purfview/whisper-standalone-win/releases)).
- **Reusing PyTorch's DLLs** only works with a **CUDA-12** torch build. PyPI's default torch is CUDA 13.0 from torch 2.11, so it cannot supply `cublas64_12.dll`.
- **Performance** (README, 13 min of audio; [README](https://github.com/SYSTRAN/faster-whisper)):

  | Setup | Time | Memory |
  |---|---|---|
  | large-v2, GPU fp16 | 63 s | 4.5 GB |
  | large-v2, GPU int8 | 59 s | 2.9 GB |
  | small, CPU int8 (8 threads, i7-12700K) | 102 s | — |

  **Batched ×8 uses 6.1 GB, so don't batch on 6 GB.**
- **Japanese word timestamps:** Japanese has no spaces, so "words" are split at Unicode boundaries between tokens (1 to a few characters). Punctuation such as 。、 attaches to the preceding unit ([tokenizer.py](https://raw.githubusercontent.com/SYSTRAN/faster-whisper/master/faster_whisper/tokenizer.py)). Group the units into phrases with fugashi.

---

## 8. Objective metric plan (listen-free QA)

| Metric | Package / model | Code lic | Weights lic | Windows | Notes |
|---|---|---|---|---|---|
| ASR round-trip WER (EN) | faster-whisper large-v3 / turbo + `jiwer` 4.0 + `whisper-normalizer` 0.1.15 | MIT / Apache-2.0 / MIT | Whisper MIT | OK | Normalise **both** sides with `EnglishTextNormalizer`; it maps "forty one point three percent" ↔ "41.3%" ([normalizer](https://raw.githubusercontent.com/openai/whisper/main/whisper/normalizers/english.py)). **Never pass the script as `initial_prompt` or `hotwords`** (hides errors). Log `avg_logprob`, `compression_ratio`, `no_speech_prob`. |
| ASR round-trip CER (JA) | same ASR (+ kotoba-whisper v2.0 cross-check) + `jiwer.cer` | as above | kotoba Apache-2.0 | OK | Normalise: NFKC → strip punctuation and whitespace → optional reading conversion with fugashi + unidic-lite (MIT/BSD) → `jaconv` (MIT) hira/kata/width. **Avoid pykakasi (GPL-3.0) in our code.** WER is meaningless for Japanese. |
| MOS predictor | **UTMOS22** via SpeechMOS `torch.hub.load("tarepan/SpeechMOS:v1.2.0","utmos22_strong",trust_repo=True)` ([repo](https://github.com/tarepan/SpeechMOS)) | MIT | MIT (repo) | OK (torch.hub) | 16 kHz. |
| MOS predictor | **UTMOSv2** ([repo](https://github.com/sarulab-speech/UTMOSv2)) | MIT | MIT | OK (needs timm; heavier) | `utmosv2.create_model(pretrained=True).predict(input_path=...)` |
| MOS predictor | DNSMOS via `torchmetrics.functional.audio.dnsmos` | Apache / MIT (DNS-Challenge repo) | ONNX (no separate licence) | OK (onnxruntime) | Built for noise suppression. The `speechmos` package was archived 2026-06. |
| MOS predictor | Distill-MOS (`pip install distillmos`) | MIT | MIT | OK | Noise-suppression domain. |
| Aesthetics | Audiobox Aesthetics (`audiobox_aesthetics`) | CC-BY 4.0 | CC-BY 4.0 | OK (UNVERIFIED) | CE/CU/PC/PQ axes ([repo](https://github.com/facebookresearch/audiobox-aesthetics)). |
| Intrusive-free objective | torchaudio `SQUIM_OBJECTIVE` (STOI/PESQ/SI-SDR estimates) | BSD | CC-BY 4.0 | OK | **Do not use `SQUIM_SUBJECTIVE` (CC-BY-NC)** or NISQA weights (CC BY-NC-SA). |
| Speaker consistency | **SpeechBrain ECAPA** `speechbrain/spkrec-ecapa-voxceleb` | Apache-2.0 | Apache-2.0 | OK with **`local_strategy=LocalStrategy.COPY_SKIP_CACHE`** (symlinks need admin, [#2836](https://github.com/speechbrain/speechbrain/issues/2836)) | Cosine similarity of each chunk vs (a) the master reference and (b) the running centroid. |
| Speaker consistency (2nd opinion) | WeSpeaker ONNX (VoxCeleb ResNet) | Apache-2.0 | CC BY 4.0 | OK | [pretrained](https://github.com/wenet-e2e/wespeaker/blob/master/docs/pretrained.md). `wavlm-base-plus-sv` is CC BY-SA 3.0: fine for internal metrics, ShareAlike only matters on redistribution. Resemblyzer is Apache-2.0 but stale, and its webrtcvad build may need a compiler. |
| Loudness | `pyloudnorm` | MIT | — | OK | Narration stem at **−16 LUFS integrated, ≤ −1 dBTP** (podcast norm). YouTube normalises playback to about −14 LUFS; that is widely measured, not an official Google spec (UNVERIFIED). |
| VAD / pauses | `silero-vad` | MIT | MIT | OK | `get_speech_timestamps(wav, model, return_seconds=True)`: leading/trailing silence, longest internal pause, pause-length distribution. |
| Pitch / prosody | `librosa.pyin` (ISC) | ISC | — | OK | F0 median, IQR and range per chunk; drift vs the reference. `praat-parselmouth` is **GPL-3.0**: OK as an internal tool, keep it out of distributed code. |
| Speaking rate | from forced alignment | — | — | — | EN words/min and syllables/s; JA mora/s (count kana). |
| Clipping | numpy | — | — | — | Count samples with \|x\| ≥ 0.999. Irodori often peaks at 1.0. |

**Automatic failure flags.** Compute each metric per chunk, then compare against **the voice's own baseline**: the median and MAD over a pilot of about 50 approved chunks. Flag a chunk if any of these trip:
1. WER or CER above baseline + k·MAD, or any deleted content word.
2. **Insertion bursts or repeated n-grams** in ASR output that are not in the script (loop or hallucination).
3. Alignment coverage: script words with ~0 duration or low scores (skipped words).
4. Seconds per character (or per mora) is a z-score outlier (truncation or rushing).
5. Leading or trailing silence, or an internal pause, over the limit.
6. Clipping.
7. LUFS off target.
8. UTMOS drop vs the voice median.
9. ECAPA similarity to the master or centroid below the voice's own 5th percentile.

WER misses prosody problems ([arXiv 2608.28970](https://arxiv.org/pdf/2608.28970)), so keep a light human spot-check.

**Biases to respect:**
- **MOS predictors penalise high pitch.** Correlation of predicted MOS with F0 on 100 Japanese speakers: UTMOS −0.53, UTMOSv2 −0.72, NISQA −0.53, DNSMOS −0.79; humans −0.06 ([arXiv 2606.19951](https://arxiv.org/html/2606.19951v1)). **Compare MOS only within one voice, never across candidate voices**, or the anime timbre will be unfairly ranked down.
- MOS models also barely react to stress misplacement or speaking-rate problems (same paper). Use MOS for artefacts, not delivery.
- **Cross-lingual speaker similarity is inherently lower.** Same-speaker cross-language EER was 5.18% vs 0.75% same-language ([arXiv 2607.22923](https://arxiv.org/html/2607.22923v1)).
  - For the Irodori→English identity score, report ECAPA similarity (EN output vs JA master) *relative to* two baselines: JA↔JA takes of the same voice, and the JA master vs other female voices.
  - For reference, CosyVoice2's same-language SIM-o is 0.652 (WavLM-based) vs 0.734 for human speech ([arXiv 2412.10117](https://arxiv.org/pdf/2412.10117)). Absolute thresholds don't transfer between encoders.
- **Pitch and ASR:** there is no direct evidence on ASR degradation for anime-style English TTS. Establish a per-voice pilot baseline first.


---

## 9. Text normalisation policy and pronunciation-risk test phrases

### 9.1 Why we normalise ourselves
- **No candidate reliably verbalises ML text on its own:**
  - Qwen3 and Irodori have no front-end at all.
  - Chatterbox only maps punctuation.
  - Kokoro, GPT-SoVITS and CosyVoice each have partial and inconsistent rules.
  - EmergentTTS-Eval found open models "misreading decimals, dropping digits" ([arXiv 2505.23009](https://arxiv.org/html/2505.23009v1)).
- **So the pipeline owns one normaliser per language.** Given display tokens, it emits:
  1. the **spoken string** sent to the TTS;
  2. the **display ↔ spoken token map** used by alignment (§7.3).
- **Engine-specific hooks** can still add a safety net: Kokoro `lexicon.golds`, GPT-SoVITS `userdict.csv`, Style-Bert-VITS2 / VOICEVOX / Aivis user dictionaries, IndexTTS `<word|kana>`, CosyVoice phoneme inpainting.

**Draft ML lexicon** (proposals; confirm by listening):

| Display | EN spoken form | JA spoken form (kana) |
|---|---|---|
| SFT | S F T | エスエフティー |
| DPO | D P O | ディーピーオー |
| PPO / GRPO | P P O / G R P O | ピーピーオー / ジーアールピーオー |
| RLHF | R L H F | アールエルエイチエフ |
| F1 | F one | エフワン |
| JSON | jay-son | ジェイソン |
| logits | low-jits (respell; or a Kokoro IPA override) | ロジット |
| held-out | held out | ホールドアウト (or 評価用に取り分けた) |
| tool-call | tool call | ツールコール |
| checkpoint | checkpoint | チェックポイント |
| LoRA | lora | ローラ |
| KL | K L | ケーエル |
| SOTA | so-ta (or "state of the art") | ソータ / 最先端 |
| GPT-4o | G P T four oh | ジーピーティーフォーオー |
| Qwen | chwen | クウェン |
| 7B / 70B | seven B / seventy B (or "billion") | ななビー / ななじゅうビー |
| pass@1 | pass at one | パスアットワン |
| 0.771 | zero point seven seven one | れいてん なな なな いち (joined: れいてんなななないち) |
| 41.3% | forty-one point three percent | よんじゅういってんさんパーセント |
| 3e-4 | three times ten to the minus four | さんかけるじゅうのマイナスよんじょう |
| − (U+2212) | minus | マイナス (Irodori *deletes* U+2212) |

**Japanese decimals:** digits after the point are read one by one, not as a number (0.771 is not ななひゃくななじゅういち). Several research notes contained miscounted な-runs for 0.771, so **generate these strings programmatically, not by hand.** Test both the joined and the spaced/中黒 forms, because separators may add pauses.

### 9.2 How to run the phrase tests

Use every phrase **verbatim** (raw script text) *and* in its **pre-normalised** form (what the text front-end will actually receive) to separate "model can't say it" from "front-end mangled it". Score each with ASR round-trip (after Whisper-normaliser) + a manual spot-check column. Expected readings are what a calm narrator should say; alternatives in brackets are acceptable.

### 9.3 English test phrases (EN-1 … EN-40)

| ID | Test text (raw) | Expected spoken form | Risk being probed |
|---|---|---|---|
| EN-1 | We fine-tune with SFT, then apply DPO. | "ess-eff-tee", "dee-pee-oh" | letter-by-letter acronyms vs. read as a word ("sft"/"dpo") |
| EN-2 | The F1 score rose from 0.712 to 0.771. | "eff-one", "zero point seven one two" / "point seven seven one" | F1 (car racing?) ; decimal digit-by-digit vs "seven hundred seventy-one" |
| EN-3 | Accuracy improved by 41.3% on the held-out set. | "forty-one point three percent", "held-out" | percent sign, decimal, hyphenated compound |
| EN-4 | The model outputs logits, not probabilities. | "LOH-jits" | rare ML word; often "log-its"/"low-gits" |
| EN-5 | Each tool-call returns JSON. | "tool call", "JAY-son" | hyphen compound; JSON as word vs "J-S-O-N" |
| EN-6 | We saved a checkpoint every 500 steps. | "five hundred" | plain number, compound noun |
| EN-7 | RLHF, PPO, and GRPO are compared in Table 3. | "ar-el-aitch-eff", "pee-pee-oh", "gee-ar-pee-oh" | 4-letter acronyms in a list |
| EN-8 | LoRA with rank r = 16 and alpha = 32. | "LOR-ah", "r equals sixteen" | mixed-case acronym read as word; single-letter variable |
| EN-9 | The loss is L = −log p(y given x). | "L equals minus log p of y given x" | minus sign (U+2212), function-call parens |
| EN-10 | Softmax of z sub i over the sum of exp z sub j. | as written | spoken equation, "sub" |
| EN-11 | We train on 1.2B tokens with a 7B model. | "one point two billion", "seven billion" / "seven-B" | B suffix ambiguity |
| EN-12 | Learning rate 3e-4, batch size 256. | "three e minus four" / "three times ten to the minus four" | scientific notation |
| EN-13 | GPT-4o and Qwen2.5-7B-Instruct were evaluated. | "G-P-T four-oh", "Qwen two point five seven B instruct" | model names with digits/hyphens; "Qwen" = "chwen" |
| EN-14 | The p-value was below 0.05. | "p value", "zero point zero five" | hyphen + leading zero |
| EN-15 | KL divergence, β = 0.1. | "K-L", "beta equals zero point one" | Greek letter glyph |
| EN-16 | Top-k = 50, top-p = 0.95. | "top K equals fifty" | hyphen + single letter |
| EN-17 | Pass@1 went from 38.0 to 52.4. | "pass at one" | @ symbol; trailing .0 |
| EN-18 | We used an A100 and an RTX 4050. | "A one hundred", "R-T-X forty fifty" | alphanumeric hardware names |
| EN-19 | Figure 2(b) shows the ablation. | "figure two b" | parenthesised sub-labels |
| EN-20 | The 95% CI is [0.74, 0.79]. | "ninety-five percent C-I … from zero point seven four to zero point seven nine" | brackets/ranges |
| EN-21 | Latency dropped 2× — from 120 ms to 60 ms. | "two times", "milliseconds" | × glyph, em dash, unit abbreviations |
| EN-22 | Tokens/sec increased to 1,250. | "tokens per second", "one thousand two hundred fifty" | slash, thousands separator |
| EN-23 | It's a SOTA result on MMLU and GSM8K. | "SO-tah", "M-M-L-U", "G-S-M eight K" | acronym read-as-word vs letters |
| EN-24 | The reward model (RM) was frozen. | "R-M" | parenthetical acronym |
| EN-25 | We compare vs. the baseline, i.e., the SFT-only model. | "versus", "that is" | Latin abbreviations with periods (sentence-split risk!) |
| EN-26 | In 2024, context grew to 128k tokens. | "twenty twenty-four", "one hundred twenty-eight K" | year reading; k suffix |
| EN-27 | ReLU, GELU, and SwiGLU activations. | "RAY-loo", "JEE-loo", "SWIG-loo" | camel-case coined words |
| EN-28 | The API returns HTTP 429. | "A-P-I", "four twenty-nine" | status code |
| EN-29 | Use `temperature=0.7`. | "temperature equals zero point seven" | code formatting / backticks / = |
| EN-30 | x̂ = argmax over y of P(y \| x). | "x hat equals arg max over y of P of y given x" | combining diacritic, pipe |
| EN-31 | The approx. cost is ~$3.50. | "approximately three dollars fifty" | tilde, currency |
| EN-32 | Held-out, in-distribution, and out-of-distribution (OOD) splits. | "O-O-D" | chain of hyphen compounds |
| EN-33 | Dr. Chen et al. reported 91.0 F1. | "Doctor", "et al" | abbreviation periods → false sentence break |
| EN-34 | Step 1: tokenize. Step 2: embed. Step 3: attend. | natural pauses | colon pauses, very short sentences |
| EN-35 | This is not a bug; it's a feature. | natural semicolon pause | punctuation-driven prosody |
| EN-36 | Seven. Point. Seven. One. | four separate words | ultra-short utterances (hallucination/trailing noise risk) |
| EN-37 | (a 300-word paragraph with no line breaks) | — | long-input truncation / repetition / skipped sentences |
| EN-38 | The word "the" appears 3 times: the, the, the. | — | repetition-loop trigger |
| EN-39 | Q, K, and V are projected by W_q, W_k, W_v. | "W sub q" | underscores, single letters |
| EN-40 | DeepSeek-R1 vs. o3-mini on AIME '25. | "o three mini", "AIME twenty-five" | lowercase model names, apostrophe year |

### 9.4 Japanese test phrases (JA-1 … JA-20)

Test each in three forms: (A) raw mixed-script, (B) with Latin acronyms/numbers converted to katakana/kanji readings, (C) fully kana. Expected readings are proposals for a narrator style guide.

| ID | Raw text | Suggested normalised form (B) | Risk |
|---|---|---|---|
| JA-1 | まずSFTで微調整し、次にDPOを適用します。 | まずエスエフティーで微調整し、次にディーピーオーを適用します。 | Latin acronym in JA text; silent skip or English-accented read |
| JA-2 | F1スコアは0.712から0.771に向上しました。 | エフワンスコアはゼロてん・なな・いち・にから、ゼロてん・なな・なな・いちに向上しました。 | decimal reading convention (れい vs ゼロ; digits after the point read one by one, not "ななひゃくななじゅういち") |
| JA-3 | 保持データで精度が41.3%改善しました。 | 保持データで精度がよんじゅういってんさんパーセント改善しました。 | % and decimal; 保持 reading |
| JA-4 | モデルはロジットを出力します。 | (already katakana) | loanword accent |
| JA-5 | ツールコールはJSONを返します。 | ツールコールはジェイソンを返します。 | JSON reading |
| JA-6 | 500ステップごとにチェックポイントを保存しました。 | ごひゃくステップごとに… | number + counter |
| JA-7 | 学習率は3e-4です。 | 学習率はさんかけるじゅうのマイナスよんじょうです。 | scientific notation |
| JA-8 | 7Bモデルと70Bモデルを比較します。 | ななビーモデルとななじゅうビーモデル… | B suffix |
| JA-9 | RLHFとGRPOの違い | アールエルエイチエフとジーアールピーオーの違い | long acronyms |
| JA-10 | 損失関数はL = −log p(y\|x)です。 | 損失関数はエル イコール マイナス ログ ピー、ワイ ギブン エックスです。 | equation in JA |
| JA-11 | GPT-4oとQwen2.5を評価しました。 | ジーピーティーフォーオーとクウェンにーてんご… | model names |
| JA-12 | 2024年に文脈長は128kトークンになりました。 | にせんにじゅうよねん… ひゃくにじゅうはちケー | year + k suffix |
| JA-13 | 上位k個の候補 | 上位ケー個の候補 | single Latin letter + counter |
| JA-14 | 評価指標はpass@1です。 | パスアットワン | @ symbol |
| JA-15 | 行って / 行った / 行う (context-dependent readings) | — | kanji yomi ambiguity (いって/おこなって) |
| JA-16 | 今日は重要な日です。 | — | 今日 きょう/こんにち; 重要 accent |
| JA-17 | 生成された音声 | — | 生成 せいせい; pitch accent |
| JA-18 | 約1,250トークン/秒 | やくせんにひゃくごじゅうトークン毎秒 | comma separator, slash |
| JA-19 | 図2(b)を参照してください。 | 図にのビーを参照… | parenthesised label |
| JA-20 | (300-character paragraph, no 。 for 120 chars) | — | long-sentence truncation / breath placement |

---

## 10. Benchmark protocol and open questions

### 10.1 Suggested protocol (for whoever runs the benchmark)

**1. Master voice.** In Irodori, generate the caption proposals in §3.6 × 4 seeds × 2 precisions (bf16, int8).
- Pick one master voice from them.
- Freeze `master_ja.wav` (8–15 s), `master_ja_set/` (~30 s), and the transcript.

**2. Japanese track.** Run Irodori (and Qwen3 1.7B as a comparison) on JA-1…JA-20.
- Test forms A, B and C (§9.4).
- Chunk at ≤70 characters.
- Score each chunk with CER, ECAPA similarity to the master, UTMOS (compare within the voice only), and RTF.

**3. English track.** For each cloner, run EN-1…EN-40 plus a ~5-minute real narration script.
- Cloners to cover:
  - Qwen3 1.7B-Base and 0.6B-Base, each in ICL and x-vector mode, on both qwen-tts and faster-qwen3-tts.
  - Chatterbox Multilingual V3 (`language_id="en"`, `cfg_weight` 0 vs 0.5), original, and Turbo.
  - CosyVoice3 cross-lingual.
  - GPT-SoVITS (`prompt_lang=ja`).
  - Stretch: IndexTTS-2.5, VoxCPM2.
- Run each with 3 seeds, using a fixed reference and prompt.
- Repeat with the **bootstrapped `master_en.wav`**.

**4. Fallback track (no cloning).**
- Qwen3 1.7B CustomVoice: Serena, Ono_Anna and Vivian, each with and without a calm `instruct`.
- Qwen3 1.7B VoiceDesign, then Base clone.
- Kokoro af_heart, af_bella and af_nicole, plus blends with jf_alpha.

**5. Per run, record:**
- peak VRAM, measured both inside the process and with nvidia-smi
- load time, s/s, first-audio latency
- OOM or crash
- WER on the raw vs normalised input
- the failure flags from §8
- ECAPA similarity for EN output vs `master_ja.wav`, relative to baselines

Also capture an accent-leak listening score (1–5): this is the one metric that needs ears.

**6. Long-form test.** Take the best two cloners and run a 10-minute script in sentence chunks. Plot ECAPA similarity, F0 median and speaking rate per chunk to see drift (the Qwen3 #220 / #239 risks).

### 10.2 Open questions / UNVERIFIED register (resolve these in the benchmark)
- **VRAM on 6 GB:**
  - Qwen3 1.7B with sdpa in bf16 (peak), both the official package and faster-qwen3-tts.
  - Chatterbox original and Multilingual V3 (reported at 6–7 GB).
  - IndexTTS-2.5 in bf16.
  - VoxCPM2.
  - GPT-SoVITS v2ProPlus.
- **Accent leakage from a Japanese reference into English** for every cloner. None has a published measurement. Also: whether Qwen3 `x_vector_only_mode` and Chatterbox `cfg_weight=0` actually reduce it.
- **Irodori itself:**
  - English-accent-free timbre transfer: does the designed timbre survive cross-lingual cloning recognisably?
  - Is 「アニメ風」 understood in Irodori captions?
  - Does the SilentCipher watermark in the reference clip affect cloning?
  - SilentCipher weights licence (unstated by Sony).
  - Irodori training-data provenance (undisclosed).
  - Irodori under Python 3.12 (the repo defaults to 3.10).
- **Whether the documented install paths hold up:**
  - Does Chatterbox V3 / Nano need the git install?
  - Does `uv pip install -r requirements.txt` work for CosyVoice outside conda?
  - Does qwen-tts work with torch 2.10?
  - Does faster-qwen3-tts co-install with qwen-tts?
- **Voice quality and legal checks:**
  - How Ono_Anna and Serena sound reading English.
  - How Kokoro jf_* voices sound reading English.
  - The Pocket TTS per-preset dataset licences.
- **faster-whisper and ctranslate2 4.8.x:**
  - Is `nvidia-cudnn-cu12` truly unnecessary?
  - Does `os.add_dll_directory` alone suffice?
- **Qwen3-ForcedAligner** without FlashAttention on Windows: speed and memory.
- YouTube synthetic-content disclosure requirements for a synthetic narrator voice (policy check, not researched).

### 10.3 Sub-research provenance
This document synthesises seven parallel research passes run on 2026-09-28:
- Qwen3-TTS
- Chatterbox and Kokoro
- the CosyVoice / IndexTTS / F5 / Spark / Zonos / Dia / CSM / Orpheus / OuteTTS / NeuTTS group
- the Kitten / VibeVoice / Higgs / MOSS / Fish / StyleTTS2 / Piper / Supertonic / Soprano / Melo / Parler / XTTS group, plus 2026 releases
- anime-voice projects
- Irodori-TTS
- alignment and metrics

Five load-bearing claims were then re-fetched directly:
- Irodori v4.1-Small card: MIT, Japanese-only, SilentCipher, ethical restrictions.
- IndexTTS-2.5 card: bilibili licence, "roughly 6 GB", Japanese.
- VoxCPM2 card: Apache-2.0, "~8 GB", Japanese.
- Qwen3-ForcedAligner card: Apache-2.0, EN + JA, ≤5 min.
- faster-qwen3-tts README: RTX 4060 Windows RTF 1.83 / 2.26, where RTF > 1 is faster than real time.
