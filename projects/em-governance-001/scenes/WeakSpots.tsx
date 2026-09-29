/**
 * The draft's self-review as a report card: what it guards well (ticks), then the two weak
 * spots it flags; the last line, three people who hold every seat can't fully check each
 * other, is the crimson turn, over three beans sitting in all three seats.
 * Cues: grades, taking, capture, drift, weak, admit, remove, cant.
 */
import { color, shadow, text } from "@vid/design";
import { Checkbox, Claim, Exhibit, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

export default function WeakSpots() {
  const { p, f, fps } = useProgress();
  // Each bean cycles through all three hats: every seat, the same people.
  const HATS = ["member", "trustee", "officer"] as const;
  const hatOf = (i: number) => HATS[(Math.floor((f / fps) / 1.4) + i) % 3]!;
  const card = ease.arrive(p("grades", 0.4));
  return (
    <Exhibit from={0}>
      <div style={{ position: "absolute", left: X0, top: TOP + 10, width: 960, height: 600, background: color.card, boxShadow: shadow.card, opacity: clamp(card * 1.4), transform: `translateY(${(1 - card) * 12}px)` }}>
        <div style={{ position: "absolute", left: 32, top: 24, ...text("label"), fontSize: 20, color: color.ink3 }}>SELF-REVIEW · §16</div>
        <div style={{ position: "absolute", left: 32, top: 58, ...text("heading"), fontSize: 36, color: color.ink }}>How well does it protect?</div>
      </div>
      <div style={{ position: "absolute", left: X0 + 32, top: TOP + 140, ...text("label"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("taking", 0.3, -0.3)) }}>GUARDS WELL</div>
      {[
        ["taking the lab’s assets", "taking"],
        ["sponsors bending results", "capture"],
        ["drifting into consulting", "drift"],
      ].map(([s, cue], i) => (
        <Checkbox key={s} x={X0 + 32} y={TOP + 186 + i * 60} label={s} size={28} p={p(cue!, 0.35)} tick={p(cue!, 0.4, 0.3)} />
      ))}
      <div style={{ position: "absolute", left: X0 + 32, top: TOP + 390, ...text("label"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("weak", 0.3)) }}>
        {`ONLY PARTLY · ${gov.flags} FLAGS, TWO OF THEM:`}
      </div>
      {[
        ["nothing forces the founders to let anyone in", "admit"],
        ["two can remove the third from the Board", "remove"],
      ].map(([s, cue], i) => (
        <div key={s} style={{ position: "absolute", left: X0 + 32, top: TOP + 436 + i * 64, display: "flex", alignItems: "center", gap: 14, opacity: ease.arrive(p(cue!, 0.35)) }}>
          <Tag p={1} c={color.ink} style={{ fontSize: 20 }}>
            FLAG
          </Tag>
          <span style={{ ...text("data"), fontWeight: 500, fontSize: 28, color: color.ink }}>{s}</span>
        </div>
      ))}
      <div style={{ position: "absolute", left: X0 + 32, top: TOP + 560, ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("remove", 0.3, 1.2)) }}>
        {`option: commit to ${gov.broadenMembers} non-founder members, or ${gov.boardExpandTo} seats, within ${gov.broadenYears} years`}
      </div>

      {/* Three beans, every seat. */}
      {FOUNDERS.map((w, i) => (
        <Bean key={w} who={w} x={1240 + i * 180} y={TOP + 420} size={115} hat={hatOf(i)} hatP={clamp(((f / fps) % 1.4) / 0.3)} p={p("grades", 0.5, 0.4 + i * 0.1)} mood={p("cant", 0.1) > 0 ? "worried" : "smile"} mark={p("cant", 0.1) > 0 ? "sweat" : undefined} markP={p("cant", 0.4, 0.3 + i * 0.1)} />
      ))}
      <div style={{ position: "absolute", left: 1150, top: TOP + 490, width: 580, ...text("data"), fontSize: 32, lineHeight: 1.25, color: color.red, opacity: ease.arrive(p("cant", 0.4, 0.4)) }}>
        three people in every seat can’t fully check each other
      </div>
      <Claim kind="limitation" note="flagged by the draft itself" x={X0} y={CLAIM_Y + 10} p={p("cant", 0.3, 1.2)} />
    </Exhibit>
  );
}
