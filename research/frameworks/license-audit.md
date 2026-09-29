# License audit: video-generation stack candidates

**Checked on 2026-09-28** against GitHub repos and license files (`gh api`), the npm registry, PyPI, Hugging Face model cards and official license pages.

**Scope:**
- **Us** means an individual researcher, possibly a tiny organization of 3 people or fewer.
- Everything runs **locally**; we do not redistribute binaries.

The companion technical evaluation is in [`framework-survey.md`](./framework-survey.md).

**Columns:**
- **OSI?** asks whether the license is on the OSI-approved list (SPDX list data, `isOsiApproved`).
- **Pay?** asks whether *we* must pay for our intended use.
- "Custom" means there is no SPDX id; I use a `LicenseRef-` name.

**UNVERIFIED** marks items I could not confirm from a primary source.

## Headline findings
1. **Remotion is the only core-candidate framework with a non-OSI license.**
   - It is free for individuals, for-profits with up to 3 employees, non-profits and evaluation.
   - Beyond that, a Company License costs $25/seat/month (Creators), or $0.01 per render with a $100/month minimum (Automators), or at least $500/month (Enterprise).
   - The **v5.0 Terms** take effect only when Remotion 5.0 ships; it had not shipped as of 2026-09-28 (latest v4.0.529). They restate the threshold as **4 or more personnel, aggregated across contractors**, and **make telemetry mandatory for Automators**.
   - Keep Remotion as an adapter only.
2. **GSAP is free but not OSI.** Its "Standard no-charge license" (Webflow, effective 2025-04-30) prohibits use in no-code visual animation builders that compete with Webflow. Our code-driven pipeline is allowed. Still, keep GSAP out of the core so the core stays OSI-clean.
3. **HyperFrames is Apache-2.0**, OSI-approved with no thresholds, but its CLI sends **PostHog telemetry by default** (opt out with `HYPERFRAMES_NO_TELEMETRY=1` or `DO_NOT_TRACK=1`). Its helpers also bring model licenses into scope:
   - **Parakeet TDT 0.6B v3 is CC-BY-4.0** (attribution required).
   - **Its local music fallback, MusicGen, is CC-BY-NC-4.0** (non-commercial). Avoid it.
4. **The local FFmpeg (gyan "full") build is GPL-3.0-or-later** (`--enable-gpl --enable-version3`, x264/x265), not LGPL. That is fine for local tool use. Redistributing the binary would require GPL compliance. There is no `--enable-nonfree`, so the build is redistributable.
5. **Theatre.js Studio is AGPL-3.0-only.** Twick (Sustainable Use License), Editframe (custom) and Rendervid (FlowHunt Attribution License) are source-available or custom licenses, often mislabelled "MIT" in 2026 roundups.
6. **Every font on the shortlist is free to use in rendered video.** Most are OFL-1.1. Latin Modern and New Computer Modern use the GUST Font License, which has no SPDX id and is LPPL-based. Rendering glyphs into video frames creates no obligation. Redistributing *modified or subsetted* font files may trigger Reserved-Font-Name renaming.

## Engines, frameworks and libraries

