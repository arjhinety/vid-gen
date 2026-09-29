# Pilot audit: OpenGrad Study 001, English final (2026-09-29)

Film audited: `build/opengrad-study-001/opengrad-study-001.en.final.mp4` (1920x1080, 30 fps, 227.03 s = 3:47, 6,811 frames, Kokoro af_heart), its `.report.json` and `en/timeline.json`. The JA films were used for layout and timing observations only.

Labels used below: **[measured]** came from the timeline, the audio or frame differencing. **[eyeballed]** was counted or judged by looking at frames. **[judgement]** is my opinion. Scratch material is in `build/audit-scratch/` (`sheets/sheet0-5.png` = contact sheets at 1 frame per 2 s; `full/f_*.png` = full-resolution frames; `an.py`, `H.npy`, `X.npy` = frame-difference analysis).

---

## 1. Plain-language verdict

The film is not "bad" because any single piece is wrong. The exhibits are, frame by frame, well made: honest, clean and carefully sourced. It feels bad because of how everything is stacked on the viewer at once.

1. **The viewer is asked to read and listen to the same sentence at the same time, all the way through.** The biggest, darkest thing on screen is the narration, arriving word by word (152 words/min), while the voice says the same words. The exhibit, which is where the explaining happens, is smaller, paler and busy changing underneath. The eye is pulled to the text; the picture is not explaining anything at the moment the viewer is looking at it.
2. **There is no breathing room.** Speech fills 90 % of the runtime, the longest gap between sentences is 1.1 s, and 72 % of all gaps are the same 0.14 s. The headline scrolls a row every 1.5 s. The result is a wall, not a pace. 3Blue1Brown (3B1B) has 5 to 9 pauses a minute and holds a picture in silence for 3 to 4.6 s so it can "do the talking". This film never does that.
3. **Concepts arrive faster than they are defined.** F1 is on screen at 10 s and explained at 75 s. "Post-training", SFT, DPO, "gate", "held-out" and "checkpoint" are used without introduction. The hook (a maths question the trained model refuses) is not connected to the study's actual question (tool use) until about 108 s.
4. **The voice has no way to carry emphasis**, so red highlighted words in the headline stand in for emphasis the voice cannot give. Every short sentence is delivered in the same flat metronome.

The 90-second launch film got away with all of this because 96 s is short enough to be a "trailer": nobody has to learn anything. At 3:47 (and 5:43 in Japanese) the same device becomes a reading task.

---

## 2. What I looked at

- 114 frames at 1 frame per 2 s, tiled into six contact sheets (`sheets/`), read in full.
- 12 full-resolution frames: cold open, four-moves, training ledger, F1 geometry, smoke test, GSM8K, label, basin, what-next, plus a JA frame.
- Frame differencing at 10 fps on the whole film (2,270 frames), split into a **headline region** (y 110 to 320) and an **exhibit region** (y 330 to 990).
- The word-timed timeline (66 lines, 145 headline rows, 72 named cues, 576 words).
- Audio: the final mix against the narration stem.

---

## 3. Measurements

### 3.1 Pacing per scene [measured, from timeline line times]

