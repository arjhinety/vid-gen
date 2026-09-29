/**
 * Now or later. Left: joining before filing: four seats around the table; two thirds of
 * four is three (no pair acts alone), but an even Board can tie. Right: joining later:
 * an Articles amendment, and the draft's plan to grow to five. Bottom: the catch, "no
 * stake" only if he stays out of any founders' company (the crimson idea), and the draft
 * wants two such trustees.
 * Cues: when, now, three, tie, later, five, nostake, twoclean.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const L = { x: X0, w: 780 };
const R = { x: 1000, w: 780 };

export default function XynilWhen() {
  const { p } = useProgress();
  const tie = p("tie", 0.1) > 0;
  return (
    <Exhibit from={0}>
      <Panel x={L.x} w={L.w} kicker="JOIN NOW · before the papers are filed" p={p("now", 0.4, -0.3)} />
      <Panel x={R.x} w={R.w} kicker="JOIN LATER · after incorporation" p={p("later", 0.4, -0.3)} />

      {/* Now: four seats. */}
      {[...FOUNDERS, "xynil" as const].map((w, i) => (
        <Bean key={w} who={w} x={L.x + 120 + i * 170} y={TOP + 215} size={85} hat="trustee" p={p("now", 0.4, 0.2 + i * 0.1)} holds={tie ? (i < 2 ? "vote" : "no") : null} holdP={p("tie", 0.4, i * 0.1)} mood={tie ? "flat" : "smile"} />
      ))}
      <Note x={L.x + 24} y={TOP + 262} w={L.w - 48} p={p("now", 0.4, 1.2)}>
        4 members and 4 trustees in the Articles · reopens decided items
      </Note>
      <Note x={L.x + 24} y={TOP + 300} w={L.w - 48} p={p("three", 0.4)} c={color.ink} size={26}>
        {`two thirds of 4 is ${gov.twoThirdsOfFour}: no two people can act alone`}
      </Note>
      <Note x={L.x + 24} y={TOP + 344} w={L.w - 48} p={p("tie", 0.4, 0.4)} c={color.ink} size={26}>
        {`but 2 against 2 is a tie · the draft’s rules are written for odd sizes, ${gov.oddRange[0]} to ${gov.oddRange[1]}`}
      </Note>

      {/* Later: an amendment, and growing to five. */}
      <Note x={R.x + 24} y={TOP + 70} w={R.w - 48} p={p("later", 0.4)} c={color.ink} size={26}>
        a new seat = amending the Articles
      </Note>
      <Note x={R.x + 24} y={TOP + 110} w={R.w - 48} p={p("later", 0.4, 0.6)}>
        2/3 of members, then government (SEC) approval
      </Note>
      {Array.from({ length: gov.boardExpandTo }, (_, i) => {
        const filled = i < 4;
        const q = p("five", 0.4, i * 0.1);
        if (q <= 0) return null;
        return filled ? (
          <Bean key={i} who={[...FOUNDERS, "xynil" as const][i]!} x={R.x + 110 + i * 140} y={TOP + 290} size={80} hat="trustee" name={false} p={q} />
        ) : (
          <div key={i} style={{ position: "absolute", left: R.x + 110 + i * 140 - 40, top: TOP + 190, width: 80, height: 100, border: `2.5px dashed ${color.ink3}`, borderRadius: 40, opacity: ease.arrive(q), display: "flex", alignItems: "center", justifyContent: "center", ...text("data"), fontSize: 30, color: color.ink3 }}>
            ?
          </div>
        );
      })}
      <Note x={R.x + 24} y={TOP + 330} w={R.w - 48} p={p("five", 0.4, 0.6)}>
        {`the draft’s plan: ${gov.boardExpandTo} seats once there are ${gov.boardExpandTo} members`}
      </Note>

      {/* The catch. */}
      <div style={{ position: "absolute", left: X0, top: TOP + 478, width: 1640, ...text("data"), fontSize: 30, color: color.red, opacity: ease.arrive(p("nostake", 0.4)) }}>
        “no stake” only if he owns no part of, and works for no, founders’ company
      </div>
      <div style={{ position: "absolute", left: X0, top: TOP + 526, width: 1640, ...text("body"), fontSize: 26, color: color.ink2, opacity: ease.arrive(p("twoclean", 0.4)) }}>
        {`and the draft wants ${gov.disinterested} such trustees before any deal with that company · Xynil would be the first`}
      </div>
      <DocTag x={X0} y={TOP + 610} p={p("twoclean", 0.3, 0.8)}>
        {"THE DRAFT’S RULES, APPLIED TO A FOURTH PERSON · §4, §8, §9"}
      </DocTag>
      <Claim kind="author-interpretation" note="derived from the draft’s rules; counsel to confirm" x={X0 + 780} y={CLAIM_Y + 8} p={p("twoclean", 0.3, 1.1)} />
    </Exhibit>
  );
}

function Panel({ x, w, kicker, p }: { x: number; w: number; kicker: string; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: TOP + 10, width: w, height: 440, border: `2px solid ${color.hairline}`, borderRadius: 18, opacity: clamp(a * 1.4) }}>
      <div style={{ position: "absolute", left: 24, top: 18, ...text("label"), fontSize: 20, color: color.ink3 }}>{kicker}</div>
    </div>
  );
}

function Note({ x, y, w, p, children, c = color.ink2, size = 22 }: { x: number; y: number; w: number; p: number; children: string; c?: string; size?: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return <div style={{ position: "absolute", left: x, top: y, width: w, ...text("body"), fontSize: size, lineHeight: 1.3, color: c, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 6}px)` }}>{children}</div>;
}