| Component | Role | License (SPDX) | OSI? | Pay? | Restrictions / notes | Source URL checked |
|---|---|---|---|---|---|---|
| HyperFrames (`hyperframes`, `@hyperframes/*`) 0.8.82 | web motion-graphics core engine | Apache-2.0 | yes | no | Telemetry (PostHog) is on by default; opt out with `HYPERFRAMES_NO_TELEMETRY=1`, `DO_NOT_TRACK=1` or `hyperframes telemetry disable`. `engine`/`producer`/`core` package.json omit a license field; the repo LICENSE covers them. The TTS provider order starts with cloud HeyGen/ElevenLabs. | https://github.com/heygen-com/hyperframes/blob/main/LICENSE ; https://github.com/heygen-com/hyperframes/blob/main/packages/cli/src/telemetry/policy.ts |
| HyperFrames agent skills | agent authoring | Apache-2.0 (same repo) | yes | no | The skills and catalog lean on GSAP (see the GSAP row). | https://github.com/heygen-com/hyperframes |
| Remotion (`remotion`, `@remotion/*`) 4.0.529 | optional adapter only | LicenseRef-Remotion (custom) | **no** | **no** while we are an individual or 3 or fewer people; otherwise a Company License (Creators $25/seat/mo; Automators $0.01/render, $100/mo minimum; Enterprise from $500/mo) | Must not copy or modify Remotion code to sell, rent, license or relicense a derivative. v5.0 Terms (effective at the 5.0 release): Company License needed at **4 or more personnel across all involved parties**, and license-key telemetry is mandatory for Automators. Some satellite packages (e.g. `@remotion/three`, `@remotion/licensing`) declare MIT in package.json but depend on `remotion` core. When the Creators/Automators tiers were introduced is **UNVERIFIED**. | https://github.com/remotion-dev/remotion/blob/main/LICENSE.md ; https://www.remotion.pro/license ; https://www.remotion.dev/docs/terms ; https://www.remotion.dev/docs/license/faq |
| Remotion's bundled FFmpeg | adapter dependency | GPL-2.0-or-later | yes | no | Built with x264/x265 and fdk-aac-free; source at remotion-dev/rust-ffmpeg-splitter. | https://www.remotion.dev/docs/miscellaneous/ffmpeg-license |
| remotion-dev/skills | agent skill (adapter) | none (no LICENSE file) | n/a | no | No license means default copyright. Installing via `npx skills add` for local use is the intended path; copying or redistributing the skill text is not licensed. | https://github.com/remotion-dev/skills |
| Manim Community Edition 0.21.0 | math engine (core) | MIT | yes | no | – | https://pypi.org/project/manim/ ; https://github.com/ManimCommunity/manim |
| pycairo 1.29.1 | Manim dependency | LGPL-2.1-only OR MPL-1.1 | yes | no | Used unmodified as a library; no copyleft effect on our code. | https://pypi.org/project/pycairo/ |
| manimpango 0.6.1 (bundles Pango/Cairo/GLib) | Manim text | MIT (bundled libs LGPL-2.1-or-later) | yes | no | Exact bundled library versions **UNVERIFIED**. | https://pypi.org/project/ManimPango/ |
| PyAV 18.1.0 | Manim encoding | BSD-3-Clause | yes | no | Wheels bundle an FFmpeg build whose license flavour is **UNVERIFIED**. | https://github.com/PyAV-Org/PyAV |
| typst (typst-py) 0.15.0 | Manim `Typst`/`MathTypst` extra | Apache-2.0 | yes | no | – | https://github.com/messense/typst-py ; https://pypi.org/project/typst/ |
| Typst CLI 0.15.1 | optional equation → SVG | Apache-2.0 | yes | no | Bundled fonts are listed in the font table. | https://github.com/typst/typst ; https://github.com/typst/typst-assets |
| ManimGL 1.7.2 | rejected (contrast only) | MIT | yes | no | – | https://github.com/3b1b/manim |
| Manim Slides 5.7.0 | optional slides from Manim | MIT | yes | no | – | https://pypi.org/project/manim-slides/ |
| FFmpeg (source) | compositor/encoder (core) | LGPL-2.1-or-later (default) | yes | no | Becomes GPL with `--enable-gpl` or GPL libraries; `--enable-nonfree` makes it non-redistributable. | https://ffmpeg.org/legal.html |
| FFmpeg 8.1.2 gyan "full" build (local) | compositor/encoder (core) | GPL-3.0-or-later (as built) | yes | no | Configuration includes `--enable-gpl --enable-version3`, libx264/libx265, NVENC and whisper; no nonfree. Local use carries no obligations; redistributing the binary means GPL compliance. Latest upstream is 9.0.2 (2026-09-18). | local `ffmpeg -version` ; https://www.gyan.dev/ffmpeg/builds/ ; https://ffmpeg.org/download.html |
| x264 / x265 (inside FFmpeg) | H.264/H.265 encoders | GPL-2.0-or-later | yes | no | This is what makes the build GPL. Codec patent licensing is out of scope and generally not an issue for individual non-distributed use (**UNVERIFIED** legal advice). | https://ffmpeg.org/legal.html |
| Chromium / chrome-headless-shell 151 | capture browser | BSD-3-Clause (+ third-party notices) | yes | no | `LICENSE.headless_shell` ships with the binary. | local `%LOCALAPPDATA%\ms-playwright\chromium_headless_shell-1234\...\LICENSE.headless_shell` |
| Playwright 1.63.0 | fallback capture harness | Apache-2.0 | yes | no | – | https://github.com/microsoft/playwright |
| Puppeteer 25.12.0 | HyperFrames capture dependency | Apache-2.0 | yes | no | – | https://github.com/puppeteer/puppeteer |
| Docker Desktop | only for `hyperframes render --docker` | proprietary (Docker Subscription Service Agreement) | no | **no** for personal use, education, non-commercial OSS, or companies with fewer than 250 employees **and** under $10M revenue | Podman as an alternative is **UNVERIFIED** with HyperFrames. | https://docs.docker.com/subscription/desktop-license/ |
| GSAP 3.15.0 (+ all plugins) | tweening (**not in core**) | LicenseRef-GSAP-Standard-No-Charge | **no** | no | Prohibited: use *"in tools that allow users to build visual animations without code that competes with Webflow's visual animation building capabilities"*; reverse-engineering to build competing products; removing notices. Free commercial use; all plugins included. Effective 2025-04-30, modified 2025-05-30. | https://gsap.com/standard-license |
| greensock/gsap-skills | agent skill | MIT | yes | no | The skill text is MIT; GSAP itself is still under its Standard license. | https://github.com/greensock/gsap-skills |
| anime.js 4.5.0 | optional tweening | MIT | yes | no | – | https://github.com/juliangarnier/anime |
| Motion (motion.dev) 13.4.4 | rejected | MIT | yes | no | Motion+ is a separate paid product (£299 one-time personal; per-seat business); not needed. | https://github.com/motiondivision/motion ; https://motion.dev/plus |
| Theatre.js `@theatre/core` 0.7.2 | rejected | Apache-2.0 | yes | no | Stale since 2024; 1.0 is developed privately. | https://github.com/theatre-js/theatre |
| Theatre.js `@theatre/studio` 0.7.2 | rejected | AGPL-3.0-only | yes | no | Network-copyleft; design-time only. | https://github.com/theatre-js/theatre ; npm `@theatre/studio` |
| lottie-web 5.13.0 / dotlottie-web 0.80.0 | rejected (asset import only) | MIT / MIT | yes | no | Authoring tools (After Effects, LottieFiles Creator) are proprietary. | https://github.com/airbnb/lottie-web ; https://github.com/LottieFiles/dotlottie-web |
| Three.js r186 | optional 3D | MIT | yes | no | – | https://github.com/mrdoob/three.js |
| React Three Fiber 9.8.1 | rejected | MIT | yes | no | – | https://github.com/pmndrs/react-three-fiber |
| Motion Canvas 3.17.2 | rejected | MIT | yes | no | – | https://github.com/motion-canvas/motion-canvas |
| Revideo 0.11.0 | rejected | MIT | yes | no | PostHog telemetry; opt out with `DISABLE_TELEMETRY=true`. | https://github.com/midrender/revideo |
| MathJax 4.1.3 (`@mathjax/src`, `mathjax`) | TeX → SVG (core library) | Apache-2.0 | yes | no | `mathjax-full` 3.2.2 is the legacy v3 package. | https://github.com/mathjax/MathJax-src ; npm `@mathjax/src` |
| KaTeX 0.18.9 | optional TeX → HTML | MIT | yes | no | – | https://github.com/KaTeX/KaTeX |
| TinyTeX (installer + `tinytex` scripts) | on-demand LaTeX for `MathTex` | MIT (tinytex; R-style MIT stub) | yes | no | The TeX Live packages it installs carry their own free licenses (LPPL-1.3c, GPL, OFL, GFL, public domain…). The yihui.org *site text* is CC BY-NC-SA, which is not the software license. | https://github.com/rstudio/tinytex ; https://yihui.org/tinytex/ |
| MiKTeX 25.12 | on-demand LaTeX for `MathTex` | mixed free licenses per package ("Copying conditions for MiKTeX", adapted from TeX Live) | mostly yes | no | Per-package licenses. | https://github.com/MiKTeX/miktex (COPYING.md) ; https://miktex.org/download |
| Tectonic 0.17.0 (installed) | not used by Manim | MIT (components various) | yes | no | – | https://github.com/tectonic-typesetting/tectonic |
| dvisvgm | needed by Manim `MathTex` | GPL-3.0 (repo SPDX) | yes | no | Tool use only. | https://github.com/mgieseki/dvisvgm |
| D3 7.9.0 | chart math (core library) | ISC | yes | no | – | https://github.com/d3/d3 |
| Mermaid 12.0.0 | optional static diagrams | MIT | yes | no | – | https://github.com/mermaid-js/mermaid |
| Vega-Lite 6.4.3 | optional | BSD-3-Clause | yes | no | – | https://github.com/vega/vega-lite |
| Observable Plot 0.6.17 | rejected | ISC | yes | no | – | https://github.com/observablehq/plot |
| matplotlib 3.11.2 | optional static figures | LicenseRef-Matplotlib (PSF-based; PyPI classifier "OSI Approved :: Python Software Foundation License") | yes (PSF-style) | no | – | https://pypi.org/project/matplotlib/ |
| Penrose `@penrose/core` 3.3.1 | optional diagrams | MIT | yes | no | The unrelated npm package `penrose` 0.4.2 is AGPL-3.0; do not confuse them. | https://github.com/penrose/penrose |
| Shiki 4.4.3 | syntax highlighting (core library) | MIT | yes | no | Bundled TextMate grammars and themes have individual licenses (mostly MIT); check any theme we redistribute (**UNVERIFIED** per theme). | https://github.com/shikijs/shiki |
| `@shikijs/magic-move` 4.4.3 | token diffing (`/core` only) | MIT | yes | no | The old `shikijs/shiki-magic-move` repo is archived. | https://github.com/shikijs/shiki/tree/main/packages/magic-move |
| Code Hike 1.1.0 | rejected (Remotion adapter only) | MIT | yes | no | `remotion-dev/template-code-hike` has **no LICENSE file**. | https://github.com/code-hike/codehike ; https://github.com/remotion-dev/template-code-hike |
| xterm.js 6.0.0 | optional terminal replay | MIT | yes | no | – | https://github.com/xtermjs/xterm.js |
| VHS 0.12.1 (+ ttyd) | optional terminal recording | MIT (+ ttyd MIT) | yes | no | – | https://github.com/charmbracelet/vhs ; https://github.com/tsl0922/ttyd |
| asciinema 3.2.1 / agg 1.9.0 | rejected | GPL-3.0 / GPL-3.0 | yes | no | asciinema does not support Windows. | https://github.com/asciinema/asciinema ; https://github.com/asciinema/agg |
| Slidev 53.0.0 | optional slides | MIT | yes | no | – | https://github.com/slidevjs/slidev |
| reveal.js 6.0.2 | optional slides | MIT | yes | no | – | https://github.com/hakimel/reveal.js |
| Marp CLI 4.5.1 | optional slides | MIT | yes | no | – | https://github.com/marp-team/marp-cli |
| Quarto 1.11.5 | optional docs and slides | MIT (bundles Pandoc GPL-2.0-or-later, Typst Apache-2.0, Deno MIT…) | yes | no | – | https://github.com/quarto-dev/quarto-cli |
| Spectacle 10.2.3 | rejected | MIT | yes | no | – | https://github.com/FormidableLabs/spectacle |
| Editframe (`@editframe/elements`) | rejected | LicenseRef-Editframe ("SEE LICENSE IN LICENSE-FULL.md") | no | **UNVERIFIED** | Custom license. | npm `@editframe/elements` |
| Twick | rejected | LicenseRef-Sustainable-Use-1.0 | no | **UNVERIFIED** | Source-available, despite being marketed as MIT. | https://github.com/ncounterspecialist/twick/blob/main/LICENSE.md |
| Rendervid | rejected | LicenseRef-FlowHunt-Attribution | no | no (attribution terms) | Custom. | https://github.com/QualityUnit/rendervid |
| Community Manim skills (adithya-s-k/manim_skill, Yusuke710/manim-skill) | agent skill | MIT | yes | no | – | https://github.com/adithya-s-k/manim_skill ; https://github.com/Yusuke710/manim-skill |

