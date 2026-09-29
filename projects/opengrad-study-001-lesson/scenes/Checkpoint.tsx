/**
 * Checkpoint 2 (lesson only). Why did no gate see the refusals? Three answers on a card, the
 * viewer's 3 s (ThinkRing), then the answer: the test was missing a kind of question. The
 * empty ANSWER tray from the previous scene stays in view as the evidence.
 * Cues: check2. Lines: l13#0 (question), l13#1 (answer).
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { ChoiceCard, ThinkRing } from "./shared/devices.tsx";
import { heldout, MODES } from "./shared/data.ts";
import { TOP, X0, X1 } from "./shared/layout.ts";

export default function Checkpoint() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const answerAt = cue.frame("line:l13#1");
  const p = (from: number, dur = 0.35) => clamp((f - from) / (dur * fps));
  const total = MODES.reduce((s, m) => s + heldout[m], 0);
  const tray = { x: X1 - 380, y: TOP + 400, w: 340, h: 220 }; // inset so its one-line caption ends inside X1
  const draw = ease.travel(p(cue.frame("line:l13#0"), 0.8));
  return (
    <Exhibit>
      <ChoiceCard
        x={X0}
        y={TOP + 40}
        w={820}
        p={p(cue.frame("line:l13#0") + Math.round(0.8 * fps), 1.4)}
        reveal={p(answerAt, 0.5)}
        answer={2}
        options={["the test was too small", "the scores were too noisy", "a kind of question was missing"]}
      />
      <ThinkRing x={X0} y={TOP + 330} start={answerAt - 3 * fps} end={answerAt} />

      {/* The evidence: the ANSWER tray of the held-out set, still empty. */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path d={`M ${tray.x} ${tray.y} L ${tray.x} ${tray.y + tray.h} L ${tray.x + tray.w} ${tray.y + tray.h} L ${tray.x + tray.w} ${tray.y}`} pathLength={1} fill="none" stroke={color.ink} strokeWidth={3} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      </svg>
      <div style={{ position: "absolute", left: tray.x, top: tray.y + tray.h + 14, width: tray.w, textAlign: "center", ...text("label"), color: color.ink, opacity: draw }}>ANSWER</div>
      <div style={{ position: "absolute", left: tray.x - 60, top: tray.y + tray.h + 48, width: tray.w + 120, textAlign: "center", whiteSpace: "nowrap", ...text("meta"), color: color.ink3, opacity: draw }}>
        {heldout.ANSWER} of {total.toLocaleString("en-US")} held-out questions
      </div>
      <Claim kind="measured" note="the held-out set's gold counts" x={X0} y={TOP + 660} p={p(answerAt, 0.3)} />
    </Exhibit>
  );
}
