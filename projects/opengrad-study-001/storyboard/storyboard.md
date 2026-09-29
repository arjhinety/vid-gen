# Storyboard — "The empty bin" (OpenGrad Study 001 pilot)

> **Status (2026-09-29): redesigned again.** After the owner found the word-synced headline too distracting for a long film, and the pacing flat, the pilot now follows [docs/design-system.md](../../../docs/design-system.md):
> - no running caption, one open-question line per stretch;
> - terms written onto the exhibits;
> - authored silent holds;
> - a rewritten, directed narration (`tone:`).
>
> The audit that drove it is `research/audits/2026-09-29-pilot-audit.md`. The script, `project.yaml` and `scenes/` are the source of truth; the scene notes below describe the first version.
>
> **Status (2026-09-28): the visual treatment below is superseded.** The pilot was redesigned into the Experimental Labs house style ([docs/design-system.md](../../../docs/design-system.md)): a grid sheet, the narration as a word-synced headline, one exhibit at a time, and Archivo / JetBrains Mono instead of paper, Newsreader and Plex. The script was rewritten to match: 11 scenes including a closing card, measured at 227.0 s (EN, Kokoro af_heart) and 343.1 s (JA, Irodori heroine clone). The **story order, the evidence per scene and the honesty devices still hold**. The **scene code** (`scenes/*.tsx`, `scenes/manim/*.py`) and `script/narration.yaml` are now the source of truth for what is on screen.

Original target ≈ 5:20. Language versions share every picture; only timing differs (each language's
timeline comes from its own narration). Cue names in `[[brackets]]` refer to
`script/narration.yaml`. Numbers on screen come from `data/study001.json`; every factual element
carries a provenance tag (claim class glyph + source) in the right margin.

## Visual spine

**Persistent objects.** Each one keeps its geometry across scenes, via `scenes/shared/layout.ts`.

| Object | Introduced | Returns |
|---|---|---|
| **Instrument panel**: navy model-I/O console | cold-open | smoke-test (same panel, same prompt), the-label (code) |
| **Four trays** (CALL · CLARIFY · DECLINE · ANSWER): the decision space, drawn as paper trays with hairline walls | four-moves | training (dots re-sort), empty-bin (counted), what-next (ANSWER tray finally fills) |
| **Held-out dots**: 1,277 dots, one per confirmatory item, coloured by *gold* mode, placed by the model's *decision* | four-moves | training, empty-bin |
| **Specimen tags** for systems: `B0 · base`, `M0 · SFT`, `M1-v2 · DPO` | four-moves | training, f1-geometry (as points), same-questions (row labels) |
| **Reviewer's pen** (vermilion): the only red in the film; means surprise, failure or refusal | cold-open | everywhere a failure lands |

**Colour contract.**
- Ink/neutral = the base model.
- Signal blue = our trained systems.
- Vermilion = refusal or failure.
- Ochre = held-out evaluation data.

Each is declared once, on first use, by a small key.

**Act structure.** One act-break device: the title glide, where a headline shrinks into the running head (top-left) over 34 f. Everything else is continuous inside a scene.

| Act | Scenes |
|---|---|
| I · the promise | cold-open → four-moves → training → f1-geometry |
| II · the contradiction | smoke-test → same-questions |
| III · the explanation | empty-bin → the-label → basin |
| IV · what next | what-next |

**Pacing.**
- Cold open at reference energy (≈10 composition changes/min).
- Mechanism scenes at 4–6/min.
- A 1.5–4 s hold after each landing (`pause` in the script).
- The camera is locked while code, tables or equations are read.

---

## I · The promise

### 1. cold-open (web, ~27 s) — "a question a child could answer"

