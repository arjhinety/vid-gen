/**
 * Member powers. (A) The big powers, each needing two thirds; a three-seat bar with the
 * 2/3 line; two votes already cross it: "2 of 3" is the crimson turn. (B) Any two
 * outvote the third, so the draft leans on process: notice, time, reasons, an outsider;
 * unanimity is nowhere (it would be a one-person veto).
 * Cues: change, electp, amend, merge, dissolve, twothirds, justtwo, outvote, process,
 * notice, delay, reasons, outsider, unanimity.
 */
import { color, text } from "@vid/design";
import { Checkbox, Claim, Exhibit, Label, Meta, Tag, Term } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const POWERS: Array<{ cue: string; label: string }> = [
  { cue: "electp", label: "elect or remove trustees" },
  { cue: "amend", label: "amend the Articles and By-Laws" },
  { cue: "merge", label: "merge with another body" },
  { cue: "dissolve", label: "dissolve the lab" },
];
const BAR = { x: 1060, y: TOP + 470, w: 600, h: 44 };

export default function MemberPowers() {
  const { p } = useProgress();
  const n = gov.founders;
  const k = gov.twoThirdsOfThree;
  const filled = p("justtwo", 0.1) > 0 ? k : 0;
  const lineX = BAR.x + (BAR.w * 2) / 3;
  return (
    <>
      <Exhibit from={0} until="outvote">
        <Label x={X0} y={TOP + 30} p={p("change", 0.3)} sub="the powers that change what the lab is">
          MEMBERS DECIDE
        </Label>
        {POWERS.map((w, i) => (
          <Checkbox key={w.cue} x={X0} y={TOP + 120 + i * 78} label={w.label} p={p(w.cue, 0.35)} tick={p("twothirds", 0.4, i * 0.12)} size={30} />
        ))}
        <Meta x={X0} y={TOP + 450} size={20} p={p("dissolve", 0.3, 0.8)}>
          also: change the mission · admit members · sell nearly everything
        </Meta>

        {FOUNDERS.map((w, i) => (
          <Bean
            key={w}
            who={w}
            x={BAR.x + 100 + i * 200}
            y={TOP + 330}
            size={115}
            hat="member"
            p={p("change", 0.5, 0.3 + i * 0.1)}
            holds={i < k ? "vote" : null}
            holdP={p("justtwo", 0.4, i * 0.15)}
            mood={p("justtwo", 0.1) > 0 ? (i < k ? "open" : "o") : "smile"}
          />
        ))}
        {/* Three seats and the two-thirds line. */}
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: ease.arrive(p("twothirds", 0.4)) }}>
          {Array.from({ length: n }, (_, i) => (
            <rect key={i} x={BAR.x + (i * BAR.w) / n + 4} y={BAR.y} width={BAR.w / n - 8} height={BAR.h} fill={i < filled ? color.ink : color.card} stroke={color.ink} strokeWidth={2.5} opacity={i < filled ? ease.arrive(p("justtwo", 0.3, 0.3 + i * 0.2)) * 0.9 + 0.1 : 1} />
          ))}
          <line x1={lineX} y1={BAR.y - 26} x2={lineX} y2={BAR.y + BAR.h + 14} stroke={color.ink} strokeWidth={3} strokeDasharray="6 5" />
        </svg>
        <Meta x={lineX - 150} w={300} align="center" y={BAR.y - 60} size={20} c={color.ink2} p={p("twothirds", 0.4, 0.3)}>
          2/3 of all members
        </Meta>
        <Term x={BAR.x} y={BAR.y + 66} c={color.red} size={60} def={`two thirds of ${n} people`} p={p("justtwo", 1.0, 0.4)}>
          {`${k} of ${n}`}
        </Term>
        <DocTag x={X0} y={TOP + 520} p={p("twothirds", 0.3, 0.8)}>
          PROVISIONAL · GDR-011
        </DocTag>
        <Claim kind="design" note="recommended thresholds; several are legal floors, as the draft reads the law" x={X0} y={CLAIM_Y} p={p("justtwo", 0.3, 1.2)} />
      </Exhibit>

      <Exhibit from="outvote">
        <Process />
      </Exhibit>
    </>
  );
}

const SHIELDS: Array<{ cue: string; head: string; sub: string }> = [
  { cue: "notice", head: "advance notice", sub: "the proposal in writing, early" },
  { cue: "delay", head: "time to wait", sub: "no same-day surprises" },
  { cue: "reasons", head: "written reasons", sub: "on the record" },
  { cue: "outsider", head: "an outside reviewer", sub: "not a member, not paid by the lab" },
];

function Process() {
  const { p } = useProgress();
  const out = p("outvote", 0.1) > 0;
  return (
    <>
      {FOUNDERS.map((w, i) => (
        <Bean key={w} who={w} x={700 + i * 260} y={TOP + 300} size={125} hat="member" p={1} holds={i < 2 ? "vote" : "no"} holdP={p("outvote", 0.4, i * 0.15)} mood={i < 2 ? "smile" : out ? "worried" : "smile"} mark={i === 2 ? "sweat" : undefined} markP={p("outvote", 0.4, 0.7)} />
      ))}
      <div style={{ position: "absolute", left: 1380, top: TOP + 110, ...text("value"), fontSize: 40, color: color.ink, opacity: ease.arrive(p("outvote", 0.3, 0.6)) }}>
        {gov.twoThirdsOfThree} : {gov.founders - gov.twoThirdsOfThree} <span style={{ ...text("meta"), fontSize: 22, color: color.ink2 }}>· any two, every time</span>
      </div>

      <Label x={X0} y={TOP + 370} p={p("process", 0.3)} sub="so the protection is process, not vote counts">
        PROCESS
      </Label>
      {SHIELDS.map((s, i) => (
        <Shield key={s.cue} x={X0 + i * 410} y={TOP + 450} head={s.head} sub={s.sub} p={p(s.cue, 0.4)} outsider={i === 3} />
      ))}
      <div style={{ position: "absolute", left: X0, top: TOP + 610, display: "flex", alignItems: "center", gap: 16, opacity: ease.arrive(p("unanimity", 0.35)) }}>
        <Tag p={1} strike={p("unanimity", 0.4, 0.5)} c={color.ink} style={{ fontSize: 24, padding: "4px 12px" }}>
          unanimity
        </Tag>
        <span style={{ ...text("meta"), fontSize: 22, color: color.ink2 }}>required nowhere · it would give one founder a veto</span>
      </div>
      <Claim kind="design" note="the draft’s own design rationale (§4)" x={X0} y={CLAIM_Y + 10} p={p("unanimity", 0.3, 1.0)} />
    </>
  );
}

function Shield({ x, y, head, sub, p, outsider }: { x: number; y: number; head: string; sub: string; p: number; outsider: boolean }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 380, height: 120, background: color.card, border: `2.5px solid ${color.ink}`, borderRadius: 16, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 12}px)` }}>
      <div style={{ position: "absolute", left: 20, top: 18, right: outsider ? 90 : 20, ...text("data"), fontSize: 28, color: color.ink }}>{head}</div>
      <div style={{ position: "absolute", left: 20, top: 62, right: outsider ? 90 : 20, ...text("meta"), fontSize: 20, lineHeight: 1.25, color: color.ink3 }}>{sub}</div>
      {outsider && <Bean who="outsider" x={330} y={108} size={62} name={false} p={clamp(p * 1.5 - 0.3)} />}
    </div>
  );
}
