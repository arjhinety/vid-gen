# Choosing a renderer for a scene

Every scene in `project.yaml` names its renderer. All renderers produce the same thing: an mp4 of **exactly** `durationFrames` frames that animates on the timeline's cues. The compositor does not care which renderer made it.

| Renderer | `entry` | Pick it when the scene is mostly… | Avoid it for… |
|---|---|---|---|
| `web` (default) | `scenes/Foo.tsx` | Typography, kinetic text, UI-like instrument panels, code (Shiki), data grids and dot fields (thousands of elements), charts, camera moves over a layout, anything reusing `@vid/kit` | Derivations where symbols must morph into each other |
| `manim` | `scenes/manim/foo.py:ClassName` | Mathematics that transforms: equations (Typst, STIX Two Math), geometric constructions, curves and surfaces, continuous parameter sweeps (`ValueTracker` + `always_redraw`), metaphors built from shapes | Dense typography, long text, UI, thousands of objects (slow Cairo raster) |
| `still` | image path | A held reference image (screenshot of a paper figure, a photo), shown as an exhibit on the sheet | Anything that should move |

**The chrome is the same for every renderer.** Grid, breadcrumb, question line (and headline, when on) are drawn by the web player for all three:

- A Manim scene renders transparent and is composited over a web "underlay" of the sheet.
- A still is placed as an `Exhibit` in the content box.

So switching a scene's renderer never changes how its cut looks.

**Rule of thumb.** If the viewer is *reading*, use web. If the viewer is *watching a mathematical object change*, use Manim.

In the pilot:
- `f1-geometry` (precision/recall plane, iso-F1 contours, 8× inset) and `basin` (the flagged landscape metaphor) are Manim.
- Everything else is web.

## Costs (RTX 4050 laptop, measured)

| | Draft 960×540 | Final 1920×1080 |
|---|---|---|
| Web (CPU raster, parallel pages) | 36–57 fps | 21–42 fps |
| Manim (Cairo) + sheet underlay + composite | 12 s scene ≈ 30–60 s; 25 s scene ≈ 60–100 s | ≈ 3–4× draft (estimate) |

Draft renders are cached per scene, so an edit re-renders only the scenes whose code or timing changed.

## Mixing inside one scene

Don't. A scene has exactly one renderer. When a web scene needs a real equation, typeset it once with Typst to SVG and place it as an image. Or split the moment into two scenes and hard-cut on a cue. That is how the references cut, too.

## Adapters (optional, not in the core)

These engines can be added as a renderer that writes `<scene>.<quality>.mp4` at the exact frame count. None is required for any shipped path.

| Engine | License | Why it's an adapter, not the core |
|---|---|---|
| **HyperFrames** (HeyGen) | Apache-2.0 | Pre-1.0 and fast-moving, with PostHog telemetry on by default (`HYPERFRAMES_NO_TELEMETRY=1`). Its ecosystem is GSAP-centric (GSAP is not OSI). Our React kit and cue model already cover its role. A good fit for importing HTML/GSAP compositions someone else authored. |
| **Remotion** | Custom (free for ≤ 3 people; company license otherwise) | Must never be irreplaceable. Useful if a collaborator already has Remotion components. |
| **Motion Canvas** | MIT | A good generator-based API, but it overlaps web + Manim, and it has its own timeline model that would fight our cue timeline. |
| **Three.js / R3F** | MIT | Add as a web-scene dependency when a scene truly needs 3D (e.g. a loss surface you orbit). Render with `VID_GPU=1`. |
| **Lottie** | MIT (players) | Only for importing an existing asset; the authoring tools are proprietary. |

The full technical evaluation is in `research/frameworks/framework-survey.md`, and licensing in [licensing.md](licensing.md).

## Adding a renderer

1. Add the name to `Renderer` in `packages/core/src/schema.ts` and an entry-format check in `validate.ts`.
2. Add a branch in `renderScene()` (`packages/cli/src/commands.ts`) that writes the mp4. Normalize it to the exact frame count (see `manim.ts`: `tpad` clone + `-frames:v`) and BT.709 tags.
3. Extend the scene cache key with every file the renderer reads.
4. Pass cue times in frames, the way `manim.ts` writes `<scene>.timing.json`. Never let the renderer invent its own timing.
