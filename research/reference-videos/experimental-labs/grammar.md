# Experimental Labs launch film — the house grammar

> **Status (2026-09-29).** This is the grammar of the lab's 96 s launch film, and it is still the source of the sheet, cuts, colour and type. Two of its devices do not scale to a five-minute explainer, and the house style no longer uses them there:
> - the narration shown as a word-by-word headline;
> - near-constant speech with an addition on every phrase.
>
> The pilot audit measured why (`research/audits/2026-09-29-pilot-audit.md`). The replacement, from 3Blue1Brown, is an open-question line, terms written onto the exhibits, and silent holds (`docs/design-system.md`). Everything below describes the launch film as measured.


Source: `experimental-labs-v3-landscape_1.mp4` (96 s, 1920×1080 at 30 fps, stereo AAC). This is the lab's own film; OpenGrad Study 001 is one of its exhibits. **It is the primary reference for flow, pace and information design** (decision 2026-09-28). The three earlier references (3B1B, the Numtera and LangEase SaaS launches, "tiny GPU") are secondary.

Measured with `vidmedia refscan --scan-fps 10`, 1 fps contact sheets (`flow/sheet_*.jpg`), 30 fps strips (`scroll.png`, `pan.png`, `pan2.png`) and a transcript (faster-whisper large-v3-turbo on CPU; `transcript.md`).

## Numbers

| Measure | Value |
|---|---|
| Hard cuts | 4 in 96 s, all into or out of the logo |
| Composition changes | 23 (14.4/min), median segment 2.0 s |
| Frame still (activity < threshold) | 8.3 % of the time |
| Narration | ≈ 250 words in 96 s ≈ **156 wpm**. No pauses longer than ≈ 0.6 s except the logo beats |
| Visual micro-events | About one per spoken phrase (every 0.6–1.5 s): a word lands, a field fills, a tick, a tag, a stamp, a point |

## The page

- **Sheet.**
  - Cool light-grey paper (≈ `#EFEFEC`) with a fine grid: minor ≈ 24 px, major ≈ 96 px, lines ≈ `#DDDDD9`.
  - A row of small perforation dots runs just under the header (y ≈ 110) and above the floor (y ≈ 968).
  - Below y ≈ 990 is a darker grey "desk" gradient, so the sheet reads as a physical page.
- **Header band** (y 0–90), slightly darker grey:
  - the logo mark, then a **mono, uppercase, tracked breadcrumb**: `EXPERIMENTAL LABS · PHILIPPINES · OPENGRAD STUDY 001 · QWEN3.5-2B · BASE → SFT → DPO`
  - the last items change per section (`§ MISSION`, `01 · EXPERIMENTAL MACHINES`, `02 · STUDY 001 · POST-TRAINING`, `§ RULES`)
- **Headline.** Top-left at x ≈ 140, baselines ≈ 165 / 255 / 340. It is a wide grotesk, bold, cap height ≈ 60 px (≈ 84 px size).
- **Exhibit.** Below the headline (top ≈ 390–430) and down to the perforation row: one figure at a time.

## The headline is the narration

1. **Words build on speech.** Each word of the current phrase fades and rises in on its spoken start, over ≈ 5 frames (≈ 6 px rise, opacity 0 → 1, light grey → ink).
2. **One phrase per row.** A long sentence is cut at punctuation into rows of ≤ ≈ 36 characters ("Serious, technical research, / done in the open, for the public interest.").
3. **Scroll.** When a new row starts, the stack scrolls up one row in ≈ 8 frames (ease-out). The previous row dims to grey (≈ `#9A9A98`) and red dims to pink (≈ `#E9A1AC`). Normally 2 rows are visible; 3 rows when the exhibit sits low; older rows leave upward.
4. **Colour carries meaning inside the sentence:**
   - **red** for the turn ("stopped answering", "went down", "never")
   - **red strikethrough** for negation ("We're not a ~~consultancy~~", "Not an ~~agency~~")
5. **The headline replaces subtitles.** The whole narration is on screen, verbatim.

## Exhibits build on the words

Every phrase changes the exhibit. Examples:

- **"We improved the metric."** A black bar grows to 0.755. A tick marks base 0.626, and the labels read `single seed · no interval`.
- **"Then the model stopped answering."**
  - The GSM8K bar collapses to a red dashed line and a red dot at 0.0 %.
  - A grid of 1,319 cells fills red: `refused 1,319 / 1,319`.
  - The source file is named in mono.
