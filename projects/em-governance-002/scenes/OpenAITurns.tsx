/**
 * The twists, as six stops on one line (evenly spaced, dated; not to scale). Above: a card
 * per stop. Below: the CEO bean that steps out and comes back, the attorneys general's
 * review as a bracket with two officials, and the verdict's tag. The crimson idea: the
 * nonprofit keeps control.
 * Cues: twists, fired, rehire, run, ag, kept, foundation, late.
 */
import type { ReactNode } from "react";
import { color, text } from "@vid/design";
import { Claim, Exhibit, Tag } from "@vid/kit";
import { clamp, ease, mix } from "@vid/motion";
import { Bean, useProgress } from "./shared/cast.tsx";
import { oa } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const LINE_Y = TOP + 330;
const CARD_W = 250;
const sx = (i: number) => X0 + 130 + i * 276;

export default function OpenAITurns() {
  const { p } = useProgress();
  const out = ease.arrive(p("fired", 0.5, 0.3)) * (1 - ease.arrive(p("rehire", 0.5)));
  const line = ease.travel(p("twists", 0.8));
  const stops: Array<{ cue: string; date: string; body: ReactNode; red?: boolean; extra?: ReactNode; extraCue?: string }> = [
    { cue: "fired", date: oa.fired, body: "the board fires its own CEO", extra: `…and decides to rehire the CEO ${oa.rehireDays} days later`, extraCue: "rehire" },
    { cue: "ag", date: oa.agStart, body: "state attorneys general begin a review" },
    { cue: "run", date: oa.pbcPlan, body: "plan: the for-profit would “run and control” the business" },
    { cue: "kept", date: oa.reversal, body: "the nonprofit keeps control", red: true },
    {
      cue: "foundation",
      date: oa.recapClosed,
      body: (
        <>
          <div style={{ ...text("bigNumber"), fontSize: 52, color: color.ink, marginBottom: 4 }}>{`${oa.foundationPct}%`}</div>
          the OpenAI Foundation’s share of the company
        </>
      ),
      extra: `it ${oa.replaceDirectors}`,
      extraCue: "foundation",
    },
    { cue: "late", date: oa.verdictDate, body: "a co-founder’s charity claims: filed too late" },
  ];
  return (
    <Exhibit from={0}>
      {/* The line. */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={X0} y1={LINE_Y} x2={mix(X0, X1, line)} y2={LINE_Y} stroke={color.ink} strokeWidth={3} />
        {stops.map((s, i) => {
          const q = ease.arrive(p(s.cue, 0.3));
          return q > 0 ? <circle key={i} cx={sx(i)} cy={LINE_Y} r={9 * q} fill={s.red ? color.red : color.ink} /> : null;
        })}
      </svg>

      {stops.map((s, i) => (
        <Card key={i} x={sx(i) - CARD_W / 2} p={p(s.cue, 0.4)} date={s.date} red={s.red} extra={s.extra} extraP={s.extraCue ? p(s.extraCue, 0.4, s.extraCue === s.cue ? 1.2 : 0) : 0}>
          {s.body}
        </Card>
      ))}

      {/* Below the line: the CEO steps out and comes back. */}
      <Bean who="plain" x={sx(0) + mix(0, 40, out)} y={TOP + 540} size={80} hat="officer" mood={out > 0.3 ? "o" : "smile"} dim={0.85 * out} hop={p("rehire", 0.5, 0.2)} p={p("fired", 0.4, -0.4)} name="the CEO" />

      {/* The review, over a year. */}
      <Bracket x1={sx(1)} x2={sx(4)} y={LINE_Y + 34} p={p("ag", 0.6, 0.3)} />
      <div style={{ position: "absolute", left: sx(1), width: sx(4) - sx(1), top: LINE_Y + 60, textAlign: "center", ...text("body"), fontSize: 24, color: color.ink2, opacity: ease.arrive(p("ag", 0.4, 0.8)) }}>
        {`the review lasted ${oa.review} · the officials who guard charities`}
      </div>
      {[0, 1].map((i) => (
        <Bean key={i} who="outsider" x={sx(1) + 200 + i * 430} y={TOP + 590} size={72} mood="flat" mark="?" markP={p("ag", 0.4, 1.4 + i * 0.2)} p={p("ag", 0.4, 1.0 + i * 0.15)} name={false} />
      ))}

      {/* The verdict. */}
      <div style={{ position: "absolute", left: sx(5) - CARD_W / 2, top: LINE_Y + 40, width: CARD_W }}>
        <Tag p={p("late", 0.4, 0.8)} c={color.ink} style={{ fontSize: 22 }}>
          {oa.verdict}
        </Tag>
        <div style={{ ...text("body"), fontSize: 22, lineHeight: 1.3, color: color.ink2, marginTop: 12, opacity: ease.arrive(p("late", 0.4, 1.4)) }}>decided on timing, not on whether the change was right</div>
      </div>

      <Claim kind="measured" note="OpenAI’s posts, the Delaware AG, the court docket · links in the receipts" x={X0} y={CLAIM_Y} p={p("late", 0.3, 1.8)} />
    </Exhibit>
  );
}

function Card({ x, p, date, red, extra, extraP, children }: { x: number; p: number; date: string; red?: boolean; extra?: ReactNode; extraP: number; children: ReactNode }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const e = ease.arrive(clamp(extraP));
  return (
    <div style={{ position: "absolute", left: x, bottom: 1080 - (LINE_Y - 22), width: CARD_W, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 10}px)` }}>
      <div style={{ ...text("label"), fontSize: 20, color: red ? color.red : color.ink3, marginBottom: 8 }}>{date}</div>
      <div style={{ background: color.card, border: `${red ? 3 : 2}px solid ${red ? color.red : color.ink}`, borderRadius: 12, padding: "12px 14px", ...text("body"), fontSize: 24, lineHeight: 1.25, color: red ? color.red : color.ink }}>
        {children}
        {extra && e > 0 && <div style={{ ...text("body"), fontSize: 21, lineHeight: 1.25, color: color.ink2, marginTop: 8, opacity: e }}>{extra}</div>}
      </div>
    </div>
  );
}

function Bracket({ x1, x2, y, p }: { x1: number; x2: number; y: number; p: number }) {
  if (p <= 0) return null;
  const t = ease.travel(clamp(p));
  const mid = (x1 + x2) / 2;
  const half = ((x2 - x1) / 2) * t;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <path d={`M ${mid - half} ${y - 14} L ${mid - half} ${y} L ${mid + half} ${y} L ${mid + half} ${y - 14}`} fill="none" stroke={color.ink2} strokeWidth={2.5} />
    </svg>
  );
}
