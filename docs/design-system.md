# The house style (Experimental Labs)

**A lab sheet that works a problem out in front of you.**

- **The page** is grey grid paper with a mono breadcrumb along the top.
- **One line under the header holds the open question**: the thing the viewer should be wondering right now. It is the only running text on the sheet. The narration is never shown.
- **Below it sits one exhibit** that builds as it is explained. The words it needs are **written onto the objects they name**.
- **Pauses are part of the design.** After a reveal the voice stops, and the picture does the talking.
- **Colour:** ink is what was measured; crimson is the turn.
- **Honesty:** every result carries its claim class. Sources go in the receipts, not on the stage.

**Where it comes from:**
- **The sheet** (paper, breadcrumb, cuts, colour and type) comes from the lab's own launch film; see `research/reference-videos/experimental-labs/grammar.md`.
- **The explaining** (text on screen, pacing, pauses) comes from 3Blue1Brown; see `research/reference-videos/3b1b-nn-ch1/beats.md`.

**Why the change.** The launch film showed its narration as a word-by-word headline. That works for a 90-second trailer, where nobody has to learn anything. The pilot audit (`research/audits/2026-09-29-pilot-audit.md`) measured what happened when we stretched it to a 3:47 explainer:
- the viewer read the same sentence the voice was saying;
- the caption was the moving thing for 31 % of the film;
- speech filled 90 % of the runtime, with no pause over 1.1 s.

The headline still exists (`headline.enabled`) for short films.

All values live in `packages/design/src/tokens.ts`. Python gets them through `tokens.json` (`pnpm design:export`; a test fails when it is stale).

## The sheet (drawn by the player for every scene)

| Element | Where | Notes |
|---|---|---|
| Header band + breadcrumb | y 0–90 | Logo mark, then `BRAND · PLACE · CRUMBS · SECTION` in mono caps, tracked 0.14 em. The scene's `section` (project.yaml) crossfades at the cut |
| Grid paper | y 90–992 | Minor lines every 24 px, major every 96 px, soft top-left light |
| Perforations | y 110 and 968 | Dots every 40 px |
| **Question line** | x 140, top y 128 | `question` style (Archivo 46 px, width 110 %), with a red margin bar. See below |
| Stage | y 236 (`layout.stageTop`) to 940 | The only thing a scene draws |
| Desk | below 992 | The surface the sheet lies on. Burned subtitles (the JA film) sit here |
| Headline (short films only) | x 140, rows from y 104 | `headline.enabled: true`; exhibits then start at y 320 or 404 |

Because the chrome is drawn from film-level context (`SceneTiming.film`), it is **identical on both sides of every cut**. A scene change is just the exhibit dissolving out and the next one arriving.

## Text on screen: what is allowed, and when

3Blue1Brown puts about two words on screen per keyframe and almost never subtitles the narration. We follow that.

1. **The open question.** One line, set per scene in `project.yaml` (`question`), in English in every language version.
   - It writes on letter by letter when first asked.
   - It stays across cuts while the film is still on that question.
   - It is cleared (`null`) when the question has been answered.
   - The pilot's questions:
     - "How did the model that refuses score better?"
     - "Why didn't any gate catch it?"
2. **Terms written onto objects** (`Term`). A word or two in the sans (34 px), plus an optional one-line definition (26 px), written on as the word is first spoken. Examples: "post-training · more training, on a finished model", "the gate · a pass-or-fail checklist". This is the film's vocabulary. Every term is defined the first time it is used.
3. **Numbers as objects.** A number sits on the bar, cell, tray or point it describes, and is spoken at most once.
4. **One crimson turn per scene.**
5. **Not allowed:**
   - the narration reproduced verbatim;
   - per-word reveals;
   - scrolling rows;
   - file names and run configs on the stage;
   - text under 20 px on the stage.

## Pacing

These are the numbers from the audit, and what the pilot now does.

| | Target | How |
|---|---|---|
| Speech share of runtime | 70–80 % | Authored `pause:` per line; `line_gap` 0.35, `beat_gap` 1.0 are only defaults |
| Pause after a question | 0.5–1.0 s | |
| Pause after a definition | 1.0–1.6 s | The term finishes writing before the next sentence starts |
| Silent hold after a big reveal | 2.5–3.5 s | e.g. the 1,319 red cells, the empty ANSWER tray, the bin filling |
| Scene edges | lead 0.5–0.8 s, hold 1–2.6 s | The cold open starts with 2.6 s of silence while the question types itself |
| Visual additions | about one per sentence | Not one per phrase: the exhibit should be still while it is being explained |
| Spoken numbers | about 3 a minute | The rest live on the objects |

## Colour: one meaning per colour, per film

| Token | Hex | Means |
|---|---|---|
| `sheet` / `sheetShade` / `desk` | `#EFEFEC` / `#E6E6E2` / `#D2D2CE` | The page |
| `grid` / `gridMajor` / `perf` | `#E0E0DB` / `#D4D4CF` / `#C6C6C1` | Paper furniture, never data |
| `ink` | `#141516` | Text, and the measured result of the system under study |
| `ink2` / `ink3` / `dim` | `#45474B` / `#65676B` / `#9D9E9B` | Secondary text; mono sublabels; spoken headline rows |
| `red` | `#D21F3C` | **The turn**: failure, regression, refusal, negation, a threshold that must not be crossed. Also the question line's margin bar |
| `redDim` | `#E9A3AE` | Crimson inside a spoken (dimmed) headline row |
| `blue` | `#2B45D6` | A second series or comparison only |
| `neutral` | `#8A8C90` | Baselines, untrained models |
| `card` | `#FAFAF8` | Cards, stamps, figure panels |
| `instrument` | `#111214` | A device screen, where the machine's literal input or output is shown |

