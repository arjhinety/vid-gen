# Commands

Everything runs through one CLI: `pnpm video <command>`. Run `pnpm video help` to list the commands.

| Command | What it does | Typical time (RTX 4050 laptop) |
|---|---|---|
| `pnpm video check <project>` | Validates specs, references, claims, cue parity, and (if built) timeline tiling, captions and audio | 2–5 s |
| `pnpm video plan <project> [--lang en]` | Pacing report: seconds per scene, lines, headline rows, wpm, speech share | 2 s |
| `pnpm video dev <project>` | Preview server: scrub, play with narration, cue ticks, captions (`c`), guides (`g`) | instant |
| `pnpm video still <project> <scene> --at cue:name+30,2.5s,end` | Exact frames to PNG (web and still scenes) | 5–10 s |
| `pnpm video scene <project> <scene> [--lang en] [--quality draft\|final] [--force]` | Renders one scene (cached by content hash) | web 5–30 s draft; manim 60–100 s |
| `pnpm video audio <project> [--lang en\|ja\|all] [--force]` | Runs TTS → prep → alignment → retry on bad ASR round-trip → timeline, subtitles, narration mix | ~1–3 min per language (5 min film) |
| `pnpm video render <project> [--lang all] [--quality draft\|final]` | Renders every scene, mixes, writes subtitles, does the delivery encode, verifies, and writes a report | see below |
| `pnpm test` / `pnpm typecheck` | Vitest (core, motion, design) and `tsc`; `cd py/media && uv run pytest` for the Python side | < 10 s |

## Draft vs final

| | Draft | Final |
|---|---|---|
| Size | 960×540 | 1920×1080 |
| Scene encode | x264 veryfast, CRF 26 | x264 medium, CRF 14 (mezzanine) |
| Delivery encode | veryfast, CRF 24 | slow, CRF 17, `tune animation`, `aq-mode 3` |
| Web capture (measured, pilot) | 36–57 fps (JPEG q80) | 21–42 fps, typically ~30 (JPEG q95) |

Measured on the pilot (RTX 4050 laptop, 16 GB): the English film (8,029 frames) took about 4 min at draft (2 of 11 scenes cached) and 6.7 min at final (5.4 min of scenes including both Manim scenes, 74 s delivery encode). Re-renders only touch scenes whose code, timing or headline context changed. A full final render of both languages needs several GB of free RAM (Chromium pages + FFmpeg + Manim); on this 16 GB machine with other apps open, one was stopped for low memory.

## Typical loop

```bash
pnpm video check opengrad-study-001
pnpm video plan opengrad-study-001                      # pacing before any audio exists
pnpm video still opengrad-study-001 training --at cue:gate+30
pnpm video render opengrad-study-001 --quality draft    # silent films on estimated timing
pnpm video audio opengrad-study-001                     # narration (GPU)
pnpm video render opengrad-study-001 --quality final
```

Each film's `.report.json` records:

- the expected and actual frame counts
- the size
- per-scene frames
- integrated loudness and true peak
- the subtitle tracks and sidecars
- any warnings

Treat warnings as failures before publishing.
