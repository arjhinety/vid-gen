/**
 * The worst-day test on the hardest case: two of you want the third out. Left: two plain
 * beans against one (not the real founders: nobody is cast as the villain). Right: the
 * draft's removal steps, then the things that are never a cause. Bottom: the gap the draft
 * itself flags (the crimson idea): the law lets 2/3 of members remove a trustee with or
 * without cause, so the third loses the trustee hat but stays a member.
 * Cues: hardest, member, thirty, reviewer, outvoted, trustee, offboard, lawyerq.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { Kicker, Note } from "./shared/boxes.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const SX = X0 + 760; // steps column
const SW = X1 - SX;

export default function WorstDay() {
  const { p } = useProgress();
  const off = ease.arrive(p("offboard", 0.5));
  const steps: Array<{ cue: string; o: number; text: string }> = [
    { cue: "member", o: 0.2, text: `one of ${gov.removalCauses.length} listed causes` },
    { cue: "member", o: 1.4, text: "a written notice with the facts" },
    { cue: "thirty", o: 0, text: `at least ${gov.removalDays} days to answer, and a hearing` },
    { cue: "reviewer", o: 0, text: "an independent reviewer finds the cause proven" },
    { cue: "reviewer", o: 1.6, text: `then a vote: both of the other ${gov.removalOtherTwo}` },
  ];
  return (
    <Exhibit from={0}>
      {/* Two against one. */}
      {[0, 1].map((k) => (
        <Bean key={k} who="plain" x={X0 + 110 + k * 150} y={TOP + 250} size={95} hat="trustee" mood="flat" name={k === 0 ? "two of you" : false} p={p("hardest", 0.4, 0.2 + k * 0.1)} />
      ))}
      <Bean who="plain" x={X0 + 560} y={TOP + 250} size={95} hat="trustee" hatP={1 - off} mood={off > 0.3 ? "worried" : "o"} mark="sweat" markP={p("hardest", 0.3, 0.9)} name={off > 0.5 ? "still a member" : "the third"} p={p("hardest", 0.4, 0.5)} />

      {/* The draft's removal steps. */}
      <Kicker x={SX} y={TOP + 10} p={p("member", 0.4)}>REMOVING A MEMBER · THE DRAFT</Kicker>
      {steps.map((s, i) => {
        const q = p(s.cue, 0.4, s.o);
        if (q <= 0) return null;
        const a = ease.arrive(clamp(q));
        return (
          <div key={i} style={{ position: "absolute", left: SX, top: TOP + 50 + i * 52, display: "flex", gap: 14, alignItems: "baseline", opacity: clamp(a * 1.4), transform: `translateX(${(1 - a) * -8}px)` }}>
            <span style={{ ...text("value"), fontSize: 24, color: color.ink3, width: 26 }}>{i + 1}</span>
            <span style={{ ...text("body"), fontSize: 26, color: color.ink }}>{s.text}</span>
          </div>
        );
      })}

      {/* Never a cause. */}
      <Kicker x={SX} y={TOP + 330} p={p("outvoted", 0.4, -0.4)}>NEVER A CAUSE</Kicker>
      <div style={{ position: "absolute", left: SX, top: TOP + 366, width: SW, display: "flex", flexWrap: "wrap", gap: 10 }}>
        {gov.notCauses.map((c, i) => (
          <Tag key={c} p={p("outvoted", 0.4, i * 0.15)} c={color.ink2} style={{ fontSize: 22, padding: "4px 12px" }}>
            {c}
          </Tag>
        ))}
      </div>

      {/* The gap. */}
      <Note x={X0} y={TOP + 330} w={680} p={p("trustee", 0.4)} c={color.red} size={28} weight={600}>
        {`the gap: under the law, ${gov.removalGap}`}
      </Note>
      <Note x={X0} y={TOP + 420} w={680} p={p("offboard", 0.4, 0.4)}>
        so two of you could take the third off the Board · not out of the lab
      </Note>
      <DocTag x={X0} y={TOP + 520} p={p("lawyerq", 0.3)}>
        {"THE DRAFT’S OWN FLAG · §16 p.46 · a lawyer to advise"}
      </DocTag>

      <Claim kind="author-interpretation" note="the draft’s removal rules, and the gap it flags itself" x={X0} y={CLAIM_Y} p={p("lawyerq", 0.3, 0.8)} />
    </Exhibit>
  );
}
