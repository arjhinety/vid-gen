# Troubleshooting

Problems we actually hit on Windows 11 with an RTX 4050 Laptop (6 GB), and how they were resolved.

## Setup

| Symptom | Cause | Fix |
|---|---|---|
| `pnpm install` warns that build scripts were ignored; Vite fails on esbuild | pnpm 11 blocks install scripts | Allowlisted in `pnpm-workspace.yaml` → `allowBuilds: { esbuild: true }` |
| `TTS engine 'x' is not installed` | Each TTS engine has its own venv (torch and CUDA pins differ) | Run the `setup` command printed by the error (from `py/tts/engines.yaml`) |
| `vidmedia … failed` naming cuBLAS / cuDNN | faster-whisper needs CUDA 12 runtime DLLs | The CLI runs `uv run --extra cuda`, which installs `nvidia-cublas-cu12` and `nvidia-cudnn-cu12`. Without a GPU, alignment falls back to CPU int8 |
| `UnicodeEncodeError` from a Python tool | The Windows console code page is not UTF-8 | The CLI sets `PYTHONIOENCODING=utf-8` for every child. Do the same when running a tool by hand |
| `Fontconfig error: Cannot load default config file`, then a crash, from `ffmpeg … drawtext` | The gyan build has no fontconfig config | We never use `drawtext`: text is rendered by the browser or by libass with an explicit `fontsdir` |

## Rendering

| Symptom | Cause | Fix |
|---|---|---|
| A scene doesn't change after an edit | Its cache key didn't include what you edited | Keys cover scene code, `packages/*/src`, tokens, project data, film context (neighbouring section, question line and headline), and the renderer code. For anything outside those, use `--force` |
| Frames differ between preview and render | The scene reads time from a clock | See the rules in [scene-authoring.md](scene-authoring.md#web-scenes-scenesfootsx): no timers, CSS transitions or `Math.random()` |
| Blank or partly loaded first frames | An async resource wasn't tracked | Load it with `useResource()`, so the capture waits for it |
| Manim scene is 21 frames long | It picked up a file from `partial_movie_files` | Fixed: the CLI now takes `<Class>.mov` from the scene's media folder only |
| Manim warns about frame drift | Waits and animations don't add up to the timed scene length | Use `wait_until(cue)`, `fit()` and `finish()`. Don't pad with `wait(n)` |
| Manim exhibit looks shifted in colour against the sheet | BT.601/709 mismatch when overlaying YUV sources | The composite converts both layers to RGB (`gbrp`/`gbrap`) with explicit BT.709 in and out. Keep that filter chain |
| Small Manim text has gaps ("8 w orked") | Pango rounds advances at small `font_size` | Fixed in `ogmanim.text()`: text is laid out at 4× and scaled down. Always use `text()`, never raw `Text()` |
| Glyphs such as ● ◐ ◌ show as boxes in Manim | Pango font fallback on Windows | Use `claim_glyph(kind)`, which draws them as shapes |
| The presenter is missing from the film, or has a black box around her | FFmpeg's native VP9 decoder drops the alpha plane | Decode the cast WebM with `-c:v libvpx-vp9` before its `-i` (the compose does). See [cast.md](cast.md#gotchas) |
| The cast track renders at ~4 fps | Frames captured with page screenshots | `renderTrack()` reads `gl.readPixels` through `__l2d.frame()` and uses 3 browsers. Measure with `packages/cast/tools/live2d-bench.ts` ([cast.md](cast.md#rendering-speed)) |
| Burned subtitles are smaller than the preview | ASS `Fontsize` is the font's Windows ascent+descent box, not its em | `subtitleStyle()` multiplies by 1.51 for Archivo. Recompute this if you change the subtitle font |

## Audio

| Symptom | Cause | Fix |
|---|---|---|
| `N line(s) above CER …; re-synthesising` | The ASR round-trip didn't match the script (a mispronunciation or a dropped word) | This is automatic (two retries with new seeds). Anything still above the limit is listed in `build/<id>/<lang>/audio/qa.json`: listen to it, then add a lexicon entry or a `say_en` / `say_ja` override |
| A number or acronym is read wrongly | The normaliser or engine front-end guessed | Add a `script/lexicon.yaml` entry (e.g. `DPO: "D P O"`), or set `say_*` on the line |
| Out of memory on the GPU | Two GPU jobs at once, or another app holding VRAM | Engines run one at a time. Close apps that use the GPU. Irodori in bf16 reserves ~5.2 GB per sentence |
| Free RAM drops to ~2 GB during JA narration | The Irodori process commits ~11 GB of host memory (flat across the run, not a leak) | Expected on a 16 GB laptop; close memory-heavy apps if the machine pages. Cached lines skip the engine on re-runs |
| Film loudness outside −16 ± 1 LU in the report | The music or SFX gain pushed the mix | Lower `audio.music.gain_db` or the SFX `gain_db`. The voice bus is normalised first; peaks are limited to −2.0 dBFS sample peak |
| Headline words out of sync in the JA film | JA word times are *proportional*: the headline is English, the speech Japanese | Expected, and one reason long films turn the headline off and burn sentence-sized English subtitles instead |

## Draft films before narration exists

`render` works before `audio` has run: it uses **estimated** timing (`SPEECH_RATE` in `packages/core/src/estimate.ts`: 2.55 words/s EN plus 0.15 s per comma, 7.0 chars/s JA) and produces a silent film with estimated subtitles. The report carries a warning. Use these drafts for layout and pacing only; cue times move once real narration exists.
