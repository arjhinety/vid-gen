# vid-gen

Local-first, code-driven research videos for OpenGrad / Small Mind.

A film is a folder of plain files:

- a script written to be heard, with the moments animations lock to
- a claims file that ties every sentence to a source in the research repo
- extracted data with provenance
- one small scene per exhibit

One command turns that into an English film and a Japanese-voice film with English subtitles. Everything renders on your own machine. There are no paid APIs and no cloud services, and every core dependency is OSI-licensed ([docs/licensing.md](docs/licensing.md)).

The first project is the **OpenGrad Study 001 pilot** (`projects/opengrad-study-001`), 5 min 26 s in English and 7 min 40 s in the Japanese-voice version (lengths are set by the measured narration and its authored pauses), in the Experimental Labs house style ([docs/design-system.md](docs/design-system.md)).

## How it works

```
script/narration.yaml ──► TTS (Irodori JA / EN engine) ──► align (faster-whisper) ──► timeline.json
                                                                               │ cues, words, question line
scenes/*.tsx   (React, pure f(frame)) ──► Playwright seek + screenshot ─┐      │
scenes/manim/*.py (Manim, transparent) ──► composite over the sheet ────┼──────┤
assets/*.png   (still) ──► exhibit on the sheet ────────────────────────┘      ▼
                                              FFmpeg: concat + mix (music, SFX, ducking) + subtitles
                                              ──► <id>.<lang>.<quality>.mp4 + .report.json + .receipts.md + .srt/.vtt
```

- **Timing comes from the voice.** Scenes animate on named cues (`[[gate]]` in the script) that resolve to the aligned word times. Retime the narration and every scene follows.
- **The picture explains; the words stay off screen.** One line at the top holds the open question; terms are written onto the objects they name; the narration itself is never shown (the Japanese version burns English subtitles).
- **The chrome is shared.** Grid sheet, breadcrumb and question line are drawn from film-level context, so cuts are invisible and the film reads as one continuous sheet.
- **Every claim has a receipt.** The stage shows each result's claim class; `<film>.receipts.md` lists every claim with its source file.
- Details: [docs/architecture.md](docs/architecture.md).

## Requirements

- Windows 11 (developed there; Linux and macOS should work, but that is untested)
- Node ≥ 22 and pnpm 11
- [uv](https://docs.astral.sh/uv/) (Python environments, created on first use)
- FFmpeg on PATH with libx264 and libass (tested with the gyan.dev 8.1.2 "full" build)
- An NVIDIA GPU with ≥ 6 GB for TTS and alignment (tested on an RTX 4050 Laptop). Rendering itself is CPU and browser work.

## Setup

```bash
pnpm install
pnpm exec playwright install chromium-headless-shell
pnpm video check smoke-test                     # sanity check: validates the tiny fixture project
```

**TTS engines** each live in their own environment. The first `pnpm video audio` prints the setup command for any engine that is missing. Engines are listed in `py/tts/engines.yaml`, and the voices are in `voices/`.

## Quick start

```bash
pnpm video plan opengrad-study-001                            # pacing report (no audio needed)
pnpm video dev opengrad-study-001                             # preview in the browser
pnpm video render opengrad-study-001 --quality draft          # silent drafts on estimated timing
pnpm video audio opengrad-study-001 --lang all                # narration: TTS, alignment, subtitles
pnpm video render opengrad-study-001 --lang all --quality final
```

Outputs land in `build/opengrad-study-001/`. See [docs/render-commands.md](docs/render-commands.md).

## Layout

| Path | What |
|---|---|
| `packages/core` | Schemas, cue parsing, timeline, question line, headline rows, captions (SRT/VTT/ASS), SFX placement, text normalisation |
| `packages/design` | Tokens (colour, type, layout, motion), fonts, `tokens.json` for Python |
| `packages/motion` | Frame context, cues, easing, interpolation, deterministic randomness |
| `packages/kit` | The exhibit vocabulary: sheet, question line, terms, headline, labels, stamps, charts, trays, code panels… |
| `packages/player` | Vite preview app and the render page |
| `packages/render` | Capture (Playwright → FFmpeg), compositor, loudness measurement |
| `packages/cli` | `pnpm video …` |
| `py/manim` | `ogmanim`: the house style for Manim (tokens, fonts, cue timing, Typst math) |
| `py/media` | `vidmedia`: audio prep, alignment and ASR QA, mix, ducking, procedural bed and SFX |
| `py/tts` | One adapter per TTS engine (each in its own venv) |
| `projects/<id>` | A film: `project.yaml`, script, claims, data, scenes |
| `voices/` | Narrator definitions: engine, parameters, provenance |
| `research/` | Framework survey and licence audit, TTS benchmark, reference-video analysis |

## Docs

- [Architecture](docs/architecture.md)
- [Project format](docs/project-format.md)
- [Authoring scenes](docs/scene-authoring.md)
- [Choosing a renderer](docs/renderer-selection.md)
- [Design system (house style)](docs/design-system.md)
- [Audio and TTS](docs/audio-tts.md)
- [Cast: a Live2D presenter, and rendering it fast](docs/cast.md)
- [Commands](docs/render-commands.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Licensing](docs/licensing.md)
- Agents working in this repo: [AGENTS.md](AGENTS.md)

## Tests

```bash
pnpm test && pnpm typecheck                     # TypeScript: core, design, motion
cd py/media && uv run --extra cuda pytest -q    # Python: mix, ducking, bed, SFX
pnpm video check opengrad-study-001             # project integrity: beats, cues, claims, SFX pins, build artefacts
```

Each render also verifies itself: frame counts per scene and per film, the subtitle track, and loudness (−16 LUFS ± 1, true peak ≤ −1 dBTP). The results go into the film's `.report.json`.
