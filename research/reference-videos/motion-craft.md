# Motion craft of two premium launch films, translated for OpenGrad research films

**References**
- **N**: "Best AI SaaS Product Launch Video | Numtera". 95.3 s, 720p30. The soundtrack is an instrumental bed with no narration.
- **L**: "Best SaaS Product Launch Ad Video | LangEase". 33.0 s, 720p30, set to a song. The lyrics are unrelated to the on-screen words.

**Purpose.** This document extracts the motion craft that makes these two films feel premium: easing, blur, depth, type choreography, transitions and timing. Each technique comes with measured parameters and a translation into our identity, a research paper that moves. It complements `analysis.md`, which covers storytelling grammar. Their look (identity) is off-limits; see §5.

**Method and caveats**
- **Bursts.** 25 frame bursts, 254 frames in total, are in `*/bursts/<ID>_<label>_NN.jpg`, with a tile sheet for each burst in `*/bursts/sheet_<ID>.jpg`.
  - Frame k (counting from 1) of a burst sits at *start + (k−1)·step/30* s.
  - Starts and steps:
    - N01 1.0/3, N02 3.4/3, N03 7.5/2, N04 9.8/2, N05 13.5/4, N06 15.8/5, N07 22.6/2, N08 29.15/3
    - N09 34.0/4, N10a 42.2/3, N10b 44.3/2, N11 49.4/2, N12 54.7/2, N13 60.0/5, N14 80.5/2, N15 89.0/9
    - L01 0.85/2, L02 1.9/2, L03 4.3/4, L04 6.4/3, L05 9.55/3, L06 12.9/3, L07 17.4/4, L08 23.8/3, L09 25.6/3
  - Dense overviews (N at 2 fps, L at 4 fps) are in `bursts/overview_NN.jpg`.
- **Exact numbers** come from numpy passes over the native 30-fps decode:
  - frame differences, cut detection, and hold and motion runs (`bursts/_motion_audio.json`)
  - per-frame text bounding boxes and edge-sharpness blur estimates
  - cubic-bezier fits to the measured progress curves
  - spectral-flux onsets, a fine period/phase beat-grid search, a Rayleigh phase-locking test, and event-locked audio profiles
  
  The scripts are in `motion-craft-scripts/`.
- **Units.** `f` means frames at 30 fps. Pixel values are at a 1080p-equivalent scale (720p source ×1.5; 480-px burst cells ×4). Blur is the Gaussian **σ**, which is what CSS `blur()` takes; sharp text in the source measures σ≈0.7 px at 720p, and that baseline was subtracted.
- **Estimates.** Perspective angles are estimated from projected edge ratios (±10°). Cursor behaviour is described from the 4-fps overviews only.

## 1. Pacing, cuts and beat sync

| Metric | Numtera | LangEase | For context: 3B / TG (analysis.md) |
|---|---|---|---|
| Hard cuts (native 30-fps detector) | 16 (**10.1/min**) | **0**. Every change is continuous | 7 / ~9 events in 18.7 / 13.4 min |
| Composition changes/min (scan; capped because segments are ≥1 s) | 37.2; manual count ≈55 beats in 93 s (~35/min) | 30.9; ≈14 scenes and ≈37 word/object beats in 29 s | 3.7 / 5.2 |
| Scan segment median / p90 | 1.0 s (the floor) / 3.1 s | 1.0 s / 4.0 s | 9.75 s / 6.25 s median |
| Still fraction (scan) | **0.05** | **0.09** | 0.66 / 0.71 |
| Frames with motion (30-fps diff ≥1 grey level) | 50 % | 58 % | — |
| Motion runs: count, median, p90 | 86, 10.5 f, 41.5 f | 21, 13 f, 58 f | — |
| Longest still stretch, excluding the end logo | 1.87 s (69.6 s) | 0.8 s | 29 s (3B) |
| Tempo (fine grid search) | 108 bpm = 16.7 f/beat | 118 bpm = 15.2 f/beat | — |
| Cuts within ±2 f of a beat | 3/16 = 19 %, against 24 % by chance; Rayleigh R = 0.28, p = 0.29 | n/a | — |
| Word/element entrances within ±2 f of a beat | 35 % against 24 % by chance, R = 0.02 (n = 20) | 33 % against 26 % by chance, R = 0.50, p ≈ 0.10, mean +74 ms after the beat (n = 9) | — |
| Motion peaks within ±2 f of a beat | 24 % against 24 % (n = 41) | 27 % against 26 % (n = 15) | — |
| Swoosh/impact SFX at cuts (2.5–7.5 kHz band, event-locked) | none detectable (z ≤ 1.4) | n/a | — |
| Light ↔ dark register flips | 8, about one every 12 s | 0 (all light) | — |

