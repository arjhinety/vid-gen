# Emotion / semantic control for the narrator: local TTS survey and test

*Run 2026-09-29 on the target machine (RTX 4050 Laptop 6 GB, 16 GB RAM, Windows 11). Desk research is dated the same day; anything I could not confirm from a primary page is marked **UNVERIFIED**. Every number in the test tables is measured (`research/tts/emotion/results.json`). Listen: **`research/tts/emotion/listen.html`**.*

> **The owner's ears decide.** The metrics below show that directions change the audio (pitch, rate, pauses) and that no tag is read aloud. They cannot say whether the delivery sounds right. I could not listen to any clip. Open `listen.html` first.

## 1. Recommendation (short)

| | Pick | Why | Cost |
|---|---|---|---|
| **EN** | **Qwen3-TTS 1.7B CustomVoice** (`Serena`), one natural-language `instruct` per line | Only engine I tested with EN that is fast, fits, stays intelligible and reacts to the instruction: ASR error 0.0 % in both conditions, RTF 0.64, 4.5 GB VRAM, Apache-2.0. Directed lines move F0 clearly (gravity line L3 median 260 to 214 Hz; surprise line L4 244 to 339 Hz, F0 SD 6.5 to 8.3 st). | It is **not the Kokoro `af_heart` house voice**. Different timbre, slower (2.2 vs 3.0 words/s), 3.4 GB more VRAM, RTF 0.64 vs 0.05. |
| **JA** | **Irodori v4.1-Small (current voice) with stacked emoji tags** | Same frozen `heroine` master, so identity is unchanged. Single emoji do almost nothing; **two stacked emoji per clause** widen the pitch range (SD 4.20 to 5.44 st, 10-90 range 10.8 to 12.6 st) with no spoken tags. | One line came back with a spoken elongation "ー!" (CER 4.5 % on that line). Effect is a bit random ("not always perfectly consistent" per the model card). |
| Fallbacks | EN: Kokoro `af_heart` (no direction) or Qwen3 with `instruct` on the key lines only. JA: Irodori neutral (identical to the current output). | | |

Do not adopt VoxCPM2 on this laptop (section 3).

## 2. Shortlist table (desk research)

Columns: how control works, languages / size, VRAM, Windows, license, voices, evidence. "Tested" = run here.

