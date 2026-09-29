# Project format

A project is a folder under `projects/<id>/`. Everything reusable lives in `packages/` and `py/`; a project holds only its story, sources, data and scene code.

```
projects/<id>/
  project.yaml            # format, brand, languages, audio, scenes (validated by core/schema.ts)
  script/
    narration.yaml        # beats → lines (EN + JA), cues, emphasis, claims
    lexicon.yaml          # optional pronunciation overrides per language
  sources/
    claims*.yaml          # every claim the film makes: text, class, source path + locator
    *.md                  # audit notes, fact sheets (human-readable)
  data/
    extract.py            # reads the source repo → study001.json with {v, src} provenance
    *.json
  scenes/
    *.tsx                 # web scenes (default export = exhibit component)
    manim/*.py            # Manim scenes (OGScene subclasses)
    shared/               # typed data accessors, layout constants
  storyboard/             # optional planning notes
voices/<voice>.yaml       # repo-level: TTS engine + voice design (shared across projects)
```

## `project.yaml`

```yaml
id: opengrad-study-001
title: "The empty bin"
format: { width: 1920, height: 1080, fps: 30 }
brand: { name: Experimental Labs, place: Philippines, crumbs: [OpenGrad Study 001] }
headline: { enabled: false }                    # true shows the narration word by word (short films only; see design-system.md)
languages:
  en: { voice: narrator-en, subtitles: [en] }
  ja: { voice: narrator-ja, subtitles: [en], burn_subtitles: true }   # burns the first subtitle language
script: script/narration.yaml
claims: sources/claims-pilot.yaml
audio:
  target_lufs: -16         # integrated loudness of the mix
  line_gap: 0.35           # default silence between lines of a beat (s); author `pause:` per line instead
  beat_gap: 1.0            # default silence between beats (s)
  music:                   # one of: { path } | { procedural: pulse, bpm: 96 } | { tracks: [...] }
    tracks:                # each from its scene to the next track's; the last ends on the film's last frame
      - { path: projects/opengrad-study-001/assets/music/graph-paper-learning.wav, from: cold-open }
      - { path: projects/opengrad-study-001/assets/music/hidden-flaw-discovery-take2.wav, from: smoke-test }
    xfade: 3               # cross-fade at each track boundary (s)
    gain_db: -12           # bed loudness under the voice target (LU)
    duck_db: -6            # extra dip under speech (dB)
    cut_hits_db: null      # an impact on every cut (dBFS), or null
  sfx: []                  # [{ at: "<scene>:<cue>", sound: tick|thump|whoosh|stamp|impact | path, gain_db, offset }]
cast:                      # optional: a Live2D presenter over the whole film (see cast.md); omit for none
  model: build/cast/live2d/graddy/graddy.model3.json
  box: { x: 1400, y: 216, w: 520, h: 864 }     # frame px; the scenes keep this lane empty
  fit: { height: 0.78, x: 0, y: -0.05 }        # character height as a share of the box; centre (-1..1, y up)
  pace: standard           # mouth flap: standard | calm
scenes:
  - id: training
    renderer: web          # web | manim | still
    entry: scenes/Training.tsx          # manim: scenes/manim/f1_geometry.py:F1Geometry; still: an image
    section: [01 · Post-training]       # breadcrumb items after the brand
    question: "Can training teach a small model when to use a tool?"   # the open question (see below)
    headline_rows: 2       # only with headline.enabled: 2 | 3 (exhibit sits lower) | 0
    sheet: true            # false for full-bleed cards without the sheet chrome
    beats: [b05, b06]      # narration beats spoken over this scene, in order
    lead: 0.5              # picture before the first word (s)
    hold: 1.2              # picture after the last word (s)
    min_duration: 0        # silent scenes need this
    claims: [pilot-corpus, pilot-ledger]
```

**The question line** (`question`): the open question of the moment, one line under the header, in English in every language version.
- A string shows it from the scene start (or keeps it, unanimated, if the previous scene ended on the same question).
- A list changes it at cues: `[{ text: "Is it refusing?" }, { at: loss, text: null }]`. `at` is any cue of the scene, including `line:<beat>#<n>`.
- `null` clears it.
- Omitted: whatever the previous scene showed stays.

## `script/narration.yaml`

```yaml
beats:
  - id: b09
    intent: "1,319 questions; the base attempts all; both trained checkpoints refuse all."
    pause: 0.6            # optional: silence after the beat (overrides beat_gap)
    lines:
      - en: "Both trained checkpoints [[refuse]]*refused every single one*."
        ja: "訓練した二つのチェックポイントは、[[refuse]]一問残らず拒否しました。"
        say_ja: "…"       # optional spoken override when the normaliser gets it wrong
        pause: 0.6        # optional: silence after the line (overrides line_gap)
        claims: [pilot-gsm8k-refuse]
```

Markup, all stripped before TTS, captions and alignment:

| Markup | Meaning |
|---|---|
| `[[name]]` | A cue on the next word. Every cue must appear in every language (`video check` enforces parity) |
| `*text*` | The word to lean on (about one per scene). Shown in crimson only when the headline is on |
| `~~text~~` | A negated term; struck in crimson only when the headline is on |
| `{tone}` | Direct the voice from this point (e.g. `{reveal}空っぽの箱`). The voice file translates it; see [audio-tts.md](audio-tts.md#direction-tone) |

A line may also carry `tone: <word>` (all languages; an inline `{tone}` overrides it in that language).

**Writing rules** (the text is on screen):

- Keep sentences short and declarative.
- Keep digits in display text; the normaliser speaks them ("1,319" → "one thousand, three hundred and nineteen"; JA 千三百十九).
- Use curly quotes.

## `sources/claims*.yaml`

```yaml
- id: pilot-gsm8k-refuse
  text: "M0 and M1-v2 refused 1,319 of 1,319 0-shot GSM8K questions."
  class: measured            # measured | author-interpretation | hypothesis | limitation | speculation | design
  source_path: results/final_campaign_verdict.json
  source_locator: "canonical_benchmarks.gsm8k.per_stage.{M0_SFT,M1_DPO_CURRENT}.zeroshot.refusals"
  notes: "…"                 # how a spoken rounding or derivation was made
```

Every `claims:` id on a line or scene must exist. Numbers on screen come from `data/*.json` through `scenes/shared/data.ts`, never literals. Each JSON value carries `src` (file#pointer in the source repo).

## `voices/<voice>.yaml`

```yaml
id: narrator-ja
lang: ja
engine: irodori            # py/tts/engines.yaml
description: "…"
params: { caption: "落ち着いた、柔らかく透明感のある若い女性の声…", seed: 7, dtype: bf16 }
provenance: "Synthetic voice designed from a text caption; no real person's voice."
```

## What `build/` contains

```
build/<id>/<lang>/
  audio/lines/*.wav, lines.json, qa.json, narration.wav, [mix.wav]
  timeline.json            # scenes, cues, lines + words, captions, question changes, headline rows
  scenes/<scene>.<quality>.mp4 (+ .json cache key; manim: .sheet.mp4, .overlay.mov)
  subtitles.<sub>.srt|vtt|ass
  stills/*.png
build/<id>/<id>.<lang>.<quality>.mp4            # the film
build/<id>/<id>.<lang>.<quality>.report.json    # frames, loudness, subtitles, warnings
build/<id>/<id>.<lang>.<quality>.<sub>.srt|vtt  # sidecars
```