**Findings**
- **Neither film is cut to the beat.** The music is a heavily limited bed: Numtera sits at 40–42 dB (relative level) in every second from 9 s to 92 s.
- **Rhythm comes from the visual edit.** A typical phrase runs *build, build, build, payoff*. Example: "it turns / the solution / into" arrive at 40.33, 40.80 and 41.27 s, **14 f apart**, and "[Reusable knowledge]" lands **30 f later**, at 42.27 s. LangEase's tricolon (Translate. Dub. Distribute.) arrives about 15 f per word (read from the 4-fps overview), then holds on the logo.
- **One structural audio sync.** Numtera's bed swells from ~30 dB to full level over 0–9 s and hits full level in the same second as the "Meet" reveal (9.93 s).
- **Macro pacing.** Numtera alternates type interstitials of 2–8 s with UI demonstrations of 3–21 s. The dark register carries the claims ("it turns the solution into…", "Auto-resolved", "you can define the response"); the light register carries the product.

**For us.** Our film is narration-led, so sync the payoffs to the narrator's stressed words, using Whisper word times, not to a beat grid.

## 2. Technique catalogue

Each entry gives **Seen** (where it occurs), **Measured** (parameters), **Why** (why it reads as premium) and **Ours** (the OpenGrad translation, including when not to use it).

**T1. Focus-pull arrival with recede exit**
- **Seen:** L 1.12 s ("Audio"), L 2.20 s ("Any"), N 8.03 s ("Stop"), N 49.53 s ("And").
- **Measured, arrival:**
  - the word enters at 165–200 % scale with σ≈7 px and ~50 % opacity
  - scale progress is 40 % at frame 2, 90 % at frame 10 and 99 % at frame 19, which fits quartOut, `cubic-bezier(0.25,1,0.5,1)`
  - blur tracks scale speed and is gone by about frame 8
- **Measured, exit:** the outgoing word shrinks to ~68 % on an accelerating ease-in over 5–6 f while fading to ~50 % contrast and blurring. The switch lands on the frame where both words are blurred.
- **Why:** it reads as a lens finding focus, and the blur hides the switch.
- **Ours:** claim cards and act titles in Newsreader, entering from 120 % with σ 4 px over 16 f. Do not use it on a number while the narrator is reading it.

**T2. Letter slam**
- **Seen:** N 9.97 s ("Meet"), N 49.53 s ("And").
- **Measured:**
  - glyphs rise from below the frame with a **2-frame stagger**
  - travel reaches 16/60/83/94/99 % at frames 1–5: speed halves every frame and there is no overshoot
  - σ≈6 px at frame 2, falling to ≈2 px by frame 6
  - the word lands at a cap height of ~47 % of frame height, then keeps shrinking ~1 %/frame for about 10 f
- **Why:** it has impact without bounce.
- **Ours:** use it once, in the cold open, as a Newsreader display word in ink, travelling ~25 % of frame height with a 2-frame stagger. Never use it in explanatory beats.

