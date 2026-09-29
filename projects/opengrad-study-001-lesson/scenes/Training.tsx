/**
 * Post-training. (A) Fine-tuning, defined; the corpus as one number and four sources; the
 * training loss drawn by the pen. (B) The held-out set, defined and sealed; opened once,
 * over-calling collapses. (C) Preference training, defined as a picture; its gain as seven
 * cells out of 453, within noise; the gate, defined, rewritten after the first results.
 * Cues: finetune, corpus, sources, heldout, sealed, drop, pref, seven, noise, gate.
 */
import { color, shadow, text } from "@vid/design";
import { Card, CellGrid, Claim, Exhibit, HBar, Meta, PenNib, ScaleAxis, Stamp, Term } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { corpusSources, pct, routing, sftLoss } from "./shared/data.ts";
import { TOP, X0, X1 } from "./shared/layout.ts";

const fmt = (n: number) => n.toLocaleString("en-US");
const BAR_W = X1 - X0 - 280 - 90; // the over-calling bars end before the stage edge (value labels sit past the bar)
// The 453-request grid sits right of the replies; its "+7" term takes the strip up to X1.
const GRID_X = 750;
const NAMES: Record<string, string> = { glaive: "Glaive", toolace: "ToolACE", when2call: "When2Call", xlam: "xLAM" };

