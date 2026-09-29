/**
 * What can wait: the three DEFERRED items as cards with a "after the lab exists" clock; then
 * founder pay's order: tax advice first, leave the Board first (the crimson idea), then pay.
 * Cues: wait, pay, classes, cte, taxfirst, leaves.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const PLAIN: Record<string, string> = {
  "GDR-022": "paying a founder",
  "GDR-033": "kinds of members",
  "GDR-036": "tax-exemption timing",
};
const W = 500;
const GAP = (1640 - 3 * W) / 2;

export default function Deferred() {
  const { p } = useProgress();
  const cues = ["pay", "classes", "cte"];
  return (
    <Exhibit from={0}>
      <div style={{ position: "absolute", left: X0, top: TOP + 14, ...text("label"), fontSize: 22, color: color.ink2, opacity: ease.arrive(p("wait", 0.3)) }}>CAN WAIT UNTIL THE LAB EXISTS</div>
      {gov.deferredList.map((d, i) => {
        const q = ease.arrive(p(cues[i]!, 0.4));
        if (q <= 0) return null;
        return (
          <div key={d.id} style={{ position: "absolute", left: X0 + i * (W + GAP), top: TOP + 60, width: W, height: 150, border: `2px dashed ${color.ink2}`, borderRadius: 16, background: color.card, opacity: clamp(q * 1.4), transform: `translateY(${(1 - q) * 12}px)` }}>
            <div style={{ position: "absolute", left: 22, top: 18, ...text("label"), fontSize: 18, color: color.ink3 }}>{`DEFERRED · ${d.id}`}</div>
            <div style={{ position: "absolute", left: 22, top: 56, ...text("heading"), fontSize: 36, color: color.ink }}>{PLAIN[d.id]}</div>
            <div style={{ position: "absolute", left: 22, top: 108, ...text("meta"), fontSize: 20, color: color.ink3 }}>{d.name}</div>
          </div>
        );
      })}

      {/* Founder pay, in order. */}
      <div style={{ position: "absolute", left: X0, top: TOP + 260, ...text("label"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("taxfirst", 0.3, -0.6)) }}>IF A FOUNDER IS EVER PAID</div>
      {[
        ["tax advice first", p("taxfirst", 0.4), false],
        ["leave the Board first", p("leaves", 0.4), true],
        ["then: same pay band as anyone", p("leaves", 0.4, 1.0), false],
      ].map(([s, q, red], i) => (
        <div key={s as string} style={{ position: "absolute", left: X0 + i * 450, top: TOP + 310, width: 400, height: 90, border: `2.5px solid ${red ? color.red : color.ink}`, borderRadius: 14, background: color.card, opacity: ease.arrive(q as number), display: "flex", alignItems: "center", padding: "0 20px", boxSizing: "border-box", ...text("data"), fontSize: 28, color: red ? color.red : color.ink }}>
          {s as string}
        </div>
      ))}
      <Arrow points={[[X0 + 404, TOP + 355], [X0 + 446, TOP + 355]]} p={p("leaves", 0.3)} width={2.5} />
      <Arrow points={[[X0 + 854, TOP + 355], [X0 + 896, TOP + 355]]} p={p("leaves", 0.3, 1.0)} width={2.5} />
      <Bean who="plain" x={X0 + 1480} y={TOP + 440} size={110} name="a founder" hat={p("leaves", 0.1, 0.4) > 0 ? null : "trustee"} p={p("taxfirst", 0.4, -0.3)} mood="smile" />
      <DocTag x={X0} y={TOP + 450} p={p("leaves", 0.3, 1.4)}>
        {"DEFERRED · GDR-022, GDR-033, GDR-036"}
      </DocTag>
      <Claim kind="design" note="not needed before incorporation (§18)" x={X0} y={CLAIM_Y} p={p("leaves", 0.3, 1.6)} />
    </Exhibit>
  );
}
