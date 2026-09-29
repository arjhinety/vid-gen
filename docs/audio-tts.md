# Audio and TTS

Narration is synthesised locally, aligned against the known script, and turned into the timeline that every scene animates to. The same pipeline builds the English film and the Japanese-voice film (with English subtitles).

## The narrators

**Expressive, and directed.** Both narrators are synthetic; nothing was cloned from a real person.

| Voice | Engine | How the voice was made | Direction | Measured |
|---|---|---|---|---|
| `narrator-en` | **Kokoro-82M** preset `af_heart` (Apache-2.0), the launch film's voice | Built-in preset | Each tone edits Kokoro's own predicted pace and pitch contour before decoding (`tone_via: prosody`), so the timbre is untouched | On one sentence, median F0 172 Hz (gravity) to 210 Hz (surprise) vs 194 neutral; length −3 % to +12 %; ASR identical in every tone; WER 0.3 %; RTF ~0.1; ~1 GB |
| `narrator-ja` | **Irodori-TTS v4.1-Small** (MIT + Ethical Restrictions) | Designed from a text caption (「明るく澄んだアニメ声の若い女性…」, seed 2026, no reference audio) and frozen as `research/tts/voices/ja-master-heroine.wav`. Production clones that master | Two emoji from Irodori's own palette at the start of the clause that carries the emotion (`tone_via: inline`) | Pitch variation 4.20 st untagged, 5.44 with stacked emoji; kana CER 0.9 %; RTF 0.72–0.75; 3.8–4.6 GB |

**How we got here.**
1. The first pilot used a Qwen3 clone of the calm `soft` master (EN) and Irodori cloning `soft` (JA). The owner found both too monotone: pitch variation 4.08 and 3.77 semitones, against 5.34 for the lab's launch film.
2. We switched EN to Kokoro `af_heart`, the launch film's own voice (5.02 st).
3. After the 3:47 pilot, the owner named the remaining problem: a voice that cannot be *directed*, meaning no emotion or emphasis where the story turns.
4. A survey and test of local engines (`research/tts/emotion-tags.md`, samples in `research/tts/emotion/listen.html`) found two ways to direct a voice that fit a 6 GB laptop and keep every word intact:
   - EN: Qwen3 CustomVoice with an instruction per line. It has no positional control, so an inline tag becomes the line's instruction.
   - JA: Irodori with stacked emoji. One emoji per clause barely moves it.
5. The owner chose Serena for English. On hearing the whole narration, they found it robotic and "static" next to Kokoro, which "has better flowing and tone", but still wanted the tags ("keep the semantic tags, but proper voice").
   - Serena reads slowly (2.3 words/s), and the 12 % time-stretch added to fix that probably made it worse.
   - Measured through the stretch: clarity ratio 5.0 → 4.7 dB, high-frequency noise +1.9 dB.
   - There was no hiss (−84 dB silence) and no codec problem (192 kbps AAC).
6. **Now:** Kokoro af_heart, directed by prosody (`py/tts/kokoro/run.py`).
   - Kokoro predicts each line's durations and pitch contour, then decodes them with the preset's timbre style.
   - A tone (`"speed=0.88 pitch=-2.5 range=0.6"`) edits the prediction, not the timbre.
   - **The limit:** it changes intonation and pace, not voice quality. It can't sound breathy or smiling the way an instruction-following model can.
   - The decoder follows the edited contour only partly (a 25 % wider range came out ~10 % wider), so the palette is set strong.
   - **Alternatives not taken:** Serena (above; kept as a commented fallback); VoxCPM2 (3–4× slower than real time, fills the 6 GB card); CosyVoice3 (instruction plus cloning; untested, the next candidate if more expressiveness is needed).

**Rule:** report pitch variation (F0 SD in semitones) with every voice choice, and compare it against the launch film. Confirm by ear: the metrics show that direction *changes* delivery, not that it sounds right.

**Fallbacks** (settings are commented in the voice files):

1. EN: Kokoro `af_heart`, the launch film's voice (no direction; `tone_via: none`), or Kokoro `af_bella` / `af_nova`.
2. JA: remove the tones (untagged Irodori is bit-identical to the undirected voice), or swap `ref_wav` to `ja-master-soft` / `ja-master-bright`.

**Not used on this machine:** Chatterbox (RTF ≈ 1.0, a 40 s cap per call, 8–10 GB host RAM, which caused paging), Chatterbox Turbo (gibberish past ~300 characters), VoxCPM2 (see above; removed from disk).

**Kokoro is deterministic,** and so is Irodori with a fixed seed. Qwen3 sets a seed per line, but whether a rerun gives bit-identical audio is unverified. A line that fails the checks below gets retried with a new seed.

The metrics cannot judge timbre or delivery, so **confirm by ear** before a final render.

## Direction (`tone`)

A line can say how it should be delivered:

```yaml
- en: "Not a statistics problem. [[title]]An empty bin: the one place we forgot to look."
  ja: "統計の問題ではありません。[[title]]{reveal}空っぽの箱。私たちが見落としていた、ただ一つの場所です。"
  tone: reveal
```

