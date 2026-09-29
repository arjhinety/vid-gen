# Framework survey: engines for local, code-driven ML research videos

Phase-0 technology research, **as of 2026-09-28**.
Target machine: Windows 11, RTX 4050 Laptop (6 GB), i5-13420H (12 threads), 16 GB RAM, Node 24.19, pnpm 11, Python 3.12 + uv, FFmpeg 8.1.2 (gyan "full" build). Manim CE 0.21.0 is installed as a uv tool. No TeX Live or MiKTeX is installed, but **Tectonic 0.17.0, poppler and ImageMagick are present via scoop**.

The companion license table is in [`license-audit.md`](./license-audit.md).

**How this was checked.** Versions, dates, stars and licenses come from the GitHub API (`gh api`), the npm registry and PyPI on 2026-09-28. Where a claim depends on implementation details, I read the upstream source: HyperFrames engine and CLI, the Remotion renderer, `@shikijs/magic-move`, the Typst SVG exporter, and the installed Manim 0.21.0. I also ran two local experiments, using only binaries that were already installed:
1. A raw Chrome DevTools Protocol (CDP) capture benchmark and a `beginFrame` probe against the Playwright-cached `chrome-headless-shell` 151 (Q1).
2. A Manim `SVGMobject` import of `<symbol>`/`<use>` SVG, the structure that Typst and MathJax emit (Q3).

The scripts lived in the session scratchpad and are not part of the repo. Anything I could not verify is marked **UNVERIFIED**.

---

## 0. Recommendation in one screen

- **Engines (three, complementary):**
  1. **HyperFrames** (Apache-2.0): the open core for web motion graphics, meaning HTML/SVG/Canvas/Three.js rendered by frame-seek and captured by headless Chrome.
  2. **Manim Community Edition 0.21** (MIT): math sequences. Its new `MathTypst` mobject needs no LaTeX. `MathTex` stays an optional path through TinyTeX or MiKTeX.
  3. **FFmpeg** (a local GPL build is fine): compositing, audio mixing and final encoding.
- **Libraries used inside the web engine (not separate engines):**
  - MathJax 4 for TeX to SVG, in Node with no browser. KaTeX is optional for fast HTML math.
  - Shiki, plus `@shikijs/magic-move/core` for token diffing, with **our own progress-driven renderer**.
  - D3 modules (scale, shape, interpolate) for charts.
  - Vanilla Three.js for occasional 3D.
- **Keep the web core replaceable:**
  - Author compositions as framework-free HTML/SVG/Canvas whose state is a pure function of `t`. They hook into HyperFrames through its `FrameAdapter` / `hf-seek` contract.
  - Keep a ~200-line raw-CDP or Playwright capture harness as a conformance/fallback renderer. This session's benchmark shows the approach works on this machine.
  - **Do not use GSAP in core components.** Its license is free but not OSI-approved (§2.1).
- **Optional adapters:**
  - Remotion. Its license is custom but free for us today; allowed as an adapter only.
  - Typst CLI (equation SVGs).
  - matplotlib (static figures).
  - Manim Slides / Slidev (secondary presentation output).
  - VHS (real terminal recordings).
  - Penrose (static math diagrams).
- **Reject:**
  - Motion Canvas: no official headless render; development has stalled.
  - Revideo: upstream lags its closed Midrender fork.
  - Theatre.js: stale, and its studio is AGPL.
  - Lottie as an authoring path.
  - ManimGL as the math engine.
  - asciinema/agg: no Windows support, GIF-only output.
  - Code Hike outside a Remotion adapter.
  - Twick, Editframe and Rendervid: source-available/custom licenses.
  - React Three Fiber, unless we adopt React anyway.

---

## 1. The six specific technical questions

### Q1. Headless Chromium frame capture on Windows

