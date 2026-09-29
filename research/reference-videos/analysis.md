# Storytelling grammar of two reference videos, for OpenGrad research films

**References**
- **TG**: "Your tiny GPU can run a 125B model now", from the channel whose watermark reads `<LocalExplained>`. 13:24 long.
- **3B**: 3Blue1Brown, "But what is a neural network?", chapter 1. 18:40 long.

**Purpose.** This document extracts the grammar of these two videos (how they structure, pace and stage an explanation) for our own films. It is not a guide to copying how either one looks. 3B is used only as a reference for explanatory rigour. Its visual identity is listed in the last section as off-limits, and TG's look is listed there too.

**Beat maps** with timestamped narration↔visual tables are in `tiny-gpu-125b/beats.md` and `3b1b-nn-ch1/beats.md`. Transcripts (`transcript.{md,srt,vtt,json}`) and the frame scan (`visual-scan.json`, `keyframes/`) sit in the same folders. The transcripts are third-party copyrighted text kept for private analysis; do not publish them.

**Method and caveats**
- Words per minute (WPM) comes from faster-whisper word timestamps.
- Pauses were measured from audio energy: a pause is a stretch below −40 dB lasting more than 0.6 s. Whisper word gaps were not used because they absorb pauses.
- Visual numbers come from `visual-scan.json`. Its drift-based segmentation undercounts changes on sparse dark frames. For example, 3B's stretch from 9:20 to 11:50 registers as one segment even though the frame moves from a weighted sum to a sigmoid graph to a bias formula. Treat changes/min as a lower bound for both videos.
- On-screen text density and the visual-mode split are manual estimates from all 50 (TG) and 60 (3B) scan keyframes. Contact sheets, plus 42 extra frames taken at transitions, were used to check them.

## 1. Comparison

| Metric | TG (tiny GPU) | 3B (neural network ch.1) |
|---|---|---|
| Duration | 804 s (13.4 min) | 1120 s (18.7 min); core ends 16:13 |
| Narration words | 2,798 | 3,360 |
| WPM over runtime / articulation rate | **209 / 209** | **180 / 203** |
| Per-act WPM range | 173 (twist) – 253 (stakes) | 161 (coda) – 207 (scope) |
| Pauses > 0.6 s | **1** (longest 0.63 s) | **102** (5.5/min; 33 > 1 s; 4 > 3 s; 9.8 % of runtime) |
| Mean sentence length | 20.5 words | 25.4 words |
| Digit tokens spoken | 235 (**17.5/min**) | 58 (**3.1/min**) |
| Hard cuts (scan) | 20 cut-frames ≈ 9 transition events | 7 |
| Composition changes/min | 5.15 | 3.70 |
| Median / p90 composition length | 6.25 s / 32.5 s | 9.75 s / 34.2 s |
| Still fraction | 0.71 | 0.66 |
| Motion runs (activity ≥ 1) | 8.3/min, median 1 s, max 4 s | 7.2/min, median 1 s, max 13 s |
| Full-frame flash peaks (activity ≥ 20) | 10 s of frames | 0 |
| Still runs ≥ 10 s | 8 (longest 16 s) | 16 (longest 29 s) |
| On-screen text | ~12 words/frame median; text in 49/50 frames | ~2 words/frame median; 12/60 frames textless |
| Dominant visual mode | ~60 % text chips / icon + label echo, ~25 % number cards or charts, ~15 % spatial metaphor | ~55 % spatial diagrams / transforms, ~22 % character interludes, ~12 % formula / graph, ~7 % photo, ~5 % text |
| Dominant transitions | pop-ins on a static canvas; grey flash-dips (and one push) at act turns; crossfades | continuous in-scene morphs, write-ons, fades; hard cuts only to change register |

Both videos move roughly the same share of the time (18–19 % of seconds have activity ≥ 1). The difference is the kind of motion:
- **TG** uses short pops and full-frame flashes.
- **3B** uses glides of up to 13 s where one object becomes another, and it never flashes the whole frame.

