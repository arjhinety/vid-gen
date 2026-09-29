# Authoring scenes

A scene is one stretch of the film that owns one or more narration **beats**.

- **It draws one exhibit at a time.** The shared sheet (grid, breadcrumb, the question line, and the headline when a project turns it on) is drawn by the player from film context, so a scene only draws the stage: y 236–940 (`TOP` to `BOTTOM`).
- **Cuts between scenes are invisible.** The old exhibit dissolves, and the next one arrives on the same sheet under the same question line.
- **Choosing a renderer:** see [renderer-selection.md](renderer-selection.md).
- **The look:** see [design-system.md](design-system.md).

## The loop

```bash
pnpm video plan opengrad-study-001                  # pacing: seconds per scene, speech share, wpm
pnpm video dev opengrad-study-001                   # preview: scrub, play, cue ticks, captions (c), guides (g)
pnpm video still opengrad-study-001 training --at cue:gate,cue:gate+30,end   # exact frames to PNG
pnpm video scene opengrad-study-001 basin           # one scene (draft), cached by content hash
```

1. **Write the beat** in `script/narration.yaml`:
   - The narration is heard, not read: connected sentences of 8–14 words, every term defined the first time it is said, about three spoken numbers a minute.
   - Put a `[[cue]]` before each word that should add something to the exhibit. Aim for **about one addition per sentence**, not one per phrase: the exhibit should be still while it is being explained.
   - Author the silences: `pause:` after a question (0.5–1 s), after a definition (1–1.6 s), and 2.5–3.5 s after a big reveal, with nothing moving.
   - Set the scene's open question (`question` in project.yaml) and write the terms the narration defines onto the objects with `Term`.
2. **Build the scene against estimated timing.** This works before any audio exists.
3. **Look at stills at every cue and at `end`,** and read them critically:
   - Does the text fit?
   - Does anything collide?
   - Is the exhibit inside the stage, y 236–940, and clear of the question line?
   - Is any text on the stage under 20 px, or is the narration repeated on screen?
   - Is there more than one crimson idea?
4. **After `pnpm video audio`, re-check** at the real cue times.

## Web scenes (`scenes/Foo.tsx`)

The default export is a React component that is a **pure function of the frame**. Wrap everything in `Exhibit`.

```tsx
import { color } from "@vid/design";
import { Claim, Exhibit, HBar, ScaleAxis, Stamp, Term } from "@vid/kit";
import { clamp, useCues, useScene, useSceneFrame } from "@vid/motion";
import { overCalls } from "./shared/data.ts";         // typed accessors over data/*.json
import { TOP, X0 } from "./shared/layout.ts";

const rate = (s: "B0" | "M0") => overCalls(s).num / overCalls(s).den;

export default function Foo() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  // Linear 0→1 from a cue (plus an offset), over `dur` seconds; components apply their own easing.
  const p = (name: string, dur = 0.3, o = 0) => clamp((f - cue.frame(name) - Math.round(o * fps)) / (dur * fps));
  return (
    <Exhibit from={0} until="next-thing">
      {/* A term written onto its object as it is first said, with a one-line definition. */}
      <Term x={X0} y={TOP + 20} def="calling a tool when none was needed" p={p("line:b06#0", 1.0)}>over-calling</Term>
      <HBar x={X0} y={TOP + 150} w={900} value={rate("B0")} p={p("base", 0.5)} label="before" />
      <HBar x={X0} y={TOP + 210} w={900} value={rate("M0")} p={p("m0", 0.5)} label="fine-tuned" />
      <ScaleAxis x={X0} y={TOP + 270} w={900} ticks={[0, 0.25, 0.5, 0.75, 1]} p={p("base", 0.4)} />
      <Stamp x={1400} y={TOP + 40} head="SEALED" p={p("sealed", 0.25)}>scored once</Stamp>
      {/* The claim class on the stage; the source file goes to the receipts (sources/claims-*.yaml). */}
      <Claim kind="measured" note="held-out set, scored once" x={X0} y={TOP + 660} p={p("m0", 0.3, 0.5)} />
    </Exhibit>
  );
}
```

**Rules.** A render seeks to each frame and screenshots it; break these and preview and render will differ.

- **No clocks or randomness.** Don't use `setTimeout`, `requestAnimationFrame`, CSS transitions or animations, `Date.now()` or `Math.random()`. Use `useSceneFrame()` / `useCues()`, and `rng(seed)` / `noise1` from `@vid/motion`.
- **Anything async goes through `useResource(key, load)`** (fonts, Shiki grammars, JSON), so the render host waits for it.
- **Lay out in design pixels** on a fixed 1920×1080 stage, with the constants from `scenes/shared/layout.ts` (`X0 = 140`, `X1 = 1780`, `TOP` = 236, `BOTTOM` = 940).
- **Data comes from `scenes/shared/data.ts`.** Never type a result number into a scene: a number on screen must trace to an extracted artifact with a `src`.

**`Exhibit` timing:**

| Setting | Effect |
|---|---|
| Default | Arrives at scene start and dissolves out by the scene's end |
| `from` / `until` (cue or seconds) | Swaps exhibits inside one scene |
| `until={false}` | Holds through the cut (the last scene) |
| `glide={{ dx, at }}` | Slides the exhibit from centre to its final column when the story widens |