export default function Training() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const at = (name: string, o = 0) => cue.frame(name) + Math.round(o * fps);
  const p = (name: string, dur = 0.35, o = 0) => clamp((f - at(name, o)) / (dur * fps));
  const total = corpusSources.reduce((s, c) => s + c.records, 0);
  const maxSrc = Math.max(...corpusSources.map((c) => c.records));

  return (
    <>
      {/* A: fine-tuning, the corpus, and training as a drawn curve. */}
      <Exhibit from="finetune" until="heldout">
        <Term x={X0} y={TOP + 30} def="more training, on examples of the behaviour you want" p={p("finetune", 1.0)}>
          fine-tuning
        </Term>
        <Card x={X0} y={TOP + 170} w={640} kicker="tool-use conversations" p={p("corpus", 0.3)}>
          <div style={{ ...text("bigNumber"), color: color.ink }}>{fmt(total)}</div>
        </Card>
        {corpusSources.map((s, i) => {
          const y = TOP + 380 + i * 62;
          const q = p("sources", 0.4, i * 0.15);
          return (
            <div key={s.id}>
              <Meta x={X0} y={y} c={color.ink2} size={22} p={q}>
                {NAMES[s.id.split("-")[0]!] ?? s.id}
              </Meta>
              <div style={{ position: "absolute", left: X0 + 190, top: y + 4, height: 22, width: (400 * s.records * ease.settle(q)) / maxSrc, background: color.ink }} />
              <Meta x={X0 + 190 + (400 * s.records) / maxSrc + 14} y={y} size={22} c={color.ink2} p={clamp(q * 2 - 1)}>
                {fmt(s.records)}
              </Meta>
            </div>
          );
        })}
        <LossCurve p={clamp((f - at("finetune", 0.6)) / (at("heldout", -0.4) - at("finetune", 0.6)))} x={830} y={TOP + 150} w={X1 - 830} h={420} />
      </Exhibit>

      {/* B: the held-out set, sealed, opened once. */}
      <Exhibit from="heldout" until="pref">
        <div style={{ position: "absolute", left: X0, top: TOP + 20, width: X1 - X0, height: 600, border: `2.5px dashed ${color.ink2}`, opacity: 1 - 0.6 * p("drop", 0.4, -0.2) }} />
        <Term x={X0 + 40} y={TOP + 56} def="questions the model never trained on" p={p("heldout", 1.0)}>
          the held-out set
        </Term>
        <Stamp x={X1 - 560} y={TOP + 50} head="SEALED" p={p("sealed", 0.25, 0.1)} style={{ opacity: 1 - p("drop", 0.3, -0.1), fontSize: 22 }}>
          scored once, after training
        </Stamp>
        <Term x={X0 + 40} y={TOP + 250} def="calling a tool when none was needed" p={p("drop", 0.9, -0.4)}>
          over-calling
        </Term>
        <Meta x={X0 + 40} y={TOP + 394} c={color.neutral} size={24} p={p("drop", 0.3, -0.2)}>
          before
        </Meta>
        <HBar x={X0 + 280} y={TOP + 386} w={BAR_W} value={routing.B0.over_call_rate} p={p("drop", 0.6, -0.2)} c={color.neutral} h={40} label={pct(routing.B0.over_call_rate, 0)} />
        <Meta x={X0 + 40} y={TOP + 464} c={color.ink} size={24} p={p("drop", 0.3, 0.3)}>
          fine-tuned
        </Meta>
        <HBar x={X0 + 280} y={TOP + 456} w={BAR_W} value={routing.M0.over_call_rate} p={p("drop", 0.6, 0.3)} h={40} label={pct(routing.M0.over_call_rate, 0)} />
        <ScaleAxis x={X0 + 280} y={TOP + 522} w={BAR_W} ticks={[0, 0.25, 0.5, 0.75, 1]} format={(v) => `${Math.round(v * 100)}%`} p={p("drop", 0.5, -0.2)} />
        <Claim kind="measured" note="held-out set, scored once" x={X0} y={TOP + 650} p={p("drop", 0.3, 0.9)} />
      </Exhibit>

      {/* C: preference training; +7 of 453, within noise; the gate. */}
      <Exhibit from="pref">
        {/* Left column (X0 .. X0+550): the term, wrapped to two lines, and the two replies. */}
        <Term x={X0} y={TOP + 30} w={540} style={{ whiteSpace: "normal" }} def="show two replies; nudge the model toward the better one" p={p("pref", 1.0)}>
          preference training
        </Term>
        <Reply x={X0} y={TOP + 180} label="reply A" p={p("pref", 0.35, 0.5)} />
        <Reply x={X0 + 290} y={TOP + 180} label="reply B" p={p("pref", 0.35, 0.7)} better={p("pref", 0.3, 1.3)} />
        <Meta x={X0} y={TOP + 330} size={20} p={p("pref", 0.3, 1.6)}>
          481 preference pairs
        </Meta>

        {/* The 453 requests that needed a tool: correct calls after fine-tuning, then the 7 that preference training added. */}
        <Grid453 x={GRID_X} y={TOP + 20} p={p("seven", 0.9, -0.3)} plus={p("seven", 0.5, 0.5)} noise={p("noise", 0.4)} />

        {/* The gate. */}
        <div style={{ position: "absolute", left: X0, top: TOP + 470, width: X1 - X0, height: 2, background: color.ink2, opacity: ease.arrive(p("gate", 0.4, -0.2)) }} />
        <Term x={X0} y={TOP + 500} def="a pass-or-fail checklist for promoting a model" p={p("gate", 1.0, -0.1)}>
          the gate
        </Term>
        <Stamp x={X1 - 630} y={TOP + 500} head="PROMOTED ✓" headColor={color.ink} p={p("gate", 0.25, 0.9)} style={{ fontSize: 22 }}>
          the preference-trained model
        </Stamp>
        <Stamp x={X1 - 670} y={TOP + 578} head="REWRITTEN" p={p("gate", 0.25, 2.0)} tilt={1.2} style={{ fontSize: 22 }}>
          after the first results were in
        </Stamp>
        <Claim kind="measured" note="the study's own errata" x={X0} y={TOP + 676} p={p("gate", 0.3, 2.4)} />
      </Exhibit>
    </>
  );
}

function Reply({ x, y, label, p, better = 0 }: { x: number; y: number; label: string; p: number; better?: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const b = ease.settle(clamp(better));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 260, height: 130, opacity: a, transform: `translateY(${(1 - a) * 8 - b * 8}px)` }}>
      <div style={{ position: "absolute", inset: 0, background: color.card, border: `${2 + b}px solid ${b > 0.5 ? color.ink : color.hairline}`, boxShadow: b > 0.5 ? shadow.lifted : shadow.card }} />
      <div style={{ position: "absolute", left: 20, top: 16, ...text("label"), color: color.ink2 }}>{label}</div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ position: "absolute", left: 20, top: 58 + i * 20, width: [220, 180, 200][i], height: 8, background: color.hairline }} />
      ))}
      {better > 0 && <div style={{ position: "absolute", right: 16, top: 8, ...text("title"), fontSize: 48, color: color.ink, opacity: b }}>✓</div>}
    </div>
  );
}