| Model | Control | Languages / params | VRAM | Windows | License (monetised YouTube?) | Voices | Evidence / status |
|---|---|---|---|---|---|---|---|
| **Irodori-TTS v4.1-Small** | Emoji in the text (44-item palette: 😲 surprise, 😏 teasing, 🙄 exasperated, 😟 worry, 🐢 slow, ⏸️ pause, 💪 forceful, 😌 relief, 📖 narration ...), plus `caption` | JA only, 0.8B | 3.7-3.8 GB torch reserved (measured, bf16) | Works (already in use) | MIT with ethical restrictions (no impersonation, no deceptive deepfakes): OK | Caption design, reference clone (our synthetic master) | **Tested.** Exact emoji list read from the pinned checkout `irodori_tts/gradio_emoji_palette.py`; the README has no full list and no `EMOJI_ANNOTATIONS.md` exists in the checkout. The model card says emoji effects "may vary depending on context and [are] not always perfectly consistent". |
| **Qwen3-TTS 1.7B CustomVoice** | `instruct` string per call (free text, any language) | 10 languages incl. EN, JA; 1.7B | 4.5 GB reserved, 4.7 GB smi peak (measured); host commit 7.8 GB | Works via faster-qwen3-tts | Apache-2.0: OK | 9 fixed presets (Serena, Vivian, Ono_Anna ...); no clone in CustomVoice | **Tested EN and JA.** 0.6B ignores `instruct`. |
| Qwen3-TTS 1.7B VoiceDesign | Voice description string | as above | ~4-5 GB | as above | Apache-2.0 | Designed | **Not tested**: weights not cached, 4.2 GB would exceed the disk budget. |
| **VoxCPM2** (OpenBMB) | `(description)text` prefix; voice design and controllable clone | 30 languages incl. EN, JA; 2B | Claimed ~8 GB; **measured 5.7-6.5 GB reserved, at the 6 GB ceiling** | pip install works; no triton so no compile | Apache-2.0 (per model card): OK | Design, clone | **Tested EN, EN-clone, JA.** Reacts strongly but fails the practical bar (section 3). |
| Chatterbox Multilingual V3 / Turbo | `exaggeration` scalar (intensity only); Turbo adds `[laugh] [chuckle] [cough]` | V3 23+ langs; Turbo EN 350M | 4.3-6.1 GB | Works, very heavy host RAM (8-10.5 GB commit) | MIT: OK | Clone | **Not re-tested.** `research/tts/benchmark.md` already showed RTF ~1.0, paging on this machine, Turbo WER 7.4 %. Tags are non-verbal sounds, not emotions. |
| Orpheus 3B (Canopy) | Tags `<laugh> <sigh> <gasp> <chuckle> <yawn> ...` + preset voices (tara, leah, ...) | EN, 3B (Llama-3.2 backbone) | GGUF Q4 reported as fitting small GPUs (UNVERIFIED for 6 GB) | llama.cpp route, not tried | HF card says Apache-2.0; base is Llama 3.2 (Llama license attribution may apply: UNVERIFIED) | Presets | **Not tested**: needs a GGUF + SNAC decoder stack; tags are non-verbal sounds, not "disbelief". |
| Maya1 (Maya Research) | `<description="...">` voice brief + inline tags `<laugh> <whisper> <angry> <sigh> <gasp> <cry>` (20+) | EN, 3B, SNAC | Card says 16 GB+; 4-bit "fits 6 GB" is a blog claim: UNVERIFIED | Not tried | Apache-2.0 | Designed by description | **Not tested**: bf16 will not fit; quantised path unproven. |
| CosyVoice3 (Fun-CosyVoice3-0.5B-2512) | Instruction text before `<\|endofprompt\|>` | 9 languages incl. EN, JA; 0.5B | UNVERIFIED (small) | Repo has no Windows notes; deps (pynini/WeText) are a known risk: UNVERIFIED | Apache-2.0 | Zero-shot clone | **Not tested**: download plus deps exceeded the disk budget after VoxCPM2. Worth a follow-up, since it is the only small model with JA instruct. |
| IndexTTS-2 | Emotion reference audio, 8-float emotion vector, or text emotion | ZH/EN (2.5 adds JA: UNVERIFIED) | UNVERIFIED | DeepSpeed hard on Windows | "bilibili Model Use License Agreement": terms not confirmed, treat as **custom/UNVERIFIED for commercial use** | Clone | Not tested. |
| Zonos v0.1 | 8-dim emotion vector, rate, pitch | EN, JA, ZH, FR, DE | 6 GB+ | Linux/macOS official, Windows experimental fork | Apache-2.0 | Clone | Not tested (Windows risk, at the VRAM ceiling). |
| Dia / Dia2 (Nari) | Speaker tags + `(laughs)` style non-verbals | EN; 1.6B / 1B / 2B | ~10 GB (Dia 1.6B) | - | Apache-2.0 | Clone | Not tested: too large; non-verbal only. |
| Fish Audio S2 (Pro) | Inline `[whisper] [excited] [angry]` | Multilingual | UNVERIFIED | - | **Fish Audio Research License; paid license for commercial use**: excluded | - | Excluded on license. |
| Higgs Audio v3 (4B) | Inline emotion / style tags | 100+ languages | too large | - | **Research and Non-Commercial License**: excluded (v2 code was Apache-2.0) | - | Excluded. |
| Step-Audio-EditX | Emotion / style edit tags on a reference clip | ZH, EN, JA, KO; 3B | 12 GB optimal | - | Apache-2.0 | Needs reference clip | Too large. |
| MOSS-TTS | - | - ; 8B production model | too large | - | Apache-2.0 (search-result claim) | Clone | Too large. |
| Kani-TTS-2 (EN) | Emotion control not confirmed | EN, 400M | 3 GB claimed | - | UNVERIFIED | Speaker embedding | Not tested: no confirmed emotion mechanism. |
| Spark-TTS | Coarse gender/pitch/speed attributes | ZH, EN | - | - | UNVERIFIED | - | Not researched further; attributes are global, not per-emotion. |
| Kokoro-82M (baseline) | None | EN (JA weak), 82M | 0.7 GB | Works | Apache-2.0 | Presets | Current EN voice. |