**Cue references** (`useCues()`):

| Ref | Meaning |
|---|---|
| `"name"` | An inline `[[name]]` marker: the aligned start of the next word |
| `"beat:b07"` / `"beat-end:b07"` | Start or end of a beat's speech |
| `"line:b07#1"` | Start of a line (0-based within the beat) |
| number | Seconds from scene start |

`cue.frame(ref)` gives a frame, `cue.at(ref, {dur, offset, ease})` an eased 0→1, and `cue.span(a, b, ease)` a progress between two refs.

### The kit (`@vid/kit`)

| Area | Components |
|---|---|
| Sheet (drawn for you) | `SheetChrome` = `Sheet` + `Breadcrumb` + `Headline`; `LogoMark`; `Exhibit` |
| Labels and provenance | `Label` (mono caps + sub), `Meta`, `Value`, `SourceTag`, `FigLabel`, `Claim` (glyph + CLASS + source), `Stamp` (verdict, slams in at −1.5°) |
| Forms | `Field`, `Checkbox` (`tick` / `strike` / `cross` progress), `Tag` |
| Charts | `Frame`, `ScaleAxis`, `HBar` (with `collapse` → red dashed trail), `LineChart` (series drawn by `PenNib`), `FlowBox`, `Link`, `Arc`, `Cross` |
| Populations | `Trays`, `DotField` (thousands of dots with stagger and colour mix), `packTray`, `scatter`, `CellGrid`, `Counter`, `Fraction`, `BarPairs`, `Meter` |
| Records and machine I/O | `Card`, `SpecimenTag`, `Rule`, `InstrumentPanel` (device screen), `CodePanel` (Shiki; focus, highlight, selections), `TypeStream` (human or machine typing) |
| Marks and stage | `PenMark`, `PenNote`, `ColorKey`, `Marked`, `T`, `Layer`, `Camera`, `FocusPull`, `At` |

The component props take a linear `p` in 0..1 and apply the house easing themselves. Frame counts and eases are listed in [design-system.md](design-system.md#motion-30-fps).

## Manim scenes (`scenes/manim/foo.py:ClassName`)

Manim draws the **exhibit only**, on a transparent background. The CLI renders the sheet underlay with the web renderer (same breadcrumb and question line), renders Manim with `--transparent`, and composites the two in RGB. So a Manim scene sits on the same page as its neighbours.

```python
from manim import Write
from ogmanim import C, OGScene, dur, math, px, rate, text

class Foo(OGScene):
    def construct(self):
        head = self.label("Tool-call routing · confirmatory", "n = 1,277 · single seed")  # like the web Label
        eq = math("F_1 = frac(2 P R, P + R)", size_px=46).move_to(px(160, 740), aligned_edge=LEFT)
        self.wait_until("harm")                         # hold until the cue
        self.play(Write(eq), run_time=dur("arrive") * 2, rate_func=rate("settle"))
        k = self.fit(dur("glide") * 2)                 # squeeze the closer if narration leaves little room
        ...
        self.play(FadeIn(self.provenance("measured", "routing.py formulas")), run_time=dur("arrive") * k)
        self.finish()                                   # hold to the exact scene length
```

- **Coordinates and type match the web stage.** `px(x, y)` takes design pixels from the top-left, and `text(s, style)` uses the web type styles (Archivo / JetBrains Mono). Text is laid out at 4× and scaled down, so small labels kern correctly.
- **Math is Typst in STIX Two Math** via `math()`, not LaTeX.
- **Waiting and ending.** `wait_until(cue, offset)` is the only way to wait, and every scene ends with `finish()`.
- **`fit(planned, until=cue)`** returns a factor ≤ 1 that makes animations end before a cue or the scene's end.
- **Keep the exhibit inside y 236–940.** The question line is drawn above it, so don't draw a background: the sheet is underneath.
- **Data and provenance.** Read data from `data/*.json`. Tag results with `self.provenance(kind, source)`, and draw claim glyphs with `claim_glyph(kind, color)` (shapes, not font glyphs).
- **Cost.** A 30 s scene takes about 60 s to render. `always_redraw` on hundreds of objects is slow.
- **Frame drift.** The CLI pads or trims to the exact frame count. A warning of more than 3 frames means your waits don't match the cues.

## Still scenes

`renderer: still` with `entry: assets/figure.png`: the image is shown as an `Exhibit` inside the content box (x 120–1800, y 236–930, contained; from y 330 when the headline is on) on the sheet, so it gets the shared chrome and a clean dissolve. Use one for an existing figure from a paper or repo. For anything with data you control, a web scene is almost always better.

## Honesty in pictures

Every scene that shows a result must let the viewer tell measurement from interpretation:

- **A `Claim` or provenance line** with the claim-class glyph: ● measured, ◐ interpretation, ○ hypothesis, △ limitation, ◌ not measured, ■ design.
- **Metaphors carry a dashed "not measured" flag** for the whole time they are on screen (see `basin.py`).
- **Illustrative layouts say so.** For example, "counts measured, cell order illustrative".
- **Two evaluation sets are never put on one axis.** Label which set each number was scored on.
- **Smoothed curves say "EMA"**, and magnified insets state their magnification.
- **Every `claims:` id on a narration line must exist** in the claims file. `pnpm video check` enforces this.