1. **Lead (1.2 s).** Paper, a faint light field. A single hairline draws left→right: the prompt line.
2. **[[q]]** A human-typed prompt streams on paper at human speed (10 chars/s), in Plex Sans: *"Ana buys 7 pencils at 12 pesos each and pays with a 100-peso bill. How many pesos of change does she receive? Answer with just the number."* Next to it, a small pencil sum `7 × 12 = 84 · 100 − 84 = 16`, drawn in ink as a margin note.
3. **[[base]]** Instrument split: a navy panel wipes in from the right (18 f, `travel`), labelled `Qwen3.5-2B · base`. It streams at machine speed: **`12`**. The pen strikes it, and `16` is written beside it in ink.
4. **[[trained]]** A second instrument panel slides beneath, labelled `after post-training · M1-v2`. It streams: *"Apologies, but I'm unable to perform calculations or provide specific answers."* Silence (1.6 s pause). The pen circles "unable to perform calculations".
5. **[[better]]** Two small scorecards drop onto the panels: `tool-call F1 0.63` vs `0.75 ✓ promoted`. The blue check contradicts the pen circle, which is the dissonance.
6. **b02 [[bin]]** Everything racks out of focus (DepthStack L1). The title sets in Newsreader display, centred: **The empty bin**, with the subtitle `OpenGrad · Study 001 · pilot`. A hairline tray outline draws under the title, empty. This is the plant.
7. **Exit.** The title glides to the running head (act-break device).

- **Provenance:** `● measured · sentinel_scores.json · 7-case smoke test (suggestive)`
- **Kit:** `TypeStream`, `InstrumentPanel`, `PenMark`, `FocusPull`, `DepthStack`, `RunningHead`

### 2. four-moves (web, ~34 s) — the decision space

1. **[[when]]** Four trays rise from the paper in a row, with labels set small in Plex Sans small-caps: `call a tool` · `ask (clarify)` · `decline` · `just answer`.
2. **[[model]]** A specimen card `Qwen3.5-2B · base` sits above the trays (ink, neutral).
3. **[[call]] [[clarify]] [[decline]] [[answer]]** Each tray lights in turn as it's named. Three real held-out prompts (short, set as index cards) drop into their correct trays:
   - "Find a comedy movie directed by Edgar Wright" → call
   - "rent an apartment, 2 bedrooms…" → ask
   - "play baby Shark" (with only a volume tool) → decline

   The ANSWER tray receives nothing. We don't comment on it yet.
4. **b04 [[reach]]** The cards dissolve into their dots. The full held-out set appears: 1,277 dots, coloured ochre-tinted by gold mode (the key appears).
5. The base model's decisions animate. Dots flow from their gold tray into the tray the model **chose**; most pour into CALL (955 dots). Dots that landed in CALL but belong elsewhere turn pen-vermilion as they land.
6. **[[p62]]** Counter: `514 / 824 = 62.4%` over-call, derived on screen (numerator counted from the red dots, denominator from the non-call dots).

- **Provenance:** `● measured · confirmatory partition n = 1,277 · predictions.jsonl (recomputed)`
- **Kit:** `Trays`, `DotField` (deterministic packing), `SpecimenTag`, `IndexCard`, `Fraction`

### 3. training (web, ~42 s) — making post-training visible

1. **[[corpus]]** The trays slide down and aside. Stage left: four paper stacks, one per source dataset, with heights proportional to records (glaive 98,339 · xlam 57,342 · toolace 11,051 · when2call 6,505). The total is **173,237**, with a small note: `27,372 seen in training (0.24 epoch)`.
2. Records stream from the stacks as thin cards into a **training block**: the specimen card, now with a hairline gradient meter. The SFT loss curve (real data, 2,400 steps, 1.57 → 0.32) draws as a small figure on the card.
3. **[[sealed]]** The held-out dots sit in their trays behind an ochre dashed boundary with a small lock glyph. They do not move while training runs, so the separation is visible.
4. The card is stamped `M0 · SFT` (blue).
5. **[[drop]]** The seal opens and the dots re-sort by M0's decisions. The CALL tray empties back into CLARIFY and DECLINE, and most red dots turn back to neutral. Counter morphs `62.4% → 15.1%` (124 of 824).
6. **b06 [[pref]]** Preference training: one pair of reply cards appears (better ✓ / worse ✗), with a gentle nudge arrow. The card is stamped `M1-v2 · DPO`.
7. **[[seven]]** Inside the CALL tray, 7 dots light blue among 453, with a magnifier ring: `351 vs 344 of 453`.
8. **[[noise]]** A faint noise band appears around the counter (`one seed · within noise`).
9. **[[gate]]** A gate icon: `promoted ✓`. The pen annotates it in the margin: *"gate v4 written after M0's results"*.

