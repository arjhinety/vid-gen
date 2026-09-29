/**
 * Membership. (A) Researchers, fellows and donors stand outside the members' box; the four
 * steps of admission. (B) Removal: listed causes only; what never counts. (C) Due process,
 * with the independent reviewer as the crimson step; the outsider stands between two
 * friends and the third.
 * Cues: join, notmember, propose, nominate, approve, register, serious, misuse, disagree,
 * never, respond, reviewer, twoone.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Label, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, DocTag, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const BOX = { x: 1100, y: TOP + 20, w: X1 - 1100, h: 300 };
const OUTSIDE = ["researcher", "fellow", "engineer", "donor"];

export default function Membership() {
  const { p } = useProgress();
  return (
    <>
      <Exhibit from={0} until="serious">
        {/* The members' box. */}
        <div style={{ position: "absolute", left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, border: `2.5px dashed ${color.ink2}`, borderRadius: 20, opacity: ease.arrive(p("join", 0.4)) }}>
          <div style={{ position: "absolute", left: 20, top: 14, ...text("label"), fontSize: 20, color: color.ink2 }}>MEMBERS</div>
        </div>
        {FOUNDERS.map((w, i) => (
          <Bean key={w} who={w} x={BOX.x + 130 + i * 190} y={BOX.y + 250} size={95} hat="member" p={p("join", 0.5, 0.2 + i * 0.1)} />
        ))}
        {OUTSIDE.map((s, i) => (
          <Bean key={s} who="plain" x={X0 + 90 + i * 210} y={TOP + 270} size={95} name={s} p={p("notmember", 0.5, 0.2 + i * 0.25)} mood={i % 2 ? "smile" : "open"} />
        ))}
        <div style={{ position: "absolute", left: X0, top: TOP + 10, ...text("meta"), fontSize: 22, color: color.ink2, opacity: ease.arrive(p("notmember", 0.4, 1.2)) }}>
          doing research here ≠ membership · only by admission
        </div>

        {/* Admission, in four steps. */}
        {[
          ["propose", "a member proposes", "in writing"],
          ["nominate", "the Board nominates", "majority of the Board"],
          ["approve", "members approve", "2/3 of all members"],
          ["register", "the Secretary registers", "membership starts"],
        ].map(([cue, head, sub], i) => (
          <Step key={cue} x={X0 + i * 420} y={TOP + 420} head={head!} sub={sub!} p={p(cue!, 0.4)} />
        ))}
        {[0, 1, 2].map((i) => (
          <Arrow key={i} points={[[X0 + 380 + i * 420, TOP + 470], [X0 + 412 + i * 420, TOP + 470]]} p={p(["nominate", "approve", "register"][i]!, 0.3, -0.2)} width={2.5} />
        ))}
        <DocTag x={X0} y={TOP + 580} p={p("register", 0.3, 0.6)}>
          PROVISIONAL · GDR-015
        </DocTag>
        <Claim kind="design" note="selective on purpose: two of three, not one veto" x={X0} y={CLAIM_Y} p={p("register", 0.3, 0.9)} />
      </Exhibit>

      <Exhibit from="serious" until="respond">
        <Label x={X0} y={TOP + 30} p={p("serious", 0.3, 0.3)} sub="listed causes only">
          CAUSES FOR REMOVAL
        </Label>
        {["serious misconduct", "misusing the lab’s assets", "breach of a trustee’s or officer’s duty", "serious research misconduct", "a disqualifying conviction"].map((s, i) => (
          <div key={s} style={{ position: "absolute", left: X0, top: TOP + 120 + i * 62, ...text("data"), fontWeight: 500, fontSize: 30, color: color.ink, opacity: ease.arrive(p("misuse", 0.35, -0.6 + i * 0.3)), whiteSpace: "nowrap" }}>
            <span style={{ ...text("value"), fontSize: 24, color: color.ink3, marginRight: 14 }}>{i + 1}</span>
            {s}
          </div>
        ))}
        <Label x={1020} y={TOP + 30} p={p("disagree", 0.3, -0.2)} sub="protected">
          NEVER A CAUSE
        </Label>
        <div style={{ position: "absolute", left: 1020, top: TOP + 120, width: 760, display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
          {gov.notCauses.map((s, i) => (
            <Tag key={s} p={p("disagree", 0.35, i * 0.45)} c={color.ink} style={{ fontSize: 28, padding: "6px 16px" }}>
              {s}
            </Tag>
          ))}
        </div>
        <Bean who="john" x={1600} y={TOP + 560} size={110} hat="member" p={p("never", 0.5)} mood="open" mark="heart" markP={p("never", 0.4, 0.4)} />
        <Claim kind="design" note="proposed causes (§7)" x={X0} y={CLAIM_Y} p={p("never", 0.3, 0.6)} />
      </Exhibit>

      <Exhibit from="respond">
        <DueProcess />
      </Exhibit>
    </>
  );
}

