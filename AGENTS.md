# Working in this repo (agents and humans)

The repo builds research videos from code. Read [README.md](README.md) first, then the doc for your task:

- [scene-authoring.md](docs/scene-authoring.md) for scenes
- [project-format.md](docs/project-format.md) for scripts and projects
- [audio-tts.md](docs/audio-tts.md) for voices

## Non-negotiables

1. **Never invent a result.** Every number, quote or code excerpt on screen or in narration must come from the research repo at the pinned commit:
   - **Numbers** go through `data/extract.py` → `data/*.json` (each value has a `src`) → `scenes/shared/data.ts`.
   - **Claims** carry a claim id that exists in `sources/claims*.yaml`, with the right class: measured, author-interpretation, hypothesis, limitation, speculation, or design.
   - **If you can't find the source, say so.** Don't paraphrase it into existence.
2. **Show what is not measured as not measured.**
   - Metaphors carry the dashed "not measured" flag.
   - Illustrative layouts say "illustrative".
   - Two evaluation sets are never put on one axis.
3. **No paid APIs and no cloud rendering.** Anything added to the default path must be OSI-licensed and run locally. Custom-licensed frameworks (Remotion, GSAP…) may only be optional adapters. Record every new dependency, with its licence and the reason for it, in `docs/licensing.md`.
4. **No real person's voice.** Narrators are synthetic and designed from text; each `voices/*.yaml` records its provenance. Keep the TTS watermarks.
5. **Every scene is deterministic.** Web scenes are a pure function of the frame: no timers, CSS transitions or `Math.random()`. Manim scenes only wait with `wait_until(cue)` and end with `finish()`.
6. **Keep the house style.** It is specified in [design-system.md](docs/design-system.md). A scene draws one exhibit on the stage (below the question line); the sheet, breadcrumb, question line and headline are not yours to draw. Never put the narration on screen as text in a long film; put terms on the objects they name. One crimson idea per exhibit.

## Workflow

```bash
pnpm video check <project>          # after any spec, script or claims edit
pnpm video still <project> <scene> --at cue:a,cue:b,end    # look at every cue before rendering
pnpm typecheck && pnpm test         # after any package edit
cd py/media && uv run --extra cuda pytest -q   # after any vidmedia edit
```

- **Inspect your output.** Extract frames around every cue and every cut, and read them critically: collisions, overflow, stranded words, colour meaning, provenance present. A passing test says nothing about how a frame looks.
- **Report plainly.** Report what failed, what you did not check, and what is estimated rather than measured (e.g. timing before `video audio` has run).
- **Don't commit or push** unless asked.

## Gotchas

- **Film context is in the cache keys.** Scene caches include the neighbouring section, question line and headline, so editing one line of narration or one question re-renders the scenes around it. That is expected. New shared chrome must be added to `filmContextKey` (`packages/cli/src/commands.ts`), or scenes will render stale from cache.
- **Manim text:** always use `ogmanim.text()`, which oversamples to fix Pango kerning. Draw claim glyphs with `claim_glyph()`, never as font characters.
- **Python output:** set `PYTHONIOENCODING=utf-8` when running Python tools by hand on Windows.
- **Loudness:** the report checks it. If you change music or SFX levels, check `integratedLufs` and `truePeakDbtp` in the film's `.report.json`.
