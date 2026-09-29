/**
 * Decision 5, expense claims. A receipt handed to another trustee who approves it (the
 * draft's suggestion), next to a flat daily allowance envelope marked "could look like
 * pay" (the crimson idea).
 * Cues: expenses, yes, receipts, another, allowance.
 */
import { color, shadow, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { DecisionHead, Option } from "./shared/decision.tsx";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

export default function D5Expenses() {
  const { p } = useProgress();
  const recP = p("yes", 0.4);
  return (
    <Exhibit from={0}>
      <DecisionHead n={5} title="expense claims" def="paying back what a trustee spent for the lab" p={p("expenses", 1.0)} />
      <Option y={TOP + 130} letter="A" label="true reimbursement" sub="receipts, approved by another trustee" p={p("yes", 0.4, -0.2)} rec recP={recP} />
      <Option y={TOP + 250} letter="B" label="no claims in the first year" sub="founders pay their own costs" p={p("yes", 0.4, 0.6)} recP={recP} />

      {/* A receipt, approved by someone else. */}
      <Receipt x={1000} y={TOP + 130} p={p("receipts", 0.5)} />
      <Arrow points={[[1250, TOP + 250], [1380, TOP + 250]]} p={p("another", 0.5)} />
      <Bean who="alpha" x={1480} y={TOP + 320} size={110} name="another trustee" p={p("another", 0.5, -0.2)} holds="vote" holdP={p("another", 0.4, 0.5)} mood="open" />

      {/* The riskier flat allowance. */}
      <Envelope x={1040} y={TOP + 420} p={p("allowance", 0.5)} />
      <div style={{ position: "absolute", left: 1330, top: TOP + 450, width: 420, ...text("data"), fontSize: 28, lineHeight: 1.25, color: color.red, opacity: ease.arrive(p("allowance", 0.4, 0.6)) }}>
        a flat allowance could look like pay to the tax office
      </div>
      <DocTag x={X0} y={TOP + 400} p={p("allowance", 0.3, 0.9)}>
        {"FOUNDER REVIEW 5 · shapes the “unpaid trustees” clause"}
      </DocTag>
      <Claim kind="design" note="the draft’s suggestion; per diems carry tax risk, as the draft reads it" x={X0} y={CLAIM_Y} p={p("allowance", 0.3, 1.3)} />
    </Exhibit>
  );
}

function Receipt({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const zig = Array.from({ length: 12 }, (_, i) => `${i * 20},${i % 2 ? 0 : 10}`).join(" ");
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 230, height: 230, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 14}px) rotate(-3deg)` }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 230, height: 214, background: color.card, boxShadow: shadow.card }} />
      <svg width={230} height={20} style={{ position: "absolute", left: 0, top: 212 }}>
        <polyline points={zig} fill={color.card} stroke="none" />
      </svg>
      <div style={{ position: "absolute", left: 18, top: 16, ...text("label"), fontSize: 18, color: color.ink3 }}>RECEIPT</div>
      {[70, 55, 80].map((w, i) => (
        <div key={i} style={{ position: "absolute", left: 18, top: 56 + i * 22, height: 7, width: `${w}%`, background: color.sheetShade, borderRadius: 4 }} />
      ))}
      <div style={{ position: "absolute", left: 18, top: 140, ...text("meta"), fontSize: 20, color: color.ink2 }}>trip to a meeting</div>
      <div style={{ position: "absolute", left: 18, right: 18, top: 176, height: 2, background: color.ink }} />
    </div>
  );
}

function Envelope({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: clamp(a * 1.4) }}>
      <g transform={`translate(${x} ${y + (1 - a) * 12}) rotate(2)`}>
        <rect width={240} height={150} rx={8} fill={color.card} stroke={color.ink} strokeWidth={2.5} />
        <path d="M 0 0 L 120 80 L 240 0" fill="none" stroke={color.ink} strokeWidth={2.5} />
        <text x={120} y={132} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={20} fill={color.ink2}>
          per day, flat
        </text>
      </g>
    </svg>
  );
}