- **Provenance:** `● measured · M0 / M1-v2 confirmatory curve.json` · `◐ interpretation · "within noise"`
- **Kit:** `SourceStack`, `Stamp`, `LossSpark`, `SealBoundary`, `DotField` transitions, `PenNote`

### 4. f1-geometry (Manim, ~32 s) — what F1 actually measures

This is a Manim scene on the same paper ground, with the same fonts and colours, and math via Typst in STIX Two Math.

1. **[[f1]]** A precision–recall square (axes 0→1, hairline grid).
2. **[[prec]]** Beside it, `precision = 441 / 955` is built from coloured counts: the called dots that were correct over all called dots.
3. **[[rec]]** `recall = 441 / 453`.
4. **[[harm]]** `F1 = 2PR / (P + R)` sets in, and iso-F1 contour curves sweep into the square (0.5, 0.6, 0.7, 0.8), each labelled.
5. **[[b0]]** The B0 point drops at (R 0.97, P 0.46) onto the 0.63 contour. A dashed drop-line shows how far precision is from recall.
6. **[[m0]]** The point travels (`glide`) to M0 (0.76, 0.735), crossing contours to 0.747. A trail shows the trade: recall down, precision up.
7. **[[m1]]** A magnifier zooms on the tiny step to M1-v2 (0.775, 0.736). The contour label reads 0.755. Hold.

- **Provenance** (rendered by the compositor overlay, not in Manim): `● measured · routing.py formulas · confirmatory n = 1,277`
- **Kit (Manim):** `ogmanim.theme`, `ogmanim.timing` (cue waits), `PaperAxes`, `IsoF1`

## II · The contradiction

### 5. smoke-test (web, ~18 s) — same score, opposite failures

1. **Act break** (title glide in): the running head reads "II · the contradiction".
2. **[[smoke]]** Seven small case chips in a row: trap arithmetic, multi-step change, format, extraction, memory, tool call, tool result. Two rows: base (ink) and promoted (blue).
3. **[[five]]** Pass/fail marks fill in. Both rows read `5 / 7`.
4. **[[opposite]]** The two failing chips on each row lift (select-and-lift). Base's failures show wrong answers (`12`, `1`); the promoted model's failures show refusals. Pen underlines "unable to…" twice.
5. **[[refused]]** The cold-open instrument panel reappears as a callback, with the same prompt and the same refusal.

- **Provenance:** `● measured · sentinel_scores.json · 5/7 vs 5/7`

### 6. same-questions (web, ~37 s) — 1,319 questions, two prompts

1. **[[gsm]]** A grid of 1,319 small cells (44 × 30, last row partial) builds row by row. The label `GSM8K test · 1,319 questions` sits above it.
2. **[[attempt]]** Row 1, `B0 · base`, fills: every cell attempted. Correct cells are solid ink (889), incorrect cells are outlined (430). Counter: `answered 100%`.
3. **[[refuse]]** Grids 2 and 3 (`M0`, `M1-v2`) fill **entirely vermilion**, in a wave. Counter `refused 1,319 / 1,319`. A long silence (1.6 s).
4. **b10 [[shots]]** A stack of 8 worked-example cards slides in front of the refusal grids (prompt shape changes).
5. **[[vanish]]** The vermilion drains out cell by cell and the cells become attempts: 743 / 732 correct. `refused 0`. Caption tag: `same weights · same questions · different prompt shape`.
6. **b11 [[worse]]** The grids compress into a compact comparison figure with three paired bars, base (ink) vs M1-v2 (blue):

   | Benchmark | Base | M1-v2 |
   |---|---|---|
   | GSM8K 8-shot | 70.4 | 55.5 |
   | MMLU-Pro | 49.0 | 37.0 |
   | IFEval strict | 67.8 | 45.8 |

   Each bar carries a small `refusals 0%` or `19.8%` note where relevant.
7. **[[switch]] [[loss]]** The figure splits into two labelled regions: **"a switch"** (the 0-shot vs 8-shot refusal contrast) and **"a loss"** (the bar gaps). Tag: `◐ interpretation · "two separable failures"`.

- **Provenance:** `● measured · final_campaign_verdict.json (H200, greedy, seed 0)`
- **Kit:** `CellGrid`, `BarPairs`, `CardStack`, `SplitLabel`

## III · The explanation

### 7. empty-bin (web, ~30 s) — why no gate saw it

