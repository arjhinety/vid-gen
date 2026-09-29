/**
 * The recap board (lesson only): three takeaways, each written as it is said. Every row repeats
 * a result already claimed earlier in the film (see the script's claims on l17).
 * Cues: recap, r1, r2, r3.
 */
import { color, text } from "@vid/design";
import { Exhibit } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { RecapRow } from "./shared/devices.tsx";
import { TOP, X0, X1 } from "./shared/layout.ts";

export default function Recap() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const p = (name: string, dur = 0.4, o = 0) => clamp((f - cue.frame(name) - Math.round(o * fps)) / (dur * fps));
  const w = X1 - X0 - 80;
  return (
    <Exhibit>
      <div style={{ position: "absolute", left: X0, top: TOP + 30, ...text("label"), color: color.ink3, opacity: ease.arrive(p("recap", 0.3)) }}>THREE THINGS TO KEEP</div>
      <div style={{ position: "absolute", left: X0, top: TOP + 72, width: X1 - X0, height: 2, background: color.ink2, transformOrigin: "left", transform: `scaleX(${ease.travel(p("recap", 0.6, 0.1))})` }} />
      <RecapRow x={X0} y={TOP + 130} w={w} n={1} p={p("r1", 0.45, -0.1)}>
        A score can rise while the model gets worse.
        <div style={{ ...text("body"), fontSize: 26, color: color.ink3, marginTop: 6 }}>Look at how it fails.</div>
      </RecapRow>
      <RecapRow x={X0} y={TOP + 330} w={w} n={2} p={p("r2", 0.45, -0.1)}>
        Check every bin.
        <div style={{ ...text("body"), fontSize: 26, color: color.ink3, marginTop: 6 }}>An empty one measures nothing.</div>
      </RecapRow>
      <RecapRow x={X0} y={TOP + 530} w={w} n={3} p={p("r3", 0.45, -0.1)}>
        Fix the label, not the refusal.
      </RecapRow>
    </Exhibit>
  );
}