**T3. Zoom-through glyph portal**
- **Seen:** N 7.5–7.97 s (into "investigation"), N 54.7–55.03 s (into the "e" of "define").
- **Measured:**
  - an exponential zoom of ≈×1.4 per frame, going from 1× to ~15× in 10–12 f
  - the next scene is already visible inside the glyph's counter by frame ~8
  - the ground colour flips navy → light during the last 4 f, hidden by the giant glyph
- **Why:** continuity. The word becomes the doorway.
- **Ours:** one act transition per film. Zoom into the counter of a key term, or into a citation bracket "[", to reveal the next act's paper page or instrument panel.

**T4. Headline-to-header glide with overlapping action**
- **Seen:** N 13.4–14.53 s.
- **Measured:**
  - scale goes from 100 % to 45 % in **34 f**, fitting `cubic-bezier(0.75,0.15,0.12,0.92)`
  - progress is 10 % at t = 0.25, 71 % at 0.5 and 94 % at 0.75, with peak speed at frame 15
  - the lateral slide that makes room starts **~5 f before** the scale settles, and new words follow at 14.7 s
- **Why:** heavy in-out easing gives the move a sense of mass, and the overlap keeps it alive.
- **Ours:** the act title shrinks into the page's running head and stays there. This is our act-break device.

**T5. Word build with closing offset and line re-centring**
- **Seen:** N 29.2–30.0 s ("Agent Approves it as {learning}"), N 14.7 s, N 51–53 s.
- **Measured:**
  - words arrive 3–6 f apart
  - each enters at 35–50 % opacity (it reads as grey), displaced 40–80 px to the right, and closes the gap within ~6 f
  - as the line grows, it re-centres over ~8 f
- **Why:** the eye reads the sentence as it is being said. Nothing pops.
- **Ours:** a 3–6-word claim only, never whole sentences (analysis.md rule 11). Each word lands 3 f before its spoken onset.

**T6. Bracket framing: converge, then clear**
- **Seen:** N 29.5 s (`{ learning }`), N 42.4–43.3 s (`[ Reusable knowledge ]`), N 44.0–44.6 s (the empty `[]` collapses into a transition).
- **Measured:**
  - the brackets enter from the frame edges ~5 f after the phrase
  - they converge over **21 f**, fitting `cubic-bezier(0.30,0.16,0,0.92)`: 56 % at t = 0.25, 85 % at 0.5, peak speed 45 px/f
  - meanwhile the phrase settles from ~160 %
- **Why:** it treats a term as a typed token.
- **Ours:**
  - hairline brackets for a defined term or a citation
  - `[ held-out ]` in ochre marks evaluation data
  - emptying the brackets shows "reset / ablate"

**T7. Typing cadence as authorship**
- **Seen:** N 0–3.5 s (a human typing), N 34.1–35.0 s (a machine log), N 89.0–89.6 s (backspacing).
- **Measured:**
  - **human:** ≈**10 chars/s**, irregular (0–2 chars per 3 f), caret solid while typing; the camera pulls back to 0.61× in 9 f mid-sentence
  - **machine:** ≈**75 chars/s**, monospace
  - **backspace:** accelerates from 23 to 67 chars/s, like a held key
  - **caret-only hold:** ~0.3–0.6 s before new text starts
- **Why:** timing tells you who is writing.
- **Ours:** paper (narrator) text never types. Human prompts type at 8–12 chars/s with jitter. Model output in the navy instrument panel streams at a real or time-compressed tokens/s rate.

**T8. Selection highlight as an edit**
- **Seen:** N 3.7–4.4 s.
- **Measured:**
  - the selection grows right-to-left at ≈40 chars/s, as a solid blue fill with the text knocked out to white
  - after the deletion, the highlight box eases its width to fit the new content over ~12 f
- **Why:** it shows a revision, not a new slide.
- **Ours:** the reviewer's pen.
  - A vermilion selection or strike marks a hypothesis that failed, and the measured result replaces it (analysis.md rule 8).
  - A blue marker shows the span our model attends to or produces.

