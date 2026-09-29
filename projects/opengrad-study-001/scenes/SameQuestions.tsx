/**
 * The same questions. (A) 1,319 maths questions as one cell each: the base model attempts
 * them all; both trained checkpoints refuse them all, and the grid turns red and holds.
 * With eight worked examples in the prompt, the same cells flip back. (B) The checkpoint
 * ladder: tool use up (ink); maths, instructions and knowledge down (red); two failures.
 * Cues: gsm, attempt, refuse, shots, vanish, second, up, down, switch, loss.
 */
import { color, text } from "@vid/design";
import { CellGrid, Claim, Exhibit, LineChart, Stamp, Term } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { cap, routing } from "./shared/data.ts";
import { TOP, X0, X1 } from "./shared/layout.ts";

const N = cap.B0.gsm8k_0shot.n;
const GRID = { x: 700, y: TOP + 110, cols: 60, cell: 12, gap: 4 };

export default function SameQuestions() {
  return (
    <>
      <Exhibit from="gsm" until="second">
        <Gsm />
      </Exhibit>
      <Exhibit from="second">
        <Ladder />
      </Exhibit>
    </>
  );
}

function Gsm() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const at = (name: string, o = 0) => cue.frame(name) + Math.round(o * fps);
  const p = (name: string, dur = 0.3, o = 0) => clamp((f - at(name, o)) / (dur * fps));
  const attempt = p("attempt", 1.4);
  const refuse = p("refuse", 2.2);
  const eight = p("vanish", 1.2, -0.2);
  const rows = Math.ceil(N / GRID.cols);
  const gridH = rows * (GRID.cell + GRID.gap);
  const refused = eight > 0.5 ? cap.M1v2.gsm8k_8shot.refusals : cap.M1v2.gsm8k_0shot.refusals;
  return (
    <>
      <Term x={X0} y={TOP + 20} def="grade-school maths questions" p={p("gsm", 1.0)}>
        {N.toLocaleString("en-US")}
      </Term>
      <div style={{ position: "absolute", left: X0, top: TOP + 150, ...text("meta"), fontSize: 22, color: color.ink2, opacity: ease.arrive(p("gsm", 0.3, 0.8)), whiteSpace: "nowrap" }}>one cell = one question</div>

      {/* Which model the grid is showing: original, then the trained checkpoints. */}
      <Who y={TOP + 260} label="original model" p={p("attempt", 0.3)} out={p("refuse", 0.3, -0.2)} note="attempted all of them" />
      <Who y={TOP + 260} label="both trained checkpoints" sub="saved after each training step" p={p("refuse", 0.3, -0.1)} c={eight > 0.5 ? color.ink : color.red} note={eight > 0.5 ? "refused none" : `refused ${refused.toLocaleString("en-US")}`} />
      <Stamp x={X0} y={TOP + 470} head="PROMPT" p={p("shots", 0.25, 0.2)} style={{ fontSize: 22 }}>
        + 8 worked examples
        <br />
        same questions, same model
      </Stamp>

      <CellGrid
        n={N}
        cols={GRID.cols}
        x={GRID.x}
        y={GRID.y}
        cell={GRID.cell}
        gap={GRID.gap}
        show={(i) => clamp(p("gsm", 1.2, 0.3) * 1.6 - (i / N) * 0.6)}
        fill={(i) => {
          const col = (i % GRID.cols) / GRID.cols;
          const row = Math.floor(i / GRID.cols) / rows;
          if (refuse > 0 && eight <= (col + row) / 2) return refuse * 1.5 - row * 0.5 > 0 ? color.red : color.ink;
          return attempt * 1.6 - row * 0.6 > 0 ? color.ink : color.hairline;
        }}
      />
      <Claim kind="measured" note="one run per model" x={X1 - 500} w={500} align="right" y={GRID.y + gridH + 36} p={p("attempt", 0.3, 1.4)} />
    </>
  );
}

