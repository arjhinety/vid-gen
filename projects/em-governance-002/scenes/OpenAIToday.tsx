/**
 * OpenAI today. Centre: the Foundation above OpenAI Group PBC, joined by the control
 * arrow (the crimson idea: control comes from the special shares and the power over
 * directors, not from the biggest stake). Bottom: the ownership bar, 26 / 27 / 47. Left:
 * safety oversight at the Foundation, and the attorneys general's advance notice. Right:
 * two directors who sit only on the nonprofit's board.
 * Cues: today, fdn, group, stake, ms, rest, classn, appoint, safety, apart, notice.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, useProgress } from "./shared/cast.tsx";
import { Box, Note } from "./shared/boxes.tsx";
import { oa } from "./shared/data.ts";
import { CLAIM_Y, CX, TOP, X0, X1 } from "./shared/layout.ts";

const BW = 480;
const BAR_X = X0 + 200;
const BAR_W = X1 - X0 - 400;

export default function OpenAIToday() {
  const { p } = useProgress();
  const segs = [
    { cue: "stake", pct: oa.foundationPct, label: "the Foundation", fill: color.ink, ink: color.card },
    { cue: "ms", pct: oa.microsoftPct, label: "Microsoft", fill: color.ink3, ink: color.card },
    { cue: "rest", pct: oa.othersPct, label: "employees and investors", fill: color.card, ink: color.ink },
  ];
  let acc = 0;
  return (
    <Exhibit from={0}>
      <Box x={CX - BW / 2} y={TOP + 10} w={BW} h={130} kicker="OPENAI FOUNDATION" title="the nonprofit" p={p("fdn", 0.4)} />
      <Box x={CX - BW / 2} y={TOP + 300} w={BW} h={130} kicker="OPENAI GROUP PBC" title="same mission" dashed p={p("group", 0.4)} />
      <Arrow points={[[CX, TOP + 146], [CX, TOP + 292]]} p={p("classn", 0.5)} c={color.red} width={5} />
      <Note x={CX + 22} y={TOP + 170} w={320} p={p("classn", 0.4, 0.3)} c={color.red} size={24} weight={600}>
        {`control: ${oa.classN} shares`}
      </Note>
      <Note x={CX + 22} y={TOP + 204} w={320} p={p("appoint", 0.4)} c={color.red} size={24}>
        appoints and removes every director
      </Note>

      {/* Who owns what. */}
      {segs.map((s) => {
        const x = BAR_X + (acc / 100) * BAR_W;
        const w = (s.pct / 100) * BAR_W;
        acc += s.pct;
        const q = ease.travel(p(s.cue, 0.5));
        if (q <= 0) return null;
        return (
          <div key={s.cue}>
            <div style={{ position: "absolute", left: x, top: TOP + 480, width: Math.max(2, w * q), height: 46, boxSizing: "border-box", background: s.fill, border: `2px solid ${color.ink}` }} />
            <div style={{ position: "absolute", left: x + 12, top: TOP + 488, ...text("value"), fontSize: 26, color: s.ink, opacity: clamp(q * 3 - 2) }}>{`${s.pct}%`}</div>
            <div style={{ position: "absolute", left: x, top: TOP + 536, width: w, ...text("meta"), fontSize: 20, color: color.ink2, opacity: clamp(q * 3 - 2) }}>{s.label}</div>
          </div>
        );
      })}
      <Note x={BAR_X} y={TOP + 440} w={BAR_W} p={p("stake", 0.4, -0.3)} size={20} c={color.ink3}>
        {`WHO OWNS THE COMPANY · the Foundation’s share is worth about ${oa.foundationUsd}`}
      </Note>

      {/* Left: safety, and the regulators' notice. */}
      <Note x={X0} y={TOP + 20} w={420} p={p("safety", 0.4)} c={color.ink} size={26}>
        safety oversight stays at the Foundation
      </Note>
      <Note x={X0} y={TOP + 90} w={420} p={p("safety", 0.4, 0.5)}>
        {`it can require fixes, ${oa.halt}`}
      </Note>
      <Bean who="outsider" x={X0 + 80} y={TOP + 400} size={72} holds="doc" holdP={p("notice", 0.4, 0.3)} mood="flat" name={false} p={p("notice", 0.4)} />
      <Note x={X0 + 160} y={TOP + 300} w={300} p={p("notice", 0.4, 0.4)}>
        the attorneys general get advance notice of big changes
      </Note>

      {/* Right: directors who sit only on the nonprofit's board. */}
      {Array.from({ length: oa.twoApart }, (_, k) => (
        <Bean key={k} who="plain" x={X1 - 340 + k * 130} y={TOP + 140} size={72} hat="trustee" name={false} p={p("apart", 0.4, k * 0.12)} />
      ))}
      <Note x={X1 - 420} y={TOP + 170} w={420} p={p("apart", 0.4, 0.4)}>
        {`within a year, at least ${oa.twoApart} directors sit only on the nonprofit’s board`}
      </Note>

      <Claim kind="measured" note="OpenAI’s structure page, the Delaware AG, the California AG’s agreement" x={X0} y={CLAIM_Y} p={p("notice", 0.3, 1.0)} />
    </Exhibit>
  );
}
