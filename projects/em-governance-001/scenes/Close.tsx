/**
 * Close. The three friends again; the answer writes on in three words (time, paper, an
 * outsider), the last in crimson as the outsider pops in beside them. Then the lab's name.
 * Cues: time, paper, outsiderc.
 */
import { color, text } from "@vid/design";
import { Exhibit, LogoMark, WriteOn } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { TOP, X0 } from "./shared/layout.ts";

export default function Close() {
  const { p } = useProgress();
  const words: Array<[string, string]> = [
    ["time", "time,"],
    ["paper", "paper,"],
    ["outsiderc", "and an outsider."],
  ];
  const mark = ease.arrive(p("outsiderc", 0.5, 2.0));
  return (
    <Exhibit from={0} until={false}>
      {FOUNDERS.map((w, i) => (
        <Bean key={w} who={w} x={560 + i * 220} y={TOP + 370} size={150} p={p(0, 0.5, 0.2 + i * 0.12)} mood={p("outsiderc", 0.1) > 0 ? "open" : "smile"} hop={p("outsiderc", 0.35, 0.3 + i * 0.12) * (1 - p("outsiderc", 0.1, 0.65 + i * 0.12))} />
      ))}
      <Bean who="outsider" x={1300} y={TOP + 370} size={150} name="the outsider" p={p("outsiderc", 0.5)} mood="smile" mark="heart" markP={p("outsiderc", 0.4, 0.5)} />
      <div style={{ position: "absolute", left: X0, top: TOP + 440, ...text("title"), fontSize: 64, color: color.ink, whiteSpace: "nowrap" }}>
        {words.map(([cue, s], i) => (
          <span key={cue} style={{ marginRight: 24, color: i === 2 ? color.red : color.ink }}>
            <WriteOn text={s} p={p(cue, 0.7)} c={i === 2 ? color.red : color.ink} />
          </span>
        ))}
      </div>
      <div style={{ position: "absolute", left: 0, top: TOP + 575, width: 1920, height: 100, opacity: clamp(mark * 1.3), transform: `translateY(${(1 - mark) * 10}px)` }}>
        <LogoMark size={72} x={650} y={6} dot={ease.travel(p("outsiderc", 0.6, 2.3))} />
        <div style={{ position: "absolute", left: 746, top: 8, whiteSpace: "nowrap", fontFamily: '"Archivo"', fontSize: 58, letterSpacing: "-0.02em", color: color.ink }}>
          <span style={{ fontWeight: 300 }}>Experimental </span>
          <span style={{ fontWeight: 800, fontStretch: "112%" }}>Machines</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, width: 1920, top: TOP + 668, textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("outsiderc", 0.4, 2.8)) }}>
        founding governance design · draft v0.1 · a proposal to argue with
      </div>
    </Exhibit>
  );
}
