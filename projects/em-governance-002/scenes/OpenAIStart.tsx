/**
 * How OpenAI started. Top: the nonprofit (2015), and two bars drawn to the same scale: the
 * billion its funders promised (dashed) and the cash that actually arrived by 2019 (solid).
 * Bottom: the capped-profit company underneath (2019), investors with returns capped at
 * 100x, the nonprofit's control arrow (the crimson idea), and the board where only members
 * without a stake vote on conflicts.
 * Cues: oa, nonprofit, cash, capped, cap, control, nostake.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, Plaque, useProgress } from "./shared/cast.tsx";
import { oa, usd } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const BAR_X = X0 + 620;
const BAR_W = 820; // the promised billion
const PX_PER_USD = BAR_W / usd(oa.committed);

export default function OpenAIStart() {
  const { p } = useProgress();
  const control = p("control", 0.5);
  const conflict = p("nostake", 0.4);
  return (
    <Exhibit from={0}>
      <Plaque x={X0} y={TOP + 20} w={520} h={150} kicker="OPENAI, INC. · 2015" title="a nonprofit" p={p("nonprofit", 0.4, -0.2)} />

      {/* Promised vs. arrived, one scale. */}
      <Bar y={TOP + 30} label="promised by its funders" value={oa.committed} w={BAR_W} dashed p={p("nonprofit", 0.6, 0.6)} />
      <Bar y={TOP + 110} label="cash that actually arrived, 2015–2019" value={oa.cash} w={usd(oa.cash) * PX_PER_USD} p={p("cash", 0.6)} />

      {/* The company underneath. */}
      <Plaque x={X0} y={TOP + 330} w={520} h={150} kicker={`OPENAI LP · ${oa.cappedYear}`} title="a capped-profit company" dashed p={p("capped", 0.4)} />
      <Arrow points={[[X0 + 260, TOP + 176], [X0 + 260, TOP + 322]]} p={control} c={color.red} width={5} />
      <div style={{ position: "absolute", left: X0 + 285, top: TOP + 226, ...text("data"), fontSize: 28, color: color.red, opacity: ease.arrive(p("control", 0.4, 0.3)) }}>controls it</div>

      {/* Investors, and the cap. */}
      {[0, 1, 2].map((i) => (
        <Bean key={i} who="sponsor" x={X0 + 680 + i * 120} y={TOP + 470} size={75} holds="bag" holdP={p("cap", 0.4, i * 0.1)} p={p("capped", 0.4, 0.6 + i * 0.12)} name={i === 1 ? "investors" : false} />
      ))}
      <Arrow points={[[X0 + 630, TOP + 405], [X0 + 528, TOP + 405]]} p={p("capped", 0.4, 1.0)} c={color.ink2} />
      <div style={{ position: "absolute", left: X0 + 620, top: TOP + 530, display: "flex", alignItems: "baseline", gap: 14, opacity: ease.arrive(p("cap", 0.4, 0.3)) }}>
        <span style={{ ...text("bigNumber"), fontSize: 60, color: color.ink }}>{oa.cap}</span>
        <span style={{ ...text("body"), fontSize: 24, lineHeight: 1.25, color: color.ink2, width: 400 }}>their money: the cap on what early investors could get back</span>
      </div>

      {/* The board: only members without a stake vote on conflicts. */}
      <div style={{ position: "absolute", left: X0 + 1150, top: TOP + 250, ...text("label"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("control", 0.4, 0.6)) }}>THE NONPROFIT’S BOARD</div>
      {[0, 1, 2, 3, 4].map((i) => {
        const stake = i >= 3;
        return (
          <Bean
            key={i}
            who="plain"
            x={X0 + 1180 + i * 92}
            y={TOP + 420}
            size={64}
            hat="trustee"
            name={false}
            p={p("control", 0.4, 0.7 + i * 0.08)}
            holds={stake ? "bag" : conflict > 0 ? "vote" : null}
            holdP={stake ? p("nostake", 0.3) : conflict}
            dim={stake ? 0.7 * ease.arrive(p("nostake", 0.4, 0.4)) : 0}
          />
        );
      })}
      <div style={{ position: "absolute", left: X0 + 1150, top: TOP + 460, width: 490, ...text("body"), fontSize: 24, lineHeight: 1.3, color: color.ink2, opacity: ease.arrive(p("nostake", 0.4, 0.5)) }}>
        on conflicts, only the members <b style={{ color: color.ink, fontWeight: 600 }}>without a stake</b> vote · the rest step out
      </div>
      <div style={{ position: "absolute", left: X0 + 1150, top: TOP + 560, ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("nostake", 0.4, 1.0)) }}>
        (a minority could hold a stake · a sketch)
      </div>

      <Claim kind="measured" note="OpenAI’s own posts, 2015–2019 · links in the receipts" x={X0} y={CLAIM_Y} p={p("nostake", 0.3, 1.4)} />
    </Exhibit>
  );
}

function Bar({ y, label, value, w, dashed = false, p }: { y: number; label: string; value: string; w: number; dashed?: boolean; p: number }) {
  if (p <= 0) return null;
  const a = ease.travel(clamp(p));
  return (
    <>
      <div style={{ position: "absolute", left: BAR_X, top: y, ...text("body"), fontSize: 24, color: color.ink2, opacity: clamp(a * 2) }}>{label}</div>
      <div style={{ position: "absolute", left: BAR_X, top: y + 36, width: Math.max(4, w * a), height: 30, borderRadius: 4, boxSizing: "border-box", border: dashed ? `2.5px dashed ${color.ink2}` : "none", background: dashed ? "transparent" : color.ink }} />
      <div style={{ position: "absolute", left: BAR_X + w * a + 14, top: y + 34, ...text("value"), fontSize: 28, color: color.ink, opacity: clamp(a * 3 - 2), whiteSpace: "nowrap" }}>{value}</div>
    </>
  );
}
