# Local TTS benchmark: female anime-style research narrator (EN + JA)

*Run 2026-09-28 on the target machine (Windows 11, RTX 4050 Laptop 6 GB, 16 GB RAM). All numbers are measured,
not quoted. Machine-readable results: `research/tts/results.json`. Listen: **`research/tts/listen.html`**.*

> **Final voice choice must be confirmed by listening.** The metrics below check intelligibility, stability,
> memory and speed. They cannot judge anime-style timbre, whether the English carries a Japanese accent, or
> whether the delivery suits calm research narration. The MOS predictor is biased against high-pitched voices,
> so it was never used to rank voices. Open `listen.html`, compare by ear, and star your picks.

## 1. Recommendation

**(a) Japanese production voice: Irodori-TTS v4.1-Small cloning its own master** (`voices/narrator-ja.yaml`)
- Reference mode with `research/tts/voices/ja-master-soft.wav`: a caption-designed synthetic master. Settings:
  bf16, 40 steps, default CFG, seed 1234, reference latent cached once per process.
- Always send one kana-normalised sentence per call.
- Measured on the JA corpus:

  | Metric | Value |
  |---|---|
  | Kana-reading CER | 1.5 % spoken form, 1.1 % raw form |
  | Consistency (clip vs voice centroid) | 0.92 |
  | Similarity to the master | 0.86 |
  | RTF (median) | 0.72 |
  | Torch reserved per sentence | 5.2 GB |

- Caption-only mode is **not** suitable for production. It re-samples the voice on every call: consistency
  0.74 (worst sentence 0.42) against 0.92 (worst 0.76) with the reference.
- Masters `ja-master-bright` and `ja-master-heroine` (higher, more anime-like: median F0 354 Hz vs 260 Hz) are
  drop-in swaps with the same settings. Pick by ear.

**(b) English production voice: Qwen3-TTS 12Hz 0.6B-Base (faster-qwen3-tts backend), ICL clone of a
*bootstrapped* English reference** (`voices/narrator-en.yaml`)
- How the reference was made (`research/tts/voices/en-master-soft.wav`):
  1. Qwen cloned the Japanese master into English.
  2. The two cleanest, most master-like English sentences were frozen as `en-master-soft.wav`.
  3. English is cloned from that English clip, with its English transcript as `ref_text`.
- Measured:

  | Metric | Value |
  |---|---|
  | WER | 1.2 % spoken form |
  | Similarity to the JA master | 0.74 |
  | Consistency | 0.89 |
  | Median F0 | 288 Hz (the JA master is 260 Hz) |
  | RTF | 0.60 |
  | VRAM per sentence | 3.9 GB |
  | p6 in one call (~70 s) | WER 3 % |

- How to read the 0.74: same-voice Japanese clips score 0.86 against the master; different female voices score
  0.03–0.26.
- Why bootstrap: cloning directly from the Japanese clip in ICL mode kept more identity (0.79) but carried
  Japanese phonetics into English. WER was 5.9 %, with errors such as "the adapter" → "zuladapter",
  "call a tool" → "koei to", and "0.771" → "0.7771".

**Fallbacks, in order**
1. **Same engine, no bootstrap:** Qwen3 0.6B-Base x-vector clone of the JA master (`xvec_only: true`).
   WER 2.1 %, similarity 0.71, RTF 0.49, 2.9 GB.
2. **Highest intelligibility with some identity:** Qwen3 1.7B-Base x-vector. WER 0.3 %, but similarity only 0.63,
   5.0 GB reserved per sentence (5.9 GB of 6.1 GB device memory in the job), and 9.5 GB host commit.
3. **No clone:** Kokoro `af_heart`. WER 0.3 %, RTF 0.10, 1.5 GB, but it is a different voice (similarity 0.03)
   and not anime-style. Qwen3 1.7B CustomVoice `Ono_Anna` (WER 0.6 %) is the preset alternative.
4. **Japanese from one engine:** if Irodori ever becomes unavailable, Qwen3 0.6B-Base cloning the master *into
   Japanese* measured CER 1.9 % and similarity 0.86, the same identity score as Irodori itself.

**Not recommended on this machine: Chatterbox.**
- Multilingual V3 is intelligible when cloning the English bootstrap reference (WER 0.6 %). But:
  - it runs at RTF ~1.0;
  - it caps each call at 40 s;
  - it is heavy on host RAM: 8.0 GB committed after load, 8.8 GB after 31 sentences, 10.5 GB after the 40 s call.
    In the Japanese run the laptop fell to 0.8 GB free RAM and RTF degraded from 1.0 to 8.3 (paging).
- Turbo: WER 7.4 %, and gibberish past ~300 characters.

## 2. What was run

| Engine (env) | Voices benchmarked |
|---|---|
| Irodori v4.1-Small (`third_party/irodori-tts/.venv`) | 3 captions × 3 seeds (voice design); ref-mode with `soft` and `heroine` masters; caption-only `soft` |
| Qwen3-TTS via faster-qwen3-tts 0.5.2 (`py/tts/qwen3`) | 0.6B-Base and 1.7B-Base × ICL / x-vector clone of `ja-master-soft`; 0.6B ICL clone of the bootstrapped `en-master-soft`; 0.6B ICL / x-vector of `ja-master-heroine`; 0.6B clone into **Japanese**; CustomVoice Serena / Ono_Anna at 0.6B (no instruct) and 1.7B (calm instruct) |
| Chatterbox (`py/tts/chatterbox`) | Turbo clone; Multilingual V3 clone with `cfg_weight` 0 and 0.5; V3 clone of `en-master-soft`; V3 Japanese |
| Kokoro-82M (`py/tts/kokoro`) | `af_heart`, `af_bella` (English only; see §7) |