- **`tone:`** is one word from the voices' `tones` tables: `curious`, `disbelief`, `irony`, `gravity`, `surprise`, `reveal`, `resolve`, `warm`. `video check` fails on a tone a voice doesn't know.
- **Inline `{tone}`** in one language's text places the direction at a clause. It overrides the line tone in that language only, which is how the Japanese puts its emoji right before 空っぽの箱.
- **Each voice file translates the word:**
  - `narrator-en` gives Kokoro a prosody edit, e.g. gravity: `speed=0.88 pitch=-2.5 range=0.6`. An instruction engine (Qwen3) would get a sentence instead.
  - `narrator-ja` inserts an emoji stack, e.g. reveal: ⏸️⏸️😎💥.
  - A voice with `tone_via: none` ignores tones.
- **Only the engine sees the direction.** Subtitles, alignment, cue timing, the ASR round-trip and the number guard all use the clean text. A tag can never be shown or mistaken for a word.
- **The cache key includes the direction,** so retuning a tone re-synthesises only the lines that use it. Untagged lines keep their key.
- **`qa.json` records each directed line's tones** and exactly what was sent.
- **Use it sparingly.** In the pilot, about a third of the lines (23 of 62) carry a tone, at the turns. When every line is emotional, none is.
- **Irodori can stretch a vowel on a tagged clause** (「消えましたー!」). The CER check ignores 「ー」, so a stretched vowel is not counted as a misreading.

## Pipeline (`pnpm video audio <project> --lang en|ja|all`)

1. **Normalise** (`packages/core/src/normalize`):
   - Turns the display text into the spoken form: numbers ("1,319" → "one thousand, three hundred and nineteen" / 千三百十九), acronyms, symbols, and the project lexicon (`script/lexicon.yaml`), or a `say_en` / `say_ja` override.
   - Keeps a character map back to the display text.
   - **Every engine gets the spoken form, one line per call.** Raw digits and Latin text were misread by every engine tested; in Japanese, the spoken form is pure kana and kanji.
2. **Synthesise** each line not already cached:
   - The cache is `.cache/tts/<engine>/<hash(engine adapter, voice params, spoken text, seed)>.wav`, so editing one line re-synthesises one line.
   - Engines run in their own venvs through `py/tts/<engine>/run.py` (job protocol in `py/tts/_protocol.py`), and each job records peak VRAM.
