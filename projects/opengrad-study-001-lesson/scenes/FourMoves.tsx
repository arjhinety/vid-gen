/**
 * The question. (A) What post-training is: a finished model, more training, a model that
 * knows when to use a tool (?). (B) The four moves as trays, one real request in each;
 * then every test request as a dot, poured where the base model put it: over-calls turn
 * red before the 62% appears. The ANSWER tray holds no test request: planted, not said.
 * Cues: when, post, model, moves, call, clarify, decline, answer, reach, p62.
 */
import { color, shadow, text } from "@vid/design";
import { Card, Claim, ColorKey, DotField, Exhibit, Fraction, Link, Meta, Term, Trays } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { overCalls, pct, routing } from "./shared/data.ts";
import { goldLayout, outcomeColors, systemLayout } from "./shared/dots.ts";
import { TOP, trays, X0, X1 } from "./shared/layout.ts";

const TRAY_TOP = 500;
const TRAY_H = 290;
const T = trays(TRAY_TOP, TRAY_H);
const GOLD = goldLayout(TRAY_TOP, TRAY_H);
const B0 = systemLayout("B0", TRAY_TOP, TRAY_H);
const B0_COLORS = outcomeColors("B0");
const BOX_W = 440; // the model boxes (the pilot's were 480: the lesson's stage is narrower)
const ABOVE = GOLD.map((q) => ({ x: q.x, y: TRAY_TOP - 110 + (q.y - TRAY_TOP) * 0.25 }));

