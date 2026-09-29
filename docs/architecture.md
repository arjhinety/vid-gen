# Architecture

vid-gen turns a **project** (a script, some claims with sources, some data, and scene code) into finished videos, one per language. It runs entirely on one Windows machine with a 6 GB GPU. No step calls a paid or cloud API.

```
projects/<id>/                      packages/ (reusable)                py/ (Python, one env each)
  project.yaml ─────────┐
  script/narration.yaml ┼─▶ @vid/core: schema · validate · normalize · timeline · captions · sfx
  sources/claims*.yaml ─┘           │
  voices/<voice>.yaml ──────────────┼─▶ cli `audio` ──▶ py/tts/<engine> (TTS, isolated venvs)
                                    │                   py/media (prep · align · mix)
                                    ▼
                           build/<id>/<lang>/timeline.json   ← measured speech, cues, captions
                                    │
  scenes/*.tsx ──▶ @vid/player (Vite) ──▶ @vid/render web.ts (Playwright seek + screenshot → FFmpeg)
  scenes/manim/*.py ──▶ cli manim.ts ──▶ py/manim (ogmanim + Manim CE, cue JSON) → exact frame count
                                    │
                                    ▼
                    @vid/render compose.ts: concat · burn/attach subtitles · mux mix · verify
                                    │
                                    ▼
                  build/<id>/<id>.<lang>.<quality>.mp4  + .report.json + .<sub>.srt/.vtt
```

## The one idea: time comes from speech

A scene never guesses how long it lasts. `buildTimeline` (`packages/core/src/timeline.ts`) computes it:

> scene duration = lead + Σ(measured line durations) + line/beat pauses + hold, then at least `min_duration`

- **Cues.** Every `[[cue]]` marker in the narration resolves to the start time of the word it precedes, taken from word alignment of the real synthesized audio. Scenes animate on cues, never on hard-coded seconds. Re-recording a line re-times the whole film, and nothing drifts.
- **Before any audio exists**, the same code runs on estimated durations (`estimate.ts`: 2.55 words/s EN, 7 chars/s JA). Everything still renders, and it is marked `estimated`.
- **Frames tile exactly.** Scene frame counts are differences of rounded absolute boundaries, so `Σ scene frames = film frames`. There is no accumulated rounding. Both the render check and the tests assert this.

## Packages

| Package | Role | Depends on |
|---|---|---|
| `@vid/core` | Renderer-agnostic model: zod schemas, validation, narration markup (cues, `*accent*`, `~~strike~~`), text normalization (numbers, lexicon, display↔spoken span map), timeline, headline rows with word times, caption chunking, SRT/VTT/ASS, SFX placement, content hashes, build paths | zod, yaml |
| `@vid/design` | The house style (Experimental Labs): colour/type/space/motion tokens, fonts (Archivo, JetBrains Mono, STIX Two Math; all OFL), `theme.css`. `export.ts` writes `tokens.json` for Python | — |
| `@vid/motion` | Deterministic motion: frame context, cue hooks (`useCues`), cubic-bezier easings measured from the references, springs, OKLab colour mixing, seeded noise, async-resource gate | react |
| `@vid/kit` | Reusable visual components: the sheet (grid, breadcrumb, word-synced headline, exhibits), mono labels and stamps, forms and checklists, bars/line charts drawn by a pen nib, flows, dot fields and trays, cell grids, meters, instrument panels, code panel (Shiki), camera | react, shiki |
| `@vid/player` | Vite app: interactive preview, plus the headless render host (`window.__vid.seek(frame)`) | vite, react |
| `@vid/render` | Web scene capture (Playwright → FFmpeg), final compositor, loudness measurement | playwright, ffmpeg |
| `@vid/cli` | `pnpm video …`: orchestration, caching, TTS/align/mix calls, Manim runs, checks | all of the above |

Python lives in `py/`, one isolated `uv` environment per concern, so the CUDA and torch pins of different engines never collide:

| Env | Role |
|---|---|
| `py/media` (`vidmedia`) | faster-whisper transcription, line prep (trim, 48 kHz, loudness match), char-level word alignment against the known text, the mix (voice bus, ducked music bed, procedural SFX), reference-video scanning |
| `py/manim` (`ogmanim`) | Manim CE 0.21 + Typst math, and the OpenGrad theme (`tokens.json`), fonts, cue timing and easing |
| `py/tts/<engine>` and `third_party/irodori-tts` | One venv per TTS engine, all speaking the job protocol in `py/tts/_protocol.py` |

## Web renderer (the default)

A web scene is a React component that is a **pure function of the frame number**: no timers, no CSS transitions, no `Date.now()`.

