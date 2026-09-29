/**
 * Decision 1, the purpose wording. Options on the left; on the right a width gauge: too
 * narrow and too broad are both red zones (the crimson idea), and the knob settles on the
 * draft's wording.
 * Then the catch: the tax rules' list of sciences does not name machine learning.
 * Cues: purpose, scientific, broad, narrow, rec, ml.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { ease, mix } from "@vid/motion";
import { Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { DecisionHead, Option, Why } from "./shared/decision.tsx";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const GX0 = 1000;
const GX1 = 1720;
const GY = TOP + 360;

export default function D1Purpose() {
  const { p } = useProgress();
  const recP = p("rec", 0.4);
  const knob = mix(GX1 - 80, (GX0 + GX1) / 2, ease.travel(p("rec", 0.8, 0.2)));
  return (
    <Exhibit from={0}>
      <DecisionHead n={1} title="purpose wording" def="the sentence that says what the lab is for" p={p("purpose", 1.0)} />
      <Option y={TOP + 130} letter="A" label="the draft’s wording" sub="scientific research · machine learning · open results" p={p("purpose", 0.4, 0.6)} rec recP={recP} />
      <Option y={TOP + 250} letter="B" label="a broader tech purpose" p={p("broad", 0.4)} recP={recP} />
      <Option y={TOP + 350} letter="C" label="narrower, machine-learning-only wording" p={p("narrow", 0.4)} recP={recP} />

      {/* The sample sentence, with the word the tax office looks for. */}
      <div style={{ position: "absolute", left: GX0, top: TOP + 130, width: GX1 - GX0, ...text("body"), fontSize: 28, lineHeight: 1.35, color: color.ink2, opacity: ease.arrive(p("purpose", 0.4, 0.3)) }}>
        “To undertake <b style={{ color: color.ink, fontWeight: 650, borderBottom: p("scientific", 0.1) > 0 ? `3px solid ${color.ink}` : "none" }}>scientific</b> research in machine learning, for the public interest …”
      </div>
      <Why x={GX0} y={TOP + 240} w={GX1 - GX0} p={p("scientific", 0.4, 0.3)} size={22}>
        the tax office’s test for exemption looks for this word
      </Why>

      {/* The width gauge. */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: ease.arrive(p("broad", 0.4, -0.4)) }}>
        <rect x={GX0} y={GY - 6} width={GX1 - GX0} height={12} rx={6} fill={color.sheetShade} stroke={color.ink} strokeWidth={2} />
        <rect x={GX0} y={GY - 6} width={140} height={12} rx={6} fill={color.red} opacity={ease.arrive(p("narrow", 0.4))} />
        <rect x={GX1 - 140} y={GY - 6} width={140} height={12} rx={6} fill={color.red} opacity={ease.arrive(p("broad", 0.4))} />
        <circle cx={knob} cy={GY} r={16} fill={color.card} stroke={color.ink} strokeWidth={3} opacity={ease.arrive(p("broad", 0.3))} />
      </svg>
      <Why x={GX1 - 300} y={GY + 26} w={300} p={p("broad", 0.4, 0.4)} size={22} c={color.red}>
        <span style={{ display: "block", textAlign: "right" }}>too broad: invites doubt</span>
      </Why>
      <Why x={GX0} y={GY + 26} w={420} p={p("narrow", 0.4, 0.4)} size={22} c={color.red}>
        too narrow: amend for every new area
      </Why>
      <Bean who="alpha" x={(GX0 + GX1) / 2} y={GY + 250} size={110} p={p("rec", 0.5, 0.4)} mood={p("ml", 0.1) > 0 ? "o" : "open"} mark={p("ml", 0.1) > 0 ? "?" : undefined} markP={p("ml", 0.3, 0.3)} hop={p("rec", 0.3, 0.6) * (1 - p("rec", 0.1, 0.9))} />

      <DocTag x={X0} y={TOP + 480} p={p("rec", 0.3, 0.8)}>
        {"FOUNDER REVIEW 1 · blocks the Articles · GDR-009"}
      </DocTag>
      <Why x={X0} y={TOP + 540} w={760} p={p("ml", 0.4)} size={24} c={color.ink}>
        one catch: the tax rules’ list of sciences doesn’t name machine learning · ask a lawyer how to word it
      </Why>
      <Claim kind="design" note="the draft’s suggestion; you may reject it" x={X0} y={CLAIM_Y} p={p("rec", 0.3, 1.2)} />
    </Exhibit>
  );
}

