# Beat map: 3Blue1Brown, "But what is a neural network? | Deep learning chapter 1" (18:40, 720p60)

Timestamps are mm:ss and come from the faster-whisper word timings. Pauses were measured from audio energy (below −40 dB for more than 0.6 s). Quotes are short excerpts.

**Central question** (0:48–1:06): *How could a program take a 28×28 grid of pixels and output which digit it is?* The film narrows this to *what is the structure of the thing that does it?* and makes the scope split explicit at 1:35: structure now, learning next time. The payoff at 15:38 is "the entire network is just a function… 784 numbers in, 10 numbers out."

**Tension device:** a gap between "comically trivial" for a brain and "dauntingly difficult" for a program. After that, a chain of "hopes" and "questions" is opened one at a time and each is closed before the next opens.

## Acts and pacing

| Act | Span | Words | WPM | Pauses/min | Comp. changes/min | Motion events/min | Still % |
|---|---|---|---|---|---|---|---|
| A1 Hook: "This is a three" | 00:00–01:07 | 188 | 169 | 4.5 | 1.8 | 9.0 | 65 |
| A2 Promise + scope | 01:07–02:43 | 332 | 207 | 5.6 | 5.6 | 6.8 | 66 |
| A3 Setup: neurons and layers | 02:43–05:32 | 484 | 172 | 5.0 | 2.8 | 6.7 | 66 |
| A4 Why layers? The hope | 05:32–08:21 | 524 | 187 | 6.8 | 5.3 | 7.8 | 67 |
| A5 Mechanism: weights, sigmoid, bias | 08:21–11:36 | 580 | 178 | 7.1 | **2.5** | 5.5 | **75** |
| A6 Scale-up + learning reframe | 11:36–13:26 | 338 | 183 | 4.3 | 4.9 | 8.1 | 54 |
| A7 Compression: matrix notation | 13:26–15:17 | 321 | 174 | 6.0 | 1.6 | 5.9 | 73 |
| A8 Payoff: network = function | 15:17–16:13 | 167 | 180 | **8.6** | **8.6** | **14.0** | 45 |
| A9 Tease + outro (subscribe, Patreon) | 16:13–17:03 | 166 | 198 | 6.0 | 3.6 | 6.0 | 42 |
| A10 Coda interview (ReLU) | 17:03–18:40 | 260 | 161 | (room tone) | 2.5 | 6.2 | 78 |

The core explanation ends at 16:13, which is 87 % of the runtime. The last 2.5 minutes are outro and coda.

**Longest pauses and what fills them:**

| Time | Pause | What is on screen |
|---|---|---|
| 14:09 | 4.6 s | matrix–vector animation plays |
| 1:46 | 3.6 s | first reveal of the working network |
| 3:42 | 3.1 s | pixel grid becomes the first layer |
| 10:46 | 3.0 s | sigmoid graph held |
| 5:29 | 2.5 s | output neuron lights before the "why layers?" question |

The pauses are where the picture does the talking.

## Beats