**T9. Split-screen register wipe**
- **Seen:** N 22.7–23.3 s.
- **Measured:**
  - a dark panel wipes in from the right until its edge rests at 48 % of frame width (the panel covers 52 %), in **18 f**, fitting `cubic-bezier(0.67,0.22,0.05,0.99)` (t50 = 0.39)
  - peak speed is ≈245 px/f at frame 6
  - terminal lines start typing once the panel has settled
  - a small blue connector arrow on the seam links the UI item to the machine's process
- **Why:** cause and mechanism appear side by side, without a cut.
- **Ours:** **this is the most on-identity technique.** The paper figure stays on the left, the navy instrument panel slides in with the real code or I/O, and a hairline blue leader carries a provenance tag.

**T10. Perspective plane that settles flat**
- **Seen:**
  - N 16.1–17.5 s: a dashboard rises from bottom-right at ~15–25° compound tilt
  - N 60.17–60.6 s: a form starts at ≈45–60° rotateY, its near edge ≈1.7× the height of the far edge, and is flat within ~15 f
  - N 44.63 s: the panel starts as an edge-on sliver and flips up in ~10 f
  - L 4.8–5.5 s: a drop-zone floor at ~35–50° rotateX
- **Measured:** far edges carry a depth-of-field falloff (σ 4–8 px).
- **Why:** UI becomes a physical object, and settling to flat says "now read".
- **Ours:** paper pages and code panels enter at ≤20° tilt and are flat before anything must be read. Never ask the viewer to read a tilted plane.

**T11. Depth-of-field layer stack with rack focus**
- **Seen:**
  - N 1.5–6.5 s: UI fragments on three depth layers; the far layers are blurred σ≈4–8 px at 30–60 % opacity and drift at different speeds
  - N 49.4 s: the outgoing word defocuses under the incoming "And"
  - N 61.17 s: the whole frame racks out to σ≈16 px before the macro cut
- **Why:** optics separate the subject from its context, without boxes or dimming.
- **Ours:** related-work snippets and earlier curves sit behind the claim at σ 4–8 px. The rack focus is our default within-act transition.

**T12. Select and lift, then push in**
- **Seen:** L 17.5–18.1 s, L 23.8–24.1 s.
- **Measured:**
  - **the card:** it scales ≈2.2× over ~16 f, gains an accent outline and a soft tinted shadow, rotates ±3° in z, and the grid behind defocuses to σ≈8–10 px
  - **the click:** the colour swaps in ~3 f, then the camera pushes in from 1.0 to 1.58× over 9 f with an ease-out
- **Ours:** lift one evaluation example out of the dataset grid. An ochre border marks it as held-out. Push in 1.25× on the output after "Enter".

**T13. Clone-scatter (one becomes many)**
- **Seen:** L 18.2–18.6 s.
- **Measured:** the lifted card turns edge-on in ~4 f and comes out as 3–5 tumbling copies with motion blur, settling in about 10 f.
- **Ours:** one prompt becomes N samples, or one seed becomes five seeds, which shows variance honestly. Fan the copies like sheets of paper; do not tumble them.

**T14. Shape-morph carry**
- **Seen:** L 10.1–10.8 s: a phone screen stretches into a progress bar over ~18 f. L 12.9–13.2 s: the bar becomes a pill, then a circle, in ~6 f, and a tick draws on in ~9 f.
- **Why:** the eye is handed from one object to the next and never has to re-orient.
- **Ours:** a loss curve collapses into its final value, which then becomes a table cell (analysis.md rule 7). Use geometric path morphs, not goo.

**T15. Leader particle with a trail**
- **Seen:** L 25.6–26.5 s.
- **Measured:** a small glyph flies a curve trailing a soft path at 30–40 % opacity, 200–400 px long, fading over ~12 f. Each word appears where the glyph arrives.
- **Ours:** a vermilion pen-tip travels to a surprise and leaves a persistent ink underline or margin note, not a comet.

