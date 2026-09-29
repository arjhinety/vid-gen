/**
 * The label. The labelling code (adapters.py 160-173, verbatim): a tool call is CALL and
 * everything else falls into `else` and becomes ANSWER; a real refusal from the training
 * targets, stamped ANSWER; how much of the corpus that is; marked as a hypothesis
 * (association, not cause).
 * Cues: code, else, apology, tenth, w2c, suspect.
 */
import { claimStyle, color, text } from "@vid/design";
import { Card, Claim, CodePanel, Exhibit, InstrumentPanel, Stamp, Tag, Term } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { audit, corpusTemplates, MODES, pct } from "./shared/data.ts";
import { TOP, X0, X1 } from "./shared/layout.ts";

/** Right column: the label, the decision options, then the refusal record. */
const RX = 1250;

// src/opengrad/data/adapters.py, lines 160-173 (verbatim; checked against the file).
const CODE = `    if any(m.get("role") == "tool" for m in messages):
        metadata["behavior"] = {
            "decision": "CALL",
            "capabilities": ["consume_tool_result"],
            "confidence": "derived",
        }
    elif any(m.get("tool_calls") for m in messages):
        metadata["behavior"] = {
            "decision": "CALL",
            "capabilities": ["single_tool_selection", "argument_grounding"],
            "confidence": "derived",
        }
    else:
        metadata["behavior"] = {"decision": "ANSWER", "capabilities": [], "confidence": "derived"}`;

export default function TheLabel() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const at = (name: string, o = 0) => cue.frame(name) + Math.round(o * fps);
  const p = (name: string, dur = 0.3, o = 0) => clamp((f - at(name, o)) / (dur * fps));
  const top = corpusTemplates[0]!;
  const example = top.example.length > 120 ? `${top.example.slice(0, top.example.lastIndexOf(" ", 120))} …` : top.example;
  const w2c = audit.per_source["when2call"]!;

  return (
    <>
      {/* A: the label every example carries; the code that assigns it; a refusal it files as an answer. */}
      <Exhibit from="line:b13#0" until="tenth">
        <Term x={RX} y={TOP + 20} def="the right move, written on each training example" p={p("line:b13#0", 1.0, 0.3)}>
          the label
        </Term>
        <div style={{ position: "absolute", left: RX, top: TOP + 140, display: "flex", gap: 10 }}>
          {MODES.map((m, i) => (
            <Tag
              key={m}
              p={p("code", 0.25, 0.3 + i * 0.12)}
              c={m === "ANSWER" && f >= at("else", 0.8) ? color.red : color.ink}
              strike={m === "CLARIFY" || m === "UNSUPPORTED" ? p("else", 0.4, 0.3 + (m === "UNSUPPORTED" ? 0.12 : 0)) : 0}
              style={{ fontSize: 20, padding: "6px 12px" }}
            >
              {m}
            </Tag>
          ))}
        </div>
        <InstrumentPanel x={X0} y={TOP + 20} w={1060} h={560} enter={p("code", 0.5, -0.1)} title="the labelling code" tag="adapters.py" tagColor={color.instrumentInk2}>
          <div style={{ marginLeft: -12, overflow: "hidden", width: 1020 }}>
            <CodePanel code={CODE} firstLine={160} fontSize={19} focus={[13, 14]} focusP={p("else", 0.4)} highlight={{ line: 14, p: p("else", 0.3, 0.2) }} />
          </div>
        </InstrumentPanel>
        <Term x={X0} y={TOP + 604} c={color.red} def="no branch for asking or declining: a refusal becomes ANSWER" p={p("else", 1.1, 0.5)} size={30}>
          else → ANSWER
        </Term>
        <Card x={RX} y={TOP + 230} w={X1 - RX} kicker="a real training example" p={p("apology", 0.3)} rotate={0.6}>
          <span style={{ ...text("code"), fontSize: 22, lineHeight: 1.45, color: color.ink }}>“{example}”</span>
        </Card>
        <Stamp x={RX + 280} y={TOP + 400} head="LABEL" p={p("apology", 0.25, 0.8)} tilt={-4} style={{ fontSize: 24 }}>
          ANSWER
        </Stamp>
      </Exhibit>

      {/* B: how much of the corpus that is; and what it does and doesn't establish. */}
      <Exhibit from="tenth">
        <Strip y={TOP + 40} label="all training examples" part={audit.totals.refusal_targets} total={audit.totals.records_audited} p={p("tenth", 1.0, 0.1)} />
        <Strip y={TOP + 190} label="one source: When2Call" part={w2c.refusal_targets} total={w2c.records} p={p("w2c", 1.0)} />
        <div style={{ position: "absolute", left: X0, top: TOP + 320, ...text("meta"), fontSize: 22, color: color.ink2, opacity: ease.arrive(p("tenth", 0.3, 0.8)), whiteSpace: "nowrap" }}>
          <span style={{ color: color.red }}>■</span> refusals labelled ANSWER · flagged by an automatic refusal detector
        </div>
        <HypothesisCard x={X0} y={TOP + 400} p={p("suspect", 0.35)} />
        <Claim kind="measured" note="the study's supervision audit" x={X1 - 560} w={560} align="right" y={TOP + 320} p={p("tenth", 0.3, 1.0)} />
      </Exhibit>
    </>
  );
}

function Strip({ y, label, part, total, p }: { y: number; label: string; part: number; total: number; p: number }) {
  if (p <= 0) return null;
  const W = 1180;
  const a = ease.arrive(clamp(p * 3));
  const pw = (part / total) * W * ease.settle(clamp(p));
  return (
    <div style={{ position: "absolute", left: X0, top: y, opacity: a }}>
      <div style={{ ...text("termDef"), color: color.ink, marginBottom: 12, whiteSpace: "nowrap" }}>
        {label} <span style={{ color: color.ink3 }}>· {total.toLocaleString("en-US")}</span>
      </div>
      <div style={{ position: "relative", width: W, height: 44 }}>
        <div style={{ position: "absolute", inset: 0, background: color.card, border: `1.5px solid ${color.hairline}` }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pw, background: color.red }} />
        <div style={{ position: "absolute", left: W + 24, top: -2, ...text("value"), fontSize: 40, color: color.red, whiteSpace: "nowrap", opacity: clamp(p * 2 - 0.6) }}>{pct(part / total, 0)}</div>
      </div>
    </div>
  );
}

function HypothesisCard({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const c = claimStyle.hypothesis;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 1100, border: `2px dashed ${color.ink2}`, padding: "22px 28px", opacity: a, transform: `translateY(${(1 - a) * 8}px)`, background: `${color.card}dd` }}>
      <div style={{ ...text("label"), color: c.color }}>{c.glyph} Hypothesis · the prime suspect</div>
      <div style={{ ...text("body"), fontSize: 32, color: color.ink, marginTop: 10 }}>Refusals taught as “answers” taught the model that answering can look like declining.</div>
      <div style={{ ...text("termDef"), fontSize: 22, color: color.ink2, marginTop: 12 }}>an association, not a proven cause: the test that would settle it hasn't been run</div>
    </div>
  );
}