function DueProcess() {
  const { p } = useProgress();
  const steps: Array<[string, string, number, boolean]> = [
    ["written notice", "cause and facts", p("respond", 0.4, -1.4), false],
    [`${gov.respondDays} days`, "to respond + a hearing", p("respond", 0.4), false],
    ["independent reviewer", "finds the cause proven", p("reviewer", 0.4), true],
    ["the other two vote", "2/3, minus the member", p("reviewer", 0.4, 1.6), false],
    ["written decision", "in the minute book", p("reviewer", 0.4, 2.4), false],
  ];
  const safe = p("twoone", 0.1, 0.4) > 0;
  return (
    <>
      <Label x={X0} y={TOP + 20} p={p("respond", 0.3, -1.6)}>
        DUE PROCESS
      </Label>
      {steps.map(([head, sub, q, red], i) => (
        <Step key={head} x={X0 + i * 330} y={TOP + 80} w={300} head={head} sub={sub} p={q} red={red} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Arrow key={i} points={[[X0 + 303 + i * 330, TOP + 130], [X0 + 327 + i * 330, TOP + 130]]} p={steps[i + 1]![2]} width={2.5} />
      ))}

      {/* Two friends, the third, and the outsider between. */}
      <Bean who="arjhine" x={560} y={TOP + 560} size={120} hat="member" p={p("twoone", 0.5, -0.4)} mood={safe ? "flat" : "smile"} />
      <Bean who="alpha" x={780} y={TOP + 560} size={120} hat="member" p={p("twoone", 0.5, -0.3)} mood={safe ? "flat" : "smile"} />
      <Bean who="outsider" x={1090} y={TOP + 560} size={120} name="independent reviewer" p={p("twoone", 0.5, 0.2)} holds="doc" holdP={p("twoone", 0.4, 0.5)} hop={p("twoone", 0.3, 0.2) * (1 - p("twoone", 0.1, 0.5))} />
      <Bean who="john" x={1400} y={TOP + 560} size={120} hat="member" p={p("twoone", 0.5, -0.2)} mood={safe ? "open" : "worried"} mark={safe ? "heart" : "sweat"} markP={p("twoone", 0.4, safe ? 0.4 : 0)} />
      <div style={{ position: "absolute", left: X0, top: TOP + 330, width: 360, ...text("body"), fontSize: 26, lineHeight: 1.3, color: color.ink2, opacity: ease.arrive(p("twoone", 0.4, 1.0)) }}>
        the one thing that stops two friends pushing out the third
      </div>
      <Claim kind="design" note="not perfect: the other two still decide, after the finding" x={X0} y={CLAIM_Y} p={p("twoone", 0.3, 1.6)} />
    </>
  );
}

function Step({ x, y, head, sub, p, w = 380, red = false }: { x: number; y: number; head: string; sub: string; p: number; w?: number; red?: boolean }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const c = red ? color.red : color.ink;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 104, background: color.card, border: `2.5px solid ${c}`, borderRadius: 14, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 10}px)` }}>
      <div style={{ position: "absolute", left: 18, right: 12, top: 16, ...text("data"), fontSize: 27, color: c, whiteSpace: "nowrap" }}>{head}</div>
      <div style={{ position: "absolute", left: 18, right: 12, top: 58, ...text("meta"), fontSize: 20, color: color.ink3, whiteSpace: "nowrap" }}>{sub}</div>
    </div>
  );
}