**T16. Process readouts**
- **Seen:** N 33.5–38 s; L 11.2–12.9 s.
- **Measured:**
  - N: a cyan scan line with a 12–20 px glow sits on the seam between the card and its streaming log, and a percentage climbs ≈0.5 %/frame
  - L: a counter climbs 75 → 100/100, with the value in the accent colour and "/100" in pale grey
- **Ours:** step and loss tickers in Plex Mono inside the instrument panel, with ochre ticks at eval checkpoints.

**T17. Living light**
- **Seen, N:** soft radial fields and vignettes behind all type; diagonal light shafts over the UI (20.5–22.9 s); a conic light rotating ~180° in ~2 s on black (89–92 s).
- **Seen, L:** tinted soft shadows (estimated blur 40–60 px, y-offset 15–25 px, 20–30 % alpha).
- **Ours:** a paper "desk-lamp" field at ±2–3 % lightness, drifting slowly, and a faint #2747D6 corner glow (≤12 % alpha) inside navy panels.

**T18. Cut on motion**
- **Measured:** 6 of the 7 detector cuts I inspected (7.87, 9.93, 39.63, 44.63, 49.53 and 60.13 s) land with the incoming element already moving and blurred. The exception is the static "Agent" card at 29.2 s.
- **Ours:** hard cuts only mid-motion, and never from one static frame to another.

**T19. Holds that are never dead**
- **Measured:**
  - the text keeps drifting in scale during holds: −2.5 to −3.5 %/s (N 29.9–30.3 s), ≈−10 %/s (N 43.35–43.75 s), ≈−9 %/s (N 81.5–82.3 s) and +3.4 %/s (L 3.7–4.2 s)
  - the longest still stretch outside the logos is 1.87 s (N) and 0.8 s (L)
- **Ours:** a calm 0.5–1.5 %/s. Lock the camera at 0 for dense code, tables and equations.

**T20. Register flips as punctuation**
- **Seen:** N at 9.9, 22.9, 29.2, 39.6, 44.6, 47.4, 55.0 and 86.5 s.
- **Measured:** every flip is hidden inside a slam, a wipe, a portal or a plane flip. None is a full-frame dissolve, which would pass through mud-grey.
- **Ours:** paper ↔ navy flips happen only through T9 or T3, and only when we show what the machine literally does.

## 3. Generic vs premium

1. **Easing has roles and long tails.**
   - Arrivals use an expo/quart-out curve. Moves use an asymmetric in-out. Exits accelerate.
   - Arrivals are 90 % done by about frame 10 and 99 % done at frames 19–21.
   - **None of the measured curves overshoots.** Templates use a uniform 0.5 s ease-in-out or a springy bounce.
2. **Optics instead of opacity.** Focus pulls, depth of field, and blur proportional to speed carry the transitions. Templates cross-fade.
3. **Continuity instead of replacement.** Portals, morphs, wipes and bracket collapses carry each scene into the next; LangEase has zero hard cuts. Templates push unrelated slides past each other.
4. **Overlap and stagger.** Glyphs are staggered 2 f and words 3–6 f, and the next move starts ~5 f before the previous one settles. Templates move everything at once, or strictly one thing after another.
5. **Extreme type-scale contrast between consecutive beats.** A display word at ~47 % of frame height is followed by body lines at 4–6 %, roughly 8–10×.
6. **Timing carries meaning.** A human types at 10 chars/s; the machine streams at 75 chars/s.
7. **UI is a lit physical plane.** It has perspective, depth of field and shadow, and it settles flat before it must be read.
8. **Palette discipline.** Each film uses one hue family plus neutrals.
9. **The edit, not the beat grid, sets the rhythm.** Cuts land on beats no more often than chance; they land on motion.

