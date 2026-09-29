/**
 * Where rules live: four documents as a staircase from hardest to easiest to change, each
 * with what it takes to change it and an example of what lives there. The rule of thumb
 * lands last, under a padlock on the Articles (the one crimson idea: hard on purpose).
 * Cues: live, articles, bylaws, policies, agreements, should.
 */
import { color, shadow, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { useProgress } from "./shared/cast.tsx";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const DOCS: Array<{ cue: string; name: string; change: string; holds: string }> = [
  { cue: "articles", name: "Articles of Incorporation", change: "2/3 of members + SEC approval", holds: "the mission · non-profit · no pay for trustees" },
  { cue: "bylaws", name: "By-Laws", change: "a member vote (2/3 for protected parts)", holds: "membership · Board · conflicts · research independence" },
  { cue: "policies", name: "Policies", change: "a Board vote", holds: "pay bands · IP rules · sponsor terms · spending limits" },
  { cue: "agreements", name: "Agreements", change: "signed by each person", holds: "who owns what they make" },
];

export default function WhereRules() {
  const { p } = useProgress();
  const lock = ease.slam(p("should", 0.3, 0.4));
  return (
    <Exhibit from={0}>
      <div style={{ position: "absolute", left: X0, top: TOP + 10, ...text("label"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("live", 0.3)) }}>HARDEST TO CHANGE ↓ EASIEST</div>
      {DOCS.map((d, i) => (
        <Doc key={d.cue} x={X0 + i * 90} y={TOP + 60 + i * 140} {...d} p={p(d.cue, 0.4)} />
      ))}
      {/* A padlock on the Articles. */}
      {lock > 0 && (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <g transform={`translate(${X0 + 1150} ${TOP + 110}) scale(${1.3 - 0.3 * lock})`} opacity={clamp(lock * 2)}>
            <path d="M -18 -6 L -18 -24 Q -18 -44 0 -44 Q 18 -44 18 -24 L 18 -6" fill="none" stroke={color.red} strokeWidth={6} />
            <rect x={-30} y={-8} width={60} height={46} rx={8} fill={color.red} />
            <circle cx={0} cy={12} r={6} fill={color.card} />
          </g>
        </svg>
      )}
      <div style={{ position: "absolute", left: X0 + 1200, top: TOP + 90, width: 420, ...text("body"), fontSize: 26, lineHeight: 1.3, color: color.ink, opacity: ease.arrive(p("should", 0.4, 0.8)) }}>
        hard to change only if changing it <b style={{ fontWeight: 650 }}>should</b> be hard
      </div>
      <Claim kind="design" note="where-each-rule-lives map (§15)" x={X0} y={CLAIM_Y + 10} p={p("should", 0.3, 1.4)} />
    </Exhibit>
  );
}

function Doc({ x, y, name, change, holds, p }: { x: number; y: number; name: string; change: string; holds: string; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 1000, height: 120, background: color.card, boxShadow: shadow.card, border: `2px solid ${color.ink}`, borderRadius: 12, opacity: clamp(a * 1.4), transform: `translateX(${(1 - a) * -20}px)` }}>
      <div style={{ position: "absolute", left: 24, top: 16, ...text("heading"), fontSize: 32, color: color.ink }}>{name}</div>
      <div style={{ position: "absolute", right: 22, top: 22, ...text("meta"), fontSize: 20, color: color.ink2 }}>{change}</div>
      <div style={{ position: "absolute", left: 24, top: 70, ...text("meta"), fontSize: 20, color: color.ink3 }}>{holds}</div>
    </div>
  );
}
