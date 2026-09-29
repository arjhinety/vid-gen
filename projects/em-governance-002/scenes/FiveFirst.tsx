/**
 * The five that come first: five cards chained to a locked Articles of Incorporation (the
 * padlock is the crimson idea).
 * Cues: block, settled.
 */
import { color, shadow, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, DocTag, useProgress } from "./shared/cast.tsx";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

export const FIVE = ["purpose wording", "office address", "starting money", "who lives where", "expense claims"];
const W = 300;
const GAP = (1640 - 5 * W) / 4;

export default function FiveFirst() {
  const { p } = useProgress();
  const doc = ease.arrive(p("settled", 0.5));
  return (
    <Exhibit from={0}>
      {FIVE.map((s, i) => {
        const q = ease.arrive(p("block", 0.4, i * 0.15));
        return (
          <div key={s} style={{ position: "absolute", left: X0 + i * (W + GAP), top: TOP + 40, width: W, height: 150, background: color.card, border: `2.5px solid ${color.ink}`, borderRadius: 14, boxShadow: shadow.card, opacity: clamp(q * 1.4), transform: `translateY(${(1 - q) * 14}px)` }}>
            <div style={{ position: "absolute", left: 20, top: 14, ...text("bigNumber"), fontSize: 44, color: color.ink }}>{i + 1}</div>
            <div style={{ position: "absolute", left: 20, top: 84, ...text("data"), fontSize: 30, color: color.ink }}>{s}</div>
          </div>
        );
      })}
      {FIVE.map((_, i) => (
        <Arrow key={i} points={[[X0 + i * (W + GAP) + W / 2, TOP + 200], [960 + (i - 2) * 60, TOP + 330]]} p={p("settled", 0.5, i * 0.08)} c={color.ink3} width={2} head={false} />
      ))}

      {/* The Articles, locked until the five are settled. */}
      <div style={{ position: "absolute", left: 960 - 330, top: TOP + 340, width: 660, height: 190, background: color.card, boxShadow: shadow.lifted, opacity: clamp(doc * 1.4), transform: `translateY(${(1 - doc) * 16}px)` }}>
        <div style={{ position: "absolute", left: 30, top: 24, ...text("label"), fontSize: 20, color: color.ink3 }}>TO BE DRAFTED</div>
        <div style={{ position: "absolute", left: 30, top: 60, ...text("heading"), fontSize: 40, color: color.ink }}>Articles of Incorporation</div>
        {[80, 64, 72].map((w, i) => (
          <div key={i} style={{ position: "absolute", left: 30, top: 124 + i * 18, height: 7, width: `${w * 0.8}%`, background: color.sheetShade, borderRadius: 4 }} />
        ))}
      </div>
      <Lock x={960 + 300} y={TOP + 350} p={p("settled", 0.3, 0.6)} />
      <div style={{ position: "absolute", left: 960 - 330, width: 660, top: TOP + 560, textAlign: "center", ...text("body"), fontSize: 26, color: color.ink2, opacity: ease.arrive(p("settled", 0.4, 1.0)) }}>
        can’t be drafted until these five are settled
      </div>
      <DocTag x={X0} y={TOP + 590} p={p("settled", 0.3, 1.4)}>
        FOUNDER REVIEW REQUIRED · items 1 to 5
      </DocTag>
      <Claim kind="design" note="the draft’s own list (§17)" x={X0} y={CLAIM_Y} p={p("settled", 0.3, 1.6)} />
    </Exhibit>
  );
}

function Lock({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.slam(clamp(p));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <g transform={`translate(${x} ${y}) scale(${1.4 - 0.4 * a})`} opacity={clamp(p * 3)}>
        <path d="M -20 -4 L -20 -26 Q -20 -48 0 -48 Q 20 -48 20 -26 L 20 -4" fill="none" stroke={color.red} strokeWidth={7} />
        <rect x={-34} y={-8} width={68} height={52} rx={9} fill={color.red} />
        <circle cx={0} cy={14} r={7} fill={color.card} />
      </g>
    </svg>
  );
}