| Scene | Start (s) | Dur (s) | Words | WPM incl. pauses | Speech share | Gaps ≥ 0.6 s | Longest gap (s) | Cues per 10 s |
|---|---|---|---|---|---|---|---|---|
| cold-open | 0.0 | 15.7 | 47 | 180 | 83 % | 0 | 0.60 | 3.2 |
| four-moves | 15.7 | 22.7 | 62 | 164 | 93 % | 0 | 0.32 | 3.5 |
| training | 38.4 | 36.2 | 76 | 126 | 94 % | 0 | 0.32 | 2.8 |
| f1-geometry (Manim) | 74.6 | 20.8 | 58 | 167 | 92 % | 0 | 0.14 | 3.4 |
| smoke-test | 95.4 | 12.5 | 32 | 154 | 92 % | 0 | 0.14 | 3.2 |
| same-questions | 107.9 | 32.2 | 71 | 132 | 91 % | 1 | 0.92 | 3.7 |
| empty-bin | 140.1 | 16.5 | 50 | 182 | 88 % | 0 | 0.50 | 3.0 |
| the-label | 156.6 | 18.5 | 60 | 195 | 93 % | 0 | 0.14 | 3.2 |
| basin (Manim) | 175.1 | 10.2 | 27 | 159 | 89 % | 0 | 0.14 | 3.9 |
| what-next | 185.3 | 34.5 | 84 | 146 | 95 % | 0 | 0.32 | 2.6 |
| close | 219.8 | 7.3 | 9 | 74 | 53 % | 0 | 0.00 | 2.8 |
| **Film** | | **227.0** | **576** | **152** | **90 %** | 12 in film (all inside scenes' beat gaps) | 1.1 | 3.2 |

(Scene start times are cumulative scene durations from the timeline.)

Film-level facts [measured]:

- **Speaking rate** while speaking: 576 words / 205 s = about 168 wpm. That is **not fast** and matches 3B1B (161 to 207 wpm). Speed of speech is not the pacing problem.
- **Pauses:** across the whole film there are 65 inter-line gaps. 47 (72 %) are exactly 0.14 s (`audio.line_gap`), 5 are 0.32 (`beat_gap`), and only 13 are ≥ 0.5 s. The longest is 1.1 s. 3B1B: 4.3 to 8.6 pauses/min, longest pauses 2.5 to 4.6 s. This film: 3.4/min at ≥ 0.6 s, none over 1.1 s. **The pause structure is metronomic, and no pause is long enough to let a picture register.**
- **Sentence length:** 103 sentences, mean 5.6 words; **42 (41 %) are four words or fewer**. This is the clipped register ("Same score. Opposite failures."). Fine as a trailer; wearing over 3:47.
- **Numbers spoken:** 22 numeric tokens in narration (about 5.8 per minute), spiking in smoke-test (19.3 per minute) and training / four-moves (about 8 per minute). Many more numbers are on screen than are spoken (0.626, 0.755, 441/955, 0.46, 0.97, 62.4 %, 514/824, 0.770 and more).
- **Scene rhythm:** 11 scenes, 10 cuts, average 20.6 s per scene. The first three scenes carry the entire setup in 74 s.
- **The voice:** every scene start has a 0.2 s lead and 0.4 to 0.9 s tail. The only long hold is the last scene's 3.2 s tail.

### 3.2 Motion, stillness and text load [measured with frame differencing; threshold is 0.02 % of region pixels changing by more than 12 grey levels between frames at 10 fps]

| Quantity | Value |
|---|---|
| Headline row scrolls | 145 rows = **38 per minute**, one every 1.54 s |
| Headline word arrivals | 576 = **152 per minute** = a new word every 0.39 s |
| Headline region moving | 49 % of the film |
| Exhibit region moving | 35.5 % of the film |
| Exhibit region **still** | **64.5 %** of the film |
| Whole frame still (both regions) | 33.6 % |
| **Only the headline moving; exhibit still** | **30.9 % of the film** (about 70 s in total) |
| Exhibit activity onsets | 111 = **29 per minute** (proxy for composition changes) |
| Named cues (visual additions) | 72 = **19 per minute**, 3.2 per 10 s |
| Headline words visible at once | median **7**, p90 9.6, max 12 (rows are 2 in most scenes, 3 in cold-open and close) |
| Exhibit text visible at once | roughly **35 to 70 words** at the fullest [eyeballed, no OCR: f_10.5 about 70, f_58 about 50, f_93 about 45, f_118 about 45, f_218 about 55] |

Scene detail on "who moves":

| Scene | Headline moving | Exhibit moving | Only headline moves |
|---|---|---|---|
| cold-open | 54 % | 72 % | 3 % |
| four-moves | 47 % | 37 % | 28 % |
| training | 42 % | 51 % | 22 % |
| f1-geometry | 53 % | 31 % | 40 % |
| smoke-test | 50 % | 30 % | 35 % |
| same-questions | 46 % | 26 % | 33 % |
| empty-bin | 57 % | 23 % | 45 % |
| the-label | 60 % | 28 % | 44 % |
| basin | 52 % | 59 % | 21 % |
| what-next | 49 % | 21 % | 39 % |
| close | 25 % | 14 % | 21 % |

Reading this against the references:

- **3B1B still % is 42 to 78 %; ours (whole frame) is 34 %.** So on paper the film is busier than 3B1B, but the *motion is text*. In empty-bin, the-label, what-next and f1-geometry, the moving part of the frame is the caption for 39 to 45 % of the time, while the picture that is supposed to teach sits still. In 3B1B, when the frame is moving, the thing that moves is the diagram.
- **Composition changes:** 29 per minute (proxy, exhibit onsets) against 3B1B's 1.6 to 8.6 and the launch film's 14.4. Even allowing that my proxy over-counts (crossfades, micro-additions), the exhibits change 2 to 5 times as often as 3B1B.
- **Dwell (fullest state held before change or exit)** [measured]. The exhibit's last activity is 0 to 2.1 s before the scene ends (basin and f1-geometry end while still moving). The longest completely still stretches are 7.1 s (what-next at 206.5 s), 4.9 s (same-questions at 123.6 s), 4.3 s (four-moves 16.4 s, training 64.8 s), 4.2 s (what-next at 187.8 s); `X.npy` has the full list. In other words the "still" stretches exist, but the voice keeps talking through them (see section 4). **The picture never gets a moment alone with the viewer.**
- **On-screen text vs 3B1B:** 3B1B median is about 2 words per keyframe and narration is almost never subtitled. Ours is about 7 headline words plus about 45 exhibit words, and the narration is 100 % subtitled by a 80 px caption.

### 3.3 Sound [measured, final mix minus narration stem]

- Narration RMS: -16.4 dBFS. Music bed + SFX residual RMS: **-39.0 dBFS** overall, **-43.8 dBFS during speech**. That is **23 dB below the voice overall and 27 dB below it during speech**.
- 96.5 % of half-second windows contain speech, so the bed only surfaces in about 8 s of the film, and even there it sits around -44 dBFS.
- Judgement: the procedural A-minor pulse and the -16 dBFS sub impacts are effectively **inaudible** on laptop or phone speakers. They are not distracting; they are also not doing the job the design doc assigns them (texture, continuity, marking cuts). This matters for the redesign: once pauses exist, dead air will be exposed because there is no audible bed to carry it.

### 3.4 Legibility [eyeballed on full-res frames, plus one computed number]

- At 1080p full screen everything is readable. The exhibits are clean and the type is good.
- The house `meta` size is **18 px (1.7 % of frame height)**; `label` 21 px; `caption` 22 px. On a 720p embed, laptop window or phone in landscape this is roughly 9 to 12 px tall. The sublabels carrying provenance (`ink3 #7D7F83` on the sheet `#EFEFEC`) have a contrast ratio of about **3.5:1** (computed from the tokens), below the 4.5:1 normally wanted for small text. `dim` (spoken headline rows, `#9D9E9B`) is about 2.3:1 by design.
- Frame f_118 (GSM8K, 120 s) has at least eight small provenance strings visible at once: `MEASURED · H200 · vLLM 0.29.0 · bf16 · greedy · seed 0`, `1 cell = 1 question · M1-v2`, `final_campaign_verdict.json · gsm8k · zeroshot`, the bar sublabels and more. A normal viewer will not read any of them in the 3 to 4 s the frame exists.
- Frame f_103 (smoke test): the sublabel `7 fixed cases · regex-graded · same prompts, same decoding` touches the column header row (`BASE · Qwen3.5-2B`), a small collision.
- Many exhibits (four-moves, empty-bin, what-next, the metaphor) leave 30 to 40 % of the exhibit area empty, while the labels and sublabels are the smallest text on the frame. Large blank paper with tiny type is the wrong ratio for a video that is watched at less than full-screen size.

---

## 4. Diagnosis of the three complaints

### Complaint 1: the top caption "worked for 90 s but is far too distracting for a long video"

**Confirmed, and it is a design flaw, not a tuning problem.**

Evidence [measured unless noted]:

- The headline is the largest, highest-contrast object on the frame: 80 px bold width-118 Archivo in ink on grey, occupying two to three rows out of the first 320 to 400 px (about 30 to 37 % of the sheet). The exhibit sits below it in smaller, paler type [eyeballed: frames f_10.5, f_58, f_93, f_118].
- It **moves constantly**: 152 word arrivals per minute, a row scroll every 1.54 s, each scroll dimming the previous row. Its motion is not information about the topic; it is a moving copy of what is being said.
- **Redundancy:** the words shown are exactly the words spoken. Learners given identical spoken and on-screen text do worse than with narration and a graphic (the redundancy effect in multimedia-learning research; treat this as background knowledge, not something re-verified here). The mechanism: the reader has to process the same sentence twice, in two channels that drift out of sync because reading is faster than speech.
- **Split attention and forced-pace reading:** the word-by-word reveal denies the viewer's own reading rhythm. The eye reads ahead of the text and gets nothing (words not yet drawn) or lags behind (a row scrolls away). Meanwhile the exhibit below is also building on every cue (3.2 additions per 10 s). Two moving fields compete for the same eye; the caption wins because it is bigger and darker.
- **Sync mismatches:** the headline builds a phrase while the exhibit is empty. Example: at 160 s ("Each example was labelled by…") the sheet is empty apart from a tiny four-chip legend (f_160). At 176 s (basin) the caption reads "Refusal became" beside a nearly empty curve (f_178). In those seconds the headline is the only content, so it has no competitor and reads like a subtitle for nothing.
- **Row breaks that hurt reading:** 10 of 145 rows end on a function word ("…a", "…the", "…of", "…that") and mid-phrase breaks occur ("Only the shape of the / request had changed", "Its gate fails any model that / keeps its tool score…"). [measured, `splitRows` at 34 chars].
- **Why 96 s worked:** the launch film had about 250 words, its exhibits are simple (a bar, a form, a checklist), its purpose was to look like a system, and nobody had to retain anything. Over 3:47 with 576 words and about 25 concepts, the caption is the dominant thing the viewer remembers ("I was reading the whole time").
- **Cost to the exhibit:** the caption takes the top 320 px; exhibits are pushed to 320 to 940 px, forcing small type, empty bands and tight layouts (see 3.4).
- **JA:** the JA version spreads the English headline over Japanese speech in proportion to position (`headline.ts`). English words appear at 101 wpm on average, but each Japanese line is a different length from its English line, so word arrival is not tied to any spoken word. The viewer reads English text keyed to sounds they do not understand. It needs real subtitles (section 6.5).

### Complaint 2: "the pacing sucks"

**Confirmed. Speed of speech is fine; the absence of silence and the constant stream of change are the cause.**

Evidence:

- Speaking rate 168 wpm; that is 3B1B's rate. The film's *overall* pace only feels faster because it has 90 % speech share and almost no pauses.
- **Pause structure** [measured]: 72 % of gaps are exactly 0.14 s; 13 gaps ≥ 0.5 s in 227 s; longest 1.1 s (3B1B: 2.5 to 4.6 s and 5 to 9 pauses/min).
- **No moment of "the picture does the talking".** 3B1B's longest pauses fall exactly where the picture changes (matrix animation, first reveal of the network, sigmoid held). In ours, the picture changes while the voice is mid-sentence, then the voice continues over the finished picture. Example: at 206 to 213 s (what-next) the exhibit is fully built and still for 7.1 s while the voice reads three sentences and the caption scrolls. Compare 3B1B's 3.6 s of silence at the first reveal.
- **Clipped delivery + red emphasis on nearly every sentence.** 41 % of sentences are four words or fewer, and 27 of 66 lines carry a `*…*` red mark, usually on the last words (*wrong*, *doesn't even try*, *better*, *we forgot to look*, *failed*, *lost recall*, *within noise*, *vanished*, *went down*...). When every other sentence is "the turn", nothing is the turn. The design doc calls for "one crimson idea per exhibit"; the narration script has one about every 8 s (27 in 227 s).
- **Scene rate:** 10 cuts in 227 s with a mean scene of 20.6 s, and the setup (the question, the model, the four moves, the corpus, the ledger, DPO, gate change) is crammed into 74 s. The middle 75 to 108 s (F1 geometry, then smoke test) introduces precision, recall, F1 contours, harmonic mean and the smoke test in 33 s.
- **Dead rhythm at the edges:** the cold open holds 0.5 s lead; there is no "cold" stillness at the start (3B1B opens with 4 s of silence and one image), and the finale gives only 3.2 s after the tagline.
- **Numbers per minute** peak at 19/min in the smoke test scene. The viewer cannot map a table of 7 cases × 2 models × 2 outcomes while hearing four numbers.

### Complaint 3: the voice is distracting (interaction with pacing and attention only)

- Kokoro af_heart is intelligible and steady [judgement]. The problem is **what the pipeline does with it**: sentence gaps are fixed (0.14 s / 0.32 s), sentences are short, and the red emphasis in the script cannot be delivered by the voice, so the emphasis lives in the headline colour instead of in the ear. [measured: gap uniformity; judgement: the "flat metronome" perception.]
- Because the voice never lets a sentence trail, the viewer cannot use any gap to look at the exhibit. Every gap that could be a "look at this" beat is 0.14 s.
- Line-level speaking rates vary widely (about 75 to 270 wpm by line span; the high end is probably inflated by alignment edges) so it is not a constant speed either. What matters for the redesign: **pacing must be authored as pauses and holds in the script (`pause:` on lines, per-beat `beat_gap`), not left to a global gap constant**, and a different TTS engine will change the per-word timing that headline sync currently depends on.

---

## 5. Other problems found

### 5.1 Story clarity for a newcomer [mostly judgement, with timestamps]

1. **The hook and the question are different stories.** Cold open (0 to 16 s): a maths question, the base model is wrong, the trained model refuses, "by the score we promoted on, it was the better model". Then 16 to 22 s: "Study 001 asked one narrow question. Can post-training teach a small model *when* to use a tool?" A viewer does not learn until about 108 s (same-questions: "Tool use went up. Maths, instructions and knowledge went down.") how the two connect. There are two mysteries and only one has been named.
2. **Undefined terms used before or without definition** [measured, first spoken time]: "post-training" (16 s), "fine-tuned" (38 s), "preference training" (about 55 s, and DPO is never said aloud but is in the breadcrumb from second 0), "ablations", "seed", "gate" (38 s, used again at 140 s, never defined), "held-out" (140 s), "checkpoints" (108 s), "harmonic mean" (75 s). The F1 score is **on screen at 10 s** (`TOOL-CALL F1 0.626 0.755`) and defined at 75 s, 65 s later.
3. **"The empty bin" as a title (14 s) before the bins exist** (four-moves at 16 s; the empty ANSWER bin reveal at 140 s). The title lands as a slogan with nothing to hook to.
4. **The "one place we forgot to look" promise** (14 s) is not paid until 140 s; nothing in between visibly builds toward it.
5. **The 62 % over-call statistic** (four-moves, about 36 s) and the F1 numbers appear in different scenes without being connected on screen.
6. **The story order is a lab report**: setup, training, metric, alarm, autopsy, hypothesis, next steps. There is no visible current question at any point.
7. **What holds up:** the opening ten-year-old question is a strong hook; the empty-bin reveal (the ANSWER tray at 0) is the film's best idea; the GSM8K refusal grid (1,319 red cells) is the film's best exhibit; the persistent four trays come back three times. These are the parts a 3B1B-style redesign should be built around.

### 5.2 Exhibits [judgement + measurements]

- Tiny type and heavy provenance (see 3.4). Every number carries a source string; this is honest, but reading them is not the viewer's job in the moment.
- Several exhibits are **full tables or ledgers shown in one go** (7-row training ledger at 58 s; 7-case smoke-test table at 103 s) when the narration references only one or two rows. The viewer has to find the row, which the caption offers no help with.
- Manim scenes (f1-geometry, basin) are the film's only continuous-motion pieces; they look like a different film (light axes, thin type, a hairline contour plot) because they are drawn to different scales and stroke weights. f1-geometry ends still moving (0.0 s before end), and basin also (0.0 s), so both cut mid-motion.
- Empty-tray moments: four empty trays sit on screen for roughly 2 to 4 s [eyeballed from the contact sheet] under "Every request has four right moves" (f_30, ja40). Labels appear before the objects they label.

### 5.3 Music bed and SFX

- Inaudible (section 3.3). 23 stamp knocks (-22 dBFS peak) and 10 sub impacts (-16 dBFS) are not audible on typical playback [judgement, from level]. The design doc's "sound marks decisions, not motion" is a good rule, but the levels make it moot.

### 5.4 Scene structure and transitions

- The sheet chrome is identical across cuts, so cuts are exhibit dissolves; that is a good mechanism and worth keeping. But each exhibit leaves the previous one dissolved out and the new one filling in, so almost every cut is a small "blank then rebuild". There is no object that persists across scenes except the four trays; contrast 3B1B, where the *same* grid becomes the neurons becomes the column.
- No scene has a silent beat at entry or exit.
- "Close" (219.8 s) shows the brand card with a mostly empty sheet and a `NEXT · Study 002` stamp for 3 s over the last sentence. It is fine as an end card; the scene before it (what-next, 34.5 s, 84 words) is the longest and densest in the film and ends with "So nothing was trained".

### 5.5 Honesty and provenance devices

- They are the film's best trait and must survive, but they currently overwhelm the exhibit for a general viewer: a claim glyph, a source filename, a run configuration, an `n =` and a `single seed` note on almost every frame. On a 720p window they read as texture, not as information. [judgement]
- AGENTS.md non-negotiable 2 requires that not-measured items are shown as such (dashed flag, "illustrative") and that two eval sets are never on one axis. It does **not** require source filenames on the frame; those come from `claims-pilot.yaml` and `data/*.json` and can live in a receipts card, the description, or a hover / end panel. The on-screen-provenance rule lives in `docs/design-system.md` ("Honesty is typographic"), which is a house-style choice that can change.

---

## 6. Recommended redesign (same sheet, no running caption)

Priorities: **P0 = do first, changes the perception of the film; P1 = do with it; P2 = polish.**

### 6.1 The core change (P0): remove the narration-as-headline; use the picture as the explainer

**What text is allowed on screen, and when.** The 3B1B pattern (about 2 words per keyframe, narration almost never subtitled) is the target.

1. **Term labels attached to objects.** One to three words, written on when the term is first spoken, and staying attached to the thing they name ("precision", "recall", "refused", "sealed", "answer bin"). Size: `label` at 30 to 36 px minimum. This is the replacement for the caption's job of carrying key words.
2. **The open question of the moment**, one line, shown when the question is first asked and kept until it is answered (3B1B's "Why the layers?", "What parameters should exist?"). Example in this film: "Did tool use get better, and what did it cost?" This gives the viewer a place to look and something to track that the caption never did.
3. **A short section title** (2 to 5 words, in the freed top band, static; the breadcrumb already changes per section and can carry it). Written on once, not animated per word.
4. **Numbers as objects, not sentences.** A number appears attached to the bar, cell, tray or point it describes, and is spoken at most once.
5. **A single crimson turn word at most once per scene**, in an exhibit label, not a running-text colour.
6. **Not allowed:** narration reproduced verbatim; per-word reveal; scrolling rows; source filenames and run configs on the frame (moved to 6.6); more than about 8 words of text at once outside exhibit object labels.

**Layout zones now that the top 320 px are free** (canvas stays 1920x1080, same grid sheet, header band 0 to 90, perforations at 110 and 968, sheet ends at 992):

| Zone | y range | Use |
|---|---|---|
| Header + breadcrumb | 0 to 90 | Unchanged; the section title can be promoted here (larger, the current section only) |
| Question line | 120 to 190 | The open question, `heading` 40 to 48 px, persistent while open; empty when there is none |
| **Stage** | 210 to 940 | One persistent object per scene; use the full height for the object itself (about 730 px instead of 620) |
| Object labels | on the stage | Attached to objects; `label` at least 28 px, `meta` retired from the stage |
| Receipts row | 900 to 940 | Optional single claim glyph and a 3 to 4 word source tag, and only when the scene's claim is a *result* |
| Desk band | 992 to 1080 | Burned subtitles for the JA version only (see 6.5) |

Practical effect: exhibits can grow about 18 % taller and fonts can go up about 40 % without collisions.

**Build changes needed in the pipeline** (section 7 lists files).

### 6.2 Pacing targets (P0)

Targets are derived from the 3B1B beats table and this film's measured numbers.

| Quantity | Now | Target |
|---|---|---|
| Speaking rate | 168 wpm | keep 150 to 170 wpm |
| Speech share of runtime | 90 % | **70 to 80 %** |
| Pauses ≥ 0.6 s | 3.4 per minute | **5 to 8 per minute** |
| Longest pause | 1.1 s | at least **3 to 4 s** at the film's 3 to 4 key reveals |
| Line gap | 72 % identical at 0.14 s | vary 0.2 to 0.6 s by sentence role; **never uniform** |
| Sentence length | mean 5.6 words, 41 % ≤ 4 | mean 9 to 12 words, with a few short ones for turns |
| Composition changes (real) | about 29/min proxy | **3 to 6 per minute**, with **one peak scene at 8 to 9** |
| Exhibit fully built dwell | 0 to 2 s | **at least 3 s of silence** on the payoff of each scene; at least 6 s at 3 to 4 key moments |
| Named cues per 10 s | 3.2 | **1 to 1.5** |
| Numbers per minute (spoken) | 5.8 average, peak 19 | at most **4 per minute**, one number per breath, and each new number attached to an object |
| Words on screen at once | about 50 (7 headline + 45 exhibit) | **5 to 15** |
| Cold-open | 0.5 s lead | 2 to 4 s of silence with the single first image (3B1B: 4 s, then "This is a three.") |

**Pause rules to put in the script:**

- After a question is posed: 0.6 to 1.0 s.
- After a reveal (the number, the empty tray, the refusal grid): 2.5 to 4 s, silent, no other motion.
- Between sections: 1.0 to 1.5 s.
- Inside a sentence at a comma that introduces a term: 0.3 to 0.5 s while the label writes on.
- Never start the next sentence until the object it is about has finished moving.

**Holds where the picture does the talking** (candidates, all measured moments): the moment the base model answers "12" and the trained model apologises (about 8 s); the 1,319 red cells filling (about 122 s); the ANSWER tray staying at 0 (about 146 s); the single refusing dot in the basin; "Two labellers agreed on 77%" against the floor line (about 209 s).

### 6.3 Scene notes (P0 to P1)

| Scene | Verdict | Notes |
|---|---|---|
| cold-open (15.7 s) | **Keep, rebuild** | Start with 2 to 3 s of silence and the question card alone. Show base answer and trained refusal, each with a hold. **Remove F1 0.626 / 0.755 from the cold open** (undefined). Move "by the score, it was better" into a spoken line with a check mark and no numbers; the numbers come in section 3. Delay the title "The empty bin" and the empty-tray image to the scene where the bin is explained, or keep only as a teaser without the word "bin" |
| four-moves (22.7 s) | **Keep, simplify** | Build the four trays one at a time, each with its example card; hold the ANSWER tray *empty* with a small "?" (the question the viewer should carry). Drop `held-out confirmatory set · n = 1,277` from the stage. The Qwen "parameters/SFT→DPO" form is jargon; cut to "a 2B model" with the model card as a single label |
| training (36.2 s) | **Cut and merge** | Show only: corpus (173,237 as one big number, four sources as one bar), the sealed test, the over-call drop 62 % to 15 %. The 7-row ledger and the 0.626 to 0.755 chart are the densest part. Keep "most failed" as a compressed ledger silhouette (7 dots, 5 red) and move row detail to a companion page. DPO gets one sentence, defined as "a second training step that uses preferences" the first time |
| f1-geometry (20.8 s) | **Simplify** | This is the only place the film teaches a concept. Give it 30 to 40 s, not 21. Introduce precision and recall with two hands-on cases (a small grid of 10 items), define F1 on the geometric plane, and only then show base, M0, M1 points. Remove the three formulas from the left half of the frame until they are earned |
| smoke-test (12.5 s) | **Simplify** | Show two columns and only the two rows that differ (multi-step-change, format-constraint). The other five rows can be five unlabelled ticks. Say "5 out of 7 for both" once and hold it |
| same-questions (32.2 s) | **Keep, tighten** | Best evidence in the film. GSM8K grid: hold in silence while it fills. The 8-shot control needs its own beat; the "Only the shape of the request had changed" sentence is the thesis, so give it a 1.5 s pause on either side. The checkpoint ladder (four lines, four percentages, labels) can lose the numbers except the largest drop |
| empty-bin (16.5 s) | **Keep, extend** | This is the film's payoff. Ask "why didn't the gate catch it?" as the on-screen question line, hold, then count the bins one by one, then let the ANSWER bin stay empty for 3 to 4 s before the "nothing to divide by" line. Remove the checklist of gates unless it is narrated item by item |
| the-label (18.5 s) | **Keep** | The code panel is a good object; enlarge it and highlight one line as it is spoken. Remove the four-chip legend at the top right until it is needed. Cut "In one source, six in ten" or make it a second bar under the first |
| basin (10.2 s) | **Cut or merge** | It is a not-measured metaphor introduced late, ending cut mid-motion. Merge into the-label as a 10 s aside with the dashed flag, or cut to keep the film about evidence |
| what-next (34.5 s) | **Split and cut** | 84 words, the longest scene, ending a film that has already peaked at the empty bin. Keep three ideas: "the label is the defect, not the refusal", "Study 002 fills the empty bin (1,055)", "it stopped itself at 77 % vs 80 %". The "many refusals were right / hallucination" flow diagram is a new idea and needs its own scene or a cut |
| close (7.3 s) | **Keep** | Extend the hold to 5 s and end on the tagline with the brand card |

Net effect: 11 scenes to 8 or 9, with the same evidence, in roughly 4:00 to 4:30 of film at 70 to 80 % speech share.

### 6.4 Script changes (P1)

The narration itself is part of the problem and should be revised, not only the caption removed:

1. **Reorder the first minute** so there is one question, not two: hook (the ten-year-old question and the refusal), then the promise ("this is a story about a score that said better while the model got worse, and the check that could have caught it"), then the study's question.
2. **Define terms at first use**, one per breath: post-training, fine-tuning, preference training (say "DPO" once), F1, gate, held-out, checkpoint.
3. **Longer, connected sentences**, with a few short ones reserved for turns. Reduce "*…*" red marks to about one per scene.
4. **One idea per scene**, stated as the open question at the top ("Did the score tell the truth?").
5. **Limit spoken numbers** to four per minute and put the rest on objects.
6. **Close the promise made at 14 s**: the "one place we forgot to look" line should be paid off explicitly at the empty bin ("this is the place").
7. Keep claims ids and classes unchanged; re-check `claims-pilot.yaml` after any rewrite because the check is per line (`pnpm video check`).

### 6.5 Japanese version (P0)

- Japanese voice with **English subtitles at the bottom**, as burned-in subtitles in the desk band (y about 1000 to 1075) or a translucent card above it. The pipeline already supports this: `burn_subtitles: true` on the language variant (`schema.ts:53`, `render.ts:120`) and `subtitle` at 40 px in `tokens.ts`; the current desk band (992 to 1080 = 88 px) fits **one line at 40 px**, so cap subtitles at about 42 characters per line and two lines, or raise the sheet's bottom edge.
- Subtitle chunks should be **sentence-scale, timed to the Japanese audio**, at most about 15 words at 17 characters/s reading rate, not word-by-word. Do not reuse the proportional spread in `buildHeadline` for non-English audio (it makes words appear at times unrelated to any spoken word; in the current JA film the English words average 101 wpm).
- Timing: JA runs 343 s against EN's 227 s, and the JA text is not normally shorter. Lengthen visual dwell rather than compress it; give the JA version its own pause schedule from its own timeline (the pipeline already builds a per-language timeline).
- Keep the on-stage labels in English (they are object names); or provide JA labels as a second string in `labels`, but do not subtitle them.
- Voice: the JA films audited still use the old voice; re-render after the TTS decision.

### 6.6 Provenance devices (P1)

Keep honesty, move detail off the stage:

- On the stage: the claim-class glyph plus **one** label per exhibit (for example "measured" or "not measured · metaphor"), and the dashed frame for metaphors. Two eval sets never share an axis (unchanged).
- A **receipts card** at the end of each section (or at the end of the film) that lists claim ids, source file, run config, `n` and seed. It can be a 3 to 4 s hold shown at the end, and also emitted as a `receipts.md` / description text from `claims-pilot.yaml`. This preserves "Never invent a result" in a form a viewer can audit.
- Retire `meta` (18 px) from the stage; the smallest text on the stage should be about 28 px at 1080p, contrast at least 4.5:1 (change `ink3` for stage text or add a darker tier).

### 6.7 Sound (P1)

- Raise the bed so it is audible (aim 12 to 15 dB under the voice during speech, not 27) and let it **open up** (louder, held chords) in the pauses; otherwise silence in the new pacing becomes dead air.
- Keep impacts to the 3 to 4 real reveals (cut hits at 8 to 10 dB above the current level), remove the routine stamp knocks (23).
- Retire "Almost no silence" from the design doc (see 7).

### 6.8 Priority list

| # | Item | Priority |
|---|---|---|
| 1 | Turn the headline off (or replace it with question line + term labels) | P0 |
| 2 | Per-scene pause and hold authoring; raise silent holds to 3 to 4 s at key reveals | P0 |
| 3 | Reorder the first minute; remove undefined F1 numbers from the cold open | P0 |
| 4 | JA: real sentence-level English subtitles in the desk band | P0 |
| 5 | Cut/merge scenes: training ledger, smoke test rows, basin, what-next | P1 |
| 6 | Rewrite narration: longer sentences, one number per breath, define terms | P1 |
| 7 | Enlarge stage type; move provenance to a receipts card | P1 |
| 8 | Make the bed audible and open in pauses; limit SFX | P1 |
| 9 | Persistent objects across scenes (grid to objects, as in 3B1B) | P2 |
| 10 | Hold mid-motion Manim ends; harmonise stroke weights with the sheet | P2 |

---

## 7. Pipeline and code facts the redesign must touch

All of these were read, not modified.

| Item | Where | Note |
|---|---|---|
| Headline construction | `packages/core/src/headline.ts` (`splitRows`, `buildHeadline`) and `packages/core/src/timeline.ts:83, 195` | `project.headline.enabled` (schema `headline.enabled`, default true) already turns it off: `timeline.ts:195` builds `[]` when disabled. Per-scene `headline_rows: 0` also hides it (`schema.ts:31`). So **the caption can be switched off without code**; the work is what replaces it |
| Headline drawing | `packages/kit/src/sheet.tsx` (`Headline` at line 127, `HeadlineRowView` at 167, `SheetChrome` at 216, which always renders `<Headline />`) | `SheetChrome` needs a new optional child region for the question line and a section title; `Headline` becomes optional |
| Layout constants | `packages/design/src/tokens.ts:127-134` (`headlineX`, `headlineTop`, `headlineRow`, `headlineChars`, `exhibitTop2: 320`, `exhibitTop3: 404`, `exhibitBottom: 940`); `projects/opengrad-study-001/scenes/shared/layout.ts` (`TOP2 = layout.exhibitTop2`, `TOP3 = layout.exhibitTop3`) | Nine scene files import `TOP2`/`TOP3` (`ColdOpen`, `EmptyBin`, `FourMoves`, `SameQuestions`, `SmokeTest`, `TheLabel`, `Training`, `WhatNext`, `shared/layout.ts`). Introduce one new constant (for example `exhibitTop = 210`) and re-derive tray rects and chart boxes; `trays(top = 520, h = 280)` in `layout.ts` needs new defaults. Manim scenes read the same numbers through `tokens.json` (`pnpm design:export`; a test fails when it is stale) |
| Type scale | `packages/design/src/tokens.ts:86-103` | `meta` 18 px and `label` 21 px are the sizes to raise for stage use; a new `stageLabel` style (about 30 px) is the simplest addition |
| Film context and cache keys | `packages/cli/src/commands.ts:60` (`filmContextKey`) and `:75` (scene hash) | Scene caches include the neighbouring headline and section (per AGENTS.md). With headline off, the key will simply stop depending on it. Any new persistent chrome (question line, section title) **must be added to `filmContextKey`**, or it will draw stale from cache. Changing tokens or layout invalidates every scene, so plan for a full re-render; edit narration and layout together to avoid two full renders |
| Audio gaps | `project.yaml` `audio.line_gap: 0.14`, `beat_gap: 0.32`; schema defaults 0.28 and 0.6; per-line `pause:` and per-beat `pause:` (`schema.ts:151, 163`; `timeline.ts:154, 158`) | Uniform 0.14 is the measured cause of the flat rhythm. Raise the defaults (for example `line_gap: 0.3`, `beat_gap: 0.9`) and author explicit `pause:` values for reveals; `hold:` and `lead:` per scene give the silent beats at scene edges (`schema.ts:34-37`) |
| Cue density | `[[cue]]` markers in `narration.yaml`; `docs/scene-authoring.md` asks for "one addition per phrase (roughly every 2 to 3 s)" | This is the source of 3.2 cues per 10 s. Update the guidance to one per sentence or per reveal |
| Sound | `project.yaml` `audio.music` (`gain_db: -21`, `duck_db: -9`, `cut_hits_db: -16`) and 13 `sfx` entries (23 events) | Measured residual is -39 dBFS (27 dB below voice during speech). Edit gain and ducking; keep loudness at -16 LUFS (check `integratedLufs` / `truePeakDbtp` in the report) |
| JA subtitles | `burn_subtitles` (`schema.ts:53`), `render.ts:120-131` (ASS burn), `layout.subtitleBaseline: 1030` | The ASS file `en/subtitles.en.ass` exists already; check its line-breaking and the desk-band height before turning it on |
| Docs that assert the old rules | `docs/design-system.md` ("The narration is the headline", "Almost no silence", "Something is always being added"), `AGENTS.md` non-negotiable 6 ("A scene draws one exhibit below the headline; the sheet, breadcrumb and headline are not yours to draw"), `research/reference-videos/experimental-labs/grammar.md` | These will contradict the redesign and must be revised together with the code |
| Non-negotiables to keep | `AGENTS.md` items 1 (no invented results), 2 (mark not-measured), 5 (deterministic scenes) | Nothing in this audit conflicts with them; on-screen source filenames are a house-style choice, not an AGENTS rule |

Suggested implementation order: (a) set `headline.enabled: false` and render two scenes as a test to see the exhibit alone; (b) add the stage-label type style and enlarge object labels; (c) add the question line to `SheetChrome` and to `filmContextKey`; (d) author pauses and revise scenes one by one, previewing with `pnpm video still` at every cue; (e) adjust audio levels last.

---

## 8. Caveats

- "Composition changes" in the 3B1B table were measured by a scene-scanner (`vidmedia refscan`); mine are a pixel-difference proxy on the exhibit region. The proxy counts crossfades and micro-additions as changes, so the 29/min figure is an upper bound. The direction (busier than 3B1B by a factor of several) is robust; the exact ratio is not.
- Exhibit word counts are eyeballed from frames; there was no OCR available (`tesseract` is not installed).
- The claim about the redundancy effect is background knowledge from multimedia-learning research, not re-verified here.
- The perception of the voice as "flat" and the sub-bass impacts as inaudible are judgements from levels and gap structure, not listening tests. Listen to the film with the redesign before locking the audio levels.
- I did not check the ASS subtitle file's wrapping or the JA audio; JA conclusions rest on the timeline and one frame.
- Files were read-only apart from this report. Scratch files are in the gitignored `build/audit-scratch/`.