function Who({ y, label, sub, p, out = 0, c = color.ink, note }: { y: number; label: string; sub?: string; p: number; out?: number; c?: string; note: string }) {
  if (p <= 0 || out >= 1) return null;
  const a = ease.arrive(clamp(p)) * (1 - ease.exit(clamp(out)));
  return (
    <div style={{ position: "absolute", left: X0, top: y, width: 520, opacity: a, transform: `translateY(${(1 - a) * 8}px)` }}>
      <div style={{ ...text("heading"), fontSize: 34, color: color.ink }}>{label}</div>
      {sub && <div style={{ ...text("termDef"), fontSize: 22, color: color.ink2, marginTop: 4 }}>{sub}</div>}
      <div style={{ ...text("value"), fontSize: 36, color: c, marginTop: 14 }}>{note}</div>
    </div>
  );
}

function Ladder() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const at = (name: string, o = 0) => cue.frame(name) + Math.round(o * fps);
  const p = (name: string, dur = 0.3, o = 0) => clamp((f - at(name, o)) / (dur * fps));
  const drawP = (name: string, o = 0) => clamp((f - at(name, o)) / (1.1 * fps));
  const s100 = (v: number) => Math.round(v * 1000) / 10;
  const series = [
    { id: "tool", name: "tool use", vals: [routing.B0.call_f1, routing.M0.call_f1, routing.M1v2.call_f1], c: color.ink, cue: "up", o: 0 },
    { id: "gsm", name: "maths", vals: [cap.B0.gsm8k_8shot.accuracy, cap.M0.gsm8k_8shot.accuracy, cap.M1v2.gsm8k_8shot.accuracy], c: color.red, cue: "down", o: 0 },
    { id: "ifeval", name: "following instructions", vals: [cap.B0.ifeval!.prompt_level_strict_accuracy, cap.M0.ifeval!.prompt_level_strict_accuracy, cap.M1v2.ifeval!.prompt_level_strict_accuracy], c: color.red, cue: "down", o: 0.3 },
    { id: "mmlu", name: "general knowledge", vals: [cap.B0.mmlu_pro!.accuracy, cap.M0.mmlu_pro!.accuracy, cap.M1v2.mmlu_pro!.accuracy], c: color.red, cue: "down", o: 0.6 },
  ];
  const x = 780;
  const y = TOP + 140;
  const w = 620;
  const h = 440;
  const Y = (v: number) => y + h - ((v * 100 - 30) / 50) * h;
  return (
    <>
      <Term x={X0} y={TOP + 20} def="after each training step, with 8 worked examples in the prompt" p={p("second", 1.0)}>
        the checkpoints
      </Term>
      <LineChart
        x={x}
        y={y}
        w={w}
        h={h}
        categories={["original", "fine-tuned", "+ preference"]}
        yMin={0.3}
        yMax={0.8}
        yTicks={[0.3, 0.4, 0.5, 0.6, 0.7, 0.8]}
        tickFormat={(v) => String(Math.round(v * 100))}
        axisP={p("second", 0.4, 0.3)}
        series={series.map((s) => ({ id: s.id, values: s.vals, c: s.c, p: drawP(s.cue, s.o), nib: true }))}
      />
      {/* End labels: name and change, e.g. "maths 70.4 → 55.5". */}
      {series.map((s) => {
        const q = clamp((f - at(s.cue, s.o) - 1.1 * fps) / (0.3 * fps));
        return (
          <div key={s.id} style={{ position: "absolute", left: x + w + 30, top: Y(s.vals[2]!) - 26, opacity: ease.arrive(q), whiteSpace: "nowrap" }}>
            <div style={{ ...text("termDef"), fontSize: 22, color: s.c }}>{s.name}</div>
            <div style={{ ...text("value"), fontSize: 28, fontWeight: 600, color: s.c }}>
              {s100(s.vals[0]!).toFixed(1)} → {s100(s.vals[2]!).toFixed(1)}
            </div>
          </div>
        );
      })}
      <Stamp x={X0} y={TOP + 250} head="① REFUSAL SWITCH" p={p("switch", 0.25)} stack style={{ fontSize: 22 }}>
        without worked examples
      </Stamp>
      <Stamp x={X0 + 10} y={TOP + 400} head="② ABILITY LOST" p={p("loss", 0.25)} tilt={1} stack style={{ fontSize: 22 }}>
        even with them
      </Stamp>
      <Claim kind="measured" note="scores × 100 · one run per model" x={X0} y={TOP + 660} p={p("down", 0.3, 1.6)} />
    </>
  );
}
