/**
 * Decision 4, who lives where. Two ID cards: the Treasurer (John) must be a resident; the
 * Corporate Secretary (Arjhine) a citizen and resident. Each card gets a "to confirm" box;
 * the dashed red swap arrow is the fallback (the crimson idea).
 * Cues: where, treasurer, secretary, confirm, swap.
 */
import { color, shadow, text } from "@vid/design";
import { Checkbox, Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { DecisionHead } from "./shared/decision.tsx";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

export default function D4Residency() {
  const { p } = useProgress();
  return (
    <Exhibit from={0}>
      <DecisionHead n={4} title="who lives where" def="the law’s rules for two of the offices" p={p("where", 1.0)} />
      <IdCard x={X0 + 60} who="john" office="Treasurer" rule={gov.residency.Treasurer} p={p("treasurer", 0.5)} confirmP={p("confirm", 0.4)} />
      <IdCard x={X0 + 860} who="arjhine" office="Corporate Secretary" rule={gov.residency.Secretary} p={p("secretary", 0.5)} confirmP={p("confirm", 0.4, 0.4)} />

      {/* If either can't: swap offices. */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: ease.arrive(p("swap", 0.4)) }}>
        <path d={`M ${X0 + 560} ${TOP + 540} Q ${X0 + 800} ${TOP + 640} ${X0 + 1040} ${TOP + 540}`} fill="none" stroke={color.red} strokeWidth={3} strokeDasharray="10 7" />
        <path d={`M ${X0 + 1040} ${TOP + 540} l -18 2 M ${X0 + 1040} ${TOP + 540} l -6 16`} stroke={color.red} strokeWidth={3} strokeLinecap="round" />
        <path d={`M ${X0 + 560} ${TOP + 540} l 18 2 M ${X0 + 560} ${TOP + 540} l 6 16`} stroke={color.red} strokeWidth={3} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", left: X0 + 600, width: 400, top: TOP + 610, textAlign: "center", ...text("data"), fontSize: 28, color: color.red, opacity: ease.arrive(p("swap", 0.3, 0.4)) }}>
        if either can’t: swap offices
      </div>
      <DocTag x={X0} y={TOP + 610} p={p("swap", 0.3, 0.8)}>
        {"FOUNDER REVIEW 4 · blocks the Articles"}
      </DocTag>
      <Claim kind="author-interpretation" note="the draft’s reading of RCC Sec. 24 · counsel to check" x={X0} y={CLAIM_Y} p={p("swap", 0.3, 1.2)} />
    </Exhibit>
  );
}

function IdCard({ x, who, office, rule, p, confirmP }: { x: number; who: "john" | "arjhine"; office: string; rule: string; p: number; confirmP: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const name = who === "john" ? "John" : "Arjhine";
  return (
    <div style={{ position: "absolute", left: x, top: TOP + 140, width: 640, height: 340, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 14}px) rotate(${who === "john" ? -1.2 : 1}deg)` }}>
      <div style={{ position: "absolute", inset: 0, background: color.card, border: `2.5px solid ${color.ink}`, borderRadius: 18, boxShadow: shadow.card }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 52, background: color.ink, borderRadius: "16px 16px 0 0" }} />
      <div style={{ position: "absolute", left: 24, top: 14, ...text("label"), fontSize: 20, color: color.card }}>{office.toUpperCase()}</div>
      <Bean who={who} x={130} y={290} size={130} name={name} p={1} mood={confirmP > 0 ? "open" : "smile"} />
      <div style={{ position: "absolute", left: 260, top: 92, ...text("label"), fontSize: 18, color: color.ink3 }}>MUST BE</div>
      <div style={{ position: "absolute", left: 260, top: 124, width: 350, ...text("data"), fontSize: 30, lineHeight: 1.25, color: color.ink }}>{`a ${rule}`}</div>
      <Checkbox x={260} y={250} label="to confirm" size={30} p={confirmP} tick={0} />
    </div>
  );
}