Every configuration ran every passage in `texts.yaml` / `texts-ja.yaml`, in both raw and spoken form, one
sentence per call. It also ran `p6_long` in one call, except Irodori caption-only, where one call is capped at
30 s. That is 22 configurations and about 740 clips.

## 3. Method

**Machine and environments**
- Every engine runs in its own uv environment as a separate process (`py/tts/<engine>/run.py <job.json>`,
  protocol in `py/tts/_protocol.py`).
- Only one GPU process ran at a time.
- All four engine environments use Python 3.10 with torch 2.10.0+cu128, so uv hard-links one cached torch build
  into all of them. Chatterbox's upstream `torch==2.6.0` pin is overridden and works.

**Corpus**
- Six passages, each in a `raw` form (digits, acronyms and symbols as an author types them) and a `spoken` form
  (what the normaliser sends).
- Each passage is split into sentences and synthesised **one sentence per call**, like the production pipeline.
- Sentences whose raw and spoken text are identical are synthesised once and shared by both forms.
- One fixed seed (1234) for every item. The model is loaded once per job and warmed up before timing.

**Speed and memory**
- `rtf` = seconds of compute per second of audio, per sentence, excluding load. Lower is faster.
- VRAM is measured four ways:
  1. `torch.cuda.max_memory_reserved`, separately for load, sentences and the one-call item.
  2. An nvidia-smi sampler thread (device-wide dedicated memory at 5 Hz; per-process figures are N/A under WDDM).
  3. The Windows "GPU Adapter Memory" counters for the NVIDIA adapter. Their *Shared Usage* grows when WDDM
     silently spills VRAM into system RAM.
  4. Process private (committed) host memory per item.
- Run flags:

  | Flag | Trigger |
  |---|---|
  | `vram_ceiling` | dedicated use within 200 MiB of 6141 MiB |
  | `shared_spill` | adapter shared usage grows by more than 256 MiB |
  | `throughput_collapse` | an item is more than 3× the median RTF *and* slower than real time |
  | `host_ram_growth` | host commit grows by more than 2 GB after load |

**Round trip**
- ASR: faster-whisper large-v3-turbo, fp16, beam 5, fixed language, no prompt, no VAD filter.
- **EN WER**
  - Both sides go through Whisper's `EnglishTextNormalizer`.
  - Spelled letters are joined ("S F T" = "SFT") and zero-padded numbers are spelled out.
  - An equivalence table covers laura~lora, jason~json, v ram~vram, over call~overcall and GB~gigabytes.
  - Passage WER compares the concatenated sentence transcripts against the passage `reference` (what a listener
    should hear).
- **JA CER**
  - Both sides are converted to hiragana *readings* (fugashi + unidic-lite), with punctuation and whitespace
    stripped.
  - The benchmark probes (SFT, DPO, F1, LoRA, VRAM, GPU, BF16, JSON, KL, GB, %, decimals, 001, and native counters
    like 2つ) map to fixed kana on both sides.
  - It therefore scores pronunciation, not the ASR's kanji choice. The reference is the text of the form sent.
- **Limitation:** Whisper writes numbers as digits. A number read with the wrong convention can still come back as
  "0.771" and score as correct, so number readings need listening.
- The raw `p4` equation (`L = -log σ(β·(Δ…))`) is not speakable text. Its high raw WER (0.7–0.9 for everyone) is
  expected, and its sentence is excluded from word-level failure flags.

**Failure flags (per sentence)**
- truncation: transcript under 75 % of the reference, or a trailing deletion
- repetition: transcript over 130 % of the reference, or a repeated n-gram absent from the reference
- skipped words: 2 or more EN words / 4 or more kana deleted
- hallucination: 3 or more EN words / 5 or more kana inserted
- wrong language: CJK text in an English transcript
- long silence (silero-vad): internal pause over 1.0 s, leading over 0.75 s, or trailing over 1.0 s
- clipping: 10 or more full-scale samples
- ASR low confidence
- speaking-rate outlier: |z| > 3 within the voice

**Voice metrics**
- **Speaker similarity:** SpeechBrain ECAPA (`spkrec-ecapa-voxceleb`, Apache-2.0) cosine, on clips of 1.5 s or
  longer.
  - *Consistency:* each clip against the voice's own centroid.
  - *Identity:* each clip against the Irodori master.
  - Cross-lingual similarity is inherently lower, so it is read against two baselines: same-voice JA clips
    (≈0.86) and different female voices (≈0.0–0.26).
- **Other measures:** LUFS (pyloudnorm), pauses (silero-vad), speaking rate (words/min or mora/s over the VAD
  speech span), F0 (librosa YIN, loud frames only).
- **MOS:** UTMOS22-strong, run on the GPU and reported only within a voice. It penalises high pitch.

Code: `research/tts/bench/bench.py` (`run`, `asr`, `audio`, `score`, `samples`, `html`, `design`, `bootstrap`,
`tables`), `research/tts/bench/utmos_gpu.py`, and `py/media/src/vidmedia/ttsqa.py` (reusable for per-chunk
production QA).

## 4. Voice design (Irodori, task 1)

**Setup**
- Text: a neutral 105-character narration line (「この動画では、ある機械学習の研究で…」), about 18–19 s.
- Precision bf16, 40 steps, caption only.