3. **Prep** (`vidmedia prep`): optional speed-up (the voice's `tempo`), mono 48 kHz, trim silence to 40 ms pads, loudness-match every line to −19 LUFS.
   - `tempo` uses FFmpeg's rubberband filter with formants preserved, so pitch and timbre don't move.
   - `narrator-en` uses 1.12, because Serena reads at about 139 words a minute and a pace instruction barely helped.
   - A 1.10 / 1.15 check kept the median F0 at 250 → 251 / 249 Hz and the ASR word-perfect.
4. **Align and QA** (`vidmedia align`):
   - faster-whisper large-v3-turbo transcribes each line in its language.
   - Words are aligned to the *known* spoken text (character-level mapping, so the script is never replaced by the transcript).
   - The round-trip CER is measured.
5. **Retry.** A line is re-synthesised with a new seed (two retries; the best take is kept) when either check fails:
   - **CER:** its character error rate is above the limit (EN 0.12, JA 0.18).
   - **Number guard:** a number is misheard. Every number, and every lexicon term containing a digit such as F1, must come back intact from the ASR, after the transcript goes through the same normaliser, so "1,319", "1319" and the words all count.

   The number guard exists because an error rate can't tell a slip from a wrong result. In the pilot, Irodori's first two takes of 「1,319問」 (two seeds) were both heard as 千三百九 (1,309): a CER of 0.042, well under the limit, but the voice would have contradicted the headline with a false number.
   - **Evidence it was the voice, not the ASR:** the number lasted 1.22 s in take 2 and 1.56 s in take 3, with 十 aligned at 3.64–3.88 s in take 3.
   - **Resolution with the `soft` master:** the third seed was heard correctly.
   - **With the `heroine` master:** all three seeds dropped the 十, so the line now spells the number in kana in `say_ja` (`jaIntegerKana(1319)` → せんさんびゃくじゅうきゅう), and every take is heard correctly.

   **When no seed gets a number right, spell it in kana.** The guard still checks a kana-spelled number, whether the ASR writes it back as digits, kanji or kana. Two limits keep that check from matching by accident:
   - It only applies to plain quantities of four or more kana. A short reading like 「に」 occurs in ordinary words such as 「前に」.
   - Names like "002" read their own way (ゼロゼロニ) are skipped.

   Every line's CER, misheard numbers, seed and texts go to `build/<id>/<lang>/audio/qa.json`. Anything still failing after the retries is flagged by name, to be checked by ear.
6. **Timeline.**
   - `buildTimeline` places lines with `line_gap` / `beat_gap` / per-line `pause`, and resolves `[[cues]]` to aligned word starts.
   - It places the question-line changes (`question` in project.yaml) at their cue times.
   - When a project turns the headline on, it builds the headline rows with per-word times (for JA the headline is English, spread proportionally over the Japanese line).
   - It writes captions (SRT/VTT) and `timeline.json`.
7. **Narration mix:** the lines placed on the timeline, normalised to the target (−16 LUFS), peaks limited to −2.0 dBFS (a peak limiter, not a whole-track gain cut, so loudness stays on target; the 1 dB margin absorbs AAC's inter-sample overs) → `narration.wav`.

## The film mix (`pnpm video render`)

When `project.yaml` declares `audio.music` or `audio.sfx`, `vidmedia mix` builds the final bus. It has three parts.

**Voice.** The voice bus is normalised to `target_lufs`.

**Bed.** The bed is one of three things:
- licensed tracks (`tracks`);
- a single licensed file (`path`);
- the procedural `pulse` (`vidmedia/bed.py`).

It sits `gain_db` LU under the voice, and a timeline envelope ducks it by `duck_db` under every spoken line (0.25 s before, 0.45 s after, 0.35 s ramps).

**Tracks** (`vidmedia/tracks.py`). Each track plays from its scene to the next track's scene, and neighbours cross-fade over `xfade` seconds across the cut. Each track is levelled on its own, so both halves sit at the same loudness. The mix is stereo: voice and effects in the centre.
- **Too long:** the first tracks keep their start and fade out at the cut. The last track keeps its *end*, so its composed ending lands on the film's last frame.
- **Too short:** it repeats a stretch from its middle, spliced where the music repeats itself.
  - The search compares 8-second windows for the same harmony (pitch-class profile) and the same rhythm (onset pattern).
  - It then shifts the splice by up to ±60 ms to line up the beats.
  - On the pilot's two tracks the chosen loops are 24.0 and 28.0 bars at 92 BPM, with harmony similarity 0.98 and 0.87.
  - The mix report (`audio/work/film-mix.results.json`) records each track's stretch, trim, loops and splice points. Listen to the splice once.

The pulse itself:

- plays an A minor pad (Am9 → Fmaj7 → Cmaj9 → Em7, two bars each)
- puts a sub on beats 1 and 3 and quiet off-beat ticks on top
- fits its bars per scene, so every cut is a downbeat
- drops the pulse in the last scene and holds the tonic

**SFX** are procedural (`tick`, `thump`, `whoosh`, `stamp`, `impact`), pinned to `scene:cue` with an offset, and not ducked. `music.cut_hits_db` adds an `impact` on every cut.

The render measures the result with EBU R128 and warns if integrated loudness is outside ±1 LU of the target or true peak is above −1 dBTP.

```yaml
audio:
  target_lufs: -16
  music:
    tracks:
      - { path: projects/opengrad-study-001/assets/music/graph-paper-learning.wav, from: cold-open }
      - { path: projects/opengrad-study-001/assets/music/hidden-flaw-discovery-take2.wav, from: smoke-test }
    gain_db: -9
    duck_db: -7
  sfx:
    - { at: "empty-bin:empty", offset: 0.2, sound: impact, gain_db: -11 }
```

**Levels.** The pilot audit measured the old bed (the pulse at −21 LU, ducked 9 dB) at 27 dB under the voice during speech: effectively inaudible. Once the film has real pauses, an inaudible bed leaves dead air. At −12 / −6 the tracks measured 19 dB under the voice in speech and 16 dB in the pauses. The pilot now uses −9 / −7. Confirm by ear.

## Adding an engine

1. Create `py/tts/<engine>/` with a `pyproject.toml` (its own pins) and a `run.py`. `run.py` reads the job JSON (`items: [{id, text, out, seed, lang}]`, `voice`, `device`), writes a WAV per item at the engine's native rate (prep resamples), and writes `<job>.results.json` through `_protocol.py`.
2. Register it in `py/tts/engines.yaml` with `python`, `runner`, `setup` and `langs`.
3. Point a `voices/<voice>.yaml` at it, with `provenance`.
4. Benchmark it against the same corpus before using it: `research/tts/bench/bench.py`. The reusable metrics are in `vidmedia/ttsqa.py` (the `qa` extra).

## Hardware notes (RTX 4050 Laptop, 6 GB)

- **One GPU process at a time.** The CLI runs engines sequentially. Irodori at bf16 reserves about 5.2 GB per sentence. A single 30 s Irodori call spills 2–3 GB into shared memory and truncates, which is why the pipeline synthesises one line per call.
- **Host RAM matters too.** Chatterbox committed 8–10.5 GB and pushed the laptop into paging.
- **Cold starts.** Loading an engine takes up to ~45 s (Chatterbox, the slowest measured). Cached lines skip the engine entirely.
- **Windows install issues:**
  - Set `HF_HUB_DISABLE_XET=1` if Hugging Face downloads fail.
  - `faster-qwen3-tts` needs transformers 5.15.1, which is pinned.