- **"We're an independent machine learning research lab."**
  - A form fills field by field: LAB / TYPE / FIELD.
  - Scope tags pop in; OPEN checkboxes tick (Methods, Data, Code, Results).
  - AUTHORS names appear, then empty seats marked `PH`.
- **"We're not a consultancy. Not an agency…"** A checklist in which each option is struck in red as it is spoken, and finally `research lab` is ticked and underlined.
- **"benchmarks AI chips, from the data center to your phone"**
  - A line chart is drawn by a pen-nib cursor in sync with the words; the second series is blue.
  - Tier labels list in on the right; a callout card follows ("THE ANSWER FLIPS WITH MODEL SIZE").
  - A stamp lands: `EVERY LOG PUBLISHED`.
- **"post-trains small models"** A wireframe loss surface with a red descent path, labelled `FIG. · GRADIENT DESCENT ON AN ILLUSTRATIVE LOSS SURFACE · NOT MEASURED DATA`.
- **"Seven post-training runs. Tool use went up. Math, instructions, and knowledge went down."**
  - A 7-row run ledger appears (tags `SFT`/`DPO`, verdicts `negative`/`rejected`/`promoted ✓` in red or black).
  - A checkpoint-ladder chart: the black tool-call line rises, and red GSM8K / IFEval / MMLU-Pro lines fall, each labelled `62.6 → 75.5`, `70.4 → 55.5`…
- **Rules** (`01 Negative results get published.` …)
  - Each rule **recalls an earlier exhibit**: the refusal bar comes back framed with a `RULE 01 · negative result, published ✓` stamp; the benchmark chart comes back with a red `source → REPORT.md` leader line.
  - Exhibits are persistent objects with memory.
- **"Sponsors can fund our compute, but never our conclusions."** Boxes chain SPONSORS → COMPUTE · GRANTS → RESEARCH → CONCLUSIONS, and a red dashed arc from sponsors to conclusions is crossed out with a red ✕.

## Motion

| Event | Measured |
|---|---|
| Word reveal | ≈ 5 frames, ease-out, small rise |
| Row scroll | ≈ 8 frames, ease-out |
| Following pan | When content grows past the frame edge (the authors row gaining empty seats), the sheet pans to follow it: eased, ≈ 0.8 s, peaking near 300 px/s. Charts and forms do not drift while they build; the frame is rarely still because something is always being added |
| Exhibit change | Old figure dissolves (≈ 8–10 frames), about 0.3–0.8 s of empty sheet under the running headline, new figure fades and scales in (≈ 10–12 frames), then glides to its final layout as side information arrives (≈ 15–20 frames) |
| Line charts | Drawn left to right by a small pen-nib cursor, timed to the words |
| Stamps and labels | Pop in with a slight rotation (≈ −1.5°), no bounce |
| Camera | No zooms or whips on the sheet. The only camera moves are the logo push-in and the end-card perspective fly-over |

## Honesty is typographic

Mono micro-labels carry the provenance, attached to the thing they qualify:

- `confirmatory · n=1,277`, `single seed · no interval`, `1 cell = 1 question`
- `gsm8k_scores.json · M1-v2 · refusals 1319`
- `FROZEN · tag study-001 · 2026-09-13 · Qwen/Qwen3.5-2B @ 15852e8c`
- `ERRATA · reports/ERRATA.md`
- `NOT MEASURED DATA`

## Typography and colour

- **Headline:** wide grotesk, bold. It matches Archivo at width ≈ 118–125 and weight ≈ 650. "Experimental" in the wordmark is a light neo-grotesk.
- **Labels, numbers and sources:** mono, uppercase-tracked for labels, sentence case for values.
- **Ink** ≈ `#141516`. **Red** ≈ `#D21F3C` (the turn, failure, negation). **Blue** ≈ `#2B45D6` (a second series only). Greys for hierarchy.
- **Logo mark:**
  - a near-black rounded square (radius ≈ 22 %) holding three light bars: top 22–78 % wide, middle 22–47 %, bottom 22–64 %
  - a red dashed leader runs from the middle bar to a red dot at 72 %
  - wordmark "Experimental" (light) + "Labs" (bold)

## What we take, and what stays ours

**We take** the grammar: the continuous sheet, the narration as headline, exhibits that build on words, following pans, recalled exhibits, and mono provenance.

**What stays ours per film** is the story, the data and the claim classes. Study 001's exhibits come from `data/study001.json`, never from this video's numbers, even where they agree.
