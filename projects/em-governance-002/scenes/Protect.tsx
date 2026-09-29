/**
 * The choices that protect the founders from each other, as three panels: the mission rule
 * (two votes 60 days apart vs unanimity), bringing others in (two new beans walk into the
 * members' box), and naming the outsider now (the outsider joins, smiling; the crimson
 * idea is "now").
 * Cues: from, twovotes, unan, twomembers, three, reviewer.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease, mix } from "@vid/motion";
import { Bean, DocTag, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const PW = 520;
const GAP = (1640 - 3 * PW) / 2;
const px = (i: number) => X0 + i * (PW + GAP);

export default function Protect() {
  const { p } = useProgress();
  const walk = ease.travel(p("twomembers", 1.2, 0.3));
  return (
    <Exhibit from={0}>
      {[0, 1, 2].map((i) => (
        <Panel key={i} x={px(i)} p={p(["twovotes", "twomembers", "reviewer"][i]!, 0.5, -0.3)} kicker={["CHANGING THE MISSION", "BRINGING OTHERS IN", "THE OUTSIDER"][i]!} />
      ))}

      {/* 1: two votes, sixty days apart (suggested) vs unanimity. */}
      <div style={{ position: "absolute", left: px(0) + 24, top: TOP + 80, width: PW - 48 }}>
        <div style={{ ...text("data"), fontSize: 30, color: color.ink, opacity: ease.arrive(p("twovotes", 0.4)) }}>two votes, {gov.missionGap} days apart</div>
        <div style={{ ...text("meta"), fontSize: 20, color: color.ink2, marginTop: 6, opacity: ease.arrive(p("twovotes", 0.4, 0.4)) }}>two thirds each time · draft suggests</div>
        <div style={{ ...text("data"), fontSize: 30, color: color.ink3, marginTop: 30, opacity: ease.arrive(p("unan", 0.4)) }}>or unanimity</div>
        <div style={{ ...text("meta"), fontSize: 20, color: color.ink3, marginTop: 6, opacity: ease.arrive(p("unan", 0.4, 0.4)) }}>{`while fewer than ${gov.unanimityAltMembers} members · one founder could veto`}</div>
      </div>
      <Calendar x={px(0) + 180} y={TOP + 330} p={p("twovotes", 0.4, 0.6)} days={gov.missionGap} />

      {/* 2: two new members walk in. */}
      {FOUNDERS.map((w, i) => (
        <Bean key={w} who={w} x={px(1) + 90 + i * 110} y={TOP + 260} size={78} name={false} p={p("twomembers", 0.4, -0.3)} hat="member" />
      ))}
      {[0, 1].map((i) => (
        <Bean key={i} who="plain" x={mix(px(1) + PW + 60, px(1) + 150 + i * 150, walk)} y={TOP + 420} size={78} name={i === 0 ? "new member" : "new member"} p={p("twomembers", 0.3, 0.3 + i * 0.2)} mood="open" hop={Math.abs(Math.sin(walk * Math.PI * 3)) * (1 - walk) * 0.6} />
      ))}
      <div style={{ position: "absolute", left: px(1) + 24, top: TOP + 510, width: PW - 48, ...text("data"), fontSize: 28, lineHeight: 1.25, color: color.ink, opacity: ease.arrive(p("three", 0.4)) }}>
        {`${gov.broadenMembers} outside members, or ${gov.boardExpandTo} seats, within ${gov.broadenYears} years`}
      </div>

      {/* 3: name the outsider now. */}
      <Bean who="outsider" x={px(2) + PW / 2} y={TOP + 330} size={120} name="independent reviewer" p={p("reviewer", 0.5)} mood="smile" mark="heart" markP={p("reviewer", 0.4, 0.5)} />
      <div style={{ position: "absolute", left: px(2) + 24, top: TOP + 440, width: PW - 48, ...text("data"), fontSize: 30, color: color.red, opacity: ease.arrive(p("reviewer", 0.4, 0.4)) }}>
        choose now
      </div>
      <div style={{ position: "absolute", left: px(2) + 24, top: TOP + 484, width: PW - 48, ...text("meta"), fontSize: 20, lineHeight: 1.3, color: color.ink2, opacity: ease.arrive(p("reviewer", 0.4, 0.7)) }}>
        a lawyer or senior academic, not a member, not paid by the lab · choosing during a dispute is much harder
      </div>
      <DocTag x={X0} y={TOP + 610} p={p("reviewer", 0.3, 1.2)}>
        {"FOUNDER REVIEW 7, 8 and 12"}
      </DocTag>
      <Claim kind="design" note="the draft’s suggestions (§4, §7, §16)" x={X0 + 480} y={CLAIM_Y + 8} p={p("reviewer", 0.3, 1.4)} />
    </Exhibit>
  );
}

function Panel({ x, p, kicker }: { x: number; p: number; kicker: string }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: TOP + 20, width: PW, height: 570, border: `2px solid ${color.hairline}`, borderRadius: 18, opacity: clamp(a * 1.4) }}>
      <div style={{ position: "absolute", left: 24, top: 18, ...text("label"), fontSize: 20, color: color.ink3 }}>{kicker}</div>
    </div>
  );
}

function Calendar({ x, y, days, p }: { x: number; y: number; days: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 150, height: 160, background: color.card, border: `2.5px solid ${color.ink}`, borderRadius: 12, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 10}px)` }}>
      <div style={{ height: 34, background: color.ink, borderRadius: "8px 8px 0 0" }} />
      <div style={{ textAlign: "center", ...text("value"), fontSize: 56, color: color.ink, marginTop: 12 }}>{days}</div>
      <div style={{ textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink3 }}>days</div>
    </div>
  );
}
