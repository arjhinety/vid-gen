/**
 * The meeting agenda: a four-item sheet (first five, the other eleven, the twenty-four
 * proposals, the lawyer); the three founders at the table; "before anyone signs" is the
 * crimson idea.
 * Cues: agenda, firstfive, acc, lawyer.
 */
import { color, shadow, text } from "@vid/design";
import { Claim, Exhibit, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

export default function Agenda() {
  const { p } = useProgress();
  const sheet = ease.arrive(p("agenda", 0.5));
  const items: Array<[string, string, number]> = [
    [`settle the first ${gov.blocking}`, "they block the Articles", p("firstfive", 0.4)],
    [`then the other ${gov.founderChoices - gov.blocking}`, "while the By-Laws are drafted", p("firstfive", 0.4, 1.2)],
    [`the ${gov.provisional} proposals`, "", p("acc", 0.4, -0.8)],
    ["bring a lawyer", "the company questions, before anyone signs", p("lawyer", 0.4)],
  ];
  return (
    <Exhibit from={0}>
      <div style={{ position: "absolute", left: X0, top: TOP + 10, width: 1000, height: 600, background: color.card, boxShadow: shadow.card, opacity: clamp(sheet * 1.4), transform: `translateY(${(1 - sheet) * 12}px) rotate(-0.5deg)` }}>
        <div style={{ position: "absolute", left: 36, top: 26, ...text("label"), fontSize: 20, color: color.ink3 }}>FOUNDERS’ MEETING · AGENDA</div>
      </div>
      {items.map(([head, sub, q], i) => (
        <div key={head} style={{ position: "absolute", left: X0 + 36, top: TOP + 90 + i * 124, width: 920, opacity: ease.arrive(q), transform: `translateY(${(1 - ease.arrive(q)) * 6}px)` }}>
          <span style={{ ...text("value"), fontSize: 32, color: color.ink3, marginRight: 22 }}>{i + 1}</span>
          <span style={{ ...text("heading"), fontSize: 38, color: color.ink }}>{head}</span>
          {sub && <div style={{ ...text("meta"), fontSize: 20, color: i === 3 ? color.red : color.ink2, marginLeft: 50, marginTop: 6 }}>{sub}</div>}
          {i === 2 && (
            <div style={{ display: "flex", gap: 10, marginLeft: 50, marginTop: 10 }}>
              {["accept", "change", "reject"].map((s, k) => (
                <Tag key={s} p={p("acc", 0.35, k * 0.4)} c={color.ink} style={{ fontSize: 22 }}>
                  {s}
                </Tag>
              ))}
            </div>
          )}
        </div>
      ))}
      {FOUNDERS.map((w, i) => (
        <Bean key={w} who={w} x={1300 + i * 160} y={TOP + 460} size={120} p={p("agenda", 0.5, 0.3 + i * 0.1)} mood="open" holds={i === 1 ? "doc" : null} holdP={p("firstfive", 0.4)} />
      ))}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: ease.arrive(p("agenda", 0.5, 0.2)) }}>
        <ellipse cx={1460} cy={TOP + 452} rx={280} ry={20} fill={color.cardShade} stroke={color.ink} strokeWidth={2.5} />
      </svg>
      <Bean who="plain" x={1620} y={TOP + 660} size={90} name="a lawyer" p={p("lawyer", 0.5, 0.3)} holds="doc" holdP={p("lawyer", 0.4, 0.6)} />
      <Claim kind="design" note="the draft’s next step (p.53), plus counsel for the company questions" x={X0} y={CLAIM_Y} p={p("lawyer", 0.3, 1.0)} />
    </Exhibit>
  );
}