**Captions**
- `soft`: the existing caption, 「落ち着いた、柔らかく透明感のある若い女性の声。アニメのナレーションのように、丁寧で聞き取りやすく話す。」
- `bright`: landscape proposal 1, 「…アニメのキャラクターのような透明感のある少し高めの声で…クリアな音質。」
- `heroine`: a more characterful caption, 「明るく澄んだアニメ声の若い女性。知的で優しく、少し楽しげに、はっきりと丁寧に説明している。クリアな音質。」

**Selection rule:** CER first, then clipping, then loudness stability (SD of 1-s levels), then within-caption MOS.

| candidate | CER | clipped | peak dBFS | loudness SD dB | F0 median / IQR Hz | UTMOS (within caption) | sim. to other seeds |
|---|---|---|---|---|---|---|---|
| **soft-s7** ✔ | 0 | 0 | −0.13 | **1.89** | 260 / 82 | 2.46 | 0.75 |
| soft-s1234 | 0 | 0 | −0.48 | 3.40 | 264 / 83 | 3.32 | 0.70 |
| soft-s2026 | 0 | 0 | −1.64 | 2.17 | 274 / 95 | 2.36 | 0.79 |
| **bright-s7** ✔ | 0 | 0 | −2.10 | **2.00** | 235 / 82 | 2.63 | 0.73 |
| bright-s1234 | 0 | 0 | −0.80 | 4.19 | 272 / 85 | 3.41 | 0.70 |
| bright-s2026 | 0 | 0 | −1.25 | 2.11 | 257 / 97 | 2.52 | 0.76 |
| heroine-s7 | 0 | 0 | −0.10 | 3.53 | 364 / 100 | 1.53 | 0.53 |
| heroine-s1234 | 0.008 | 0 | −0.67 | 3.02 | 326 / 86 | 2.45 | 0.65 |
| **heroine-s2026** ✔ | 0 | 0 | −0.57 | **2.14** | 355 / 125 | 1.89 | 0.68 |

**Findings**
- All nine candidates round-trip exactly or near-exactly. Irodori's duration predictor gives the same length for
  every seed of a caption.
- 「アニメ」 captions work as a style cue: `heroine` is about 95 Hz higher than `soft`.
- `heroine` has the lowest UTMOS. This is the documented pitch bias, not evidence of worse audio.
- The seeds of one caption are different speakers (similarity 0.53–0.79). A caption is a distribution, not a voice,
  and that is why production must clone a frozen master.

**Masters written:** `research/tts/voices/ja-master-{soft,bright,heroine}.wav` + `.yaml`.
- Each YAML records the caption, seed, checkpoint revision 2b28324d…, transcript, sha256, selection metrics and
  provenance.
- Each master was silence-trimmed and normalised to −16 LUFS with peaks ≤ −1 dBFS. `soft` lands at −16.7 LUFS
  because of the peak limit.
- `research/tts/voices/PRIMARY` = `soft`: the reference used for the cross-lingual runs.
- `soft` was chosen as primary because it is the owner's existing caption, has the most stable loudness, and has
  the calmest pitch contour. `heroine` was also run through Qwen so its English can be heard.

**Irodori reference mode vs caption-only** (task 1, cross-chunk consistency; JA corpus, 34 sentences):

| mode | CER spoken / raw | consistency mean (min) | sim. to master | RTF median | sentence VRAM (reserved) |
|---|---|---|---|---|---|
| caption only (`soft` caption, seed 1234) | 1.0 % / 0.6 % | 0.743 (0.420) | 0.51 | 0.58 | 5.1 GB |
| reference `ja-master-soft` (latent cached) | 1.5 % / 1.1 % | **0.921 (0.759)** | **0.86** | 0.72 | 5.2 GB |
| reference `ja-master-heroine` | 0.9 % / 0.6 % | 0.910 (0.778) | 0.86 (to heroine) | 0.72 | 4.6 GB |

- With a caption only, the voice drifts from sentence to sentence; with the frozen master it stays put.
- Re-encoding the 18 s reference on every call cost RTF 0.84 (median). The adapter now caches the reference latent
  once per process (`cache_ref_latent`, default on), which brings it to 0.72. Short sentences still pay a fixed
  overhead (RTF about 1.1 for a 3 s sentence).

## 5. Results by engine

Column notes:
- The *spill* and *smi peak* columns are per job, and the job ends with the ~70 s one-call item. Sentence-level
  memory is the *sentences* figure.
- err = WER (EN) or kana CER (JA).
- *sim to master* = similarity to `ja-master-soft` (see §6 for the `heroine` rows).

### Irodori (Japanese)

| voice | load s | torch reserved MB: load / sentences / one call | smi peak MB (job) | spill (job) | RTF median (p90) | err spoken | err raw | p6 one call | consistency (min) | sim to master | F0 Hz | rate | LUFS mean ± sd | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ja-caption-soft | 65 | 3228 / 5120 / – | 5241 | no | 0.58 (1.01) | 0.010 | 0.006 | – | 0.743 (0.420) | 0.512 | 264 | 6.3 mora/s | −16.0 ± 0.2 | long_silence 1 |
| ja-ref-heroine | 49 | 3228 / 4628 / 7940 | 5901 | **2.2 GB shared** (one call) | 0.72 (1.34) | 0.009 | 0.006 | 0.598 | 0.910 (0.778) | 0.630 | 352 | 6.8 mora/s | −15.4 ± 0.1 | rate_outlier 1 |
| ja-ref-soft | 54 | 4526 / 5198 / 8510 | 5623 | **3.1 GB shared** (one call) | 0.72 (1.09) | 0.015 | 0.011 | 0.653 | 0.921 (0.759) | 0.856 | 254 | 7.0 mora/s | −16.2 ± 0.1 | long_silence 2 |