export default function FourMoves() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const at = (name: string, o = 0) => cue.frame(name) + Math.round(o * fps);
  const p = (name: string, dur = 0.35, o = 0) => clamp((f - at(name, o)) / (dur * fps));

  const lit = (name: string, next?: string) => p(name, 0.25) * (1 - (next ? 0.75 * p(next, 0.3) : 0));
  const dotsIn = p("reach", 0.8, 0.1);
  const pour = p("reach", 2.4, 1.0);
  const oc = overCalls("B0");

  return (
    <>
      {/* A: post-training, as a picture. */}
      <Exhibit from="line:l03#0" until="moves">
        <ModelBox x={X0 + 20} y={TOP + 170} p={p("line:l03#0", 0.4, 0.2)} name="Qwen3.5-2B" nameP={p("model", 0.5)} />
        <Term x={X0 + 20} y={TOP + 440} def="about two billion parameters" p={p("model", 1.0, 0.3)}>
          a small model
        </Term>
        <ModelBox x={X1 - BOX_W - 20} y={TOP + 170} p={p("when", 0.4, -0.1)} name="…that knows when to use a tool" nameP={p("when", 0.6)} question />
        <Link points={[[X0 + BOX_W + 40, TOP + 290], [X1 - BOX_W - 40, TOP + 290]]} p={p("post", 0.5)} width={3} />
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <path d={`M ${X1 - BOX_W - 58} ${TOP + 278} L ${X1 - BOX_W - 36} ${TOP + 290} L ${X1 - BOX_W - 58} ${TOP + 302}`} fill="none" stroke={color.ink} strokeWidth={3} opacity={clamp(p("post", 0.2, 0.45) * 2)} />
        </svg>
        <Term x={(X0 + X1) / 2} y={TOP + 90} align="center" w={0} def="more training, on a finished model" p={p("post", 1.1)} style={{ transform: "translateX(-50%)", width: "max-content" }}>
          post-training
        </Term>
      </Exhibit>

      {/* B: the four moves, then where the base model put every test request. */}
      <Exhibit from="moves">
        <Trays
          trays={T}
          p={p("moves", 0.6)}
          labelP={p("call", 0.3, -0.2)}
          glow={{ CALL: lit("call", "clarify"), CLARIFY: lit("clarify", "decline"), UNSUPPORTED: lit("decline", "answer"), ANSWER: lit("answer", "reach") }}
        />
        {/* Real test requests, one per tray. */}
        <div style={{ opacity: 1 - p("reach", 0.3) }}>
          <Card x={T[0]!.rect.x + 12} y={TRAY_TOP + 36} w={T[0]!.rect.w - 24} kicker="needs a tool" p={p("call", 0.3)}>
            <span style={{ fontSize: 22 }}>“Find a comedy movie directed by Edgar Wright?”</span>
          </Card>
          <Card x={T[1]!.rect.x + 12} y={TRAY_TOP + 36} w={T[0]!.rect.w - 24} kicker="missing: which city?" p={p("clarify", 0.3)}>
            <span style={{ fontSize: 22 }}>“Rent an apartment, at least 2 bedrooms…”</span>
          </Card>
          <Card x={T[2]!.rect.x + 12} y={TRAY_TOP + 36} w={T[0]!.rect.w - 24} kicker="only tool: set_volume" p={p("decline", 0.3)}>
            <span style={{ fontSize: 22 }}>“play baby Shark”</span>
          </Card>
        </div>

        {dotsIn > 0 && (
          <DotField from={pour > 0 ? GOLD : ABOVE} to={pour > 0 ? B0 : GOLD} p={pour > 0 ? pour : dotsIn} spread={pour > 0 ? 0.6 : 0.5} fromColor={color.ink} toColor={pour > 0 ? B0_COLORS : color.ink} r={3.6} lift={pour > 0 ? 60 : 0} />
        )}
        <Meta x={X0} y={TOP + 20} size={22} c={color.ink2} p={p("reach", 0.3, 0.2)}>
          one dot = one test request · 1,277
        </Meta>
        <ColorKey
          x={X1 - 680}
          y={TOP + 664}
          p={p("reach", 0.3, 2.6)}
          items={[
            { color: color.ink, label: "right move" },
            { color: color.red, label: "called a tool it shouldn't" },
            { color: color.ink3, label: "other mistake" },
          ]}
        />
        {/* Only now the number, read off the red dots. */}
        <Term x={X0} y={TOP + 70} c={color.red} size={64} def="of requests that needed no tool got one anyway" p={p("p62", 1.2, -0.1)}>
          {pct(routing.B0.over_call_rate, 0)}
        </Term>
        {p("p62", 0.1, 0.6) > 0 && (
          <div style={{ position: "absolute", left: X0 + 640, top: TOP + 84 }}>
            <Fraction num={oc.num} den={oc.den} p={p("p62", 0.9, 0.6)} size={34} />
          </div>
        )}
        <Claim kind="measured" note="base model, before any training" x={X0} y={TOP + 660} p={p("p62", 0.3, 1.2)} />
      </Exhibit>
    </>
  );
}

/** A model as an object: a dark card with its name; `question` marks the model we hope to get. */
function ModelBox({ x, y, p, name, nameP, question = false }: { x: number; y: number; p: number; name: string; nameP: number; question?: boolean }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const n = ease.arrive(clamp(nameP));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: BOX_W, height: 240, opacity: a, transform: `translateY(${(1 - a) * 10}px)` }}>
      <div style={{ position: "absolute", inset: 0, background: question ? color.card : color.instrument, border: question ? `2.5px dashed ${color.ink2}` : "none", borderRadius: 18, boxShadow: question ? undefined : shadow.instrument }} />
      <div style={{ position: "absolute", left: 32, top: 30, ...text("label"), color: question ? color.ink3 : color.instrumentInk2 }}>{question ? "THE GOAL" : "THE MODEL"}</div>
      <div style={{ position: "absolute", left: 32, right: question ? 130 : 32, top: 90, ...text("heading"), fontSize: question ? 36 : 48, lineHeight: 1.15, color: question ? color.ink : color.instrumentInk, opacity: n }}>{name}</div>
      {question && <div style={{ position: "absolute", right: 30, bottom: 12, ...text("display"), fontSize: 110, color: color.red, opacity: n }}>?</div>}
    </div>
  );
}