| Time | Beat / function | Narration cue | On screen |
|---|---|---|---|
| 00:00 | COLD OPEN, image-first | (4 s silence) | a single low-res handwritten 3 |
| 00:04 | Hook: the object | "This is a three." | the 3; then three different 3s (0:19) |
| 00:13 | Wonder | "appreciate how crazy it is that brains can do this so effortlessly" | the 3s; audience character (identity trait) |
| 00:48 | PROBLEM (dissonance) | "write for me a program that takes in a grid of 28 by 28 pixels" | 3 → pixel grid → arrow → column 0–9 with "?" |
| 01:02 | Stakes line | "from comically trivial to dauntingly difficult" | same |
| 01:06 | Relevance + promise | "Not as a buzzword, but as a piece of math." | characters + a glimpse of the formula aₗ₊₁ = σ(Waₗ + b) |
| 01:35 | SCOPE split | "devoted to the structure… the following one is going to tackle learning" | two icons: Structure / learning |
| 01:42 | First reveal (cut 1:42.75; pause 3.6 s) | "put together a neural network that can learn to recognize handwritten digits" | full network lights up on a digit |
| 01:49 | Context + humility | "many many variants… the simplest plain vanilla form" | text: CNN → images, LSTM → speech; "Plain vanilla (aka multilayer perceptron)" |
| 02:37 | Expectation management (cut) | "fall short of a couple hopes we might have" | character interlude |
| 02:43 | SETUP: define the atom | "a thing that holds a number" | lone circle + label "Neuron → Thing that holds a number" |
| 03:03 | Input layer, built from the known object | "784 neurons in total" | **the same pixel grid; each pixel becomes a neuron (0.61 in a circle)** |
| 03:36 | Transform + hold (pause 3.1 s) | "all of these 784 neurons make up the first layer" | the grid reorganises into a column with a "784" brace |
| 03:46 | Output layer | "10 neurons, each representing one of the digits" | column 0–9 boxed |
| 04:02 | Hidden layers = open question | "a giant question mark" | yellow box "Hidden layers" + "?" |
| 04:17 | Honest arbitrariness | "16 well, that was just a nice number to fit on the screen" | "Why 2 layers? / 16 neurons each" |
| 04:58 | Demo: forward pass | "that pattern of activations causes some very specific pattern in the next layer" | activations propagate; the brightest output is boxed |
| 05:32 | QUESTION 1 (cut) | "why it's even reasonable to expect a layered structure… to behave intelligently" | "Why the layers?" with arrows |
| 05:48 | Hope, decomposed | "A 9 has a loop up top and a line on the right." | image algebra: 9 = ◯ + │, 8 = ◯ + ◯ |
| 06:07 | Hope mapped onto the network | "each neuron in the second to last layer corresponds with one of these subcomponents" | "Upper loop neuron… maybe…" |
| 06:40 | **Objection voiced** | "that just kicks the problem down the road" | — |
| 06:53 | Recursion: loops become edges | "recognize the various little edges that make it up" | ◯ = sum of coloured edge fragments; "Little edge" layer? |
| 07:26 | Full chain | "lights up… the upper loop and a long vertical line… a 9" | three-layer lighting |
| 07:40 | **Caveat / deferral** | "Whether or not this is what our final network actually does is another question" | — |
| 07:52 | Transfer (cuts at 7:55 and 8:01) | "useful for other image recognition tasks" | lion photo, then edge map of the lion; speech: sounds → syllables → words |
| 08:20 | MECHANISM: the viewer as designer | "picture yourself right now designing" | the network is reduced to one hidden neuron with its 784 inputs and a pixel grid with one edge region lit (08:48) |
| 08:53 | QUESTION 2 | "What dials and knobs should you be able to tweak" | "What parameters should exist?" p₁…p₈ + noise grid |
| 09:07 | Weights | "assign a weight to each one of the connections" | w₁…w₈ values; connections |
| 09:27 | **Encoding declared aloud** | "green pixels to indicate positive weights and red pixels to indicate negative" | weight grid laid over the pixel grid |
| 09:42 | Design an edge detector | "some negative weights associated with the surrounding pixels" | weighted-sum formula + 7 with a highlighted stroke |
| 10:14 | Squish | "squishes the real number line into the range between 0 and 1" | sigmoid graph + formula (held 3 s at 10:46) |
| 10:52 | Bias | "you want some bias for it to be inactive" | σ(w₁a₁+…+wₙaₙ − 10), "bias"; "Only activate meaningfully when weighted sum > 10" (held about 29 s) |
| 11:23 | Two-line summary | "weights tell you what pixel pattern… bias tells you how high" | same |
| 11:35 | **Scale shock** | "And that is just one neuron!" | fan of 784 connections; "784 weights per neuron / One bias for each" |
| 11:59 | Count derived on screen | "784 x 16 weights, along with 16 biases" | 784×16 + 16×16 + 16×10 weights; 16+16+10 biases → boxed **13,002** |
| 12:30 | Reframe of "learning" | "finding a valid setting for all of these many many numbers" | "Learning → Finding the right weights and biases" |
| 12:42 | Thought experiment | "setting all of these weights and biases by hand" | character thought-bubble with a network |
| 13:26 | COMPRESSION | "a little cumbersome to write down, don't you think?" | full indexed formula aᵢ⁽¹⁾ = σ(…) |
| 13:41 | Notation built from the objects (pause 4.6 s at 14:09) | "Organize all of the activations from one layer into a column as a vector" | the labels a₀…aₙ are lifted out of the neuron column into a bracketed vector (13:44–13:48); W appears beside it (13:52); a row of W is highlighted against one output neuron; the output entry "?" |
| 14:13 | Cross-reference | "the series I did on linear algebra, especially chapter 3" | thumbnail of that series (identity) |
| 14:28 | Finish the expression | "wrap a sigmoid around the outside" | σ(Wa + b), elementwise σ shown on [x y z] |
| 15:05 | Why notation matters | "libraries optimize the heck out of matrix multiplication" | — |
| 15:17 | **CALLBACK + REVISION** | "Remember how earlier I said these neurons are simply things that hold numbers?" | the 2:55 label returns and is **crossed out**, replaced by "Function" |
| 15:38 | PAYOFF | "the entire network is just a function" | "Network → Function", f(a₀…a₇₈₃) = (y₀…y₉) |
| 15:47 | Recap montage | "13,000 parameters… matrix vector products and the sigmoid" | fast replay of 13,002, the weighted-sum grid, σ(Wa+b), the network (15:52–16:04) |
| 16:03 | Reassurance | "if it were any simpler, what hope would we have" | "It kind of has to be complicated, right?" |
| 16:13 | TEASE | "How does this network learn the appropriate weights and biases" | "On learning" play icon |
| 16:27 | Outro joke | "the neural networks that underlie YouTube's recommendation algorithm" | "Subscribe?" |
| 16:47 | Patrons | — | Patreon card |
| 17:03 | CODA (cut) | "early networks used this to squish…" / "ReLU seems to be much easier to train" | live footage of the guest at a blackboard; ReLU graph |
| 18:24 | End | "All right. Thank you, Lisha." | — |