**Findings**
- Irodori is Japanese only, so the English raw/spoken distinction does not apply.
- On raw Latin text, Irodori's VRAM was heard as "VIRAM", KL as 「ケール」, and F1 as 「F1輪」. The ASR writes numbers
  back as digits, so its readings of 0.412 / 41.3 % are not verified by the metric. Use the kana-normalised
  spoken form.
- **One call is not viable:**
  - the p6 passage (~400 characters) hits the 30 s cap and is truncated (CER 0.60–0.65);
  - that 30 s generation needed 8.5 GB reserved, spilling 2–3 GB into shared memory;
  - the `heroine` one-call inserted words (「評価セットを積も凍結し…」).
- Two sentences have 0.8 s of leading silence. Trim in the pipeline.

### Qwen3-TTS (faster-qwen3-tts 0.5.2, bf16, sdpa)

| voice | load s | reserved MB: load / sentences / one call | smi peak (job) | spill (job) | RTF median (p90) | WER spoken | WER raw | p6 one call | consistency (min) | sim to ja-master-soft | F0 Hz | wpm | LUFS | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **base06b-icl-enboot-soft** (recommended) | 47 | 3276 / 3896 / 4088 | 4257 | no | 0.60 (0.70) | **0.012** | 0.103 | 0.030 | 0.887 (0.687) | **0.744** | 288 | 164 | −17.1 ± 0.8 | rate_outlier 1 |
| base06b-icl-soft | 31 | 3390 / 3862 / 4054 | 4221 | no | 0.56 (0.67) | 0.059 | 0.144 | 0.061 | 0.881 (0.730) | 0.794 | 282 | 157 | −17.6 ± 0.7 | truncation 1, rate_outlier 1 |
| base06b-xvec-soft | 21 | 2518 / 2920 / 3906 | 4073 | no | **0.49** (0.52) | 0.021 | 0.124 | 0.006 | 0.869 (0.728) | 0.710 | 252 | 183 | −18.1 ± 0.8 | rate_outlier 1 |
| base17b-icl-soft | 59 | 5336 / 5808 / 6000 | 5913 | 0.34 GB shared | 0.85 (1.50) | 0.024 | 0.139 | 0.036 | 0.755 (**0.316**) | 0.634 | 235 | 161 | −18.3 ± 1.2 | none |
| base17b-xvec-soft | 42 | 4454 / 5000 / 5914 | 5901 | 0.26 GB shared | 0.62 (0.66) | **0.003** | 0.094 | 0.000 | 0.872 (0.624) | 0.630 | 224 | 173 | −17.7 ± 0.8 | none |
| base06b-icl-heroine | 20 | 3422 / 3584 / 3892 | 4061 | no | 0.52 (0.61) | 0.026 | 0.142 | 0.036 | 0.861 (0.598) | 0.765 to heroine | 364 | 156 | −18.2 ± 1.6 | long_silence 3 |
| base06b-xvec-heroine | 22 | 2518 / 2986 / 4054 | 4221 | no | 0.49 (0.54) | 0.000 | 0.103 | 0.000 | 0.854 (0.612) | 0.682 to heroine | 313 | 183 | −20.9 ± 1.1 | hallucination 1 |
| base06b-icl-soft-**ja** (Japanese output) | 23 | 3390 / 3484 / 3946 | 4115 | no | 0.55 (0.67) | CER 0.019 | CER 0.032 | 0.023 | 0.911 (0.787) | **0.863** | 257 | 7.3 mora/s | −17.6 ± 0.6 | skipped_words 1 |
| cv17b-ono_anna (+calm instruct) | 27 | 4400 / 4954 / 5908 | 5895 | 0.26 GB shared | 0.61 (0.63) | 0.006 | 0.097 | 0.000 | 0.818 (0.616) | 0.199 | 248 | 164 | −27.7 ± 2.1 | none |
| cv17b-serena (+calm instruct) | 29 | 4400 / 5002 / 5884 | 5871 | 0.26 GB shared | 0.61 (0.66) | 0.041 | 0.133 | 0.006 | 0.868 (0.704) | 0.264 | 235 | 135 | −24.1 ± 1.9 | none |
| cv06b-ono_anna | 34 | 2506 / 3456 / 3860 | 4027 | no | 0.50 (0.53) | 0.035 | 0.106 | 0.012 | 0.812 (0.555) | 0.231 | 291 | 133 | −29.1 ± 2.6 | long_silence 6 |
| cv06b-serena | 114 | 2464 / 3584 / 3928 | 4095 | no | 0.90 (0.97) | 0.021 | 0.142 | 0.012 | 0.846 (0.639) | 0.255 | 245 | 140 | −25.7 ± 1.7 | **wrong_language 1** |

**Findings**
- **ICL from the Japanese clip leaks Japanese phonetics** into English: 「zuladapter」, 「koei to」, "0.771" →
  "0.7771", "0.412" → "0.00412". X-vector mode avoids that but loses identity (0.79 → 0.71). The bootstrapped
  English reference gets most of both (WER 1.2 %, similarity 0.74).
