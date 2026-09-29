# Licensing

This page covers what the pipeline **actually uses**. The wider survey of 60+ candidates, with sources and check dates (2026-09-28), is in [`research/frameworks/license-audit.md`](../research/frameworks/license-audit.md) and [`research/tts/tts-landscape.md`](../research/tts/tts-landscape.md).

**Summary:**

- Every core dependency is OSI-licensed. Nothing on the default path costs money or calls a cloud service.
- No custom-licensed framework (Remotion, GSAP, Theatre Studio, Editframe, Twick) is used.
- Remotion remains a possible *adapter*, never the core.

## Core runtime

| Component | Why we use it | License | Notes |
|---|---|---|---|
| React 19 + react-dom | Scenes as pure functions of the frame | MIT | |
| Vite 8 | Preview server, and the page the renderer captures | MIT | |
| Playwright 1.63 + Chromium headless shell | Deterministic seek-and-screenshot capture | Apache-2.0 / BSD-3-Clause | Local only |
| TypeScript 7, tsx, Vitest | Build, CLI, tests | Apache-2.0 / MIT / MIT | |
| zod 4, yaml 2 | Project and schema validation | MIT / ISC | |
| Shiki 4 | Code panels (real repo code, highlighted) | MIT | Bundled grammars and themes: mostly MIT |
| Manim Community 0.21 (+ pycairo, manimpango, PyAV) | Math and geometric exhibits | MIT (pycairo LGPL-2.1/MPL-1.1; Pango LGPL) | Used unmodified as libraries |
| typst-py 0.15 | Equations in Manim (no TeX install) | Apache-2.0 | |
| FFmpeg 8.1 (gyan "full" build) | Scene encode, Manim compositing, concat, subtitles, loudness; the cast track's transparent VP9 (its libvpx, BSD-3-Clause) | **GPL-3.0-or-later as built** (x264/x265) | Fine for local tool use. **Do not redistribute the binary** without GPL compliance. No `--enable-nonfree` |
| faster-whisper + Whisper large-v3-turbo | Alignment and ASR round-trip QA | MIT / MIT | Local, CUDA or CPU |
| numpy, scipy, soundfile, pyloudnorm, rapidfuzz, PyYAML | Audio mix, ducking, loudness, QA | BSD / BSD / BSD / MIT / MIT / MIT | |

## Voices (TTS)