## 2. Narrative structure

**TG is a consumer-decision investigation** in 12 acts:

| Act | Time | What happens |
|---|---|---|
| Hook | 0:00 | A temptation, voiced by "the voice in my head" |
| Central question | 0:17 | Stated three ways: this model vs my 27B vs my $20 plan |
| Confession and promise | 0:32 | "I have fallen for it more than once… finished relieved" |
| Stakes | 0:48 | Money: "one click away from buying a big RAM kit" |
| Plant | 0:56 | "the minutes… before this thing says its first word" |
| Steelman | 1:11 | Credibility argued explicitly: "if I only tell you the bad part…" |
| Payoff of the plant | 3:27 | "Three minutes of nothing" |
| Turn | 4:31 | "That number fooled me too" |
| Rule | 5:20 | "Count what it holds, not what it touches" |
| Two fixes fail | 6:24–8:10 | Squeezing and a faster engine both fall short |
| Resolution | 8:10 | The setup that works |
| Twist | 8:54 | "that RAM is the part that got expensive" (+485 %) |
| Payoff | 9:41 | Arithmetic: $1,099 ÷ $20 ≈ 55 months |
| Release | 10:37 | "The excitement did not survive it, and I was glad" |
| Exceptions | 10:42 | Who the verdict misses |
| Maker's-eye reframe | 12:07 | "the same trick that makes it cheap to serve…" |
| Close | 12:51–13:24 | Rule callback, then the question answered in the same words as the hook |

Tension in TG is emotional (desire against caution) and financial. It is released by a calculation, not by an image.

**3B is a Socratic construction** in 8 acts before the outro:
- **Hook (0:00).** Image-first, with 4 s of silence: "This is a three." Wonder follows, then the problem stated as a task: "write for me a program…"
- **Dissonance (1:02).** "comically trivial to dauntingly difficult"
- **Scope contract (1:35).** Structure now, learning next.
- **Setup (2:43).** A neuron is "a thing that holds a number". Layers are built from the known pixel grid.
- **Question (5:32).** "Why the layers?" This leads to a hope (loops, then edges), an objection voiced ("kicks the problem down the road", 6:40), and a deferral ("another question… I'll come back to", 7:40).
- **Mechanism (8:20).** The viewer is cast as designer: weights, then sigmoid, then bias.
- **Scale shock (11:35).** "And that is just one neuron!" leads to 13,002.
- **Compression (13:26).** Matrix notation.
- **Payoff (15:17).** A revision of the first definition: a neuron is a function, and so is the whole network.
- **Tease (16:13).** Followed by the outro and an interview coda.

Tension in 3B is a sequence of small open loops. Each is opened as a spoken or written question and closed before the next opens.

## 3. Pacing

**TG** talks at 209 wpm with no pause longer than 0.63 s anywhere. It also averages 17.5 spoken numbers per minute; at 3:00–3:23, six throughput figures arrive in 23 s. The only brake is structural: the twist act slows to 173 wpm, and the "turn" act has the fewest layout changes (1.6/min).

**3B:**
- **Speed.** The raw articulation rate is similar (203 wpm), but 3B spends about 10 % of its runtime silent.
- **Where the silences fall.** Its longest pauses sit exactly on animations: 4.6 s during the matrix–vector build (14:09), 3.6 s at the first network reveal (1:46), 3.1 s as the pixel grid becomes the first layer (3:42), and 3.0 s holding the sigmoid (10:46).
- **Mechanism act (8:21–11:36).** This is the stillest and slowest part: 2.5 composition changes/min and 75 % still. Formulas are held for up to 29 s while they are discussed.
- **Payoff act.** This is the fastest part: 8.6 changes/min and 14 motion events/min. It is a recap montage of images the viewer already owns (15:52–16:04).

The rhythm is **slow to build, fast to recall**.

## 4. Narration-to-visual mapping

