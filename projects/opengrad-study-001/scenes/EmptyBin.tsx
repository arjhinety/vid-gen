/**
 * The empty bin. The four trays return (the persistent object) and the held-out set is
 * counted into them; the ANSWER tray stays empty and holds in silence. The answering
 * score divides by zero, reads zero for every model, and its one gate check is skipped.
 * Cues: line:b12#0 (the question), count, empty, zero, off, title.
 */
import { color, text } from "@vid/design";
import { Checkbox, Claim, DotField, Exhibit, Stamp, Tag, Term, Trays } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { heldout, MODES } from "./shared/data.ts";
import { goldLayout } from "./shared/dots.ts";
import { TOP, trays, X0, X1 } from "./shared/layout.ts";

const TRAY_TOP = 530;
const TRAY_H = 250;
const T = trays(TRAY_TOP, TRAY_H);
const GOLD = goldLayout(TRAY_TOP, TRAY_H);
const ABOVE = GOLD.map((q) => ({ x: q.x, y: TRAY_TOP - 70 + (q.y - TRAY_TOP) * 0.2 }));

export default function EmptyBin() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const at = (name: string, o = 0) => cue.frame(name) + Math.round(o * fps);
  const p = (name: string, dur = 0.3, o = 0) => clamp((f - at(name, o)) / (dur * fps));
  const settle = p("count", 1.4, 0.1);
  const answer = T[3]!.rect;
  const flag = ease.settle(p("empty", 0.5));

  return (
    <Exhibit from={0}>
      <Trays trays={T} p={p("line:b12#0", 0.6, 0.4)} labelP={p("line:b12#0", 0.3, 0.8)} glow={{ ANSWER: flag }} counts={Object.fromEntries(MODES.map((m) => [m, m === "ANSWER" ? "" : heldout[m].toLocaleString("en-US")]))} countP={p("count", 0.3, 1.2)} />
      {settle > 0 && <DotField from={ABOVE} to={GOLD} p={settle} spread={0.5} fromColor={color.ink} r={3.6} lift={0} />}
      {/* ANSWER: nothing to count. */}
      <div style={{ position: "absolute", left: answer.x, top: answer.y - 76, width: answer.w, textAlign: "center", ...text("value"), fontSize: 52, color: color.red, opacity: ease.arrive(p("empty", 0.4)) }}>0</div>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <rect x={answer.x - 14} y={answer.y - 14} width={answer.w + 28} height={answer.h + 28} fill="none" stroke={color.red} strokeWidth={3} strokeDasharray="12 8" opacity={flag} />
      </svg>

      {/* The answering score: nothing to divide by. */}
      <Term x={X0} y={TOP + 20} def="right answers ÷ questions that should just be answered" p={p("zero", 1.0, -0.1)}>
        the answering score
      </Term>
      <div style={{ position: "absolute", left: X0, top: TOP + 130, ...text("value"), fontSize: 48, color: color.red, opacity: ease.arrive(p("zero", 0.4, 0.5)), whiteSpace: "nowrap" }}>0 ÷ 0</div>
      <div style={{ position: "absolute", left: X0 + 190, top: TOP + 140, display: "flex", gap: 12 }}>
        {["original", "fine-tuned", "preference"].map((m, i) => (
          <Tag key={m} p={p("off", 0.25, -0.6 + i * 0.15)} c={color.red} style={{ fontSize: 20 }}>
            {m} · 0
          </Tag>
        ))}
      </div>

      {/* The gate's answering check, switched off. */}
      <div style={{ position: "absolute", left: X1 - 560, top: TOP + 34, ...text("label"), color: color.ink3, opacity: ease.arrive(p("off", 0.3, -0.3)) }}>THE GATE</div>
      <Checkbox x={X1 - 560} y={TOP + 80} size={30} label={<span style={{ fontSize: 26 }}>answering score ≥ 0.40</span>} strike={p("off", 0.5, 0.2)} p={p("off", 0.3, -0.2)} />
      <Stamp x={X1 - 540} y={TOP + 136} head="SKIPPED" p={p("off", 0.25, 0.7)} style={{ fontSize: 22 }}>
        it could never pass
      </Stamp>
      <Stamp x={answer.x - 30} y={answer.y + answer.h / 2 - 44} head="THE EMPTY BIN" p={p("title", 0.25)} tilt={-3} style={{ fontSize: 24 }} />
      <Claim kind="measured" note="held-out gold counts; the study's lessons document" x={X0} y={TOP + 660} p={p("count", 0.3, 1.8)} />
    </Exhibit>
  );
}