- **1.7B is not better for this job.**
  - It is more intelligible in x-vector mode (0.3 %), but its identity is lower (0.63) and its pitch lower
    (224–235 Hz vs the master's 260 Hz, so less anime).
  - 1.7B ICL was unstable: one sentence had similarity 0.32 to its own centroid.
  - It fits in 6 GB only at the ceiling: 5.0–5.8 GB reserved per sentence, 5.9 GB of 6.1 GB device memory,
    ~0.2–0.3 GB shared with no slowdown, and 9.5 GB host commit.
- **The `heroine` master survives cross-lingual cloning only partly.** In ICL the F0 stays anime-high (364 Hz),
  but the transcripts show accent errors: "half billion parameter" → "den gobi palmeta", "JSON tool" → "gson 2".
  X-vector is clean (WER 0.0 %) but drops to 313 Hz and 0.68 similarity. Listen before choosing `heroine` for
  English; if chosen, bootstrap an `en-master-heroine` the same way.
- **One call works** for every Qwen voice: the 70 s p6 passage came out with WER 0–6 %. One exception: the ICL
  (JA reference) one-call ran to 144 s of audio, with long silences.
- **Presets:**
  - they are quiet (−24 to −29 LUFS; the pipeline must loudness-match);
  - 0.6B Ono_Anna left 0.6–2.7 s leading silences on 6 sentences;
  - 0.6B Serena answered the raw equation in **Chinese gibberish** (「并于 SwagSigma别大了…」).
- **No text front-end:** raw "LoRA" → "Allura"/"LoRa", "0.5B" → "0.5 B", "Study 001" → "study one" /
  "zero ZOA1". Send the spoken form.

### Chatterbox (git 5de7a54, torch 2.10 override, PerTh watermark always on)

| voice | load s | reserved MB: load / sentences / one call | smi peak (job) | spill (job) | RTF median (p90) | err spoken | err raw | p6 one call | consistency (min) | sim to ja-master-soft | F0 Hz | rate | LUFS | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| mtl-v3-cfg5-enboot-soft | 53 | 3610 / 4268 / 6064 | 5851 | 0.4 GB shared; host commit 8.0 → 10.5 GB | 1.00 (1.26) | **0.006** | 0.142 | 0.442 (truncated at 40 s) | 0.895 (0.726) | 0.692 | 266 | 175 wpm | −16.5 ± 0.5 | rate_outlier 1 |
| mtl-v3-cfg5-soft | 35 | 3604 / 4228 / 6118 | 5905 | 0.4 GB shared | 0.95 (1.22) | 0.015 | 0.147 | 0.509 (truncated) | 0.873 (0.537) | 0.722 | 229 | 187 wpm | −16.8 ± 0.5 | skipped 1, rate_outlier 1 |
| mtl-v3-cfg0-soft | 45 | 3604 / 4266 / 6112 | 5899 | 0.4 GB shared | 1.21 (2.06) | 0.053 | 0.186 | 0.485 (truncated) | 0.886 (0.740) | 0.763 | 236 | 162 wpm | −16.5 ± 0.6 | truncation, skipped, clipping, long_silence ×2 |
| turbo-soft | 80 | 3144 / 3704 / 4074 | 4181 | no | 0.82 (1.36) | 0.074 | 0.215 | **0.915 (gibberish)** | 0.866 (0.676) | 0.768 | 238 | 171 wpm | −28.7 ± 0.8 | truncation 1 |
| mtl-v3-soft-**ja** | 26 | 3604 / 4094 / 6236 | 5897 | 0.5 GB shared; **host RAM 8.7 GB, paging** | **3.32** (4.99) | CER 0.047 | CER 0.136 | 0.504 (truncated) | 0.906 (0.750) | 0.853 | 240 | 7.5 mora/s | −16.4 ± 0.8 | skipped 2, hallucination 1, clipping 1 |

**Findings**
- **`cfg_weight=0` (the README's accent fix) made English worse, not better:** WER 5.3 % vs 1.5 % at 0.5, with
  errors like "the numbers went up" → "deep hop", "how" → "hell". It also ran slower (RTF 1.21).
- **Japanese goes through pykakasi, which misreads kanji:**
  - 訓練 → 「きみれん」, heard as 気味連/キミレン, in every occurrence;
  - 呼び出し → 「こび出し」;
  - raw numbers become gibberish (「アレパイノミツパイノ…」).
- **Host-RAM pressure.** The process commits 8.0 GB after load. It grows about 25 MB per sentence (8.8 GB after
  31 English sentences) and jumps to 10.5 GB during the 40 s call.
  - In the Japanese run (with the usual desktop apps open), free RAM fell to 0.8 GB and RTF climbed steadily from
    1.0 to 8.3.
  - GPU shared memory stayed flat, so this was host paging, not a VRAM spill.
  - Growth was not tracked per item in that run, so a true leak is suspected, not proven.
- **Limits:** every call stops at 1000 speech tokens (40 s), so one call is not viable. Turbo turns p6 into
  gibberish ("Before any way to Scott if part may I'm right tonight…").

### Kokoro-82M (preset voices, no cloning)

| voice | load s | reserved MB: load / sentences / one call | smi peak | RTF median (p90) | WER spoken | WER raw | p6 one call | consistency (min) | sim to ja-master-soft | F0 Hz | wpm | LUFS |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| af_heart | 91 (first spaCy load) | 642 / 946 / 1508 | 1615 | **0.10** (0.27) | **0.003** | 0.097 | 0.000 | 0.874 (0.693) | 0.034 | 198 | 182 | −25.6 ± 0.3 |
| af_bella | 35 | 646 / 1142 / 1598 | 1705 | 0.11 (0.36) | 0.003 | 0.097 | 0.006 | 0.901 (0.720) | −0.045 | 201 | 180 | −24.8 ± 0.5 |

**Findings**
- The best English front-end of the set:
  - raw 0.412 / 0.771 / 41.3 % transcribed back correctly (digit-masking caveat: the conventions are not verified);
  - the misreads were "Study 001" → "study one", "SFT" heard as "SFD", and "overcall" → "overhaul" in both forms.
- It is a different, lower (≈200 Hz), non-anime voice. Identity to the master is 0.03, so it is a fallback only.

## 6. Identity across languages (ECAPA similarity to each JA master, mean over clips)

| voice | ja-master-soft | ja-master-bright | ja-master-heroine |
|---|---|---|---|
| *baseline: same voice, JA* irodori/ja-ref-soft | **0.856** | 0.705 | 0.523 |
| *baseline: same voice, JA* irodori/ja-ref-heroine | 0.630 | 0.507 | **0.855** |
| qwen3/base06b-icl-soft-ja (Qwen, Japanese) | 0.863 | 0.704 | 0.625 |
| chatterbox/mtl-v3-soft-ja (Chatterbox, Japanese) | 0.853 | 0.734 | 0.627 |
| qwen3/base06b-icl-soft (EN, JA reference) | 0.794 | 0.672 | 0.605 |
| chatterbox/turbo-soft (EN) | 0.768 | 0.675 | 0.550 |
| chatterbox/mtl-v3-cfg0-soft (EN) | 0.763 | 0.660 | 0.568 |
| **qwen3/base06b-icl-enboot-soft (EN, recommended)** | **0.744** | 0.633 | 0.576 |
| chatterbox/mtl-v3-cfg5-soft (EN) | 0.722 | 0.627 | 0.548 |
| qwen3/base06b-xvec-soft (EN) | 0.710 | 0.601 | 0.545 |
| chatterbox/mtl-v3-cfg5-enboot-soft (EN) | 0.692 | 0.558 | 0.568 |
| qwen3/base17b-icl-soft (EN) | 0.634 | 0.610 | 0.460 |
| qwen3/base17b-xvec-soft (EN) | 0.630 | 0.568 | 0.485 |
| qwen3/base06b-icl-heroine (EN) | 0.483 | 0.380 | **0.765** |
| qwen3/base06b-xvec-heroine (EN) | 0.386 | 0.288 | **0.682** |
| irodori/ja-caption-soft (caption only) | 0.512 | 0.568 | 0.514 |
| *baseline: other voices* qwen3 CustomVoice Serena / Ono_Anna | 0.20–0.26 | 0.18–0.28 | 0.22–0.32 |
| *baseline: other voices* kokoro af_heart / af_bella | −0.05–0.03 | −0.05–0.07 | −0.01 |

Every cross-lingual clone lands far above the different-speaker baseline and below the same-language one. These
numbers say the English "sounds like the same speaker" to an embedding model. They say nothing about accent.

## 7. Raw vs spoken, and which texts each engine mispronounces

WER / CER per passage, spoken / raw. The raw `p4` equation is unspeakable by design.

| voice | p1 | p2 terms | p3 acronyms | p4 equation | p5 | p6 |
|---|---|---|---|---|---|---|
| irodori/ja-ref-soft | 0.00 / 0.00 | 0.01 / 0.01 | 0.07 / 0.04 | 0.01 / 0.01 | 0.00 / 0.00 | 0.00 / 0.00 |
| qwen3/base06b-icl-enboot-soft | 0.03 / 0.12 | 0.03 / 0.00 | 0.03 / 0.07 | 0.00 / 0.72 | 0.00 / 0.00 | 0.01 / 0.00 |
| qwen3/base06b-xvec-soft | 0.03 / 0.03 | 0.00 / 0.15 | 0.05 / 0.10 | 0.00 / 0.74 | 0.00 / 0.00 | 0.02 / 0.02 |
| qwen3/base06b-icl-soft | 0.03 / 0.03 | 0.09 / 0.15 | 0.12 / 0.23 | 0.10 / 0.72 | 0.11 / 0.11 | 0.02 / 0.02 |
| qwen3/base17b-xvec-soft | 0.00 / 0.00 | 0.00 / 0.00 | 0.03 / 0.05 | 0.00 / 0.74 | 0.00 / 0.00 | 0.00 / 0.01 |
| chatterbox/mtl-v3-cfg5-enboot-soft | 0.00 / 0.00 | 0.00 / 0.15 | 0.00 / 0.17 | 0.00 / 0.90 | 0.00 / 0.00 | 0.01 / 0.01 |
| chatterbox/turbo-soft | 0.06 / 0.12 | 0.03 / 0.12 | 0.17 / 0.38 | 0.03 / 0.77 | 0.14 / 0.14 | 0.06 / 0.10 |
| kokoro/af_heart | 0.00 / 0.03 | 0.00 / 0.03 | 0.00 / 0.05 | 0.00 / 0.72 | 0.00 / 0.00 | 0.01 / 0.01 |
| qwen3/base06b-icl-soft-ja | 0.07 / 0.10 | 0.01 / 0.02 | 0.01 / 0.04 | 0.02 / 0.08 | 0.00 / 0.00 | 0.02 / 0.01 |
| chatterbox/mtl-v3-soft-ja | 0.02 / 0.08 | 0.04 / 0.43 | 0.01 / 0.26 | 0.10 / 0.11 | 0.06 / 0.06 | 0.05 / 0.05 |

The full table for all 22 voices is in `results.json` and in `bench.py tables` output.

**Mispronounced texts (raw form unless noted), from the ASR alignments**

| Text | Irodori (JA) | Qwen3 | Chatterbox | Kokoro |
|---|---|---|---|---|
| `Study 001` | — | "study one" / "zero ZOA1" | "stadia 01" (Turbo) | "study one" |
| `SFT`, `DPO` | — | "Esft", "BPO" (Serena) | "saint"/"speed"/"seat", "depot" | "SFD" |
| `F1`, `0.412`, `0.771`, `41.3%` | F1 heard as 「F1輪」 | "0.00412", "0.772", "0.7771" (ICL); "0.799 each" (x-vector) | "0.12", "0.4777", "41.404040" | transcribed back correctly (see the digit-masking caveat) |
| `LoRA`, `0.5B`, `BF16`, `VRAM`, `KL` | VRAM heard as "VIRAM", KL as 「ケール」 | "Allura", "0.5 B", "VFU16", "ram" | "Allura", "0 V", "BFS16", "abap ram", "key say" | "0.5 b" |
| Equation `L = -log σ(β·…)` | n/a (JA passage is prose) | reads symbols ("L equals minus log sigma, beta, delta…"); 0.6B Serena → Chinese gibberish | "LL log C D C…", "qi qi qi…" repetition | "L equals log sigma, beta, delta…" |
| `overcall` (spoken form too) | — | "overhaul"/"overall" | "overhaul" | "overhaul" |
| 訓練, 呼び出し (JA) | correct | correct | 「きみれん」, 「こび出し」 (pykakasi) | — |

**Conclusion:** no engine can be trusted with raw ML text. The normaliser's spoken form fixes nearly everything.
Remaining spoken-form errors are few: "LoRA" spoken as "Laura" is sometimes heard as "Allura", and
"over-call" as "overhaul". Consider spelling the latter "over call".

## 8. Failure behaviour summary

| Engine | Truncation | Repetition / hallucination | Long silences | Clipping | Per-call cap |
|---|---|---|---|---|---|
| Irodori | one call > 30 s is cut (CER 0.60–0.65) | one-call hallucination 「積も凍結」 | 0.8 s leading on 2 sentences | no clipped sentence, but peaks reach −0.01 dBFS (limit in the loudness step) | 30 s / 256 tokens |
| Qwen3 | 1 sentence (0.6B ICL, JA reference) | 0.6B Serena → Chinese on raw equation | 0.6B Ono_Anna: 6 sentences with 0.6–2.7 s leading silence (one with a 1.8 s internal pause) | none | 2048 tokens (~160 s); one call fine |
| Chatterbox | all one-calls at 40 s | V3 cfg0 and Turbo: garbled words; Turbo one-call gibberish | cfg0: 1.1 s internal pauses | 1 sentence each in V3 cfg0 and V3 JA | 1000 tokens (40 s); Turbo ≤ ~300 chars |
| Kokoro | none | none | none | none | auto-chunks internally |

## 9. What did not work (or needed a workaround) on Windows

- **Qwen3 (faster-qwen3-tts 0.5.2):** `qwen-tts-hf` crashes on transformers 5.17
  (`MimiConfig has no attribute rope_theta`). Pinned `transformers==5.15.1`.
- **Chatterbox (install):** the upstream git dependency on `resemble-perth` (Perth master) hung `uv sync`
  indefinitely on Windows. Overridden to PyPI `resemble-perth==1.0.1` with `setuptools<82`. The torch 2.6 pin was
  overridden to 2.10+cu128 and runs fine. V3 needs the git install (not in PyPI 0.1.7). Turbo's `from_pretrained`
  also downloads an unused 1 GB `s3gen.safetensors`; the adapter fetches only what it loads.
- **Chatterbox (runtime):** the host-RAM pressure in §5. If it is ever used, run it alone and restart it periodically.
- **HF downloads:** Xet transfers failed ("CAS Client Error"). `HF_HUB_DISABLE_XET=1` fixed it.
- **Host RAM is the real constraint on a 16 GB laptop:**
  - process commit after load is Qwen 0.6B 5.9–7.4 GB, Qwen 1.7B 8.0–9.5 GB, Chatterbox 8.0 GB and Kokoro 3.7 GB;
  - one Qwen run crashed with `0xC0000005` while a CPU metrics job ran alongside it; the rerun alone was fine;
  - run one engine at a time and keep other heavy apps closed.
- **Irodori:**
  - a 30 s generation spills 2–3 GB into shared GPU memory;
  - the reference is re-encoded on every call unless cached (now cached);
  - `compile_model` is unavailable (no triton).
- **Kokoro Japanese: not attempted.** `misaki[ja]` needs `pyopenjtalk` (sdist, MSVC + CMake) plus a 1 GB unidic
  download. Its Japanese voices are C-grade and have no anime identity, so the disk was not justified.
- **Metrics:**
  - UTMOS runs at ~1× real time on CPU, so it runs on the GPU in the Qwen env (`utmos_gpu.py`);
  - librosa `pyin` was ~20× slower than YIN;
  - WDDM per-process GPU memory is N/A in nvidia-smi, so the adapter-level "GPU Adapter Memory" counters are used
    (via `typeperf`, no admin needed).
- **Shared `py/media` venv:** another process re-synced it mid-run (adding pytest), which removed the new `qa`
  extra. The QA metrics therefore run from a separate environment of the same project:
  `UV_PROJECT_ENVIRONMENT=build/venv-ttsqa uv sync --extra cuda --extra qa` (in `py/media`).

## 10. Reproduce

```bash
# envs (Python 3.10 + torch 2.10.0+cu128, hard-linked from the uv cache)
(cd py/tts/qwen3 && uv sync); (cd py/tts/chatterbox && uv sync); (cd py/tts/kokoro && uv sync)
(cd py/media && UV_PROJECT_ENVIRONMENT=../../build/venv-ttsqa uv sync --extra cuda --extra qa)
export HF_HUB_DISABLE_SYMLINKS_WARNING=1 PYTHONIOENCODING=utf-8 HF_HUB_DISABLE_XET=1
Q=build/venv-ttsqa/Scripts/python; B=research/tts/bench/bench.py
$Q $B list                                   # all voice configs
$Q $B run qwen3/base06b-icl-enboot-soft      # GPU; one process per config, sequential
$Q $B asr all                                # GPU (faster-whisper)
py/tts/qwen3/.venv/Scripts/python research/tts/bench/utmos_gpu.py build/tts-bench/<engine>/<voice> ...   # GPU
$Q $B audio all                              # CPU (ECAPA, VAD, F0, LUFS)
$Q $B score && $Q $B tables && $Q $B samples && $Q $B html
```

The engines are registered in `py/tts/engines.yaml` (qwen3, chatterbox, kokoro added), so
`voices/narrator-{ja,en}.yaml` work with the CLI's `runEngine` unchanged.

## 11. Disk

Free space on C: went from 32 GB to 14 GB.

| Item | Size |
|---|---|
| New model weights: Qwen3 0.6B-Base 2.4 GB, 1.7B-Base 4.3 GB, Chatterbox Multilingual V3 3.0 GB, Chatterbox Turbo 2.8 GB | 12.5 GB |
| UTMOS + ECAPA | 0.4 GB |
| `research/tts/samples` (MP3, 96 kbps, loudness-matched) | 90 MB |
| `research/tts/voices` | 6 MB |
| `build/tts-bench` scratch (raw WAVs, jobs, logs; safe to delete) | 0.35 GB |
| The four new environments, net (torch is hard-linked, not copied; the QA env adds a CPU torch) | ~5 GB |

**Unused cached models:** the HF cache already contained `yeeko/Elaina_TTS_QWen3_SFT_Epoch16` (4.3 GB) and
`phasefield-audio/Irodori-TTS-v4.1-Anime` (2.9 GB).
- The first is a fine-tune named after an anime character. The second is excluded by the landscape report
  (undisclosed anime training data).
- Neither was used. Deleting them would free 7.2 GB.

## Addendum (2026-09-28, after the first pilot): expressiveness was not measured

**What happened.** The owner heard the pilot and found the narration "too monotone" next to the Experimental Labs
launch film, which uses plain Kokoro. This benchmark scored intelligibility, identity, stability, memory and speed,
but never *prosody*. Its master-selection rule (§4) even preferred the most stable loudness and the "calmest pitch
contour". A flat voice can win every one of those metrics.

**New metric: pitch variation.**
- F0 via librosa YIN on loud voiced frames, expressed in semitones around the clip's median.
- Reported as the SD, and as the 10–90 % range, in semitones.
- Scripts: `bench/voice_match_synth.py`, `bench/voice_match_score.py`, `bench/pitch_range_ja.py`.

**English, on the launch film's first 7 sentences.** All 15 Kokoro English female voices were synthesised with the
same text; the film audio still has its music bed.

| voice | ECAPA sim. to the film's narrator | pitch SD (st) | 10–90 % range (st) | median F0 |
|---|---|---|---|---|
| launch film narrator | — | 5.34 | 10.95 | 201 Hz |
| **Kokoro af_heart** | **0.950** | 5.02 | 10.43 | 199 Hz |
| Kokoro af_bella | 0.705 | 4.16 | 7.28 | 201 Hz |
| Kokoro af_nova | 0.688 | 4.54 | 9.19 | 160 Hz |
| next 12 voices | 0.18–0.35 | 4.0–7.0 | | |
| pilot EN (Qwen3 0.6B clone, first 7 lines) | 0.02 | 4.08 | 9.56 | 299 Hz |

The launch film's narrator is Kokoro `af_heart`.

**Japanese (benchmark passages, spoken form).**

| voice | pitch SD (st) | 10–90 % range (st) | median F0 |
|---|---|---|---|
| Irodori clone of `soft` (pilot v1) | 3.77 | 8.84 | 254 Hz |
| **Irodori clone of `heroine`** | **4.25** | **11.13** | 351 Hz |
| Irodori caption-only (`soft` caption) | 4.95 | 11.36 | 262 Hz |
| Qwen3 0.6B clone of `soft` → JA | 3.90 | 9.21 | 260 Hz |
| Chatterbox V3 clone of `soft` → JA | 3.74 | 8.52 | 236 Hz |

Caption-only is the most varied, but it re-samples the speaker on every call (consistency 0.74), so it is unusable
for a whole film. Cloning pulls prosody toward the master, so the master's liveliness sets the ceiling.

**Decision.**
- English → Kokoro `af_heart`, the house voice.
- Japanese → Irodori cloning `ja-master-heroine`.
- Future voice choices report pitch variation next to WER and similarity, and are compared against the launch film.