**TG** stages each sentence as a text chip or number card. About 60 % of beats show words the narrator is saying at that moment ("THE CARD I OWN", "ONE CLICK AWAY", "FOOLED ME TOO"), so the viewer reads and listens to the same content at once. It does have genuine spatial ideas:
- the expert-slab stack with a yellow "active" stripe (4:48), reused at 7:07 and 12:53
- the red-vs-green bar for "big in memory, cheap in compute" (2:28)
- a donut filled to 82.7 % (7:01)
- the division equation built in sync with "we start… we divide… we get" (10:00)

Both of its metaphors are spoken but never drawn: the "brilliant friend" at 4:17 and the "fridge down the hall" at 5:48. At those moments the screen shows text chips from the previous point.

**3B** puts text on screen for only three jobs:
- **term anchors:** "Neuron → Thing that holds a number"
- **open questions:** "Why the layers?", "What parameters should exist?"
- **derivations:** the 784×16… sum leading to 13,002

Everything else is the idea itself, drawn and moved: the grid becomes neurons, then a column, then a vector; a 9 is drawn as loop + line; a weight grid is laid over the pixel grid. By estimate, fewer than 10 % of its frames duplicate narration as words, against about 60 % for TG.

## 5. Typography

**TG** has three tiers, all in capitals:
1. Heavy grotesque sans titles, top-centre, with one keyword recoloured yellow ("THAT RAM GOT **EXPENSIVE**").
2. Bold sans numbers in filled colour pills with an offset "sticker" shadow.
3. Small letter-spaced monospace labels in outlined rounded chips, used for sources and qualifiers.

Numbers always carry units and separators ("37.6 GB", "$191 · AUG 2025", "≈ 55 MONTHS", "19.35–20.65"). The ≈ sign and the ranges are good practice. The small monospace chips are hard to read at 720p on a phone, and one label is clipped behind its icon ("THE FAST ENGI", 7:28–7:41).

**3B** uses a single serif/math family, in sentence case and regular weight, drawn on stroke by stroke. Hierarchy comes from position, colour and proximity to the object, not from size or weight. Numbers are typeset as math, sit inside or next to the object they describe (0.61 inside a neuron, the "784" brace beside the layer), and are derived rather than asserted.

## 6. Transition vocabulary and persistence

**TG**
- Within a layout, elements pop in, bars and donuts fill, and one label is struck through (the headline "65 TOK/S" at 10:41).
- Between layouts it uses crossfades.
- At act turns it uses a grey flash-dip: 0:34, 2:51, 4:31, 7:28, 8:54, 10:24, 10:57 and 12:52, plus a lateral push at 6:41.
- Isometric hardware icons (card, RAM, SSD, hourglass, basket) recur as tokens, but they are re-placed on each slide rather than carried across.
- The strongest persistence is the slab stack and the rule title, both called back at 12:51.

**3B**
- Almost everything happens on one continuous canvas. Objects are kept and changed rather than replaced: the same 28×28 grid becomes 784 neurons (3:03), then the first layer (3:36), and the neuron labels are later lifted into a bracketed vector (13:44).
- Highlights recolour existing objects.
- The earliest definition returns at 15:17 and is struck out and replaced by "Function". This is the film's structural callback.
- Hard cuts (7 in total) are reserved for changing register: character interlude, photo insert, interview.

## 7. Motifs and colour semantics

**TG**
- **Yellow:** the subject or the headline figure.
- **Red:** cost, penalty or wait.
- **Green:** fits, good, the rule.
- **Blue:** the comparator.
- **Grey:** retired or dimmed.

The semantics drift. Blue means "dense 27B" at 1:55, "2-bit build" at 6:48, and "Flash-Next" at 10:18. Colour follows its left/right position on the slide, not the entity. Recurring motifs are the hourglass (waiting), the RAM stick (cost), the slab stack (held vs active) and the basket (buying).

**3B**
- **Brightness:** activation.
- **Green / red:** positive / negative weight. The narrator declares this encoding aloud at 9:27.
- **Yellow:** focus or annotation.
- **Distinct hues:** separate sub-components within an image equation.