1. The render host loads the scene and awaits fonts and any `useResource` promises (Shiki grammars, data).
2. The capture loop runs: `seek(f)` → `flushSync` → wait for idle → two rAFs → screenshot (JPEG q80 in draft, q95 in final) → piped to FFmpeg `image2pipe` → libx264. The output is tagged BT.709 limited range.
3. Frames are split into chunks across up to `min(6, cpus/3)` pages and concatenated losslessly.
4. Chromium runs with CPU raster by default, which is deterministic and leaves the GPU free for TTS. Set `VID_GPU=1` for WebGL-heavy scenes.

Measured on the RTX 4050 laptop (16 GB) during the pilot: 36–57 fps at draft (960×540) and 21–42 fps, typically ~30, at final (1920×1080).

## The shared sheet

The house style (see [design-system.md](design-system.md)) draws the same chrome on every scene: grid paper, the mono breadcrumb, the open-question line, and (for short films that turn it on) the narration as a word-by-word headline.

- **It is drawn by the player, not by scenes.** `Stage` wraps each scene in `SheetChrome`.
- **It is built from film-level context** (`SceneTiming.film`):
  - the question-line changes at absolute times (`timeline.questions`)
  - the headline rows with absolute word times (`timeline.headline`, empty when off)
  - the brand
  - this scene's and the previous scene's section
  - the visible headline rows
- **So a cut changes only the exhibit.** Scene cache keys include that context, so an edit elsewhere re-renders the scenes whose question line or headline it changes.

## Manim renderer

Manim scenes draw only their exhibit, on a transparent background. The sheet underneath is rendered by the web renderer (the scene's web "underlay" is the chrome with an empty exhibit), and the two are composited in RGB, so there is no BT.601/709 colour shift.

`cli/manim.ts` works like this:

1. It writes the scene's timing (cues in frames, exact duration) to `<scene>.timing.json`.
2. It runs `manim render` in `py/manim` with `VID_SCENE_JSON` pointing at that file.
3. Inside the scene, `OGScene.wait_until("cue")` holds until a cue, and `fit()` compresses closing animations when the narration leaves little room.
4. The CLI then normalizes the output to the exact frame count (clone-pad or trim, alpha kept) and warns when drift exceeds 3 frames, because that means the waits don't match the cues.
5. `compositeOverlay` lays it over the sheet underlay and encodes it like a web scene.

`still` scenes (one held image) are web scenes too: the image is an `Exhibit` on the sheet.

## Caching

Scene renders are content-addressed (`build/<p>/<lang>/scenes/<id>.<quality>.json` stores the key). The key covers:

- scene timing (cues, duration)
- film context (question line, headline rows, sections, brand), because the sheet is part of the frame
- quality and format
- every file in `packages/{design,motion,kit}`, `packages/player/src`, the capture code, and the project's `scenes/`
- for Manim: `py/manim/src`, the Manim driver, `tokens.json` and the project's `data/`

TTS output is cached by `hash(engine adapter, voice spec, spoken text, seed)` in `.cache/tts/<engine>/`, so editing one line re-synthesizes one line. The delivery encode always runs; it is the cheap step.

## Compositor

`render.ts` + `compose.ts`, one pass per language:

1. **Scenes**: rendered or cached, and each scene file's frame count is verified.
2. **Audio**: `narration.wav` (from `audio`). If the project declares a music bed or SFX, `vidmedia mix` adds them:
   - **The bed** is a licensed file, or the license-free procedural `pulse` (`vidmedia/bed.py`). The pulse's bars are fitted per scene so every cut lands on a downbeat.
   - **Ducking** follows a timeline-driven envelope. It knows exactly when speech happens, so there is no compressor pumping.
   - **SFX** are procedural and pinned to cues (`scene:cue`). An optional `impact` marks every cut.
   - **Music tracks** (`music.tracks`) are fitted to their stretch of the film and cross-faded (`vidmedia/tracks.py`); the mix is then stereo.
3. **Subtitles**: SRT/VTT sidecars (and a soft `mov_text` track). An ASS file styled from the tokens (libass, Archivo) is written for variants that set `burn_subtitles`. The pilot's Japanese version burns its English subtitles: sentence-sized chunks timed to the Japanese lines, in the desk band at the bottom.
4. **One delivery encode**: concat filter → optional cast overlay (a transparent VP9 track of the presenter, [cast.md](cast.md)) → optional `subtitles=` burn → x264 (`tune animation`, `aq-mode 3`) + AAC 192k, with soft subs as `mov_text`.
5. **Verify**: frame count equals the timeline, subtitle track count, and EBU R128 integrated loudness and true peak. The results go into a `.report.json` next to the film.

## Where things are deliberately *not* abstracted

- **No general "scene graph" DSL.** Scenes are React or Manim code. An agent or a person edits real code with real types, and the shared vocabulary lives in `@vid/kit`, `@vid/motion` and `ogmanim`.
- **No framework runtime in the core.** HyperFrames (Apache-2.0) and Remotion (custom license) can be adapters: a scene renderer that writes an mp4 of the exact frame count is all the compositor needs. See [renderer-selection.md](renderer-selection.md).