## Narration-to-visual mapping (representative moments)

| # | Time | Said | Shown | Relationship |
|---|---|---|---|---|
| 1 | 00:04 | "This is a three" | the digit itself | literal (the object) |
| 2 | 00:52 | the program's input and output | 3 → grid → digit column with "?" | diagram build |
| 3 | 02:51 | neuron = thing that holds a number | lone circle + definition label | text echo (term anchor) |
| 4 | 03:03–03:42 | pixels → 784 neurons → first layer | grid → circles → column | **transformation of a persistent object** |
| 5 | 04:02 | hidden layers, "giant question mark" | yellow box + "?" | annotation on the persistent object |
| 6 | 05:53 | 9 = loop + line | image equation | metaphor drawn as visual algebra |
| 7 | 07:12 | loops made of little edges | same equation format, one level down | recursive callback of format |
| 8 | 09:27 | green = +, red = − | weight grid over the pixel grid | encoding declared, then applied |
| 9 | 10:26 | squish to 0–1 | sigmoid graph, held in silence | graph |
| 10 | 11:59 | 13,000 knobs | the sum laid out → 13,002 | data derived on screen |
| 11 | 13:41 | vector / matrix / row | the neuron labels are lifted out of the layer into the vector | transformation (diagram → notation) |
| 12 | 15:17 | neuron is really a function | the old label is crossed out | callback + revision |
| 13 | 15:52 | "absurdly complicated function" | recap montage of earlier frames | visual callback |

**Rough split, from manually classifying all 60 scan keyframes:**
- about 55 % spatial diagrams or transformations of the network, grids and digits
- about 22 % audience-character interludes (identity; do not copy)
- about 12 % formula or graph
- about 7 % photo or live footage
- about 5 % text-primary frames

On-screen text: median of about 2 words per keyframe, and 12 of 60 keyframes have no text at all. Text is mostly single-term labels ("784", "Hidden layers", "Sigmoid", "bias") or the open question of the moment ("Why the layers?", "What parameters should exist?"). Narrated sentences are almost never subtitled.

## Transitions observed

The scan detected 7 hard cuts:
- 1:42.75, 2:37.5, 5:32.25 and 6:42: switching between the diagram scene and the character interlude
- 7:55 and 8:01: the photo insert
- 17:03.75: the interview

Everything else happens on a continuous canvas: morphs (grid → neurons → column → vector), write-on labels, fades, objects sliding aside to make room, reductions to a single neuron (8:48, 11:38), and highlights that recolour an existing object rather than adding a new one.

## Weaknesses noticed

- The first weight appears at 9:07, which is 49 % of the runtime. The promise/scope act (96 s) is heavy on meta commentary.
- A5 spends about 170 s on the "edges → loops → digits" hope. The film flags it as possibly untrue only verbally (7:40) while the visuals present it as fact.
- The coda brings in ReLU after the payoff and implicitly downgrades the sigmoid that A5 spent 1.5 minutes building.
- The character interludes carry no information of their own. They are timing and voice devices.