Motifs are the handwritten digit as a running test case, the brace-plus-count label, and the "?" for an open question. The encodings are stable for the whole film.

## 8. Composition

**TG** uses centred, symmetric layouts on a dark field. Content sits in the middle ~60 % of the width, with the title at the top third and icons left or right of the data. There are no camera moves, so a layout is static and gets refilled.

**3B** uses an asymmetric, persistent stage. The network runs full-height on the left or centre, with the test input top-left and annotations placed next to the thing they describe. Objects slide aside to make room, and the view reduces to a single neuron when detail is needed (8:48, 11:38). Density grows within a scene and is reset between scenes.

## 9. What works, what fails

**TG works because:**
- the question is stated in the viewer's terms and answered in the same words
- a sensory number is planted and then paid off
- the good case is steelmanned first
- the rule is memorable and called back
- the payoff is arithmetic done in sync
- it ends on honest exceptions and asks the viewer to test it themselves

**TG's failure modes to avoid:**
1. subtitle-slides (the screen repeats the narration)
2. a flood of numbers (17.5/min, many used once, with vague sources such as "one owner" or "a write-up")
3. metaphors that are spoken but never drawn
4. colour that is bound to slide position rather than to the entity
5. no room to breathe (0 pauses; 253 wpm in the stakes act)
6. craft defects: a clipped label, and narration seams at 0:56, 5:24 and 11:44 (a stray "number.", a stray "changes.", and "its attention cache is about a tenth of, what, the dense 27B…"). These suggest the narration was never proofed, but that is an inference.

**3B works because:**
- one object persists and is transformed
- the viewer is cast as designer ("picture yourself…")
- objections are voiced and then deferred honestly
- silence covers the animations
- the first definition is revised at the payoff

**3B's failure modes to avoid:**
1. slow arrival: the first weight appears at 9:07, 49 % of the way in, after a 96-s scope act
2. a speculative picture (the edge → loop hierarchy, about 170 s) that is drawn exactly like fact and caveated only in the narration (7:40)
3. interludes that carry no information of their own
4. a 2.5-min tail after the payoff, whose coda (ReLU) undercuts the sigmoid the film just built

## 10. Transferable grammar rules for OpenGrad films