Sources: [Irodori-TTS v4.1-Small](https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small), [Irodori repo](https://github.com/Aratako/Irodori-TTS), [Qwen3-TTS CustomVoice](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice), [VoxCPM2](https://huggingface.co/openbmb/VoxCPM2), [Chatterbox-Turbo](https://huggingface.co/ResembleAI/chatterbox-turbo), [Orpheus](https://huggingface.co/canopylabs/orpheus-3b-0.1-ft), [Maya1](https://huggingface.co/maya-research/maya1), [CosyVoice](https://github.com/FunAudioLLM/CosyVoice), [IndexTTS](https://github.com/index-tts/index-tts), [Zonos](https://github.com/Zyphra/Zonos), [Higgs Audio](https://github.com/boson-ai/higgs-audio), [Step-Audio-EditX](https://huggingface.co/stepfun-ai/Step-Audio-EditX), [Kani-TTS-2](https://huggingface.co/nineninesix/kani-tts-2-en), [Fish Audio S2](https://fish.audio/s2/).

## 3. Empirical test

**Setup.** Six lines (`research/tts/emotion/lines.py`), synthesised once neutral and once directed, one line per call, seed 1234, each engine in its own environment, one GPU process at a time. Text scored against is the clean line (no tag, no instruction). Adapters: `py/tts/qwen3/run.py` (now accepts a per-item `instruct`), `py/tts/irodori/run.py` (now accepts `per_item_caption`), new `py/tts/voxcpm/` (pinned `pyproject.toml`, `run.py`). Harness: `research/tts/emotion/run_emotion.py`, metrics `analyze.py`.

**Metrics.**
- *Pitch SD* and *10-90 range*: F0 (librosa.yin, same code as `voice_match_score.py pitch()`), in semitones relative to each clip's median, **pooled over the 6 clips** (so each cell is 6 lines, not a whole passage; the current-voice figures 5.0 / 4.2 in the voice files come from longer passages).
- *ASR error*: faster-whisper large-v3-turbo (CPU int8), beam 5, fixed language, WER for EN, kana CER for JA, against the clean text. A spoken tag or instruction would show up as insertions.
- *Rate*: EN words per second, JA mora per second, over the active speech span.
- RTF is seconds of compute per second of audio (median, after warm-up). VRAM is `torch.cuda.max_memory_reserved`. Host RAM is process private commit.

### 3.1 English

| Engine / condition | Pitch SD (st) | 10-90 range (st) | WER mean (max) | Words/s | Median F0 Hz |
|---|---|---|---|---|---|
| **Baseline Kokoro af_heart** (exact test lines, no direction possible) | 5.32 | 10.10 | 2.4 % | 2.96 | 204 |
| Qwen3 1.7B CV Serena, neutral | 5.17 | 10.16 | 0.0 % | 2.20 | 244 |
| **Qwen3 1.7B CV Serena, directed** | **5.85** | 10.76 | **0.0 %** | 2.21 | 232 |
| VoxCPM2 design, neutral | 5.74 | 12.04 | 2.4 % | 2.44 | 232 |
| VoxCPM2 design, directed | 6.00 | 11.59 | 4.5 % (14.3 %) | 2.57 | 254 |
| VoxCPM2 clone of our EN master, neutral | 4.77 | 10.73 | 6.8 % | 2.32 | 264 |
| VoxCPM2 clone of our EN master, directed | 5.09 | 10.14 | 2.1 % (12.5 %) | 2.19 | 262 |

The pooled pitch SD is a blunt measure: the intended emotions are different for each line, so they push F0 in different directions. Per-line effect for Qwen3 (neutral to directed): L1 duration 3.04 to 2.64 s; L3 (gravity) F0 260 to 214 Hz and duration 3.6 to 4.0 s; L4 (surprise) F0 244 to 339 Hz, SD 6.5 to 8.3 st; L5 (reveal) 4.3 to 3.6 s; L6 (resolve) 4.5 to 5.0 s. All twelve Qwen3 clips round-trip with 0 % WER, so the instruction text is not spoken.

**VoxCPM2 verdict: the control is strong but the engine is not usable here.**
- Speed: RTF 3.0-4.4 (3 to 4 times slower than real time; Qwen3 is 0.64).
- Memory: 5.7-6.5 GB reserved on a 6.1 GB card, 0.78 GB spilled into shared memory in one run, host commit up to 21 GB, first load 542 s (cold disk) and 76-167 s warm.
- Timbre: the design-mode voice is re-sampled per call (median F0 swings 191-279 Hz across neutral lines) and directed lines jump (L3 462 Hz, L4 429 Hz, possibly pitch-tracker octave errors, to be checked by ear).
- Accuracy: directed lines dropped or changed words ("train" for "trained") and the JA design voice misread kanji (CER up to 14.7 %).
- Disk: 4.7 GB of weights plus about 0.7 GB of environment.

### 3.2 Japanese

| Engine / condition | Pitch SD (st) | 10-90 range (st) | CER mean (max) | Mora/s | Median F0 Hz |
|---|---|---|---|---|---|
| **Baseline: current Irodori heroine clone** (the production build's lines; text identical to the test lines) | 4.20 | 10.78 | 0.0 % | 6.72 | 350 |
| Irodori neutral (this run) | 4.20 | 10.78 | 0.0 % | 6.72 | 350 |
| Irodori emoji A: one semantic emoji per clause | 4.27 | 10.85 | 0.0 % | 6.26 | 350 |
| Irodori emoji B: one leading emoji per line | 4.32 | 10.62 | 0.0 % | 6.63 | 350 |
| Irodori per-line style **caption** with the reference | 4.19 | 10.82 | 0.0 % | 6.49 | - |
| Irodori caption + emoji A | 4.25 | 10.39 | 0.0 % | 6.21 | - |
| **Irodori emoji C: two stacked emoji per clause** | **5.44** | **12.64** | 0.8 % (4.5 %) | 5.78 | 350 |
| Qwen3 1.7B CV Ono_Anna, neutral | 3.56 | 7.64 | 0.8 % | 6.10 | 260 |
| Qwen3 1.7B CV Ono_Anna, directed (JA instruction) | 3.62 | 7.68 | 1.2 % | 6.27 | 270 |
| VoxCPM2 design, neutral | 4.53 | 10.06 | 15.3 % | 6.45 | - |
| VoxCPM2 design, directed | 5.19 | 10.40 | 5.0 % (14.7 %) | 7.24 | - |

Findings:
- **Irodori neutral reproduces the current production lines exactly** (identical metrics to the build). With a fixed seed it is deterministic, so a tagged line differs from a neutral one only through the tag.
- **One emoji per clause is nearly inert** in pitch terms (SD +0.07 to +0.12 st). It does change rate and add pauses (L3 4.9 to 5.4 s, L5 4.4 to 5.1 s). Captions with a reference clip are also inert (SD -0.01 st).
- **Stacked emoji are audible in the numbers.** L5 (`⏸️⏸️😎💥` before 空っぽの箱) goes from 4.4 s to 7.2 s and SD 4.5 to 7.8 st, mostly a long pause plus a stress. L2, L4 and L6 SD rise by 0.4-1.4 st.
- **Tags are not read as words but they can be voiced as sounds.** L4 with `😲😆` came back as 「拒否は消えましたー!同じ問題」: the ASR heard a drawn-out "ー" and a sharp "!" (CER 4.5 % on that line, 0.8 % mean). That is the emoji acting, not text being spoken, but it needs a listen and an ASR gate that tolerates it.
- Qwen3 CustomVoice ignores Japanese instructions in practice (SD 3.56 to 3.62 st), so it is no substitute for Irodori tags.
- VoxCPM2 JA: the design voice is unstable and misreads kanji (neutral CER 15 %). Not an option.

### 3.3 Resources

| Job | Load s | RTF median | Torch reserved MB | smi peak MB (job) | Shared spill MB | Host commit MB (after load / max) | Free RAM at start GB |
|---|---|---|---|---|---|---|---|
| Kokoro EN | 8 | 0.05 | 726 | 838 | 79 | 3784 / 3896 | 4.5 |
| Qwen3 1.7B CV, EN | 46 | 0.64 | 4510 | 4677 | 79 | 7847 / 7985 | 3.2 |
| Qwen3 1.7B CV, JA | 28 | 0.61 | 4590 | 4764 | 79 | 7757 / 8035 | 3.9 |
| Irodori (18 items, A/B/neutral) | 33 | 0.75 | 3698 | 3822 | 79 | 8458 / 10259 | 4.0 |
| Irodori caption + emoji C (contended, see note) | 59-65 | 0.97-1.27 | 3822-4000 | 4251-5653 | 156-373 | 8222-8401 / 10353-10469 | 5.8-6.1 |
| VoxCPM2 EN design | 542 | 3.01 | 5672 | 5782 | 79 | 8750 / 8975 | 4.4 |
| VoxCPM2 EN clone | 167 | 4.35 | 6456 | 5902 | 779 | 20369 / 21114 | 6.8 |
| VoxCPM2 JA | 76 | 3.22 | 5674 | 5784 | 79 | 19801 / 20004 | 5.0 |

Notes:
- **RAM rule:** when I started, only 2.65 GB was available (3 GB threshold); I polled for a few minutes and it rose above 3 GB, after which every model load started with at least 3.2 GB free. Every job's start figure is in `build/emotion/*/job.json`.
- The last two Irodori jobs overlapped with a CPU Whisper run, so their RTF and shared-spill flags are contaminated; the clean Irodori RTF is 0.75.
- Peak VRAM leaves 1.4-1.6 GB headroom for Qwen3 and 2.3 GB for Irodori, but 6 GB does not allow anything else on the GPU, and host commit of 8-10 GB per engine process is what slows the laptop when the browser is open.

## 4. Integration proposal

### 4.1 Markup in `narration.yaml` (proposal only; nothing in `projects/`, `voices/`, `packages/` or `docs/` was edited)

Two levels, both optional:

```yaml
- en: "Not a statistics problem. {reveal}An empty bin."
  ja: "統計の問題ではありません。{reveal}空っぽの箱です。"
  tone: reveal              # line-level default; omitted = neutral
```

- `tone:` is one word from a small closed vocabulary (start with: `disbelief`, `irony`, `gravity`, `surprise`, `reveal`, `resolve`, `warm`, `neutral`). Each voice file gets a `tones:` table that maps a word to what that engine needs:
  - Kokoro: ignored (no control).
  - Qwen3 CV: an `instruct` sentence per tone (the ones in `lines.py` are a starting point). Line-level only; Qwen3 has no positional control, so an inline `{tag}` collapses to the line's tone.
  - Irodori: a short emoji string per tone (stack two: e.g. `surprise: "😲😆"`, `reveal: "⏸️😎💥"`, `gravity: "😟😖"`) inserted at the start of the line, or at the inline `{tag}` position.
- The inline `{tone}` syntax is chosen because `[[cue]]` and `*` / `~~` are already taken. It applies from that position to the end of the clause.
- **Stripping:** the parser removes `tone:` and `{...}` before captions, the on-screen headline, `[[cue]]` word alignment and the ASR gate reference, exactly as it does for `[[cue]]` today. Only the engine adapter sees the directed form. Emoji must never reach the forced aligner or the subtitles.
- Because the aligner works from the stripped text, extra pauses or sounds produced by emoji become gaps between aligned words, which the `[[cue]]` timing already tolerates. Check the one-word cues near a tag (`L5` grew by 2.8 s).

### 4.2 Engine choice and fallbacks

| Language | Primary | Fallback 1 | Fallback 2 |
|---|---|---|---|
| EN | Qwen3 1.7B CV Serena with `instruct` (register in `engines.yaml`; the adapter already supports it) | Same engine, neutral (no `instruct`) | Kokoro `af_heart` (house voice, no direction) |
| JA | Irodori heroine clone with stacked emoji | Irodori neutral (bit-identical to the current build) | none needed |

The EN choice is a **voice trade-off, not a free upgrade**. The launch film's voice is `af_heart`, and mixing engines inside one video will be audible. Two workable policies: (a) switch the whole EN track to Qwen3 CV if you prefer its timbre by ear; (b) keep Kokoro everywhere except the handful of turn lines you want directed, and accept the timbre jump there. I recommend deciding after listening to the `Qwen3 CV Serena` rows against the Kokoro baseline rows.

### 4.3 Risks

- **Determinism.** Irodori: proven (neutral output equals the production build; fixed seed). Qwen3: per-item `torch.manual_seed` is applied, but I did not run a repeat to prove bit-identical output (UNVERIFIED); treat regeneration as "same words, same seed, possibly slightly different audio" until checked.
- **Tag reliability.** Irodori's card says emoji effects are inconsistent. Stacked emoji produced one unintended vocalisation (L4). Run the ASR gate on every tagged line.
- **Gate and retries.** Suggested: WER or CER above 8 % on the clean text triggers up to two retries with `seed+1`, `seed+2`; then fall back to the neutral tone for that line and log it. The gate must ignore trailing "ー" and "!" for Irodori.
- **VRAM / RAM.** One GPU process at a time (already the rule). Qwen3 CV at 4.5-4.7 GB and Irodori at 3.7-3.8 GB both fit; VoxCPM2 does not (5.7-6.5 GB, shared spill, 20 GB commit). Check at least 3 GB free RAM before loading; Irodori and Qwen3 both commit 8-10 GB, so close the browser before a render.
- **Speed.** Qwen3 RTF 0.64 (EN), Irodori 0.75. A 10-minute film is roughly 6-8 minutes of synthesis per language, plus retries.
- **License.** Qwen3 (Apache-2.0) and Irodori (MIT with ethical restrictions: no impersonation or deceptive deepfakes; our voices are synthetic) are fine for a monetised channel. Irodori adds a SilentCipher watermark (already noted in `voices/narrator-ja.yaml`).
- **Emoji in files.** `narration.yaml` must be read as UTF-8 on Windows; avoid emoji in filenames and log lines (cp1252 consoles crash).

## 5. What was not done

- **No listening.** All judgements about naturalness, emphasis and whether "disbelief" sounds like disbelief are open until the owner listens.
- **Not tested (with reasons):** Qwen3 VoiceDesign (4.2 GB download would break the 6 GB budget), CosyVoice3 (same; also Windows dependency risk), Orpheus and Maya1 (3B, need quantised GGUF plus SNAC stack; tags cover non-verbal sounds rather than emotions), Chatterbox (RAM and speed already ruled it out in `benchmark.md`; tags/`exaggeration` are not emotion labels), IndexTTS-2 and Zonos (Windows and license risks), Dia, Higgs v3, Fish S2, Step-Audio-EditX, MOSS-TTS (size or license). Kani-TTS-2 and Spark-TTS were not verified to offer emotion control.
- **Only one seed** per line and condition; the pitch numbers are six clips each. Differences under about 0.3 st should be read as noise.
- Pitch tracking is librosa.yin; octave errors are possible for VoxCPM2's very high directed F0 values.

## 6. Disk

About 5.4 GB of new data: VoxCPM2 weights 4.7 GB (`~/.cache/huggingface/hub/models--openbmb--VoxCPM2`) and its environment `py/tts/voxcpm/.venv` (~0.7 GB), plus 6 MB of samples. Free space is now about 3.5 GB. **Since VoxCPM2 is not recommended, both can be deleted safely** (`rm -rf py/tts/voxcpm/.venv` and the HF folder). Other reclaimable space, not touched: `yeeko/Elaina_TTS_QWen3_SFT_Epoch16` (4.2 GB) and `phasefield-audio/Irodori-TTS-v4.1-Anime` (2.9 GB), together about 7.2 GB.

## 7. Files

- `research/tts/emotion/listen.html` and `research/tts/emotion/samples/` (mp3, 6 MB)
- `research/tts/emotion/{lines,run_emotion,analyze,make_page}.py`, `results.json`, `asr_cache.json`
- Adapters: `py/tts/voxcpm/{pyproject.toml,run.py,uv.lock}` (new, **not** registered in `engines.yaml`), `py/tts/qwen3/run.py` (per-item `instruct`), `py/tts/irodori/run.py` (`per_item_caption`). Both edits are backward compatible.
- Raw wavs and job logs: `build/emotion/` (scratch).