1. **Act break:** "III · the explanation".
2. **[[count]]** The four trays return (callback) with the held-out dots, now counted. Numbers roll up above each tray: `CALL 453` · `CLARIFY 371` · `DECLINE 453` · `ANSWER`...
3. **[[empty]]** ...`0`. The camera pushes in (1.25×) on the ANSWER tray. Hold, with silence and a very slow drift. The pen draws a bracket around the empty tray.
4. **[[zero]]** The metric appears as a tiny formula over the tray, `answered correctly ÷ ANSWER items = 0 ÷ 0 → reported 0.0`, and repeats for B0, M0 and M1-v2 (`0.0`, `0.0`, `0.0`).
5. **[[off]]** A gate checklist beside it; the line `no-call accuracy ≥ 0.40` is struck through and marked `skipped`.
6. **[[title]]** The title "The empty bin" returns from the running head into the tray (payoff).

- **Provenance:** `● measured · partition per_class` · `◐ interpretation · "vacuity bug, not a statistics bug"`

### 8. the-label (web, ~35 s) — the annotation contract as code

1. **[[code]]** An instrument panel slides up with the actual adapter code (`src/opengrad/data/adapters.py`, lines 160–173), syntax-highlighted and trimmed to the three branches. The camera is locked.
2. The `CALL` branches highlight in turn. **[[else]]** The `else` line highlights and "`decision: ANSWER`" is selected (MarkSelection).
3. **[[apology]]** A training record card travels into the function. The user asks to find a duplicate in a list; the reply starts "Apologies, but I'm unable to perform calculations…". It takes the `else` branch and gets stamped `ANSWER`. The pen circles the mismatch.
4. **[[tenth]]** The stamped card multiplies into a proportional strip of 173,237 records. 10.5% of it turns vermilion (18,114) and is labelled "refusal-shaped · labelled ANSWER".
5. **[[w2c]]** The When2Call segment expands: 4,038 of 6,505 (62.1%).
6. **[[suspect]]** A hypothesis tag (open circle ○) attaches: `○ hypothesis · association, not cause`, plus the caveat `heuristic detector; precision unmeasured`.

- **Provenance:** `● measured · adapters.py 160–173 · supervision audit (heuristic)`
- **Kit:** `CodePanel` (Shiki tokens, seekable line focus), `MarkSelection`, `ProportionStrip`

### 9. basin (Manim, ~16 s) — the metaphor, flagged

1. The top-left tag stays on screen for the whole scene: `◌ metaphor · not a measured mechanism`, set in an italic hairline box.
2. **[[basin]]** A 1-D landscape curve draws on paper, with a deep basin labelled "refuse" and a gentler valley labelled "answer".
3. **[[roll]]** A ball (the bare question) rolls into the refusal basin (Manim physics-free, eased path).
4. **[[tilt]]** Eight small example cards land on the left slope. The curve morphs and the basin rises.
5. **[[out]]** The ball rolls out into "answer".

- **Kit (Manim):** `ogmanim.landscape`

## IV · What next

### 10. what-next (web, ~54 s)

1. **[[label]]** Quote set in Newsreader italic, with the repo quote tag: *"The defect is the label, not the refusal."* (`◐ ROADMAP.md`)
2. **[[trade]]** A balance sketch, over-refusal on one side and hallucination on the other. Deleting refusals just tips it.
3. **[[one]]** Three small plain tags: `1 model · 1 seed · 0 replicates`. A stop sign formed from a hairline octagon.
4. **b16** "Study 002" running head.
5. **[[fill]]** The four trays return one last time. The ANSWER tray **fills**: 1,055 dots pour in (284 natural + 771 constructed), in ochre. Payoff of the title.
6. **[[fails]]** A gate line reads `tool F1 holds ∧ answering collapses → FAIL`.
7. **[[agree]] [[floor]]** An agreement meter fills to 0.770 and stops short of a hairline at 0.80 labelled "floor (set in advance)". A stop stamp: `nothing trained`.
8. **b17 [[grad]] [[ckpt]]** Everything clears. The tagline sets in two lines of Newsreader, with *hypothesis* and *evidence* in italic. The OpenGrad mark (blue→violet gradient hairline) sits below.
9. **End card (3.5 s hold):** `Next: Study 002`.
