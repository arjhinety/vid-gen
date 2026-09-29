# Cast: a Live2D presenter over the film

A project can have a **presenter**: a rigged 2D character who stands in a lane beside the exhibits, lip-synced to the narration. The first one is Graddy-chan, who teaches the OpenGrad Study 001 lesson (`projects/opengrad-study-001-lesson`). Projects without a `cast` block (the pilot) render exactly as before.

This page covers how the presenter is built into a film, and what we measured while making the render fast enough to use. The speed findings apply to any Live2D model rendered headlessly, so they are written to be reused.

## Setup

`third_party/` is not in the repository. The cast needs two Live2D components there. Rebuilding a rig needs two more tools.

| Folder | What | Where it comes from | Needed for |
|---|---|---|---|
| `third_party/cubism-core/` | Live2D Cubism Core for Web (`live2dcubismcore.min.js` and friends) | The `Core/` folder of the Cubism SDK for Web 5-r.5 (released 2026-04-02), downloaded from Live2D's site after accepting its licence | Drawing any Live2D model |
| `third_party/CubismWebFramework/` | Live2D Cubism Web Framework | `git clone https://github.com/Live2D/CubismWebFramework third_party/CubismWebFramework`, then `git checkout d4da0aa` ("Update to Cubism 5 SDK for Web R5") | Drawing any Live2D model |
| `third_party/psd2live-bin/PSD2Live/` | The PSD2Live 1.4.2 Windows app (source: `github.com/tsunehimatoi/psd2live`) | The app build, unpacked | Rebuilding a rig only |
| `third_party/see-through/` | See-through layer splitter | `git clone https://github.com/shitagaki-lab/see-through third_party/see-through` (we used `a25a549`) | Splitting new art only |

