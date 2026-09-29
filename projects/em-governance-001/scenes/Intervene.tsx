/**
 * When the Board may step in. (A) A permission slip with the nine grounds, ticked as they
 * are named; then the four conditions on every intervention. (B) Two researchers
 * disagree; the dissent goes into the paper; the President's gavel is crossed out (the
 * crimson idea): no officer breaks the tie.
 * Cues: when, grounds, broke, written, limited, each, dissent, tie.
 */
import { color, shadow, text } from "@vid/design";
import { Checkbox, Claim, Cross, Exhibit, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const SLIP = { x: X0, y: TOP + 20, w: 900, h: 560 };

export default function Intervene() {
  const { p } = useProgress();
  const grounds = gov.grounds;
  const first = 5;
  return (
    <>
      <Exhibit from={0} until="each">
        {/* The permission slip. */}
        <div style={{ position: "absolute", left: SLIP.x, top: SLIP.y, width: SLIP.w, height: SLIP.h, background: color.card, boxShadow: shadow.card, opacity: ease.arrive(p("when", 0.4)), transform: `rotate(-0.6deg) translateY(${(1 - ease.arrive(p("when", 0.4))) * 14}px)` }}>
          <div style={{ position: "absolute", left: 32, top: 26, ...text("label"), fontSize: 20, color: color.ink3 }}>BOARD INTERVENTION · PERMISSION SLIP</div>
          <div style={{ position: "absolute", left: 32, top: 60, ...text("heading"), fontSize: 36, color: color.ink }}>Only on these grounds</div>
          <div style={{ position: "absolute", left: 32, right: 32, top: 118, height: 1.5, background: color.hairline }} />
        </div>
        {grounds.map((g, i) => {
          const q = i < first ? p("grounds", 0.35, 0.3 + i * 0.35) : p("broke", 0.35, -0.4 + (i - first) * 0.45);
          return <Checkbox key={g} x={SLIP.x + 36 + (i % 2) * 420} y={SLIP.y + 160 + Math.floor(i / 2) * 74} label={g.toLowerCase().replace("ip ", "IP ")} size={28} p={q} tick={clamp(q * 1.3 - 0.3)} />;
        })}

        {/* The four conditions. */}
        <div style={{ position: "absolute", left: 1110, top: TOP + 40, ...text("label"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("written", 0.3, -0.4)) }}>EVERY TIME, IT MUST BE</div>
        {gov.interventionRules.map((r, i) => {
          const q = i < 3 ? p("written", 0.35, i * 0.45) : p("limited", 0.35);
          return (
            <div key={r} style={{ position: "absolute", left: 1110, top: TOP + 90 + i * 96 }}>
              <Tag p={q} c={color.ink} style={{ fontSize: 30, padding: "8px 18px" }}>
                {r}
              </Tag>
            </div>
          );
        })}
        <Clock x={1460} y={TOP + 400} p={p("limited", 1.6, 0.2)} />
        <DocTag x={1110} y={TOP + 520} p={p("limited", 0.3, 0.8)}>
          PROVISIONAL · GDR-014
        </DocTag>
        <Claim kind="design" note="researchers may ask the full Board to reconsider" x={X0} y={CLAIM_Y} p={p("limited", 0.3, 1.2)} />
      </Exhibit>

      <Exhibit from="each">
        <Bean who="arjhine" x={560} y={TOP + 420} size={150} name="researcher" p={p("each", 0.5)} mood="open" mark="!" markP={p("each", 0.4, 0.4)} />
        <Bean who="john" x={1360} y={TOP + 420} size={150} name="researcher" facing={-1} p={p("each", 0.5, 0.15)} mood="o" mark="?" markP={p("each", 0.4, 0.55)} />
        {/* The paper between them, with the dissent in it. */}
        <div style={{ position: "absolute", left: 760, top: TOP + 60, width: 400, height: 360, background: color.card, boxShadow: shadow.card, padding: "22px 26px", opacity: ease.arrive(p("line:b15#1", 0.4)) }}>
          <div style={{ ...text("label"), fontSize: 18, color: color.ink3 }}>THE PAPER</div>
          {[88, 72, 90, 64].map((w, i) => (
            <div key={i} style={{ height: 8, width: `${w}%`, background: color.sheetShade, marginTop: i === 0 ? 20 : 14, borderRadius: 4 }} />
          ))}
          <div style={{ marginTop: 26, padding: "10px 14px", background: color.cardShade, borderRadius: 8, opacity: ease.arrive(p("dissent", 0.4, 0.2)) }}>
            <div style={{ ...text("label"), fontSize: 18, color: color.ink }}>DISSENT</div>
            <div style={{ ...text("body"), fontSize: 22, color: color.ink2, marginTop: 4 }}>recorded, with the evidence</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 760, width: 400, top: TOP + 440, textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("dissent", 0.4, 1.4)) }}>
          or: step off as an author
        </div>

        {/* No officer breaks the tie. */}
        <Bean who="alpha" x={960} y={TOP + 600} size={90} hat="officer" name="President" p={p("tie", 0.5, -0.2)} holds="doc" holdP={p("tie", 0.4)} mood="o" />
        <Cross x={1075} y={TOP + 530} size={46} p={p("tie", 0.25, 0.5)} />
        <div style={{ position: "absolute", left: 1115, top: TOP + 510, ...text("data"), fontSize: 30, color: color.red, opacity: ease.arrive(p("tie", 0.3, 0.7)), whiteSpace: "nowrap" }}>no tie-breaker</div>
        <Claim kind="design" note="scientific disputes are settled by evidence among the researchers" x={X0} y={CLAIM_Y} p={p("tie", 0.3, 1.2)} />
      </Exhibit>
    </>
  );
}

/** A small clock whose hand sweeps once: time-limited. */
function Clock({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p * 4));
  const ang = -90 + 300 * ease.travel(clamp(p));
  const r = 44;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: clamp(a * 1.4) }}>
      <circle cx={x} cy={y} r={r} fill={color.card} stroke={color.ink} strokeWidth={3} />
      <line x1={x} y1={y} x2={x + r * 0.72 * Math.cos((ang * Math.PI) / 180)} y2={y + r * 0.72 * Math.sin((ang * Math.PI) / 180)} stroke={color.ink} strokeWidth={3.5} strokeLinecap="round" />
      <line x1={x} y1={y} x2={x} y2={y - r * 0.5} stroke={color.ink} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={x} cy={y} r={4} fill={color.ink} />
    </svg>
  );
}
