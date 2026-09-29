/**
 * Close. The repository's own line, set as the closing title (a card, like "The empty
 * bin." at the start, not a running caption); then the lab's mark, where to find
 * everything, and what comes next. Cues: grad, ckpt.
 */
import { color, text } from "@vid/design";
import { Exhibit, LogoMark, Stamp, WriteOn } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { X0 } from "./shared/layout.ts";

export default function Close() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const p = (name: string, dur = 0.35, o = 0) => clamp((f - cue.frame(name) - Math.round(o * fps)) / (dur * fps));
  const a = ease.arrive(p("ckpt", 0.5, 1.4));
  const dot = ease.travel(p("ckpt", 0.6, 1.7));
  return (
    <Exhibit from="grad" until={false}>
      <div style={{ position: "absolute", left: X0, top: 300, ...text("title"), color: color.ink, whiteSpace: "nowrap" }}>
        <div>
          <WriteOn text="Every gradient is a hypothesis." p={p("grad", 1.1)} />
        </div>
        <div style={{ marginTop: 8 }}>
          <WriteOn text="Every checkpoint is evidence." p={p("ckpt", 1.0)} c={color.ink} />
        </div>
      </div>
      <div style={{ position: "absolute", left: X0, top: 480, ...text("crumb"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("ckpt", 0.4, 1.0)) }}>OPENGRAD README</div>
      <div style={{ position: "absolute", left: 0, top: 590, width: 1920, height: 120, opacity: clamp(a * 1.3), transform: `translateY(${(1 - a) * 10}px)` }}>
        <LogoMark size={96} x={640} y={0} dot={dot} />
        <div style={{ position: "absolute", left: 768, top: 12, whiteSpace: "nowrap", fontFamily: '"Archivo"', fontSize: 74, letterSpacing: "-0.02em", color: color.ink }}>
          <span style={{ fontWeight: 300 }}>Experimental </span>
          <span style={{ fontWeight: 800, fontStretch: "112%" }}>Labs</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, top: 736, width: 1920, textAlign: "center", ...text("value"), fontSize: 24, color: color.ink2, opacity: ease.arrive(p("ckpt", 0.4, 1.8)) }}>
        <b style={{ color: color.ink }}>opengrad</b>.arjhinety.com · github.com/<b style={{ color: color.ink }}>arjhinety/OpenGrad</b> · tag study-001
      </div>
      <Stamp x={1920 / 2 - 150} y={810} head="NEXT" p={p("ckpt", 0.25, 2.3)} w={300} style={{ textAlign: "center", fontSize: 22 }}>
        Study 002
      </Stamp>
    </Exhibit>
  );
}
