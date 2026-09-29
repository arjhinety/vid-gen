/**
 * Cold open. The question types itself in silence; the base model answers wrongly; the
 * trained model refuses; by the promotion score, the trained model is still "better".
 * Then the title. No numbers yet: F1 is explained in its own scene.
 * Cues: q, base, trained, better, bin.
 */
import { color, text } from "@vid/design";
import { Card, Claim, Cross, Exhibit, InstrumentPanel, Stamp, Term, TypeStream } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { sentinel, sentinelCase } from "./shared/data.ts";
import { TOP, X0, X1 } from "./shared/layout.ts";

const CASE = "multi-step-change";
const EXPECTED = "16"; // the grader for this case is /\b16\b/ (data/study001.json → sentinel.prompts)

export default function ColdOpen() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const prompt = sentinel.prompts[CASE]!.user[0]!;
  const baseOut = sentinelCase("B0", CASE).raw;
  const trainedOut = sentinelCase("M1v2", CASE).raw;
  const at = (name: string, o = 0) => cue.frame(name) + Math.round(o * fps);
  const p = (name: string, dur = 0.35, o = 0) => clamp((f - at(name, o)) / (dur * fps));
  const s = (t: number, dur = 0.35) => clamp((f - t * fps) / (dur * fps));

  const panelX = 900;
  const panelW = X1 - panelX;
  const baseDone = at("base", 0.25) + Math.ceil((baseOut.length / 30) * fps);
  const refusalDone = at("trained", 0.25) + Math.ceil((trainedOut.length / 60) * fps);

  return (
    <>
      <Exhibit from={0.15} until={cue.frame("bin") / fps - 0.2}>
        {/* The question, as a person typed it: it types itself before anyone speaks. */}
        <Card x={X0} y={TOP + 44} w={700} kicker="a question" p={s(0.15, 0.4)}>
          <TypeStream text={prompt} at={Math.round(0.5 * fps)} mode="machine" rate={55} caret={false} s="body" c={color.ink} style={{ fontSize: 32, lineHeight: 1.4 }} />
        </Card>
        <Term x={X0} y={TOP + 310} def="right answer" p={p("q", 0.9, 0.3)}>
          {EXPECTED}
        </Term>

        {/* The base model answers, wrongly. */}
        <InstrumentPanel x={panelX} y={TOP + 44} w={panelW} h={180} enter={p("base", 0.5, -0.1)} title="original model" tag="base" tagColor={color.instrumentInk2}>
          <TypeStream text={baseOut} at={at("base", 0.25)} mode="machine" rate={30} caret={false} s="value" c={color.instrumentInk} style={{ fontSize: 64 }} />
        </InstrumentPanel>
        <Cross x={panelX + 170} y={TOP + 150} size={40} p={clamp((f - baseDone - 4) / 7)} />
        <Term x={panelX + 230} y={TOP + 128} c="#FF8C9E" p={clamp((f - baseDone - 8) / (0.7 * fps))}>
          wrong
        </Term>

        {/* The trained model refuses. */}
        <InstrumentPanel x={panelX} y={TOP + 262} w={panelW} h={214} enter={p("trained", 0.5, -0.1)} title="after our training" tag="trained" tagColor="#9DAAF4">
          <TypeStream text={trainedOut} at={at("trained", 0.25)} mode="machine" rate={60} caret={false} s="code" c="#F0B2BC" style={{ fontSize: 30, lineHeight: 1.45 }} />
        </InstrumentPanel>
        <Stamp x={panelX + panelW - 330} y={TOP + 440} head="REFUSED" p={clamp((f - refusalDone - 6) / 7)} style={{ fontSize: 22 }}>
          no attempt
        </Stamp>

        {/* The promotion score: the trained model wins. No numbers until F1 is explained. */}
        <div style={{ position: "absolute", left: X0, top: TOP + 560, width: X1 - X0, height: 2, background: color.ink2, opacity: ease.arrive(p("better", 0.4, -0.1)) }} />
        <div style={{ position: "absolute", left: X0, top: TOP + 590, ...text("label"), color: color.ink3, opacity: ease.arrive(p("better", 0.3, -0.1)) }}>BY THE SCORE WE PROMOTED ON</div>
        <div style={{ position: "absolute", left: X0, top: TOP + 632, display: "flex", alignItems: "baseline", gap: 28, whiteSpace: "nowrap" }}>
          <span style={{ ...text("title"), color: color.ink, opacity: ease.arrive(p("better", 0.3, 0.15)) }}>trained</span>
          <span style={{ ...text("title"), color: color.ink3, opacity: ease.arrive(p("better", 0.3, 0.3)) }}>beats</span>
          <span style={{ ...text("title"), color: color.neutral, opacity: ease.arrive(p("better", 0.3, 0.45)) }}>original</span>
        </div>
        <Stamp x={X0 + 800} y={TOP + 628} head="PROMOTED ✓" headColor={color.ink} p={p("better", 0.25, 1.0)} style={{ fontSize: 22 }}>
          the trained model
        </Stamp>
        <Claim kind="measured" note="the study's own outputs and scores" x={X1 - 640} w={640} align="right" y={TOP + 520} p={p("better", 0.3, 1.4)} />
      </Exhibit>

      {/* Title: the plant. */}
      <Exhibit from="bin">
        <TitleCard />
      </Exhibit>
    </>
  );
}

function TitleCard() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const t = (o: number, d = 0.35) => ease.arrive(clamp((f - cue.frame("bin") - o * fps) / (d * fps)));
  const tray = { x: 1260, y: 480, w: 420, h: 300 };
  const draw = ease.travel(clamp((f - cue.frame("bin") - 0.5 * fps) / (0.8 * fps)));
  return (
    <>
      <div style={{ position: "absolute", left: X0, top: 480, ...text("display"), color: color.ink, opacity: t(0), transform: `translateY(${(1 - t(0)) * 10}px)` }}>
        The empty bin.
      </div>
      <div style={{ position: "absolute", left: X0 + 4, top: 630, ...text("crumb"), fontSize: 20, color: color.ink3, opacity: t(0.3) }}>
        OpenGrad Study 001 · pilot
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <rect x={tray.x} y={tray.y} width={tray.w} height={tray.h} fill={color.cardShade} opacity={draw * 0.7} />
        <path d={`M ${tray.x} ${tray.y} L ${tray.x} ${tray.y + tray.h} L ${tray.x + tray.w} ${tray.y + tray.h} L ${tray.x + tray.w} ${tray.y}`} pathLength={1} fill="none" stroke={color.ink} strokeWidth={3} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      </svg>
    </>
  );
}
