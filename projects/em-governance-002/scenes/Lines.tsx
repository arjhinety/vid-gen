/**
 * The two lines around money. "consulting" struck through; then a gate between the lab and a
 * founders' company, locked until the Board has two trustees with no stake (the lock is the
 * crimson idea); then a big question mark over the company.
 * Cues: lines, consulting, twofree, big.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, Plaque, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

export default function Lines() {
  const { p } = useProgress();
  return (
    <Exhibit from={0}>
      <div style={{ position: "absolute", left: X0, top: TOP + 30, display: "flex", alignItems: "center", gap: 18, opacity: ease.arrive(p("consulting", 0.4, -0.3)) }}>
        <span style={{ ...text("bigNumber"), fontSize: 44, color: color.ink }}>14</span>
        <Tag p={1} strike={p("consulting", 0.4, 0.3)} c={color.ink} style={{ fontSize: 30, padding: "6px 16px" }}>
          consulting as a business
        </Tag>
        <span style={{ ...text("meta"), fontSize: 20, color: color.ink2 }}>no managed services, no paid private benchmarks</span>
      </div>

      <div style={{ position: "absolute", left: X0, top: TOP + 130, ...text("bigNumber"), fontSize: 44, color: color.ink, opacity: ease.arrive(p("line:b12#2", 0.3)) }}>15</div>
      <Plaque x={X0 + 90} y={TOP + 140} w={440} h={150} kicker="THE LAB" title="non-profit" p={p("line:b12#2", 0.4)} />
      <Plaque x={X0 + 1080} y={TOP + 140} w={440} h={150} kicker="A COMPANY THE FOUNDERS OWN" title="for-profit" dashed p={p("line:b12#2", 0.4, 0.4)} />
      <Gate x={X0 + 800} y={TOP + 215} p={p("line:b12#2", 0.4, 0.8)} lock={p("twofree", 0.3, 0.3)} />
      <div style={{ position: "absolute", left: X0 + 560, width: 500, top: TOP + 310, textAlign: "center", ...text("body"), fontSize: 26, lineHeight: 1.3, color: color.ink2, opacity: ease.arrive(p("twofree", 0.4, 0.6)) }}>
        {`no deals until ${gov.disinterested} trustees have no stake in the company`}
      </div>

      {/* Today: all three would have a stake. */}
      {["arjhine", "alpha", "john"].map((w, i) => (
        <Bean key={w} who={w as "arjhine"} x={X0 + 200 + i * 150} y={TOP + 600} size={95} hat="trustee" p={p("twofree", 0.4, 0.8 + i * 0.1)} mood="o" />
      ))}
      <div style={{ position: "absolute", left: X0 + 90, top: TOP + 645, ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("twofree", 0.3, 1.4)) }}>today, all three trustees would have a stake</div>
      <div style={{ position: "absolute", left: X0 + 1180, top: TOP + 330, ...text("display"), fontSize: 200, lineHeight: 1, color: color.ink, opacity: ease.arrive(p("twofree", 0.4, 3.2)), transform: `scale(${0.8 + 0.2 * ease.arrive(p("twofree", 0.4, 3.2))})` }}>?</div>
      <DocTag x={X0 + 700} y={TOP + 560} p={p("twofree", 0.3, 1.8)}>
        {"FOUNDER REVIEW 14 and 15 · GDR-027, GDR-023"}
      </DocTag>
      <Claim kind="design" note="the draft’s suggestions (§9, §11, §16)" x={X0 + 700} y={CLAIM_Y + 8} p={p("twofree", 0.3, 2.0)} />
    </Exhibit>
  );
}

function Gate({ x, y, p, lock }: { x: number; y: number; p: number; lock: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const l = ease.slam(clamp(lock));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: clamp(a * 1.4) }}>
      <g transform={`translate(${x} ${y})`}>
        <line x1={-200} y1={0} x2={200} y2={0} stroke={color.ink3} strokeWidth={3} strokeDasharray="10 7" />
        <rect x={-60} y={-60} width={120} height={120} rx={8} fill={color.card} stroke={color.ink} strokeWidth={3} />
        {[-30, 0, 30].map((dx) => (
          <line key={dx} x1={dx} y1={-60} x2={dx} y2={60} stroke={color.ink} strokeWidth={3} />
        ))}
        {l > 0 && (
          <g transform={`translate(0 ${10}) scale(${1.4 - 0.4 * l})`} opacity={clamp(lock * 3)}>
            <path d="M -14 -4 L -14 -20 Q -14 -34 0 -34 Q 14 -34 14 -20 L 14 -4" fill="none" stroke={color.red} strokeWidth={6} />
            <rect x={-24} y={-6} width={48} height={38} rx={7} fill={color.red} />
          </g>
        )}
      </g>
    </svg>
  );
}