| Engine | Used for | Code / weights | Terms on the output |
|---|---|---|---|
| **Irodori-TTS v4.1** | Japanese narrator (voice designed from a text caption; emoji tones) | MIT / MIT + **Ethical Restrictions** | No cloning or impersonation without consent, no deepfakes or misleading speech. The maintainer confirmed that monetised video is fine (issue #32). It embeds a SilentCipher watermark |
| **Kokoro-82M** | English narrator: preset `af_heart` (the launch film's voice), directed per line by editing the predicted pitch contour and pace | Apache-2.0 | None |
| Qwen3-TTS 1.7B CustomVoice | Rejected English narrator (preset Serena, directed per line); the owner found it robotic | Apache-2.0 | None |
| Qwen3-TTS (0.6B / 1.7B Base) | Earlier English clone | Apache-2.0 | None |
| Chatterbox (Turbo / Multilingual) | English candidate | MIT | The PerTh watermark is always on; keep it |

The benchmarks and the choice are recorded in `research/tts/benchmark.md`, `research/tts/emotion-tags.md` (emotion control; Fish S2 and Higgs v3 excluded on non-commercial terms) and `voices/narrator-*.yaml`.

**Rules:**

- **No real person's voice** is cloned or imitated. The narrator is a synthetic voice designed from a text description.
- **Each voice file records its provenance** in a `provenance:` field.
- **Rejected for licence reasons:** F5-TTS, XTTS-v2, OuteTTS 1B, Fish S2 / OpenAudio (non-commercial or research terms), and anything derived from AivisSpeech "Anneli" (trained without consent).

## Characters (the cast: Graddy-chan and the kōhai)

| Component | Why we use it | Licence | Notes |
|---|---|---|---|
| OpenAI image generation via the Codex CLI | Painted character art: base designs plus open-mouth and closed-eye edits | OpenAI terms: the user owns the outputs | Original characters; the prompts are in `build/cast/designs/codex/*.log`. Both characters are drawn as adults |
| See-through (shitagaki-lab) | Splits one illustration into up to 23 inpainted, semantically named layers (PSD) | Code Apache-2.0. Weights: LayerDiff3D and Marigold NF4 under **OpenRAIL++-M**, SAM body parsing under Apache-2.0 | OpenRAIL use restrictions (no harmful uses) carry over. Runs locally in `third_party/see-through` |
| PSD2Live 1.4.2 | Auto-rigs the layered PSD into a Live2D model (`.moc3`, `.cmo3`, physics, motions) from its CLI and MCP | **GPL-3.0**. It is used as a tool; the model files it writes are our data, not its code | Its `.moc3` writer is a clean-room reimplementation of Live2D's format. Live2D's EULA forbids reverse engineering Live2D's *software* and does not address files written by other tools. **The owner chose, on 2026-09-29, to use PSD2Live's output directly rather than re-export through the official Cubism Editor, accepting that grey area** |
| Live2D Cubism Core for Web 5-r.5 | Runs the model in the browser renderer | Live2D Proprietary Software License, redistributable files (`third_party/cubism-core`) | The SDK release licence is free for individuals and small businesses under ¥10M annual sales. Our in-house renderer for our own videos is not an "expandable application" |
| Live2D Cubism Web Framework 5-r.5 | Loads, poses and draws the model (`packages/cast/live2d`) | Live2D Open Software License | Vendored in `third_party/CubismWebFramework`, unmodified |
| Kokoro-82M phoneme durations (`py/tts/kokoro/timings.py`) | English lip-sync: the duration Kokoro predicted for each phoneme of a line it already spoke, checked against the WAV's length to the sample | Apache-2.0 (the same engine as the narration) | No new dependency |
| vidmora aligner: `prj-beatrice/japanese-hubert-base-phoneme-ctc-v4` (HuBERT + CTC over OpenJTalk phonemes) | Japanese mora timings for lip-sync (Irodori exposes none); it only analyses our own audio and generates no voice | Apache-2.0 | Trained on ReazonSpeech (CDLA-Sharing-1.0; Japanese Copyright Act Art. 30-4, analysis use). No dataset content is reproduced. Runs in `py/mora` |
| pyopenjtalk-plus (OpenJTalk G2P), sudachipy, sudachidict-core | Text to OpenJTalk phonemes, the aligner's targets | MIT (OpenJTalk: modified BSD) / Apache-2.0 / Apache-2.0 | Local; `py/mora` only |
| transformers 5.x, torch 2.10 (CPU) | Run the HuBERT-CTC model in `py/mora` | Apache-2.0 / BSD-3-Clause | Isolated from `py/media` |

## Fonts (all rendered into frames; the files stay in the repo)

| Font | Role | License |
|---|---|---|
| Archivo (variable width and weight) | Question line, terms, titles, body | OFL-1.1 |
| JetBrains Mono | Labels, breadcrumb, values, code | OFL-1.1 |
| STIX Two Math / Text | Equations | OFL-1.1 (Reserved Font Name "TM Math") |

Rendering glyphs into video creates no obligation. The OFL texts are kept next to the font files in `packages/design/fonts/`. If you subset or modify a font file for redistribution, rename it as the RFN clauses require.

## Audio assets

- **Sound effects** (`tick`, `thump`, `whoosh`, `stamp`, `impact`) and the fallback `pulse` bed are synthesised procedurally in `py/media/src/vidmedia/`, so they are license-free.
- **The pilot's music** is two tracks the project owner generated with **Google Flow** (music) on a paid plan. The owner confirmed on 2026-09-29 that the plan covers publishing the output. The files and their provenance are in `projects/opengrad-study-001/assets/music/` (`PROVENANCE.md`).
  - They were generated from text prompts written for this film, with no reference audio and no named artist.
  - Prompt 1, "Graph Paper Learning" (the setup): *Instrumental underscore for a calm, curious science explainer video about how an AI model learns. 92 BPM, 4/4, A minor moving to C major. Felt piano playing sparse broken chords, soft pizzicato strings, a warm analog synth pad, a gentle muted kick on beats 1 and 3, very light shaker. Mood: curious, focused, quietly optimistic, like watching an idea being worked out on graph paper. Understated and steady: no drops, no risers, no big build-ups, no sudden hits, no vocals, and no lead melody that competes with a narrator; keep the midrange clear for speech. Two-bar intro with no long fade-in, then consistent energy with small variations every 16 bars so it can be cut anywhere. End on a sustained A minor chord. Length 3 minutes.*
  - Prompt 2, "Hidden Flaw Discovery" (from the alarm to the end): *Instrumental underscore for the second half of a science explainer about discovering a hidden flaw in an AI experiment. 92 BPM, 4/4, A minor. Opens sparse and quietly tense: a low sustained cello and synth drone, a soft ticking pulse, felt piano repeating one quiet two-note figure. Gradually opens up: a warmer pad arrives and the piano chords move through F major and C major, a feeling of understanding rather than triumph. The final 30 seconds are hopeful and settled, ending on a clean held A minor add9 chord that rings out naturally for about 5 seconds (a real ending, not a fade-out). No vocals, no drums louder than a soft kick, no drops, no risers, no sudden hits; keep the midrange clear for a narrator. Length 3 minutes.*
  - The owner used the second take of prompt 2.
- **Any other music:** record its licence next to the file, and prefer CC0 or a licence you hold.
- **Avoid MusicGen** (CC-BY-NC-4.0).

## Content

On-screen numbers and code come from the OpenGrad repository at a pinned commit, with `src` pointers in `data/study001.json`. The OpenGrad repository's own license governs that code: quote it with attribution, as the `CodePanel` source labels do.

## Telemetry

Nothing in the default pipeline phones home:

- **Playwright** does not phone home.
- **Vite** is only a local dev server.
- **Hugging Face downloads** happen once, at setup.
- **HyperFrames** is not used. If you add it as an adapter, set `HYPERFRAMES_NO_TELEMETRY=1`.
