/**
 * Meet Xynil (not in the draft; the owner named him as the first trustee beyond the
 * founders). The draft's rules applied to him: MEMBER FIRST (the crimson idea), the
 * admission steps, the contribution criteria, and what every trustee signs up to.
 * Cues: xynil, member, propose, nominate, approve, contrib, accepts, unpaid.
 */
import { color, text } from "@vid/design";
import { Checkbox, Claim, Exhibit, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const SX = 560;
const SW = 230;
const SG = 14;

export default function XynilJoin() {
  const { p } = useProgress();
  const steps: Array<[string, string, number]> = [
    ["proposed", "in writing", p("propose", 0.4)],
    ["nominated", "by the Board", p("nominate", 0.4)],
    ["approved", "2/3 of members", p("approve", 0.4)],
    ["registered", "by the Secretary", p("approve", 0.4, 1.0)],
    ["then trustee", "elected to a seat", p("approve", 0.4, 1.6)],
  ];
  return (
    <Exhibit from={0}>
      <Bean who="xynil" x={330} y={TOP + 420} size={170} name="Xynil Jhed Lacap" p={p("xynil", 0.5)} mood="open" mark="!" markP={p("xynil", 0.4, 0.5)} hop={p("xynil", 0.35, 0.1) * (1 - p("xynil", 0.1, 0.45))} />
      <div style={{ position: "absolute", left: 150, width: 360, top: TOP + 480, textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("xynil", 0.4, 1.0)) }}>
        first trustee beyond the founders
      </div>

      <div style={{ position: "absolute", left: SX, top: TOP + 10, ...text("label"), fontSize: 24, color: color.red, opacity: ease.arrive(p("member", 0.35)) }}>MEMBER FIRST, THEN TRUSTEE</div>
      {steps.map(([head, sub, q], i) => (
        <Step key={head} x={SX + i * (SW + SG)} y={TOP + 60} head={head} sub={sub} p={q} last={i === 4} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Arrow key={i} points={[[SX + i * (SW + SG) + SW + 2, TOP + 110], [SX + (i + 1) * (SW + SG) - 2, TOP + 110]]} p={steps[i + 1]![2]} width={2.5} />
      ))}

      {/* A real contribution first. */}
      <div style={{ position: "absolute", left: SX, top: TOP + 210, ...text("label"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("contrib", 0.3)) }}>AT LEAST ONE OF</div>
      <div style={{ position: "absolute", left: SX, top: TOP + 246, width: 1160, display: "flex", flexWrap: "wrap", gap: 10 }}>
        {["sustained research", "research engineering", "leading a program", "long institutional service", "governance work"].map((s, i) => (
          <Tag key={s} p={p("contrib", 0.35, 0.2 + i * 0.15)} c={color.ink} style={{ fontSize: 22, padding: "4px 12px" }}>
            {s}
          </Tag>
        ))}
      </div>
      <div style={{ position: "absolute", left: SX, top: TOP + 330, ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("contrib", 0.3, 1.0)) }}>
        {`e.g. about ${gov.contributionMonths} months of sustained research`}
      </div>

      {/* What every trustee signs up to. */}
      {[
        ["accepts the Articles, By-Laws and charters", p("accepts", 0.35)],
        ["discloses his interests", p("accepts", 0.35, 0.8)],
        ["not disqualified by law", p("accepts", 0.35, 1.3)],
        ["unpaid while a trustee", p("unpaid", 0.35)],
      ].map(([s, q], i) => (
        <Checkbox key={s as string} x={SX} y={TOP + 380 + i * 56} label={s as string} size={28} p={q as number} tick={clamp((q as number) * 1.4 - 0.3)} />
      ))}
      <DocTag x={X0} y={TOP + 600} p={p("unpaid", 0.3, 0.6)}>
        {"THE DRAFT’S RULES, APPLIED TO A NEW PERSON · §7, §8"}
      </DocTag>
      <Claim kind="author-interpretation" note="Xynil is not in the draft; this applies its admission rules to him" x={X0} y={CLAIM_Y + 8} p={p("unpaid", 0.3, 0.9)} />
    </Exhibit>
  );
}

function Step({ x, y, head, sub, p, last }: { x: number; y: number; head: string; sub: string; p: number; last: boolean }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: SW, height: 100, background: last ? color.ink : color.card, border: `2.5px solid ${color.ink}`, borderRadius: 14, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 10}px)` }}>
      <div style={{ position: "absolute", left: 16, top: 14, ...text("data"), fontSize: 26, color: last ? color.card : color.ink }}>{head}</div>
      <div style={{ position: "absolute", left: 16, right: 10, top: 56, ...text("meta"), fontSize: 20, color: last ? color.instrumentInk2 : color.ink3, whiteSpace: "nowrap" }}>{sub}</div>
    </div>
  );
}