| # | Rule | Evidence | Application to ML research docs |
|---|---|---|---|
| 1 | State the central question within 30 s in the viewer's terms, and answer that exact question at the end | TG 0:17 → 12:58; 3B 0:48 → 15:38 | "Can a model this size learn X from Y?" returns as the final line, with its measured conditions |
| 2 | Open on one concrete object before naming the topic | 3B 0:00–0:04 (4 s of image, then "This is a three"); TG 0:00 (the post) | Open on one sample, one failure or one loss curve, not on the method name |
| 3 | Make it feel hard before explaining it | 3B 1:02 "trivial to dauntingly difficult"; TG 0:10 vs 3:27 | Show the naive approach failing before introducing the method |
| 4 | Steelman before critique, and give the reason | TG 1:11; 3B 2:37 "fall short of a couple hopes" | Present baselines at their strongest; treat negative results with equal care |
| 5 | Plant one sensory number early and pay it off later | TG 0:56 → 3:27 (3.11 min); 3B 784 (3:09) reused as a persistent label | Pick 2–4 anchor numbers per film (params, tokens, loss gap) and reuse them |
| 6 | Budget numbers (~4/min) and derive each headline figure on screen | TG 17.5/min flood (3:00–3:23); 3B 12:17 sum → 13,002; TG 10:00 division | Build compute or parameter totals term by term; never float an unexplained figure |
| 7 | One persistent object per idea: transform it rather than replacing it | 3B grid → neurons → column → vector (3:03, 3:36, 13:44); TG slab stack 4:48 / 7:07 / 12:53 | One tensor, block or attention map carried through init → trained → ablated |
| 8 | When understanding deepens, bring back the old label and revise it on screen | 3B 2:55 → 15:37 (struck out → "Function"); TG 10:41 headline crossed out | "We expected X" frame returns and is corrected by the result |
| 9 | Let silence carry the reveals: 1.5–4 s holds, target ~170–185 wpm overall | 3B 102 pauses, 4.6 s at 14:09, 3.1 s at 3:42; TG has 0 pauses at 209 wpm | Hold after each figure lands; never talk over a transform |
| 10 | Slow to build, fast to recall | 3B mechanism act 2.5 changes/min vs payoff montage 8.6/min (15:52–16:04) | Build the method on one canvas slowly; montage only what is already built |
| 11 | Text is an anchor, not a subtitle: terms, open questions, derivations | 3B ~2 words/frame; TG ~12 words/frame, ~60 % echo | Label nouns and questions; never typeset the sentence being spoken |
| 12 | If you narrate a metaphor, draw it on the same object, or cut it | TG 4:17 and 5:48 (not drawn); 3B 5:53 "loop + line" drawn as image algebra | Every analogy maps visibly onto the persistent object |
| 13 | Declare each encoding aloud once and bind colour to an entity or meaning for the whole film | 3B 9:27; TG blue drifts (1:55 / 6:48 / 10:18) | One fixed colour for "our model", one for the baseline, one for error, with a key on first use |
| 14 | Voice the viewer's objection when it arises, then answer it or explicitly defer it | 3B 6:40, 7:40; TG 5:25 dissent, 7:41 "no such check has been published" | Skeptic beats ("isn't this memorisation?") answered with evidence or flagged as open |
| 15 | Mark speculation visually, not only verbally | 3B 5:32–8:20 hope drawn as fact, caveated in speech at 7:40 | Hypothesised mechanisms get a distinct "unconfirmed" treatment until evidence confirms them |
| 16 | Reserve one restrained transition type for act turns; keep everything else continuous | TG flash-dips at 4:31, 8:54, 10:24, 12:52; 3B cuts only for register change | One act-break device; within an act, morph |
| 17 | Compress a single sentence into the rule, then call it back at the close | TG 5:20 → 12:51; 3B "just a function" 15:38 → 15:59 | Each film ends on one sentence the viewer can repeat |
| 18 | Contract the scope and disclose arbitrary choices | 3B 1:35 scope split, 4:17 "16… a nice number to fit on the screen"; TG 12:01 "mine included" | Say what is out of scope, which hyperparameters were arbitrary, and how to reproduce |
| 19 | Explain why the design is the way it is from the maker's side, before judging | TG 12:07–12:40; 3B 12:42–13:26 (why hand-tuning intuition matters) | Motivate each design choice before showing its cost |
| 20 | End once the question is answered; move extras before the payoff or cut them | 3B 2.5-min tail with a ReLU coda after the payoff | No new concepts after the answer |

## Identity traits to avoid (do not imitate)

**From 3Blue1Brown:**
- the pure-black background with its blue/teal–brown–yellow palette
- the LaTeX Computer Modern serif used for all text
- stroke-by-stroke "write-on" text and the signature morph look
- the network drawn as thin grey edges between teal-outlined circle columns with a "784" brace
- green/red weight edges
- MNIST digits in a framed square at top-left
- the pi creatures, or any googly-eyed mascot audience with speech bubbles
- cross-promo thumbnails
- the character-beside-guest-footage coda
- the "But what is…?" title pattern
- in-jokes such as "squishification"

**From TG, also not ours:**
- the charcoal field with isometric flat hardware icons
- all-caps heavy sans titles with one yellow keyword
- monospace outline chips
- pill number cards with offset colour shadows
- grey flash-dips
- the corner code-bracket watermark
- the confessional "I fell for it" voice as a house style

**What we keep is the grammar only:** a persistent object that transforms, questions opened and closed, anchor numbers derived on screen, silence at reveals, stable encodings, and callbacks.