## Models and helpers pulled in by the HyperFrames CLI (in scope only if we use its media commands)

| Component | Role | License (SPDX) | OSI? | Pay? | Restrictions / notes | Source URL checked |
|---|---|---|---|---|---|---|
| Kokoro-82M weights | local TTS (`hyperframes tts`) | Apache-2.0 | yes (code-style license on weights) | no | Downloaded from kokoro-onnx GitHub release assets. | https://huggingface.co/hexgrad/Kokoro-82M |
| kokoro-onnx | TTS runtime | MIT | yes | no | – | https://github.com/thewh1teagle/kokoro-onnx |
| whisper.cpp + ggml Whisper models | transcription | MIT (code, ggml models); OpenAI Whisper weights Apache-2.0 on HF / code MIT | yes | no | On Windows, HyperFrames needs a user-supplied `whisper-cli` or a cmake build. | https://github.com/ggml-org/whisper.cpp ; https://huggingface.co/openai/whisper-small |
| NVIDIA Parakeet TDT 0.6B v3 | optional transcription | CC-BY-4.0 | n/a (not a software license) | no | **Attribution required**. | https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3 ; HyperFrames `docs/packages/cli.mdx` |
| sherpa-onnx | Parakeet runtime | Apache-2.0 | yes | no | – | https://github.com/k2-fsa/sherpa-onnx |
| MusicGen (`facebook/musicgen-*`) | HyperFrames local music fallback | CC-BY-NC-4.0 | n/a | no, but **non-commercial only** | **Avoid** if videos may be monetized. | https://huggingface.co/facebook/musicgen-small ; HyperFrames `packages/cli/src/audio/providers.ts` |