## 4. Motion spec for our renderer (React/SVG/Canvas at 30 fps, 1920×1080; Manim with matching rate functions)

**Easing tokens** (each checked against the measured curves at t = 0.25/0.5/0.75):

| Token | cubic-bezier | Role | Default length | Reference match |
|---|---|---|---|---|
| `arrive` | (0.25, 1, 0.5, 1) | element or word entrance, push-in | 16 f (10 f high-energy) | L01: 0.69/0.93/0.99 vs measured 0.71/0.90/0.96 |
| `settle` | (0.3, 0.15, 0, 1) | brackets, connectors, highlight resize | 21 f | N10a |
| `travel` | (0.65, 0.15, 0.1, 1) | wipes, panel moves, pans | 18–24 f | N07: 0.14/0.80/0.97 vs measured 0.17/0.83/0.97 |
| `glide` | (0.72, 0.12, 0.18, 0.96) | big layout transforms, title → running head | 34 f | N05: 0.10/0.66/0.95 vs measured 0.10/0.71/0.94 |
| `exit` | (0.32, 0, 0.67, 0) | leaving elements | 6–8 f | L02 |
| `slam` | (0.3, 0, 0.1, 1) | cold open only | 6–8 f | N04 |
| `portal` | exponential ×1.35/frame | glyph zoom-through | 12 f | N03, N12 |
| `drift` | linear | idle during holds | whole hold, 0.5–1.5 %/s | T19 |

No overshoot. If springs are used, make them critically damped (ζ = 1), with 99 % settled in 18–24 f. In Manim, pass these curves as custom `rate_func`s.

**Stagger**
- glyphs: 2 f (slam only)
- words: 4–6 f, or locked to the narrator with the word landing 3 f before its onset
- list items and cards: 6–8 f
- panels: 10–12 f
- start the next move when the previous one is at ~85 %

**Blur and depth**
- **Arrival blur:** σ_max 4 px (calm) or 7 px (high-energy), coupled to speed.
- **Depth layers:**

  | Layer | Blur σ | Opacity | Parallax |
  |---|---|---|---|
  | L0 subject | 0 | 100 % | 1.0 |
  | L1 context | 3–4 px | 60 % | 0.6 |
  | L2 ambient | 8–12 px | 35 % | 0.3 |

- **Rack focus:** out to 12–16 px over 8 f, then in over 10 f.
- **Tilted planes:** a depth-of-field band from 0 px at the focus line to 6 px at the far edge.
- **Motion blur:** a 180° shutter, rendered as 8 temporal sub-samples on any frame where something moves more than 8 px/f.
- **Shadows:** ink #16181D at 8–12 % alpha, blur 32–48 px, y 12–24 px.

**Camera rules**
1. One camera move at a time, using `travel` or `glide`.
2. Idle drift is at most 1.5 %/s in scale and 4 px/s in pan. The camera is locked whenever code, tables or equations are being read.
3. Tilt is at most 20°, only while moving, and flat before the narrator refers to the content. Use perspective 2200 px.
4. After an action, push in 1.25× over 12 f with `arrive`.
5. Hard cuts only mid-motion.

**Transitions**
- **Within a beat:** a rack-focus handoff (T1/T11, 8 f + 14 f, switching at peak blur) or a morph carry (T14, 18–24 f).
- **Between beats:** the instrument split (T9, 18 f), select-and-lift (T12), or a word handoff.
- **Act breaks:** a single device, the title-to-running-head glide (T4, 34 f), per analysis.md rule 16. The glyph portal (T3) is used once, leaving the cold open.
- **Register flips:** only via T9 or T3.
- **Energy:** the cold open (first 20–30 s), reveals and act breaks run at the reference speeds. Everything else runs at ~1.5× the reference durations, with 1.5–4 s holds after each landing.
- **Composition changes:** a baseline of 4–6/min, rising to 10–15/min in the cold open and recap montages (the references run at ~35/min).

