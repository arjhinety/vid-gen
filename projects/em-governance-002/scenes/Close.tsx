/**
 * Close. The three founders and the outsider together; one line writes on; the lab's name.
 * Cues: calm.
 */
import { color, text } from "@vid/design";
import { Exhibit, LogoMark, WriteOn } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { TOP, X0 } from "./shared/layout.ts";

export default function Close() {
  const { p } = useProgress();
  const mark = ease.arrive(p("calm", 0.5, 2.0));
  return (
    <Exhibit from={0} until={false}>
      {FOUNDERS.map((w, i) => (
        <Bean key={w} who={w} x={560 + i * 220} y={TOP + 370} size={150} p={p(0, 0.5, 0.2 + i * 0.12)} mood="open" mark={i === 1 ? "heart" : undefined} markP={p("calm", 0.4, 1.0)} />
      ))}
      <Bean who="outsider" x={1300} y={TOP + 370} size={150} name="the outsider" p={p(0, 0.5, 0.6)} mood="smile" />
      <div style={{ position: "absolute", left: X0, top: TOP + 440, ...text("title"), fontSize: 56, color: color.ink, whiteSpace: "nowrap" }}>
        <WriteOn text="Decide the hard things while everyone agrees." p={p("calm", 1.4, -1.2)} />
      </div>
      <div style={{ position: "absolute", left: 0, top: TOP + 575, width: 1920, height: 100, opacity: clamp(mark * 1.3), transform: `translateY(${(1 - mark) * 10}px)` }}>
        <LogoMark size={72} x={650} y={6} dot={ease.travel(p("calm", 0.6, 2.3))} />
        <div style={{ position: "absolute", left: 746, top: 8, whiteSpace: "nowrap", fontFamily: '"Archivo"', fontSize: 58, letterSpacing: "-0.02em", color: color.ink }}>
          <span style={{ fontWeight: 300 }}>Experimental </span>
          <span style={{ fontWeight: 800, fontStretch: "112%" }}>Machines</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, width: 1920, top: TOP + 668, textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("calm", 0.4, 2.8)) }}>
        founding governance · the decisions · draft v0.1 · not legal advice
      </div>
    </Exhibit>
  );
}