## Fonts

| Font | Role | License (SPDX) | OSI? | Pay? | Restrictions / notes | Source URL checked |
|---|---|---|---|---|---|---|
| Inter 4.1 | UI / sans | OFL-1.1 | yes | no | Embedding in video carries no obligations. No Reserved Font Name is declared in the repo LICENSE. | https://github.com/rsms/inter |
| IBM Plex (Sans/Serif/Mono) | sans / serif / mono | OFL-1.1 | yes | no | Reserved Font Name "Plex" (confirmed in the LICENSE header). | https://github.com/IBM/plex |
| JetBrains Mono 2.304 | code | OFL-1.1 | yes | no | No Reserved Font Name is declared in the repo LICENSE. | https://github.com/JetBrains/JetBrainsMono |
| Source Serif 4 (4.005R) | serif | OFL-1.1 | yes | no | Reserved Font Name "Source" (an Adobe trademark), confirmed in the LICENSE. | https://github.com/adobe-fonts/source-serif |
| Source Sans 3 (3.052R) | sans | OFL-1.1 | yes | no | Reserved Font Name "Source" (an Adobe trademark), confirmed in the LICENSE. | https://github.com/adobe-fonts/source-sans |
| Fraunces 1.000 | display serif | OFL-1.1 | yes | no | No Reserved Font Name is declared in the repo LICENSE. | https://github.com/undercasetype/Fraunces |
| Geist / Geist Mono 1.7.2 | sans / mono | OFL-1.1 | yes | no | No Reserved Font Name is declared in the repo LICENSE. | https://github.com/vercel/geist-font |
| STIX Two (Text + Math) 2.13 | math / serif | OFL-1.1 | yes | no | Reserved Font Name "TM Math"; STIX Fonts is an IEEE trademark. | https://github.com/stipub/stixfonts |
| Latin Modern (lm, lm-math 1.959) | TeX-look text and math | GUST Font License (no SPDX id; LPPL-1.3c-derived) | n/a (LPPL-1.3c is OSI) | no | Modified versions must be renamed (LPPL-style). | https://ctan.org/pkg/lm-math |
| New Computer Modern 8.1.1 (incl. NewCM Math) | TeX-look text and math (Typst's math font; MathJax v4 default basis) | GPL-3.0-or-later WITH Font-exception-2.0 OR GUST Font License | yes (GPL option) | no | The font exception means documents and renders are not GPL-infected. | https://ctan.org/pkg/newcomputermodern |
| KaTeX fonts (KaTeX_*) | KaTeX rendering | MIT | yes | no | Derived from Computer Modern. | https://github.com/KaTeX/katex-fonts |
| MathJax v4 font packages (`@mathjax/mathjax-newcm-font`, `-stix2-font`, …) 4.1.3 | MathJax SVG glyph data | Apache-2.0 (npm metadata) | yes | no | Derived from NewCM (GFL), STIX2 (OFL) and others. How upstream font terms carry into the Apache-labelled packages is **UNVERIFIED**; harmless for rendering. | npm `@mathjax/mathjax-newcm-font` ; https://docs.mathjax.org/en/latest/output/fonts.html |
| Libertinus Serif | Typst default text font (bundled) | OFL-1.1 | yes | no | – | https://github.com/typst/typst-assets |
| DejaVu Sans Mono | Typst bundled mono | Bitstream-Vera-derived (DejaVu changes public domain) | no | no | Exact SPDX mapping **UNVERIFIED**. | https://github.com/typst/typst-assets |

## Payment summary for us
- **Nothing on the recommended path requires payment:** HyperFrames, Manim CE, FFmpeg, MathJax, Shiki, D3, Three.js, the fonts above, and Playwright for the fallback harness.
- **Remotion** becomes paid only if 4 or more people end up operating it. Under the v5 terms, contractor headcount counts toward that threshold.
- **Docker Desktop** becomes paid only for a company with 250 or more employees or $10M or more in revenue.
- **Motion+** is never needed.
