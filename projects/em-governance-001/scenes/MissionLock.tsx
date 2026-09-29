/**
 * The mission lock, as a timeline: a written proposal, at least 30 days, vote one, at
 * least 60 days (the crimson span: time is the protection), vote two, and the purpose must
 * stay scientific and non-profit. A snail crawls the 60 days: slower, not impossible.
 * Cues: mission, proposal, vote1, gap, stay, slower, months.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Meta, Tag, Term } from "@vid/kit";
import { clamp, ease, mix, useScene, useSceneFrame } from "@vid/motion";
import { Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const Y = TOP + 330;
const XA = 300;
const XB = 1560;
const days = gov.missionNotice + gov.missionGap;
const xAt = (d: number) => XA + ((XB - XA) * d) / days;

export default function MissionLock() {
  const { p, at, f } = useProgress();
  const x1 = xAt(gov.missionNotice);
  const x2 = xAt(days);
  const crawl = clamp((f - at("gap", 0.4)) / (at("slower", 0.6) - at("gap", 0.4)));
  return (
    <Exhibit from={0}>
      <Term x={X0} y={TOP + 20} def="what the lab is for · its primary purpose" p={p("mission", 1.0)}>
        the mission
      </Term>

      {/* The line of time. */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={XA} y1={Y} x2={XA + (x1 - XA) * ease.travel(p("proposal", 0.8, 0.5))} y2={Y} stroke={color.ink} strokeWidth={3} />
        <line x1={x1} y1={Y} x2={x1 + (x2 - x1) * ease.travel(p("gap", 0.9))} y2={Y} stroke={color.red} strokeWidth={5} />
        {[XA, x1, x2].map((x, i) => {
          const q = [p("proposal", 0.3), p("vote1", 0.3), p("vote1", 0.3, 1.4)][i]!;
          return <circle key={i} cx={x} cy={Y} r={11 * ease.arrive(q)} fill={color.card} stroke={color.ink} strokeWidth={3} />;
        })}
      </svg>

      <Event x={XA} p={p("proposal", 0.4)} head="written proposal" sub="to every member" />
      <Event x={x1} p={p("vote1", 0.4)} head="vote 1" sub="2/3 of all members" />
      <Event x={x2} p={p("vote1", 0.4, 1.4)} head="vote 2" sub="2/3 again" />
      <Span x1={XA} x2={x1} p={p("proposal", 0.4, 0.9)} c={color.ink2}>{`≥ ${gov.missionNotice} days`}</Span>
      <Span x1={x1} x2={x2} p={p("gap", 0.4, 0.4)} c={color.red}>{`≥ ${gov.missionGap} days`}</Span>

      <Snail x={mix(x1 + 30, x2 - 130, crawl)} y={Y - 6} p={p("gap", 0.4, 0.3)} />

      {/* What the new mission must still be. */}
      <div style={{ position: "absolute", left: x2 - 420, top: Y + 130, width: 520, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
        {["scientific", "non-stock, non-profit", "dissolution clause unchanged"].map((s, i) => (
          <Tag key={s} p={p("stay", 0.35, i * 0.25)} c={color.ink} style={{ fontSize: 22, padding: "4px 12px" }}>
            {`✓ ${s}`}
          </Tag>
        ))}
      </div>
      <div style={{ position: "absolute", left: x1, width: x2 - x1, textAlign: "center", top: Y + 72, ...text("data"), fontSize: 32, color: color.ink, opacity: ease.arrive(p("slower", 0.4)) }}>
        slower, not impossible
      </div>

      {/* The third founder gets time to argue. */}
      <Bean who="john" x={XA + 60} y={Y + 300} size={120} hat="member" holds="doc" holdP={p("months", 0.5)} mood="open" mark="!" markP={p("months", 0.4, 0.4)} p={p("months", 0.5, -0.3)} />
      <div style={{ position: "absolute", left: XA + 170, top: Y + 150, width: 520, ...text("body"), fontSize: 28, color: color.ink2, opacity: ease.arrive(p("months", 0.4, 0.3)) }}>
        two months and a public record to argue
      </div>

      <DocTag x={X0 + 460} y={TOP + 30} p={p("proposal", 0.3, 1.2)}>
        PROVISIONAL · GDR-012
      </DocTag>
      <Meta x={X0 + 460} y={TOP + 86} size={20} c={color.ink3} p={p("slower", 0.3, 1.2)}>
        {`alternative (a founder decision): unanimity while fewer than ${gov.unanimityAltMembers} members`}
      </Meta>
      <Claim kind="design" note="proposed mission-protection rule" x={X0} y={CLAIM_Y + 10} p={p("slower", 0.3, 0.8)} />
    </Exhibit>
  );
}

function Event({ x, p, head, sub }: { x: number; p: number; head: string; sub: string }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x - 160, width: 320, top: Y - 110, textAlign: "center", opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 8}px)` }}>
      <div style={{ ...text("data"), fontSize: 30, color: color.ink }}>{head}</div>
      <div style={{ ...text("meta"), fontSize: 20, color: color.ink3, marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function Span({ x1, x2, p, c, children }: { x1: number; x2: number; p: number; c: string; children: string }) {
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x1, width: x2 - x1, top: Y + 26, textAlign: "center", ...text("value"), fontSize: 26, color: c, opacity: ease.arrive(clamp(p)) }}>
      {children}
    </div>
  );
}

/** A small snail: slow on purpose. */
function Snail({ x, y, p }: { x: number; y: number; p: number }) {
  const f = useSceneFrame();
  const { fps } = useScene();
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const squish = 1 + Math.sin((f / fps) * Math.PI * 2) * 0.04;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <g transform={`translate(${x} ${y}) scale(${a * squish} ${a})`} opacity={clamp(p * 3)} strokeLinecap="round" strokeLinejoin="round">
        <path d="M -30 0 Q -30 -12 -6 -12 L 26 -12 Q 34 -12 36 -22 L 40 -34 M 36 -22 L 32 -36" fill="none" stroke={color.ink} strokeWidth={3} />
        <path d="M -34 0 L 30 0 Q 40 0 36 -12" fill={color.card} stroke={color.ink} strokeWidth={3} />
        <circle cx={0} cy={-26} r={22} fill={color.card} stroke={color.ink} strokeWidth={3} />
        <path d="M 0 -26 m -4 0 a 4 4 0 1 1 8 0 a 8 8 0 1 1 -16 0 a 12 12 0 1 1 24 0" fill="none" stroke={color.ink} strokeWidth={2.4} />
        <circle cx={40} cy={-35} r={2.6} fill={color.ink} />
        <circle cx={32} cy={-37} r={2.6} fill={color.ink} />
      </g>
    </svg>
  );
}