**Is `HeadlessExperimental.beginFrame` Linux-only? No, it is available on Windows.**
- The CDP protocol definition says `Target.createTarget.enableBeginFrameControl` is *"headless shell only, not supported on MacOS yet"* ([Target.pdl](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/Target.pdl), [HeadlessExperimental.pdl](https://github.com/ChromeDevTools/devtools-protocol/blob/master/pdl/domains/HeadlessExperimental.pdl)). The restriction is to macOS, not Windows.
- **Verified locally.** I launched `chrome-headless-shell` 151.0.7922.34 (Playwright cache) and 151.0.7922.47 (Puppeteer cache) with `--enable-begin-frame-control --deterministic-mode --run-all-compositor-stages-before-draw …`. A beginFrame issued with a `screenshot` parameter returned PNG data on the first attempt, with the GPU (D3D11), with SwiftShader, and with `--disable-gpu`.
- **Caveats found:**
  - `frameTimeTicks` must be strictly monotonic. Reusing old ticks hangs the call until timeout.
  - With **2 or more begin-frame-controlled targets in one browser process**, `beginFrame` returned `hasDamage=false` and no screenshot. Parallel beginFrame capture therefore probably needs one browser process per worker. That multi-process fix is **UNVERIFIED**.
- The "Linux-only" story is a **framework policy, not a Chrome limitation**.
  - HyperFrames' docs describe *"BeginFrame mode (Linux + `chrome-headless-shell`)"* vs *"Screenshot mode (macOS, Windows, and as an automatic fallback)"* ([hyperframes-vs-remotion.mdx](https://github.com/heygen-com/hyperframes/blob/main/docs/guides/hyperframes-vs-remotion.mdx)). The [HeyGen research post](https://www.heygen.com/research/html-to-video) calls the macOS/Windows fallback "less robust but functional".
  - A search-indexed third-party write-up attributes the fallback to Chrome on those platforms "crash[ing] under --deterministic-mode". I could not open it (x.com returned 402), so that reason is **UNVERIFIED**.
  - No crash occurred in this session's short tests. Long-render stability on Windows is **UNVERIFIED**.

**What does HyperFrames use on Windows? `Page.captureScreenshot`, or an experimental `drawElement` path; not BeginFrame.**
- Source: `requestedCaptureMode = headlessShell && process.platform === "linux" && !forceScreenshot && beginFrameControlEnabled ? "beginframe" : "screenshot"` ([browserManager.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/engine/src/services/browserManager.ts)).
- On macOS and Windows with a hardware GPU, a default-on "drawElement" fast path is used. It is `canvas.drawElementImage` behind `--enable-features=CanvasDrawElement`, measured at *"~46% faster than Page.captureScreenshot"*. It was opened on win32 on 2026-07-27, and the kill switch is `PRODUCER_EXPERIMENTAL_FAST_CAPTURE=false` ([config.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/engine/src/config.ts), [drawElementService.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/engine/src/services/drawElementService.ts)).
- On Windows, multi-worker capture writes frames to disk unless `HF_CAPTURE_PARALLEL_STREAM=true` is set ([docs/packages/cli.mdx](https://github.com/heygen-com/hyperframes/blob/main/docs/packages/cli.mdx)).

**What does Remotion use on Windows? `Page.captureScreenshot` on every platform.** The call uses `optimizeForSpeed: true`, `captureBeyondViewport: true` and `fromSurface`, and Remotion launches `chrome-headless-shell` ([screenshot-task.ts](https://github.com/remotion-dev/remotion/blob/main/packages/renderer/src/screenshot-task.ts), [BrowserFetcher.ts](https://github.com/remotion-dev/remotion/blob/main/packages/renderer/src/browser/BrowserFetcher.ts)). Frame readiness is signalled from the page (`remotion_renderReady`); it does not use virtual time.

**Throughput measured on this laptop.** Setup:
- Raw CDP over the WebSocket, 1920×1080 at DPR 1, headless shell 151, D3D11 GPU.
- Each frame is `Runtime.evaluate(seek(t))` followed by capture; base64 decoding is included, encoding is not.
- "Heavy" scene: 400 SVG circles, a 90-point path and a text transform, all updated per frame. "Light" scene: 20 circles.

| mode / format | 1 page | 2 pages | 4 pages | 6 pages | avg frame size |
|---|---|---|---|---|---|
| screenshot JPEG q90 (heavy) | 11.2 fps (89 ms/frame) | 16.7 fps | 19.7 fps | 23.7 fps | 205 KB |
| screenshot PNG (heavy) | 7.4 fps (136 ms) | 10.3 fps | 18.1 fps | 15.7 fps | 309 KB |
| screenshot JPEG q90 (light) | 10.5 fps (96 ms) | – | 21.6 fps | – | 90 KB |
| screenshot PNG (light) | 8.7 fps (116 ms) | – | 19.9 fps | – | 125 KB |
| beginFrame PNG (heavy / light) | 11.5 / 11.9 fps (87 / 84 ms) | fails (see caveat) | fails | fails | 309 KB |

How to read these numbers:
- **The per-frame cost is dominated by a fixed ~85–135 ms readback and encode at 1080p, not by scene complexity.** The light scene is barely faster than the heavy one.
- **JPEG is about 20–35% faster than PNG and smaller.** JPEG has no alpha channel, so alpha layers need PNG.
- **Parallel pages in one browser scale sub-linearly:** about 1.8–2× at 4 pages, and little gain beyond that on a 12-thread laptop. PNG at 6 pages was slower than at 4.
- One cold first run measured 228 ms/frame, so expect ±2× variance with thermals and power state.
- **Estimate:** at ~20 fps aggregate, a 10-minute 1080p30 video (18,000 frames) takes about 15 minutes to capture. A single page takes about 27 minutes.
- Playwright's `page.screenshot` in Chromium goes through the same CDP `Page.captureScreenshot` call. Its throughput should therefore be similar, plus Playwright overhead (**UNVERIFIED**; not measured with Playwright itself).

**Determinism observed:**
- SHA-256 hashes of frames 0 and N were **identical across every run, across screenshot and beginFrame modes, and across 1–6 parallel pages** (same format).
- The **SwiftShader render produced different bytes** from the GPU render. Byte-exactness therefore holds per machine, GPU backend and Chrome version, not across machines.
- HyperFrames says the same thing and recommends `--docker` for cross-machine exactness ([determinism.mdx](https://github.com/heygen-com/hyperframes/blob/main/docs/concepts/determinism.mdx)).

### Q2. Can Three.js / React Three Fiber be driven deterministically per frame? Yes.
- **R3F:** with `frameloop="never"`, calling `advance(timestamp)` sets `clock.elapsedTime = timestamp`, runs `useFrame` subscribers with `delta = timestamp - previous`, and renders once ([loop.ts](https://github.com/pmndrs/react-three-fiber/blob/master/packages/fiber/src/core/loop.ts), via Context7).
- **Remotion** relies on this: `<ThreeCanvas>` forces `frameloop='never'` during rendering and forbids `useFrame` in favour of `useCurrentFrame()` ([three-canvas docs](https://www.remotion.dev/docs/three-canvas)).
- **Vanilla Three.js:** compute state from `t` and call `renderer.render(scene, camera)` inside the seek handler. Use `AnimationMixer.setTime(t)` for glTF clips.
- **HyperFrames** ships a Three.js adapter that dispatches a synchronous `hf-seek` CustomEvent with `waitUntil()` for asynchronous work. It also hooks `THREE.DefaultLoadingManager` so capture waits for assets ([adapters/three.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/core/src/runtime/adapters/three.ts), [seek-dispatch.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/core/src/runtime/adapters/seek-dispatch.ts)).
- **Remaining nondeterminism sources:**
  - Unseeded `Math.random`.
  - Physics integrated with variable `dt`. Step with a fixed `dt` from 0, or precompute.
  - `Clock`/`performance.now()` use.
  - Asynchronous texture or shader compilation that finishes after capture.
  - MSAA and precision differences between GPUs or drivers, and hardware vs SwiftShader.
  - Capturing a WebGL canvas outside the task that drew it. Render synchronously in the seek, or set `preserveDrawingBuffer: true`.
- Playwright's `page.clock.install()` fakes `Date`, timers, `requestAnimationFrame`, `requestIdleCallback` and `performance` ([Clock API](https://playwright.dev/docs/api/class-clock)). This is a useful guard for third-party code, but it does **not** control CSS/WAAPI animations or the compositor.

### Q3. Manim CE on Windows via uv
- **Version:** 0.21.0, released 2026-08-10; requires Python ≥3.11 and supports 3.11–3.14 ([PyPI](https://pypi.org/project/manim/)). The local uv tool runs 0.21.0 on CPython 3.11.15 with pycairo 1.29.1, manimpango 0.6.1, PyAV 18.1.0 and moderngl 5.12.
- **Wheels:** PyPI has win_amd64 cp312 wheels for pycairo 1.29.1 (2026-08-07) and manimpango 0.6.1 (2025-10-23), so no compiler is needed.
- **Transparent output (`-t`):** this gives **`.mov` with QuickTime Animation (`qtrle`, `argb`)**, not ProRes 4444. With `--format webm` it gives **VP9 `yuva420p`**, and `--format png` gives an RGBA PNG sequence. This comes from the installed `scene_file_writer.py`: `if config.transparent: codec "qtrle", pix_fmt "argb"`. qtrle is lossless and large; transcode with FFmpeg if ProRes 4444 is wanted.
- **LaTeX requirement:** `Tex`/`MathTex` need a `latex` binary **plus `dvisvgm`** ([uv install docs](https://docs.manim.community/en/stable/installation/uv.html)).
  - The docs recommend MiKTeX on Windows. MiKTeX 25.12 has a 142 MB basic installer and auto-installs missing packages on the fly ([miktex.org](https://miktex.org/download)).
  - TinyTeX is the alternative. `TinyTeX-1-windows.exe` is 70 MB and the default TinyTeX is 165 MB ([tinytex-releases](https://github.com/rstudio/tinytex-releases/releases)). Its default package list lacks `dvisvgm`, `standalone`, `preview` and others ([pkgs-custom.txt](https://github.com/rstudio/tinytex/blob/main/tools/pkgs-custom.txt)), so `tlmgr install` the ~30 packages Manim lists. Non-R users get no automatic missing-package install ([yihui.org/tinytex](https://yihui.org/tinytex/)).
  - The locally installed Tectonic produces PDF/XDV but ships no `dvisvgm`, so it does not plug into `MathTex` directly. Tectonic PDF followed by poppler `pdftocairo -svg` and `SVGMobject` is a possible no-TeX-Live path (**UNVERIFIED**; untested).
- **No-LaTeX path: now first-class.** Manim 0.21 added **`Typst` and `MathTypst`** mobjects. They compile through the `typst` Python package (≥0.14; typst-py 0.15.0 has an abi3 win_amd64 wheel) straight to SVG, then import through `SVGMobject` ([0.21.0 changelog](https://docs.manim.community/en/stable/changelog/0.21.0-changelog.html), [typst_mobject reference](https://docs.manim.community/en/stable/reference/manim.mobject.text.typst_mobject.html)).
  - `MathTypst` supports `{{ … }}` / `{{ … : label }}` grouping and `.select(label)`.
  - The extra is not installed in the local uv tool yet; enabling it is `uv tool install "manim[typst]"`.
- **SVG import from MathJax or the Typst CLI also works.** Typst's SVG exporter writes glyphs as `<symbol><path>` plus `<use>` ([typst-svg text.rs](https://github.com/typst/typst/blob/main/crates/typst-svg/src/text.rs)). MathJax SVG uses `<use>` unless `fontCache: 'none'` is set. I verified locally that the installed Manim `SVGMobject` resolves `<symbol>`/`<use>` (both `href` and `xlink:href`) and nested transforms: a 3-glyph test SVG gave 3 filled submobjects.
- **What is lost without `MathTex`:**
  - `TransformMatchingTex`, which keys on the `tex_string` attribute that `MathTypst` does not have (installed `transform_matching_parts.py`).
  - `get_part_by_tex` / `set_color_by_tex` substring APIs.
  - TeX-specific packages and macros.
  - Byte-identical 3b1b-style glyph metrics.
- **Replacements:** `TransformMatchingShapes` (shape-hash matching); `ReplacementTransform(a.select("lhs"), b.select("lhs"))` on labeled groups; `track_baselines=True` for alignment.
- Manim 0.20 rewrote `MathTex` for robustness and added `--seed` for reproducible randomness ([0.20.0 changelog](https://docs.manim.community/en/stable/changelog/0.20.0-changelog.html)).

### Q4. HyperFrames
- **License:** Apache-2.0 (repo `LICENSE`; the CLI `package.json` says `Apache-2.0`). The `engine`, `producer` and `core` package.json files omit the `license` field, which is only a hygiene issue since the repo license covers them. It is OSI-approved with no usage thresholds.
- **Maturity:**
  - Created 2026-03-10.
  - 53.7k stars, 4.9k forks, 68 contributors (top 3: 2173, 1122 and 922 commits).
  - **Over 200 releases in 6.5 months**; v0.8.82 was released on 2026-09-28, and five releases shipped in the last three days.
  - 46 open issues, 200 open PRs, 74 issues opened in the last 30 days (GitHub API).
  - Pre-1.0: the `FrameAdapter` interface is labelled *"experimental v0 API"* ([frame-adapters.mdx](https://github.com/heygen-com/hyperframes/blob/main/docs/concepts/frame-adapters.mdx)).
- **GSAP is not mandatory.** `gsap` is only a devDependency of `@hyperframes/core`. Runtime adapters exist for **GSAP, CSS, WAAPI, anime.js, Lottie, Three.js, TypeGPU, D3** and map libraries ([adapters dir](https://github.com/heygen-com/hyperframes/tree/main/packages/core/src/runtime/adapters)). The docs and catalog are GSAP-first ("the normal authoring path").
- **Composition model:**
  - Plain HTML/CSS/JS files. SVG and Canvas are native; Three.js goes through its adapter.
  - React is not first-class. The docs frame it as "HTML file vs React component", and the Remotion-port skill refuses `useState`/`useEffect` state machines ([hyperframes-vs-remotion.mdx](https://github.com/heygen-com/hyperframes/blob/main/docs/guides/hyperframes-vs-remotion.mdx)). A bundled React app inside a composition should still work if it is seekable (**UNVERIFIED**).
- **Rendering:**
  - Puppeteer 25 plus `chrome-headless-shell`, and system FFmpeg (Node ≥22).
  - The time rule is `time = floor(frame)/fps`, and every animation is seeked, never played.
  - No `Date.now`, unseeded randomness or mid-render fetch is allowed.
  - Google Fonts are inlined as base64 `@fontsource` copies, and video is pre-extracted to frames ([determinism.mdx](https://github.com/heygen-com/hyperframes/blob/main/docs/concepts/determinism.mdx), [research post](https://www.heygen.com/research/html-to-video)).
  - BeginFrame runs only on Linux; Windows uses screenshot or drawElement (Q1).
  - A known silent fallback from BeginFrame to screenshot with 6+ GPU workers ([issue #4584](https://github.com/heygen-com/hyperframes/issues/4584), 2026-09-27) led to a `--require-beginframe` PR (#4585).
- **Windows:**
  - Supported and heavily used. The source cites *"~206k non-CI hardware-GPU Windows renders / 30d"* and carries several win32-specific workarounds (a streaming-encode auto-disable, EOF-vs-EPIPE pipe handling) ([config.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/engine/src/config.ts)).
  - Byte-exact reproducibility across machines requires `--docker`. Docker Desktop is free for personal use and for companies with fewer than 250 employees and under $10M revenue ([Docker](https://docs.docker.com/subscription/desktop-license/)); Podman is an alternative (**UNVERIFIED** that HyperFrames supports it).
- **Outputs:** MP4 (H.264/H.265), **WebM VP9 with alpha**, **MOV ProRes 4444 (`prores_ks`, `yuva444p10le`)**, PNG sequence, GIF and HLS ([chunkEncoder.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/engine/src/services/chunkEncoder.ts), [rendering.mdx](https://github.com/heygen-com/hyperframes/blob/main/docs/guides/rendering.mdx)).
- **Bundled media helpers:**
  - `hyperframes tts` uses **Kokoro-82M** through `kokoro-onnx`, pip-installed, with the model downloaded from the kokoro-onnx GitHub release.
  - The voice-provider order is **HeyGen (cloud) → ElevenLabs (cloud) → Kokoro (local)**, so it must be forced local.
  - `hyperframes transcribe` uses **whisper.cpp** (`whisper-cli`; on Windows you must supply the binary or build it with cmake and a C compiler; `small.en` by default) or **NVIDIA Parakeet TDT 0.6B v3** (int8, ~640 MB, **CC-BY-4.0**) via sherpa-onnx, which runs on Windows x64 ([cli.mdx](https://github.com/heygen-com/hyperframes/blob/main/docs/packages/cli.mdx), [tts.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/cli/src/commands/tts.ts), [transcribe.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/cli/src/commands/transcribe.ts), [providers.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/cli/src/audio/providers.ts)).
- **Telemetry:** PostHog, **on by default**. Opt out with `HYPERFRAMES_NO_TELEMETRY=1`, `DO_NOT_TRACK=1` or `hyperframes telemetry disable` ([policy.ts](https://github.com/heygen-com/hyperframes/blob/main/packages/cli/src/telemetry/policy.ts)).
- **Agent skills:** `npx skills add heygen-com/hyperframes` (21 skills, Apache-2.0) or `claude plugin marketplace add heygen-com/hyperframes` ([README](https://github.com/heygen-com/hyperframes)). The hosted HyperFrames MCP's `compose`/`render_video` tools are disabled for local CLI agents, which are pointed to the local skills instead.

### Q5. Motion Canvas vs Revideo in 2026
- **Motion Canvas** (MIT):
  - The last npm release is **3.17.2 (2024-12-14)**; GitHub has 3.18.0-alpha.0 (2025-02-16).
  - **One commit since February 2025** (a docs domain change, 2026-07-02). The site was down in July 2026 ([#1225](https://github.com/motion-canvas/motion-canvas/issues/1225)), and there is an open "depends on an unsupported dependency" issue ([#1233](https://github.com/motion-canvas/motion-canvas/issues/1233)).
  - **There is still no official headless or CLI render.** Rendering is triggered from the Vite editor UI ([#415](https://github.com/motion-canvas/motion-canvas/issues/415), open since 2023; [#1218](https://github.com/motion-canvas/motion-canvas/issues/1218); a draft PR from 2024 is unmerged).
  - Verdict: stagnant; reject.
- **Revideo** (MIT; the repo moved to `midrender/revideo`):
  - Headless `renderVideo()` works; 0.11.0 was released 2026-07-10, including a fix to *"decouple editor plugin injection from core so headless renders work"*.
  - The team says *"Revideo's animation engine continues to be developed as part of Midrender… recent changes have not yet been upstreamed to the open-source repository"* ([midrender.com/revideo](https://midrender.com/revideo)).
  - PostHog telemetry is disabled with `DISABLE_TELEMETRY=true` ([README](https://github.com/midrender/revideo/blob/main/README.md)).
  - Windows rendering is **UNVERIFIED**.
  - Verdict: usable but strategically orphaned; reject as core.

### Q6. Can Shiki Magic Move be driven by an explicit progress value?
- **Not with the stock renderer.** `shikijs/shiki-magic-move` is **archived**; the code now lives in the Shiki monorepo as **`@shikijs/magic-move` 4.4.3** (2026-08-10, MIT).
- `MagicMoveRenderer` does FLIP with **wall-clock CSS transitions**. It sets `--smm-duration`, forces reflow and waits on `el.getAnimations()…finished` ([renderer.ts](https://github.com/shikijs/shiki/blob/main/packages/magic-move/src/renderer.ts)). There is no progress API.
- Pausing the resulting CSS transitions and setting `currentTime` (HyperFrames' CSS/WAAPI adapters, or the CDP `Animation` domain) could work. It is fragile, though: the FLIP start state is measured at trigger time, so random-order seeks would need the step re-triggered.
- **The deterministic route** is to use **`@shikijs/magic-move/core`** (`codeToKeyedTokens`, `syncTokenKeys`, `createMagicMoveMachine`). It gives token lists with stable keys across two code states. Lay the tokens out ourselves (monospace grid), then compute position, opacity and color as a pure function of `p ∈ [0,1]` per key. This is about 150–250 lines and fits the `seek(t)` contract.
- **Code Hike** already has a progress-driven design: `getStartingSnapshot` + `calculateTransitions` + `applyStyle({progress})`. The official Remotion template drives it from `useCurrentFrame()` ([template-code-hike CodeTransition.tsx](https://github.com/remotion-dev/template-code-hike/blob/main/src/CodeTransition.tsx)). However, it is React-only and its default path uses WAAPI `element.animate` ([docs](https://codehike.org/docs/code/token-transitions)).

---

## 2. Per-candidate evaluations

Legend: **Ver** = latest version (date). **Maint** = maintenance signal. **Lic** = license (SPDX, OSI?). **Pay** = payment needed for us, meaning an individual researcher or a tiny org of 3 people or fewer. **Win** = local Windows rendering. **Det** = determinism and capture method. **Agent** = agent ergonomics and skills. **I/O** = interop and alpha. **Verdict** = whether it earns a dependency.

### 2.1 Video and animation engines

**Remotion**: React components rendered to video by frame number.
- **Ver:** 4.0.529 (2026-09-25).
- **Maint:** very active: 393 contributors and 270 issues in 30 days. Bus factor is concentrated: J. Burger has about 31.9k of the commits (Remotion AG).
- **Lic:** custom "Remotion License", **not OSI**. Free for *"an individual, a for-profit organization with up to 3 employees, a non-profit… or evaluating"*. Other organizations need a Company License. The licence also forbids selling or relicensing a derivative of Remotion ([LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)). Pricing ([remotion.pro/license](https://www.remotion.pro/license)):
  - **Creators:** $25 per seat per month.
  - **Automators:** $0.01 per render, $100/month minimum.
  - **Enterprise:** from $500/month.
- **2025–26 changes:** **v5.0 Terms** are published but *"take effect upon the release of Remotion 5.0"*, which has not happened (latest is 4.0.529). They:
  - restate the threshold as **"four or more" personnel, aggregated across contractors/agencies operating it on the same project**;
  - make **telemetry mandatory for Automators** (a licenseKey event per render) ([terms](https://www.remotion.dev/docs/terms), [FAQ](https://www.remotion.dev/docs/license/faq)).
  - The date the Creators/Automators tiers were introduced is **UNVERIFIED**.
- **Pay:** no, while 3 or fewer people operate it. Yes if the organization grows.
- **Win:** yes (`@remotion/compositor-win32-x64-msvc` 4.0.529 on npm). It bundles a **GPL-2.0-or-later** FFmpeg ([ffmpeg-license](https://www.remotion.dev/docs/miscellaneous/ffmpeg-license)). NVENC is available on Windows x64.
- **Det:** pure function of `useCurrentFrame()`, captured with `Page.captureScreenshot` on every platform. Nondeterminism comes from CSS animations, R3F `useFrame`, and assets not guarded by `delayRender`.
- **Agent:** excellent. Official skills: `npx skills add remotion-dev/skills` ([repo](https://github.com/remotion-dev/skills), 4.8k stars; **the repo has no LICENSE file**).
- **I/O:** ProRes 4444 (`yuva444p10le`), VP8/VP9 alpha, PNG sequences ([transparent videos](https://www.remotion.dev/docs/transparent-videos)).
- **Verdict:** best-in-class DX, but its custom license rules it out as the irreplaceable core under the owner's constraint. **Optional adapter only** (for example, reusing Remotion templates such as Code Hike).

**HyperFrames** (HeyGen): HTML to deterministic video, built for agents. Details are in Q4.
- **Ver:** 0.8.82 (2026-09-28).
- **Lic:** Apache-2.0 (OSI).
- **Pay:** no.
- **Win:** yes, via screenshot or drawElement capture.
- **Det:** seek-driven, `floor(frame)/fps`, adapters for many runtimes. Byte-exact only within one machine; use Docker for cross-machine exactness.
- **Agent:** best-in-class. 21 official skills, lint, Studio preview, catalog, MCP.
- **I/O:** WebM VP9 alpha, MOV ProRes 4444, PNG sequences, MP4, audio mixing.
- **Risks:**
  - Pre-1.0 churn (several releases a day) and an experimental adapter API.
  - Telemetry on by default.
  - A GSAP-first ecosystem.
  - Cloud voice providers come first in the TTS order.
  - HeyGen could relicense *future* versions; released versions stay Apache-2.0 and forkable.
- **Verdict:** **open core for web motion graphics**, pinned to an exact version with telemetry off (see §4).

**Manim Community Edition**: Python engine for precise math animation (3b1b lineage). Details are in Q3.
- **Ver:** 0.21.0 (2026-08-10).
- **Maint:** healthy. 418 contributors, 80 commits in 90 days, releases every 2–6 months.
- **Lic:** MIT (OSI). Its dependencies pycairo (LGPL-2.1-only OR MPL-1.1) and manimpango (MIT, bundles Pango/Cairo LGPL) are used as libraries, with no copyleft effect on our code.
- **Pay:** no.
- **Win:** yes, via uv with wheels.
- **Det:**
  - Cairo CPU rendering is deterministic run to run.
  - `--seed` (0.20+) controls randomness.
  - It is *not* random-access frame-seekable: a scene is an imperative script, and you can only select animation ranges (`-n`) or reuse cached partial movies.
  - Fits the pipeline as timeline-aligned clips with durations enforced from our spec.
- **Agent:** good. Python is familiar and errors are clear, but LaTeX errors are painful. Community skills: [adithya-s-k/manim_skill](https://github.com/adithya-s-k/manim_skill) (MIT, 1.1k stars), [Yusuke710/manim-skill](https://github.com/Yusuke710/manim-skill) (MIT); no official skill.
- **I/O:** qtrle MOV (argb), VP9 alpha WebM, PNG sequences. 0.21 overlaps partial-movie encoding with rendering.
- **Verdict:** **core math engine.**

**ManimGL (3b1b/manim)**: Grant Sanderson's OpenGL fork.
- **Ver:** 1.7.2 (2024-12-13). The main branch is active (VideoMobject landed 2026-09-09), but there has been no release in 21 months.
- **Lic:** MIT.
- **Win:** works, but LaTeX is mandatory for `Tex`, there is no Typst path, the API diverges from Manim CE, and the docs are thinner.
- **Det:** OpenGL, so it depends on the GPU.
- **Verdict:** contrast only. **Reject** as the engine; Manim CE has the community, the release cadence and the no-LaTeX path.

**Motion Canvas**: TypeScript generators rendering to Canvas2D, with a Vite editor. Details are in Q5.
- **Lic:** MIT.
- **Det:** generator timeline; seeking replays from the scene start.
- **Agent:** 900 Context7 snippets, but only tiny community skills (for example `apoorvlathey/motion-canvas-skills`, 2 stars).
- **Verdict:** **reject**: no headless render, and effectively unmaintained.

**Revideo**: Motion Canvas fork with headless rendering. Details are in Q5.
- **Lic:** MIT.
- **Verdict:** **reject** as core: upstream lags the closed Midrender product.

**Own frame-seek harness** (Playwright/Puppeteer or raw CDP driving headless Chromium), plus FFmpeg.
- **Lic:** Playwright 1.63.0 and Puppeteer 25.12.0 are Apache-2.0. Chromium and chrome-headless-shell are BSD-3-Clause plus third-party components.
- **Win:** yes. Measured in Q1; about 120 lines of raw CDP with zero npm dependencies were enough.
- **Det:** as good as the page's `seek(t)` purity; `beginFrame` is available on Windows in single-target mode.
- **Agent:** trivial to debug, but every feature is ours to build: fonts, video frames, audio, parallelism, preview UI.
- **Verdict:** **keep as a thin conformance/fallback renderer** for engine-neutral compositions. It guarantees HyperFrames stays replaceable. Do not grow it into a second product.

**FFmpeg**: encode, composite (`overlay`, `xfade`), audio mix (`amix`, `loudnorm`), alpha handling.
- **Ver:** 9.0.2 "Lei" (2026-09-18); the local build is 8.1.2.
- **Lic:** LGPL-2.1-or-later by default. **The gyan builds are GPLv3** (`--enable-gpl --enable-version3`, libx264/x265; *"All builds are… licensed as GPLv3"*) ([gyan.dev](https://www.gyan.dev/ffmpeg/builds/), [ffmpeg legal](https://ffmpeg.org/legal.html)). No `--enable-nonfree` in the local build.
- **Pay:** no. Running it as a local tool triggers no obligations; redistributing the binary would.
- **I/O notes:** the local build includes NVENC/AMF/QSV, libvpx (VP9 alpha), `prores_ks` and **`--enable-whisper`** (FFmpeg's `whisper` audio filter).
- **Verdict:** **core.**

### 2.2 Animation libraries (inside the web engine)

**GSAP**
- **Ver:** 3.15.0 (2026-04-13).
- **Maint:** Webflow-owned, steady.
- **Lic:** **"Standard 'no charge' license", not OSI** ([gsap.com/standard-license](https://gsap.com/standard-license), effective 2025-04-30). Free commercial use, and all plugins are included (SplitText, MorphSVG and others).
- **Restriction:** prohibits use *"in tools that allow users to build visual animations without code that competes with Webflow's visual animation building capabilities"*. It also bans reverse-engineering to build competing products.
- **Pay:** no.
- **Det:** timelines are pausable and seekable; HyperFrames' default adapter.
- **Agent:** official skills at [greensock/gsap-skills](https://github.com/greensock/gsap-skills) (MIT, 15.7k stars).
- **Verdict:** **not in core components.** It would become load-bearing under a non-OSI license, and if this repo ever grows a GUI timeline editor, the Webflow clause could bite. It is tolerable in throwaway experiments. anime.js v4 or our own tween functions fill the same role.

**anime.js v4**
- **Ver:** 4.5.0 (2026-06-22).
- **Maint:** single maintainer, 73k stars, active.
- **Lic:** MIT.
- **Det:** `createTimeline({autoplay:false})` plus `tl.seek(ms)`. Setting `engine.useDefaultMainLoop = false` with manual `engine.update()` removes the requestAnimationFrame dependency ([engine update](https://animejs.com/documentation/engine/engine-methods/update), [seek](https://animejs.com/documentation/timeline/timeline-methods/seek)).
- **Agent:** HyperFrames has an anime.js adapter.
- **Verdict:** **optional helper** if hand-written easing and interpolation (preferred) proves insufficient.

**Motion (motion.dev)**
- **Ver:** 13.4.4 (2026-09-25).
- **Lic:** MIT. Motion+ is an optional paid add-on of examples and components (£299 one-time personal; per-seat business) whose shipped code is MIT ([motion.dev/plus](https://motion.dev/plus)).
- **Det:** `animation.time = t` seeks ([docs](https://motion.dev/docs/animate)). The design is UI-first and React-centric, and layout animations measure the DOM.
- **Verdict:** **reject**: adds nothing over anime.js or pure interpolation for video.

**Theatre.js**
- **Ver:** 0.7.2 (2024-05-19). The last commit was 2024-04-11 ("Add the 1.0 notice"); 1.0 development moved to a **private** repository.
- **Lic:** `@theatre/core` Apache-2.0; `@theatre/studio` **AGPL-3.0-only**, used only at design time.
- **Verdict:** **reject**: stale, and the studio is AGPL.

**Lottie (lottie-web / dotLottie)**
- **Ver:** lottie-web 5.13.0 (npm 2025-05-21; last code commit 2024-11), with low maintenance. dotlottie-web 0.80.0 (2026-08-28) is active and uses the ThorVG WASM renderer.
- **Lic:** MIT for both.
- **Det:** `goToAndStop(frame)` / `setFrame`; HyperFrames has an adapter.
- **Authoring:** needs After Effects + Bodymovin or the proprietary LottieFiles tools, which is not code-first.
- **Verdict:** **reject** as an authoring path. Allowed only to import an existing asset through the HyperFrames adapter.

### 2.3 3D

**Three.js**
- **Ver:** r186 (npm 0.186.1, 2026-09-24).
- **Maint:** very active.
- **Lic:** MIT.
- **Det:** see Q2. HyperFrames has an adapter and Remotion has `@remotion/three`.
- **Agent:** strong model familiarity, plus community skills (for example [Three.js-Claude-Skill-Package](https://github.com/Impertio-Studio/Three.js-Claude-Skill-Package), MIT, 18 stars).
- **Verdict:** **optional library** for the occasional 3D shot. Vanilla, not R3F.

**React Three Fiber**
- **Ver:** 9.8.1 (2026-09-24); a v10 branch exists (release status **UNVERIFIED**).
- **Lic:** MIT.
- **Det:** `frameloop="never"` plus `advance(t)`.
- **Verdict:** **reject** unless we already use React, which the HyperFrames core does not.

### 2.4 Other tools and 2025–26 newcomers

- **Manim Slides** 5.7.0 (PyPI 2026-09-14), MIT: turns Manim scenes into slide decks (Qt player, HTML/reveal.js, PPTX). **Optional** secondary output.
- **Penrose** `@penrose/core` 3.3.1 (2026-08-30), MIT: turns Substance/Style/Domain programs into SVG diagrams through optimization, with seeded variation. **Optional** for static math diagrams. Note: the unrelated npm package `penrose` is AGPL-3.0; do not confuse the two.
- **Editframe** (`@editframe/elements` 0.60.11): *"SEE LICENSE IN LICENSE-FULL.md"*, a custom licence. **Reject.**
- **Twick**: often described as "MIT" in 2026 roundups, but the repo actually uses the **Sustainable Use License v1.0** (source-available, not OSI) ([LICENSE.md](https://github.com/ncounterspecialist/twick/blob/main/LICENSE.md)). **Reject.**
- **Rendervid** (QualityUnit): "FlowHunt Attribution License" (custom), 65 stars. **Reject.**
- **VideoFlow**: marketed as an Apache-2.0 Remotion alternative ([videoflow.dev](https://videoflow.dev/remotion-alternatives)). I could not locate its repo, so it is **UNVERIFIED** and not considered.
- **ft-motion** (`imserhatdemir/ft-motion`, MIT, 34 stars): the same "Canvas2D as a pure function of time, then headless Chrome, then FFmpeg" pattern as our fallback harness. Useful only as a reference.

### 2.5 Math and science rendering

**LaTeX distributions** (needed only for Manim `MathTex`). Details are in Q3.
- **MiKTeX** 25.12: 142 MB basic installer, on-the-fly package install. **Recommended** if LaTeX is ever needed; accept it only when a scene truly needs TeX packages.
- **TinyTeX**: 70–165 MB, with manual `tlmgr` installs on non-R setups.
- **Tectonic**: MIT, already installed, but no `dvisvgm`.

**KaTeX**
- **Ver:** 0.18.9 (2026-09-23), MIT.
- **Output:** **HTML/MathML only, no SVG** (`output: 'html' | 'mathml' | 'htmlAndMathml'`) ([options](https://katex.org/docs/options)). It therefore needs the browser and loaded fonts: await `document.fonts.ready` before capture.
- `\htmlClass`, `\htmlId` and `\htmlData` tag subexpressions for morphs; they require `trust` enabled and `strict` off.
- Fonts: MIT ([katex-fonts](https://github.com/KaTeX/katex-fonts)).
- **Optional:** fast inline math in the web engine.

**MathJax 4**
- **Ver:** `@mathjax/src` / `mathjax` 4.1.3 (2026-07-03), Apache-2.0. The v3 package `mathjax-full` 3.2.2 (2022) is legacy.
- **TeX to SVG in Node with no browser** via `@mathjax/src/bundle/tex-svg.js` and the liteDOM adaptor ([docs](https://docs.mathjax.org/en/latest/server/), via Context7). Set `fontCache: 'none'` for self-contained paths.
- `\class{…}{…}`, `\cssId` and `\data{…}` put attributes on SVG groups ([html extension](https://docs.mathjax.org/en/latest/input/tex/extensions/html.html)). This is our **substitute for `TransformMatchingTex` in the web engine**: tag terms, then morph matched groups.
- The default font is `mathjax-newcm` (New Computer Modern), with 11 font sets in all ([fonts](https://docs.mathjax.org/en/latest/output/fonts.html)). The npm font packages declare Apache-2.0.
- **Core library** for math in web scenes. Its SVGs also feed Manim's `SVGMobject` when TeX syntax matters.

**Typst**
- **Ver:** 0.15.1 (2026-07-17), Apache-2.0; typst-py 0.15.0.
- `typst compile --format svg` writes glyphs as outlined `<symbol><path>` with no font dependency ([text.rs](https://github.com/typst/typst/blob/main/crates/typst-svg/src/text.rs)).
- Bundled fonts: New Computer Modern / NewCM Math (GFL / GPL with font exception), Libertinus Serif (OFL-1.1), DejaVu Sans Mono ([typst-assets](https://github.com/typst/typst-assets)).
- **Manim bridge:** native `MathTypst` in 0.21.
- **Optional adapter** (CLI for standalone equation SVGs). It enters the stack anyway as a Manim extra.

### 2.6 Diagrams and charts

- **D3** 7.9.0 (2024-03-12, ISC). Stable and modular; use `d3-scale`, `d3-shape`, `d3-interpolate`, `d3-hierarchy` as **pure functions** in `seek(t)`. HyperFrames has a D3 adapter. **Core library** (modules only).
- **Mermaid** 12.0.0 (2026-09-10, MIT). Static SVG diagrams; the CLI needs Puppeteer. Layout is stable per input but offers no animation. **Optional** (static diagrams, then animate the SVG ourselves).
- **Vega-Lite** 6.4.3 (2026-04-24, BSD-3-Clause). Vega can render SVG headlessly in Node. **Optional**; D3 covers our needs.
- **Observable Plot** 0.6.17 (2025-02-14, ISC). Needs a DOM (jsdom or linkedom in Node). **Reject** (redundant with D3).
- **matplotlib** 3.11.2 (2026-09-11, a PSF-based license). Static figures and SVG/PNG, with mathtext (no LaTeX needed). For reproducible SVG set `svg.hashsalt`, `svg.fonttype: 'path'` and `metadata={'Date': None}`. **Optional adapter** for paper-style figures.

### 2.7 Code visualization

- **Shiki** 4.4.3 (2026-08-10, MIT). TextMate-grammar highlighting producing HTML or tokens. Remember the review-discipline rule: dual-theme `defaultColor:false` output needs the bridge CSS. **Core library.**
- **Shiki Magic Move**: see Q6. `@shikijs/magic-move` 4.4.3 is MIT; the old repo is archived. **Use `/core` only**, with our own progress renderer.
- **Code Hike** 1.1.0 (2026-03-17, MIT). React/MDX; progress-driven token transitions via `calculateTransitions`. **Reject** outside a Remotion adapter.
- **xterm.js** 6.0.0 (2025-12-22, MIT). Terminal emulator in the browser. For seekable terminal shots, replay a pre-recorded byte stream (for example asciicast v2) up to `t`. Writes are asynchronous, so await the `write` callback in `seek`. **Optional.**
- **VHS** 0.12.1 (2026-09-24, MIT). Scripted `.tape` files record a *real* shell via ttyd and headless Chrome into GIF/MP4/WebM/PNG. The README lists Windows binaries and scoop/winget installs, and it needs `ttyd` and `ffmpeg` on PATH. Command output timing is real, not seekable. Windows ttyd behaviour is **UNVERIFIED**. **Optional** for authentic CLI demos, composited as clips.
- **asciinema** 3.2.1 (GPL-3.0): *"Windows is currently not supported."* **agg** 1.9.0 (GPL-3.0) outputs **GIF** only. **Reject**; use xterm.js replay instead.

### 2.8 Presentation (secondary output)

- **Slidev** 53.0.0 (2026-09-16, MIT). Vue/Markdown; exports PDF/PNG/PPTX through Playwright. **Optional** if talk slides are wanted.
- **reveal.js** 6.0.2 (2026-09-10, MIT). Mature; also Manim Slides' HTML target. Use indirectly.
- **Marp CLI** 4.5.1 (2026-09-06, MIT). Markdown to PDF/PPTX/HTML, simplest of the group. **Optional.**
- **Quarto** 1.11.5 (2026-09-17, MIT; bundles Pandoc GPL-2.0-or-later, Typst and Deno). Best if we also publish written companion articles with revealjs slides. **Optional.**
- **Spectacle** 10.2.3 (2025-10-10, MIT). React; slower cadence. **Reject.**

---

## 3. Comparison table

| Candidate | Role here | License (OSI?) | Pay for us? | Latest (date) | Maintenance | Windows local | Frame-seekable / capture | Alpha out | Official or notable agent skill | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| HyperFrames | web motion-graphics engine | Apache-2.0 (yes) | no | 0.8.82 (2026-09-28) | hyper-active, pre-1.0 | yes (screenshot/drawElement) | yes, adapter seek; BeginFrame on Linux only | VP9, ProRes 4444, PNG | yes, official (21 skills) | **CORE** (pinned) |
| Manim CE | math sequences | MIT (yes) | no | 0.21.0 (2026-08-10) | healthy | yes (uv wheels) | deterministic; not random-access | qtrle MOV, VP9, PNG | community (MIT) | **CORE** |
| FFmpeg | composite / encode / audio | LGPL-2.1+; local build GPL-3.0+ (yes) | no | 9.0.2 (2026-09-18) | healthy | yes | n/a | ProRes 4444, VP9, qtrle | n/a | **CORE** |
| Own CDP/Playwright harness | conformance and fallback | Apache-2.0 / BSD-3 (yes) | no | Playwright 1.63.0 | n/a | yes (measured) | yes; beginFrame works single-target | PNG | n/a | **keep thin** |
| Remotion | React video engine | custom (**no**) | no if ≤3 people; else from $25/seat/mo | 4.0.529 (2026-09-25) | very active, concentrated | yes | yes, `Page.captureScreenshot` | ProRes 4444, VP9, PNG | yes, official | **adapter only** |
| Motion Canvas | TS canvas engine | MIT (yes) | no | 3.17.2 (2024-12) | stalled | editor only | generator replay | via exporter | none notable | reject |
| Revideo | headless MC fork | MIT (yes) | no | 0.11.0 (2026-07-10) | upstream lags | UNVERIFIED | yes | UNVERIFIED | none | reject |
| ManimGL | math (contrast) | MIT (yes) | no | 1.7.2 (2024-12) | dev active, no releases | yes (needs LaTeX) | GPU-dependent | yes | none | reject |
| GSAP | tweening | GSAP Standard (**no**) | no | 3.15.0 (2026-04-13) | steady | n/a | seekable | n/a | official (MIT) | not in core |
| anime.js v4 | tweening | MIT (yes) | no | 4.5.0 (2026-06-22) | active | n/a | seek + manual engine | n/a | – | optional |
| Motion | UI animation | MIT (yes); Motion+ paid | no | 13.4.4 (2026-09-25) | active | n/a | `.time` seek | n/a | – | reject |
| Theatre.js | keyframe studio | core Apache-2.0, studio AGPL-3.0 | no | 0.7.2 (2024-05) | stale / private | n/a | seekable | n/a | – | reject |
| Lottie / dotLottie | vector animation playback | MIT (yes) | no | 5.13.0 / 0.80.0 | low / active | n/a | setFrame | n/a | – | reject (import only) |
| Three.js | 3D | MIT (yes) | no | r186 (2026-09-24) | very active | yes | yes (manual render) | via engine | community | optional |
| R3F | React 3D | MIT (yes) | no | 9.8.1 (2026-09-24) | active | yes | `frameloop='never'` + advance | via engine | – | reject (no React) |
| MathJax 4 | TeX to SVG | Apache-2.0 (yes) | no | 4.1.3 (2026-07-03) | active | Node | static SVG | n/a | – | core library |
| KaTeX | TeX to HTML | MIT (yes) | no | 0.18.9 (2026-09-23) | active | browser | static | n/a | – | optional |
| Typst | math/markup to SVG | Apache-2.0 (yes) | no | 0.15.1 (2026-07-17) | very active | yes | static | n/a | – | optional (+ Manim extra) |
| MiKTeX / TinyTeX | LaTeX for MathTex | mixed free / TeX licenses | no | 25.12 / 2026.09 | active | yes | n/a | n/a | – | on demand |
| D3 | chart math | ISC (yes) | no | 7.9.0 (2024-03) | stable | n/a | pure functions | n/a | – | core library |
| Shiki + magic-move/core | code | MIT (yes) | no | 4.4.3 (2026-08-10) | active | n/a | core is pure; renderer is ours | n/a | – | core library |
| Code Hike | code transitions | MIT (yes) | no | 1.1.0 (2026-03-17) | slow | n/a | progress via React | n/a | – | reject (non-Remotion) |
| VHS | real terminal recording | MIT (yes) | no | 0.12.1 (2026-09-24) | active | binaries (ttyd UNVERIFIED) | real time | PNG frames | – | optional |
| asciinema / agg | terminal cast / GIF | GPL-3.0 (yes) | no | 3.2.1 / 1.9.0 | active | **no** | – | GIF | – | reject |
| Manim Slides / Slidev / Marp / Quarto | slides | MIT (yes) | no | 5.7.0 / 53.0.0 / 4.5.1 / 1.11.5 | active | yes | n/a | n/a | – | optional secondary |

---

## 4. Recommendation

### 4.1 The engine set (three engines, not a soup)
1. **HyperFrames**: the **open core for web motion graphics**. It is the only actively maintained, OSI-licensed HTML-to-video engine with a frame-seek contract, Windows support, alpha outputs (VP9, ProRes 4444, PNG), parallel capture, preview Studio, lint and official agent skills. Everything it does, we could reproduce with the thin harness, so it is valuable but **not irreplaceable**.
2. **Manim CE 0.21**: math sequences. Default to `MathTypst`/`Typst` (no LaTeX). Install MiKTeX on demand only for scenes that need `MathTex` or `TransformMatchingTex`.
3. **FFmpeg**: the single compositor and encoder for all renderer outputs, plus the narration audio track from local TTS.

### 4.2 Libraries inside the web engine (vendored as npm dependencies, no extra engines)
- MathJax 4: TeX to SVG with tagged subexpressions.
- Shiki plus `@shikijs/magic-move/core`, feeding our own progress-driven token renderer.
- D3 modules: scales, shapes, interpolation.
- Three.js: optional 3D.
- KaTeX: optional.
- Easing and interpolation are our own pure functions. anime.js v4 is an allowed fallback.

### 4.3 Guardrails that keep the core open and replaceable
- **Composition contract = ours.** Each web scene exports a pure `render(t)`/`seek(frame)` and registers with HyperFrames through a custom `FrameAdapter` or an `hf-seek` listener. The same HTML must render under the in-repo raw-CDP/Playwright harness. CI should compare a few golden frames from both, on the same machine.
- **Pin HyperFrames to an exact version** and upgrade deliberately. Set `HYPERFRAMES_NO_TELEMETRY=1`. Force local TTS (Kokoro) if we use its helpers at all; the TTS choice belongs to the separate `research/tts` track.
- **No GSAP in core components.** It is non-OSI and carries the Webflow clause. HyperFrames catalog blocks that import GSAP are allowed in experiments only.
- **Determinism:**
  - Fix Chrome (bundled headless-shell), GPU mode, DPR 1 and fonts (local files, not network).
  - Seed all randomness.
  - Expect byte-exactness per machine only; use `--docker` if cross-machine exactness is ever needed.
  - For golden tests at first, consider `PRODUCER_EXPERIMENTAL_FAST_CAPTURE=false`, which turns off the experimental Windows drawElement path.
- **Alpha interchange between engines:**
  - PNG sequences, or ProRes 4444 / qtrle MOV, as masters.
  - VP9 alpha only for web previews.
  - FFmpeg `overlay` composites everything onto the opaque master.

### 4.4 Optional adapters (add only when a video needs them)
- **Remotion**: custom license, free while 3 or fewer people operate it. Adapter only (for example, reusing its Code Hike or caption templates). Never the only path.
- **Typst CLI**: standalone equation and figure SVGs.
- **matplotlib**: paper-faithful static plots, as SVG with fixed hash salt.
- **VHS**: authentic terminal footage.
- **Penrose**: static math diagrams.
- **Manim Slides, Slidev, Marp or Quarto**: talk decks as a secondary output.

### 4.5 Reject (and why)
- **Motion Canvas:** no headless render, stalled since 2025.
- **Revideo:** development moved into closed Midrender.
- **ManimGL:** no releases since 2024, LaTeX-only math.
- **Theatre.js:** stale, and the studio is AGPL.
- **Lottie** as an authoring path: proprietary authoring tools.
- **Motion:** UI-oriented, redundant.
- **R3F:** pulls in React for no gain.
- **Code Hike** outside Remotion: React/MDX-bound.
- **asciinema/agg:** no Windows support, GIF output.
- **Observable Plot:** redundant with D3.
- **Spectacle.**
- **Twick, Editframe, Rendervid:** non-OSI custom or source-available licenses.

---

## 5. Open items and UNVERIFIED claims
- Whether BeginFrame capture is stable over *long* renders on Windows, and whether one-browser-per-worker makes parallel beginFrame work (Q1).
- Throughput through Playwright's own `page.screenshot` rather than raw CDP. Expected to be similar.
- Whether HyperFrames works with Podman instead of Docker Desktop for `--docker`.
- Whether a bundled React app inside a HyperFrames composition renders correctly.
- Revideo rendering on Windows; VHS/ttyd on Windows.
- The Tectonic → `pdftocairo -svg` → `SVGMobject` path for Manim.
- The date Remotion introduced its Creators/Automators tiers, and the Remotion 5.0 release date.
- VideoFlow's repository and license.