function Grid453({ x, y, p, plus, noise }: { x: number; y: number; p: number; plus: number; noise: number }) {
  if (p <= 0) return null;
  const n = routing.M0.confusion.CALL.CALL + (routing.M0.confusion.CALL.ANSWER + routing.M0.confusion.CALL.CLARIFY + routing.M0.confusion.CALL.UNSUPPORTED);
  const m0 = routing.M0.confusion.CALL.CALL;
  const m1 = routing.M1v2.confusion.CALL.CALL;
  const cols = 24; // the pilot's 30 x 13 px grid is too wide for the lesson's stage
  const cell = 10;
  const gap = 3;
  const a = ease.arrive(clamp(p));
  const rows = Math.ceil(n / cols);
  const gy = y + 50;
  const addY = gy + Math.floor(m0 / cols) * (cell + gap);
  const tx = x + cols * (cell + gap) + 30;
  const below = gy + rows * (cell + gap) + 14;
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, opacity: a, whiteSpace: "nowrap" }}>
        <span style={{ ...text("label"), color: color.ink2 }}>{n} REQUESTS THAT NEEDED A TOOL</span>
      </div>
      <CellGrid
        n={n}
        cols={cols}
        x={x}
        y={gy}
        cell={cell}
        gap={gap}
        show={(i) => clamp(p * 1.5 - (i / n) * 0.5)}
        fill={(i) => (i < m0 ? color.ink : i < m1 && plus > 0 ? color.red : color.hairline)}
        hollow={(i) => i >= m0 && !(i < m1 && plus > 0)}
      />
      <div style={{ position: "absolute", left: x, top: below, ...text("meta"), fontSize: 22, color: color.ink2, opacity: a, whiteSpace: "nowrap" }}>
        <span style={{ color: color.ink }}>■</span> {m0} called right after fine-tuning
      </div>
      <Term x={tx} y={addY - 12} w={X1 - tx} c={color.red} def="from preference training" p={plus}>
        {`+${m1 - m0}`}
      </Term>
      {/* The verdict on the whole grid, under it (the strip right of the grid is too narrow for it). */}
      <Term x={x} y={below + 44} c={color.ink2} def="one run: a gain this small could be chance" p={noise}>
        within noise
      </Term>
    </>
  );
}

/** SFT loss (real log, every 20th step), smoothed and labelled as smoothed, drawn by the pen. */
function LossCurve({ p, x, y, w, h }: { p: number; x: number; y: number; w: number; h: number }) {
  if (p <= 0) return null;
  let ema = sftLoss[0]![1];
  const smooth = sftLoss.map(([st, l]) => [st, (ema = 0.85 * ema + 0.15 * l)] as const);
  const maxStep = smooth[smooth.length - 1]![0];
  const maxL = Math.max(...smooth.map((d) => d[1]));
  const pts = smooth.map(([st, l]) => [x + (st / maxStep) * w, y + h - (l / maxL) * h * 0.92] as const);
  const n = Math.max(2, Math.round(pts.length * clamp(p)));
  const d = pts
    .slice(0, n)
    .map(([a, b], i) => `${i ? "L" : "M"} ${a.toFixed(1)} ${b.toFixed(1)}`)
    .join(" ");
  const last = pts[n - 1]!;
  const a = ease.arrive(clamp(p * 6));
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y - 70, opacity: a, whiteSpace: "nowrap" }}>
        <div style={{ ...text("term"), fontSize: 30, color: color.ink }}>training loss</div>
        <div style={{ ...text("termDef"), fontSize: 22, color: color.ink2, marginTop: 4 }}>how wrong the model is on its examples · smoothed</div>
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={x} x2={x + w} y1={y + h} y2={y + h} stroke={color.ink2} strokeWidth={1.5} opacity={a} />
        <line x1={x} x2={x} y1={y} y2={y + h} stroke={color.ink2} strokeWidth={1.5} opacity={a} />
        <path d={d} fill="none" stroke={color.ink} strokeWidth={3.5} strokeLinejoin="round" />
      </svg>
      {p < 1 && <PenNib x={last[0]} y={last[1]} />}
      <Meta x={x + w - 160} y={y + h + 12} size={20} p={a}>
        {fmt(maxStep)} steps
      </Meta>
    </>
  );
}