Licences and their conditions are in [licensing.md](licensing.md#characters-the-cast-graddy-chan-and-the-kōhai).

## How it fits into a film

```
narration (build/<id>/<lang>/audio)                     timeline.json (line starts, cues, tones)
        │                                                         │
        ▼                                                         ▼
mouth timings per line  ──────────────►  film track: one parameter set per frame
(packages/cast/live2d/narration.ts)      (packages/cast/live2d/film.ts)
                                                     │
                                                     ▼
                              renderTrack(): headless Chromium + Cubism Web SDK
                              → transparent VP9 WebM, cached by content
                              (packages/cast/tools/live2d-render.ts, packages/cli/src/cast.ts)
                                                     │
scenes (concat) ─────────────────────────────────────┴──► overlay in the compose, before any
                                                          burned subtitles (packages/render/src/compose.ts)
```

- **Declared in `project.yaml`:**

  ```yaml
  cast:
    model: build/cast/live2d/graddy/graddy.model3.json   # repo-relative .model3.json
    box: { x: 1400, y: 216, w: 520, h: 864 }            # where the track sits in the frame (px)
    fit: { height: 0.78, x: 0, y: -0.05 }               # character height as a share of the box; centre (-1..1, y up)
    pace: standard                                      # mouth-flap pace: standard (~6 changes/s) | calm
    seed: 7                                             # blinks and flap variation
  ```

  The scenes keep the lane empty (the lesson's `scenes/shared/layout.ts` ends the stage at `X1 = 1380`; the lane starts at 1420).
- **One track for the whole film.** The character is not drawn per scene. She is one continuous layer, so a scene cut never makes her jump.
- **Cached by content.** The key covers the model files, the cast code and the track itself. Re-rendering a film whose narration did not change reuses the WebM.
- **Draft quality renders at half size**, like the scenes (`QUALITY.draft.scale = 0.5`).

## The mouth

The mouth is a set of drawn chibi shapes (closed, small, ah, oh, laugh), swapped whole on one parameter (`ParamMouthShape`). That is how hand-drawn anime does lip flap (口パク); a realistic, continuously opening mouth looked wrong on a chibi face.

**When the mouth moves** is decided in `packages/cast/live2d/lipsync.ts`:

- Inside speech, a loop of open → half → open → closed runs, holding each drawing 4–7 frames (about 6 changes a second at the `standard` pace).
- A rounded vowel shows "oh"; a held vowel (≥ 200 ms) keeps its shape.
- A real lip closure (m/b/p ≥ 50 ms) closes the mouth.
- Only a pause of ≥ 150 ms stops the flap.
- The mouth leads the sound by one frame.

**Where the timings come from**:

- **English (Kokoro): working.** Kokoro predicts a duration for every phoneme when it speaks. `py/tts/kokoro/timings.py` re-runs that prediction for each line's exact text, voice and direction. It then checks that the predicted total equals the cached WAV's length to the sample, and stops if any line disagrees. All 71 lesson lines and the 62 pilot lines match.
  - The inputs come from the audio build's own records (`qa.json` for the text and direction sent, the `prep-*.json` job for each take's raw WAV, head trim and tempo). A TTS job file is not enough: lines served from the TTS cache leave none.
  - Two corrections were measured on the pilot's lines (2026-09-29):
    - speech starts a median 35 ms before Kokoro's predicted phone start (81 onsets, IQR 20–55 ms);
    - the last phone of a phrase runs on over the trailing silence, so wherever the audio is quiet for ≥ 120 ms the mouth closes.
- **Japanese (Irodori): not yet wired into the film track.** Irodori exposes no per-sound timings. The aligner in `py/mora` (HuBERT phoneme CTC over OpenJTalk phonemes; see its README) produces mora timings from the audio. Connecting it to `narration.ts` is the next step for the Japanese film.

## The rest of the performance

Everything else in the track is a pure function of the timeline (`film.ts`, `motion.ts`):

- **Body:** slow breathing, head and body sway on unrelated periods, and seeded blinks. While talking, a slow sway eases in and out, and she nods at the start of each run of speech and on stressed syllables (at most one every 1.5 s).
- **Head per line:** each line's `tone` (the same word that directs the voice) maps to a small head pose, eased in just before the line and out after it. For example, `curious` tilts one way; `irony` (her teasing) tilts the other; `gravity` lowers the head. The table is `TONE_POSE` in `film.ts`.
- **Smiles:** after a `warm`, `resolve` or `irony` line, in the pause that follows, her eyes switch to the drawn happy arcs (^^). After warm and resolved lines the mouth also switches to the laughing shape. The smile lasts up to 1.1 s (2.5 s after the film's last line), and ends 0.35 s before she speaks again.
- **The viewer's turn:** a `curious` line followed by a pause of ≥ 2.5 s is where the scenes draw a countdown ring. She holds the question face through that pause and looks at the viewer.
- **Glances:** when an exhibit moves (a scene cue, or a cut), she glances toward the stage. There is at most one glance every 6 s, and none during the viewer's turn.

## Rendering speed

The first full-film render ran at **4 frames per second**, which is about 48 minutes for the 6.5-minute lesson. After the changes below, it runs at **18–22 fps at full size** (about 9–11 minutes) and **~59 fps at draft size** (about 3.3 minutes; one test run). The captured pixels are the same as before.

**Measured on:** an Intel i5-13420H (8 cores, 12 threads) with SwiftShader (Chromium's CPU WebGL), a 520×864 canvas, on 2026-09-30. Numbers moved by ±30% between runs as other work loaded the machine, so compare settings back to back. To measure your own machine:

```bash
npx tsx packages/cast/tools/live2d-bench.ts build/cast/live2d/graddy/graddy.model3.json --size 520x864 --browsers 1,3
```

### What we found

| Stage | What we measured | Conclusion |
|---|---|---|
| Drawing the model | Issuing a frame's draw calls: 280–330 fps, SwiftShader or the Intel GPU (ANGLE D3D11). WebGL runs asynchronously, so this is an upper bound | **Not the bottleneck.** The `readPixels` path below waits for the drawing to finish and still reaches 15 fps. A GPU does not help |
| Capturing a frame with `locator.screenshot()` | 4.2–4.6 fps full size; 10–12 fps at 260×432 | **The first bottleneck.** Each screenshot goes through the page compositor and a PNG encode. GPU rendering gave the same 3.9–4.4 fps |
| Capturing with `gl.readPixels` (`__l2d.frame()`) | 14–15 fps full size (15.1 on the Intel GPU), raw RGBA returned as base64 | **3.5× faster.** The browser does the base64 itself (a `data:` URL via `FileReader`), which is far faster than building a string in JS |
| Same pixels? | Alpha identical; opaque pixels identical; edge pixels within 1/255 | Safe to switch. `live2d-bench.ts` re-checks this every run |
| VP9 + alpha encoding (libvpx), from a raw file | `-deadline good -cpu-used 2`: 21.5 fps (one run); `good`/`4`: 13–40 fps (six runs); `realtime`/`8`: 106–116 fps (two runs) | **The second bottleneck, once capture was fixed.** Realtime mode, against the same source, scored SSIM 0.990 / PSNR 38.1 dB vs 0.991 / 38.2 dB for `good`/`4`. The file is ~40% larger (≈ 21 KB a frame at 520×864) |
| Parallel browsers | End to end, full size, realtime VP9: 1 → 13 fps; 3 → 18–22 fps (four runs); 4 → 19 fps; 6 → 15 fps | **3 browsers is the sweet spot here.** Every frame is a pure function of the track plus pre-baked physics, so frames can be drawn in any order, in several separate browser processes. Beyond 3, they compete for the same CPU threads |

### What the renderer does now

`packages/cast/tools/live2d-render.ts`:

1. Bakes physics (hair sway) in one sequential pass.
2. Starts 3 headless Chromium instances, each with its own SwiftShader GPU process.
3. They draw interleaved frames; each frame is read with `gl.readPixels`.
4. FFmpeg receives raw RGBA and flips it (`vflip`: WebGL's rows run bottom to top). It un-premultiplies the alpha (`format=gbrap,unpremultiply=inplace=1`), converts to BT.709 limited-range YUVA, and encodes VP9 with `-deadline realtime -cpu-used 8 -crf 16`.

The same capture path serves the demo tools (`live2d-clip.ts`, `live2d-say.ts`), which composite over the sheet colour instead of keeping the alpha.

### Gotchas

- **Read VP9 alpha with libvpx.** FFmpeg's native VP9 decoder silently drops the alpha plane. Put `-c:v libvpx-vp9` before the `-i` of the WebM; the compose does this through `overlay.inputArgs`.
- **WebGL pixels are premultiplied.** The Cubism renderer blends into a premultiplied buffer. Un-premultiply before encoding, or every soft edge (hair, blush) darkens.
- **Blend in YUV only when both sides use the same matrix.** The WebM is encoded with an explicit `out_color_matrix=bt709:out_range=tv`, the same as the scenes, so the compose overlays in YUV with no conversion. The Manim overlay, whose source is RGB, instead converts both layers to RGB; see [troubleshooting.md](troubleshooting.md).
- **Overlay checks need matching timestamps.** A one-image still overlaid with frame *n* of a video shows nothing, because the overlay filter pairs frames by time. Decode the frame to a PNG first.
- **Never blend between two drawings.** An expression drawn as a separate image (Graddy-chan's eye smile, the mouth shapes) is a switch: any value between its states shows both drawings at once, a ghosted double image. Set it to its states only, and cut between them. We found this by rendering the eye smile at 0, 0.25, 0.5, 0.75 and 1 before using it in the film; do the same for any new expression parameter.
- **Check that a parameter shows.** On Graddy-chan the brow parameters exist but change nothing visible (the brows sit under the fringe), so the track does not use them.
- **More browsers is not always faster.** Re-measure on a machine with more cores before raising `browsers`.

## Commands

```bash
# The film: the cast track renders (or is reused) inside the normal render
pnpm video render opengrad-study-001-lesson --lang en --quality draft

# A clip of narration lines, lip-synced (English), for checking a model
npx tsx packages/cast/tools/live2d-say.ts build/cast/live2d/graddy/graddy.model3.json build/cast/live2d/graddy/say-en.mp4 --project opengrad-study-001 --lines b01#0..b02#0

# A made-up talking clip, and a pose sheet
npx tsx packages/cast/tools/live2d-clip.ts <model3.json> <out.mp4> [--seconds 8] [--pace standard|calm]
npx tsx packages/cast/tools/live2d-poses.ts <model3.json> <out-dir>

# Rendering speed on this machine
npx tsx packages/cast/tools/live2d-bench.ts <model3.json> [--size 520x864] [--frames 90] [--browsers 1,3]
```

## Making a character (outline)

The Graddy-chan model was made in these steps. The scripts record every edit, so the rig can be rebuilt:

1. **Painted art** (Codex CLI image generation): the base design, plus edits with the eyes closed and with each drawn mouth shape.
2. **Layer split:** See-through (`third_party/see-through`) splits the illustration into named, inpainted layers.
3. **Clean-up:** `py/cast/psd_prep.py` reconciles the layers with the original painting and adds the mouth-shape layers.
4. **Rig:** PSD2Live auto-rigs the PSD. Then `py/cast/rig_graddy.py` applies the edits through PSD2Live's MCP (blink, iris masks, and the mouth-shape switch) and exports the `.moc3` model.

Licences for each tool are in [licensing.md](licensing.md#characters-the-cast-graddy-chan-and-the-kōhai). **The rigged model files currently live in `build/` (gitignored)**; a published repository needs them somewhere versioned.
