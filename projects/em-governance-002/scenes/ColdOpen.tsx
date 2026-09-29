/**
 * Cold open. The three founders again; sixteen decision cards deal out and the first five
 * lift; then the lab's little house gets a dashed "company?" beside it (the crimson idea).
 * Cues: choices, sixteen, five, openai, company, card.
 */
import { color, shadow, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease, mix } from "@vid/motion";
import { Bean, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const GX = 1040;
const GY = TOP + 40;
const CW = 150;
const CH = 84;

export default function ColdOpen() {
  const { p } = useProgress();
  const lift = ease.arrive(p("five", 0.5));
  const hop = (i: number) => p("card", 0.35, i * 0.12) * (1 - p("card", 0.1, 0.4 + i * 0.12));
  return (
    <Exhibit from={0}>
      {FOUNDERS.map((w, i) => (
        <Bean key={w} who={w} x={330 + i * 230} y={TOP + 470} size={160} p={p(0, 0.5, 0.3 + i * 0.15)} mood={p("company", 0.1) > 0 ? "o" : "smile"} mark={p("company", 0.1) > 0 ? "?" : undefined} markP={p("company", 0.4, 0.4 + i * 0.1)} hop={hop(i)} />
      ))}

      {/* Sixteen decisions; five come first. */}
      {Array.from({ length: gov.founderChoices }, (_, i) => {
        const q = p("sixteen", 0.35, i * 0.06);
        if (q <= 0) return null;
        const first = i < gov.blocking;
        const a = ease.arrive(q);
        return (
          <div key={i} style={{ position: "absolute", left: GX + (i % 4) * (CW + 14), top: GY + Math.floor(i / 4) * (CH + 14) - (first ? lift * 8 : 0), width: CW, height: CH, background: first && lift > 0 ? color.ink : color.card, border: `2px solid ${first ? color.ink : color.hairline}`, borderRadius: 10, boxShadow: first ? shadow.card : undefined, opacity: clamp(a * 1.4), transform: `scale(${mix(0.8, 1, a)}) rotate(${(i % 3) - 1}deg)`, display: "flex", alignItems: "center", justifyContent: "center", ...text("value"), fontSize: 30, color: first && lift > 0 ? color.card : color.ink3 }}>
            {i + 1}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: GX, top: GY + 4 * (CH + 14) + 6, ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("five", 0.3, 0.4)) }}>
        {`${gov.founderChoices} founder decisions · the first ${gov.blocking} block the founding papers`}
      </div>

      {/* The lab, and maybe a company beside it. */}
      <Building x={GX + 20} y={TOP + 500} label="THE LAB" p={p("openai", 0.5)} />
      <Building x={GX + 340} y={TOP + 500} label="A COMPANY?" dashed p={p("company", 0.5)} />
      <div style={{ position: "absolute", left: GX + 250, top: TOP + 560, ...text("value"), fontSize: 34, color: color.red, opacity: ease.arrive(p("company", 0.3, 0.5)) }}>+</div>
      <Claim kind="design" note="the founders’ draft v0.1 · a proposal, not adopted" x={X0} y={CLAIM_Y} p={p("card", 0.3, 0.5)} />
    </Exhibit>
  );
}

function Building({ x, y, label, p, dashed = false }: { x: number; y: number; label: string; p: number; dashed?: boolean }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const c = dashed ? color.red : color.ink;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: clamp(a * 1.4) }}>
      <g transform={`translate(${x} ${y + (1 - a) * 12})`} strokeLinejoin="round">
        <path d="M -8 60 L 110 0 L 228 60 Z" fill={color.cardShade} stroke={c} strokeWidth={3} strokeDasharray={dashed ? "10 7" : undefined} />
        <rect x={0} y={58} width={220} height={120} fill={color.card} stroke={c} strokeWidth={3} strokeDasharray={dashed ? "10 7" : undefined} />
        <rect x={90} y={118} width={40} height={60} rx={20} fill={color.sheetShade} stroke={c} strokeWidth={2.5} />
        <text x={110} y={100} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight={500} fontSize={20} fill={c}>
          {label}
        </text>
      </g>
    </svg>
  );
}
