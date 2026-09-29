/**
 * What next. (A) The study's own verdict; why deleting refusals is no fix; the limits.
 * (B) Study 002: the trays return and the empty ANSWER bin fills (1,055) and holds; the
 * new gate rule; the labellers' agreement stops short of its pre-registered floor, so
 * nothing is trained.
 * Cues: label, trade, one, explain, fill, fails, agree, floor, nothing.
 */
import { color, text } from "@vid/design";
import { Card, Claim, DotField, Exhibit, FlowBox, Link, Meter, packTray, Stamp, Tag, Term, Trays, type Pt } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { agreement, MODES, pconf } from "./shared/data.ts";
import { TOP, trays, X0, X1 } from "./shared/layout.ts";

/** The labeller-agreement block (the pilot had it at x 1100-1760; the lesson's stage ends at X1). */
const AGREE_X = 800;

const TRAY_TOP = 560;
const TRAY_H = 230;
const T = trays(TRAY_TOP, TRAY_H);
const R = 2.3;
// Study 002's evaluation population (P-CONF gold counts), packed per tray.
const DOTS: Array<{ mode: string; at: Pt; from: Pt }> = MODES.flatMap((m, i) => {
  const pts = packTray(pconf[m], T[i]!.rect, R, 1.1, 8);
  return pts.map((q, k) => ({ mode: m, at: q, from: { x: q.x, y: TRAY_TOP - 90 - ((k * 37) % 60) } }));
});

export default function WhatNext() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const at = (name: string, o = 0) => cue.frame(name) + Math.round(o * fps);
  const p = (name: string, dur = 0.3, o = 0) => clamp((f - at(name, o)) / (dur * fps));

  const others = DOTS.filter((d) => d.mode !== "ANSWER");
  const answers = DOTS.filter((d) => d.mode === "ANSWER");
  const fy = TOP + 330;

  return (
    <>
      {/* A: the verdict, the trade-off, the limits. */}
      <Exhibit from="label" until="explain">
        <Card x={X0} y={TOP + 30} w={1080} kicker="the study's own conclusion" p={p("label", 0.3)}>
          <span style={{ ...text("title"), fontSize: 56, color: color.ink }}>
            “The defect is the <span style={{ color: color.red }}>label</span>, not the refusal.”
          </span>
        </Card>
        <FlowBox x={X0} y={fy} w={330} h={76} p={p("trade", 0.3)}>
          DELETE REFUSALS
        </FlowBox>
        <Link points={[[X0 + 330, fy + 38], [X0 + 420, fy + 38]]} p={p("trade", 0.3, 0.3)} />
        <FlowBox x={X0 + 420} y={fy} w={330} h={76} p={p("trade", 0.3, 0.5)}>
          FEWER REFUSALS
        </FlowBox>
        <Link points={[[X0 + 750, fy + 38], [X0 + 840, fy + 38]]} p={p("trade", 0.3, 0.8)} c={color.red} />
        <FlowBox x={X0 + 840} y={fy} w={X1 - X0 - 840} h={76} c={color.red} p={p("trade", 0.3, 1.0)}>
          MORE MADE-UP ANSWERS
        </FlowBox>
        <div style={{ position: "absolute", left: X0, top: TOP + 500, display: "flex", gap: 14 }}>
          {["one model", "trained once", "never repeated"].map((t, i) => (
            <Tag key={t} p={p("one", 0.25, i * 0.25)} c={color.ink} style={{ fontSize: 22, padding: "8px 16px" }}>
              {t}
            </Tag>
          ))}
        </div>
        <Stamp x={X1 - 380} y={TOP + 480} head="STOPPED" p={p("one", 0.25, 1.4)} style={{ fontSize: 24 }}>
          no retraining on labels
          <br />
          it can't trust
        </Stamp>
        <Claim kind="author-interpretation" note="the study's roadmap and limits" x={X0} y={TOP + 660} p={p("label", 0.3, 1.0)} />
      </Exhibit>

      {/* B: Study 002. */}
      <Exhibit from="explain">
        <Term x={X0} y={TOP + 20} def="explain the failure before trying to fix it" p={p("explain", 1.0)}>
          Study 002
        </Term>
        <Trays trays={T} p={p("explain", 0.6, 0.3)} labelP={p("explain", 0.3, 0.6)} glow={{ ANSWER: p("fill", 0.4) }} counts={Object.fromEntries(MODES.map((m) => [m, m === "ANSWER" && p("fill", 0.3, 1.2) <= 0 ? "" : pconf[m].toLocaleString("en-US")]))} countP={p("explain", 0.3, 0.8)} />
        <DotField from={others.map((d) => d.from)} to={others.map((d) => d.at)} p={p("explain", 1.2, 0.6)} fromColor={color.ink3} r={R} lift={0} spread={0.5} />
        <DotField from={answers.map((d) => d.from)} to={answers.map((d) => d.at)} p={p("fill", 1.8)} fromColor={color.ink} r={R} lift={0} spread={0.7} opacity={p("fill", 0.1) > 0 ? 1 : 0} />
        {/* The new gate rule. */}
        <div style={{ position: "absolute", left: X0, top: TOP + 150, opacity: ease.arrive(p("fails", 0.3)), transform: `translateY(${(1 - ease.arrive(p("fails", 0.3))) * 6}px)`, whiteSpace: "nowrap" }}>
          <div style={{ ...text("label"), color: color.ink3 }}>THE NEW GATE</div>
          <div style={{ ...text("termDef"), fontSize: 26, color: color.ink, marginTop: 8 }}>
            tool score holds + answering collapses → <span style={{ color: color.red, fontWeight: 700 }}>FAIL</span>
          </div>
        </div>
        {/* The agreement floor. */}
        <Term x={AGREE_X} y={TOP + 20} def={`two AI labellers · ${agreement.items.toLocaleString("en-US")} items`} p={p("agree", 1.0, -0.3)}>
          labeller agreement
        </Term>
        {p("agree", 0.1, -0.1) > 0 && <Meter x={AGREE_X} y={TOP + 150} w={300} value={agreement.raw_agreement} floor={agreement.floor} p={p("agree", 1.0)} floorLabel={p("floor", 0.1) > 0 ? `floor ${Math.round(agreement.floor * 100)}%, set in advance` : undefined} />}
        <Stamp x={AGREE_X + 320} y={TOP + 150} head="STOP" p={p("nothing", 0.25)} stack style={{ fontSize: 22 }}>
          nothing trained
        </Stamp>
        <Claim kind="measured" note="Study 002's evaluation set and stop report" x={X0} y={TOP + 660} p={p("fill", 0.3, 2.0)} />
      </Exhibit>
    </>
  );
}
