/**
 * The Board. Left: what the Board governs (money, people, contracts, risk). Right: the hard
 * line around results, a red dashed fence (the crimson idea), and inside it what the Board
 * may not do. Last, the sneaky version: a budget cut wearing a fake moustache, crossed out.
 * Cues: money, people, opens, results, soften, bury, authors, budget.
 */
import { color, text } from "@vid/design";
import { Checkbox, Claim, Cross, Exhibit, Label, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const FENCE = { x: 980, y: TOP + 20, w: X1 - 980, h: 560 };

export default function BoardLimits() {
  const { p } = useProgress();
  const fence = ease.travel(p("results", 0.9));
  return (
    <Exhibit from={0}>
      <Label x={X0} y={TOP + 24} p={p("money", 0.3, -0.4)} sub="the Board of Trustees">
        THE BOARD GOVERNS
      </Label>
      {FOUNDERS.map((w, i) => (
        <Bean key={w} who={w} x={X0 + 480 + i * 110} y={TOP + 150} size={70} hat="trustee" name={false} p={p("money", 0.4, -0.3 + i * 0.1)} />
      ))}
      <Chips y={TOP + 200} items={[["money", p("money", 0.35)], ["people", p("people", 0.35)], ["contracts", p("people", 0.35, 0.5)], ["risk", p("people", 0.35, 0.9)]]} big />
      <Chips
        y={TOP + 290}
        items={[
          ["budgets", p("line:b12#1", 0.35)],
          ["bank accounts", p("line:b12#1", 0.35, 0.4)],
          ["compute", p("line:b12#1", 0.35, 0.8)],
          ["hiring and pay", p("line:b12#1", 0.35, 1.2)],
          ["programs: open or close", p("opens", 0.35)],
        ]}
      />

      {/* The line around results. */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <rect x={FENCE.x} y={FENCE.y} width={FENCE.w} height={FENCE.h} rx={22} fill="none" stroke={color.red} strokeWidth={3.5} strokeDasharray="14 9" pathLength={1000} strokeDashoffset={0} opacity={fence} style={{ clipPath: `inset(0 ${(1 - fence) * 100}% 0 0)` }} />
      </svg>
      <Label x={FENCE.x + 30} y={FENCE.y + 26} p={p("results", 0.4, 0.4)} c={color.red} sub="the researchers’ call">
        RESULTS
      </Label>
      <div style={{ position: "absolute", left: FENCE.x + 30, top: FENCE.y + 120, ...text("label"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("soften", 0.3, -0.3)) }}>THE BOARD MAY NOT</div>
      {[
        ["change, soften or hide a result", "soften"],
        ["bury a negative result", "bury"],
        ["pick who is an author", "authors"],
        ["override a correction", "authors"],
        ["settle science with a title", "authors"],
      ].map(([label, cue], i) => (
        <Checkbox key={label} x={FENCE.x + 30} y={FENCE.y + 170 + i * 70} label={label} size={28} p={p(cue!, 0.35, i >= 3 ? 0.6 + (i - 3) * 0.4 : 0)} cross={p(cue!, 0.4, (i >= 3 ? 0.6 + (i - 3) * 0.4 : 0) + 0.3)} />
      ))}

      {/* The disguised version. */}
      <Disguise x={X0} y={TOP + 420} p={p("budget", 0.45)} />
      <Cross x={X0 + 90} y={TOP + 555} size={56} p={p("budget", 0.25, 1.6)} />
      <div style={{ position: "absolute", left: X0 + 360, top: TOP + 450, width: 440, ...text("body"), fontSize: 26, lineHeight: 1.3, color: color.ink2, opacity: ease.arrive(p("budget", 0.4, 0.8)) }}>
        a budget cut or a closed program, used to hide a result: <b style={{ color: color.ink, fontWeight: 600 }}>also prohibited</b>
      </div>
      <DocTag x={FENCE.x} y={FENCE.y + FENCE.h + 20} p={p("soften", 0.3, 0.5)}>
        PROVISIONAL · GDR-013, GDR-014
      </DocTag>
      <Claim kind="design" note="proposed limits on the Board (§5, §6)" x={X0} y={CLAIM_Y} p={p("budget", 0.3, 2.0)} />
    </Exhibit>
  );
}

function Chips({ y, items, big = false }: { y: number; items: Array<[string, number]>; big?: boolean }) {
  return (
    <div style={{ position: "absolute", left: X0, top: y, width: 780, display: "flex", flexWrap: "wrap", gap: 12 }}>
      {items.map(([s, q]) => (
        <Tag key={s} p={q} c={big ? color.ink : color.ink2} style={{ fontSize: big ? 30 : 22, padding: big ? "6px 16px" : "4px 12px" }}>
          {s}
        </Tag>
      ))}
    </div>
  );
}

/** A "budget cut" card wearing a fake moustache and glasses. */
function Disguise({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 330, height: 170, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 10}px) rotate(-2deg)` }}>
      <div style={{ position: "absolute", inset: 0, background: color.card, border: `2.5px solid ${color.ink}`, borderRadius: 12 }} />
      <div style={{ position: "absolute", left: 20, top: 14, ...text("label"), fontSize: 20, color: color.ink3 }}>BOARD MINUTE</div>
      <div style={{ position: "absolute", left: 20, top: 44, ...text("data"), fontSize: 30, color: color.ink }}>“budget cut”</div>
      <svg width={330} height={170} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g transform="translate(250 118)" strokeLinecap="round">
          <circle cx={-18} cy={-8} r={13} fill="none" stroke={color.ink} strokeWidth={3} />
          <circle cx={18} cy={-8} r={13} fill="none" stroke={color.ink} strokeWidth={3} />
          <path d="M -5 -9 Q 0 -13 5 -9" fill="none" stroke={color.ink} strokeWidth={3} />
          <path d="M 0 14 Q -12 6 -26 16 Q -14 22 0 17 Q 14 22 26 16 Q 12 6 0 14 Z" fill={color.ink} />
        </g>
      </svg>
    </div>
  );
}