**Reusable components**
1. **`FocusPull`**: `{scaleFrom: 1.2, blurFrom: 4, opacityFrom: 0.5, dur: 16, ease: arrive}`. The exit is `{scaleTo: 0.85, blurTo: 4, opacityTo: 0, dur: 7, ease: exit}`, and the switch lands at peak blur.
2. **`KineticClaim`**: takes words with timestamps. Settings: `lead: -3f`, `from: {opacity: 0.4, dx: +48px, tracking: +0.04em}`, `dur: 12`, and line re-centring over 18 f with `travel`.
3. **`TypeStream` + `Caret`**:
   - human mode: 8–12 chars/s ±40 % jitter, plus 150–400 ms at punctuation
   - machine mode: 40–80 chars/s, or real tokens/s
   - backspace: 20 → 60 chars/s
   - caret: 2 px wide, cap-height tall, blinking 530/530 ms and solid while typing
4. **`MarkSelection`**:
   - modes: `highlight`, `strike` and `replace`
   - rates: selection at 40 chars/s, strike draws in 8 f
   - fill: semantic colour at 22 % alpha with the text left in ink
   - `replace` resizes the box over 12 f with `settle`
5. **`BracketFrame`**: hairline brackets converge from ±50 % of frame width in 21 f with `settle`. The `clear` variant fades the content over 6 f, then closes the brackets over 8 f into a transition.
6. **`InstrumentSplit`**:
   - a navy #0B1B2E panel wipes to 45–50 % width in 18 f with `travel`
   - a seam connector (1 px blue hairline plus a 6 px diamond) links the source element to the panel, with a provenance tag
   - panel content starts once the wipe is 90 % done
7. **`PerspectivePlane`**: enters at `rotateX 14°, rotateY −10°, y +12 %`, with a depth-of-field mask on the far edge, and settles to 0° over 30 f with `glide`.
8. **`DepthStack`**: layers L0–L2 as specified above, with `rackFocus(layer, 8f out / 10f in)`.
9. **`GlyphPortal`**: zooms ×1.35/frame on a glyph's counter for 12 f, masks the next scene into the counter, and switches register at frame 8, with motion blur on.
10. **`MorphCarry`**: SVG path interpolation (curve → number → cell) over 20 f with `travel`, keeping the entity's semantic colour.

Optional extras are a `PenLeader` (vermilion tip plus a persistent ink stroke, 14–20 f) and a `LightField` (paper lamp at ±2.5 % lightness, vignette 6 %).

## 5. Identity traits we must not copy

**Numtera**
- **Colour and light:** the white/black/sky-blue monochrome with large soft blue gradient blobs and vignettes, and the rotating conic blue light on black.
- **Type:** gradient-filled words (ink to blue), the neo-grotesk display sans, and light-blue `{ }` braces as keyword styling.
- **Signature moments:** the "Meet [icon] Name" reveal and the typed-caret "Start a free trial" end card.
- **Surfaces:** diagonal light-shaft overlays, frosted-glass forms on blue, and its product UI (inbox, workflows, tickets).

**LangEase**
- **Palette and ground:** the lavender-white ground with indigo-to-cyan gradient bars.
- **Signature elements:**
  - the 4-point sparkle glyph and its comet trail
  - the outlined hand-grab cursor
  - the ring of tilted phones
  - confetti
  - the glass folder icon
- **Wording and branding:** the "Translate. Dub. Distribute." tricolon wording, and the "zelios" agency watermark.
- **Format:** the song-driven ad.

**Both**
- glassmorphism
- celebratory particles
- "Meet X" and CTA end cards
- beat-less but always-moving ad pacing as a house style

**What we take is the mechanics only:** easing roles, optics, continuity, stagger and overlap, timing as meaning, and planes that settle flat. All of it is expressed in paper, ink, hairlines, Newsreader/Plex/JetBrains Mono, navy instruments, and blue/vermilion/ochre used strictly by meaning.