- **Contrast** (computed from the tokens):
  - ink on the sheet: 15.9:1;
  - ink2: 8.1:1;
  - ink3: 4.9:1. It was 3.5:1 (`#7D7F83`) until the audit; it now passes AA for small text.
- **Accent budget.** At most one crimson idea per exhibit. When everything is red, nothing is.

## Type

| Family | Role | License |
|---|---|---|
| **Archivo** (variable width and weight) | Question line, terms, titles, body, data (and the headline, when on) | OFL-1.1 |
| **JetBrains Mono** | Labels (caps, tracked), breadcrumb, values, code | OFL-1.1 |
| **STIX Two Math** | Equations (Typst in Manim) | OFL-1.1 |

**Styles:**
- sans: `question`, `term`, `termDef`, `display`, `title`, `heading`, `body`, `data`, `caption`, `headline`, `subtitle`;
- mono: `bigNumber`, `value`, `label` (caps, 24 px), `meta` (20 px), `crumb`, `code`.

## The exhibit vocabulary (`@vid/kit`)

| Component | Use |
|---|---|
| `Exhibit` | One figure: fades and scales in over 11 frames, dissolves out over 9 |
| `Term` | A term written onto the object it names, with an optional definition and leader line. `WriteOn` is its letter-by-letter reveal |
| `Label` + `Meta` + `Value` | Mono labels, small notes ("one dot = one test request · 1,277"), values |
| `Claim` | The claim-class glyph and class ("● MEASURED"), plus an optional short note ("one run per model"). Speculation reads **NOT MEASURED** |
| `Stamp` | A verdict the study itself issued (PROMOTED ✓, SKIPPED, STOP). It slams in with a −1.5° tilt |
| `Field`, `Checkbox`, `Tag` | Forms: ticks draw, options strike in red, chips pop |
| `HBar` (+ `collapse`) | Black bars. A collapse leaves a red dashed trail and dot where the value was |
| `LineChart` + `PenNib` | Categorical ladders drawn by a pen nib in step with the narration |
| `CellGrid`, `DotField`, `Trays` | Populations before scalars: 1 cell = 1 question, 1 dot = 1 item |
| `FlowBox`, `Link`, `Arc`, `Cross` | Flows, with red dashed links that must not exist, crossed out |
| `Card`, `InstrumentPanel`, `CodePanel` | Records and examples; device output; real code (Shiki) |

## Motion (30 fps)

| Event | Frames | Ease |
|---|---|---|
| Question line write-on | 15–33 (0.024 s per letter) | linear, per-letter fade |
| Term write-on | ~27 (the scene sets it) | per-letter fade |
| Element arrive | 10 | arrive (0.25, 1, 0.5, 1) |
| Tick, strike, connector | 14 | settle (0.3, 0.15, 0, 1) |
| Move | 16 | travel (0.65, 0.15, 0.1, 1) |
| Exhibit glide to final layout | 18 | glide (0.72, 0.12, 0.18, 0.96) |
| Exhibit in / out | 11 / 9 | arrive / exit |
| Stamp | 7 | slam (0.3, 0, 0.1, 1) |

**Principles:**

- **When the frame moves, the thing that moves is the idea.** Never text for its own sake.
- **Hold the finished picture.** Every scene's payoff gets a silent hold; the film's three or four biggest reveals get 2.5–3.5 s.
- **No bounces, zooms or whips on the sheet.** The camera only follows content that outgrows the frame.
- **Exhibits come back.** The trays recur across three scenes and change: the answer tray empty in the question, counted empty in the empty bin, filled by Study 002.

## Sound

- **Bed:** licensed tracks (`audio.music.tracks`), one per half of the film, cross-faded at the cut, or the procedural `pulse` when a project has no music.
  - It sits 12 LU under the voice in the pauses, and ducks another 6 dB under speech.
  - That is loud enough to carry the silences. At the old 21 LU and 9 dB the audit measured the bed 27 dB under the voice and effectively inaudible.
  - The mix is stereo when the tracks are: voice and effects in the centre.
- **Effects:** an `impact` on the three big reveals; a knock on the two verdicts that end a section. Nothing else: sound marks decisions, not motion.

## Honesty is typographic, and complete off-screen

On the stage every result carries its claim class: ● measured, ◐ interpretation, ○ hypothesis, △ limitation, ◌ not measured, ■ design. A short note adds what the viewer needs in the moment, e.g. "one run per model".

Illustrative figures say so:
- the dashed "not measured · a metaphor" flag on the basin;
- "within noise · one run: a gain this small could be chance".

The full provenance lives in the receipts, where it can be audited at leisure:
- every claim id, its source file and locator, in `sources/claims-*.yaml`;
- written next to each film as `<film>.receipts.md`.

The rule in `AGENTS.md` is unchanged: never invent a result, and mark what was not measured.
