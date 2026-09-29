/**
 * The alarm. The seven-question smoke test: both models pass five, and fail in opposite
 * ways. The base model's misses are wrong answers; the trained model's misses are
 * refusals. Only the misses carry text; the passes are ticks.
 * Cues: smoke, five, opposite, refused.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Term } from "@vid/kit";
import { clamp, ease, useCues, useScene, useSceneFrame } from "@vid/motion";
import { sentinel } from "./shared/data.ts";
import { TOP, X0, X1 } from "./shared/layout.ts";

const COLS = { base: 700, trained: 1230 };
const ROW = 70;

export default function SmokeTest() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const at = (name: string, o = 0) => cue.frame(name) + Math.round(o * fps);
  const p = (name: string, dur = 0.3, o = 0) => clamp((f - at(name, o)) / (dur * fps));
  const top = TOP + 150;
  const cases = sentinel.B0.cases.map((c) => ({ id: c.id, base: c, trained: sentinel.M1v2.cases.find((x) => x.id === c.id)! }));

  return (
    <Exhibit from="smoke">
      <Term x={X0} y={TOP + 20} def="seven fixed questions, asked of each model" p={p("smoke", 1.0)}>
        smoke test
      </Term>
      <Header x={COLS.base} y={top - 70} name="original" p={p("smoke", 0.3, 0.3)} score={`${sentinel.B0.pass} / ${sentinel.B0.total}`} scoreP={p("five", 0.3)} />
      <Header x={COLS.trained} y={top - 70} name="trained" p={p("smoke", 0.3, 0.4)} score={`${sentinel.M1v2.pass} / ${sentinel.M1v2.total}`} scoreP={p("five", 0.3, 0.3)} />
      <div style={{ position: "absolute", left: X0, top: top - 10, width: X1 - X0, height: 2, background: color.ink2, opacity: p("smoke", 0.4, 0.3) }} />
      {cases.map((c, i) => {
        const y = top + 8 + i * ROW;
        const rowIn = p("smoke", 0.25, 0.5 + i * 0.1);
        return (
          <div key={c.id}>
            <div style={{ position: "absolute", left: X0, top: y + 14, ...text("meta"), fontSize: 22, color: color.ink2, opacity: ease.arrive(rowIn), whiteSpace: "nowrap" }}>{c.id.replace(/-/g, " ")}</div>
            <Cell x={COLS.base} y={y} r={c.base} fill={p("smoke", 0.25, 0.8 + i * 0.1)} flag={p("opposite", 0.3)} />
            <Cell x={COLS.trained} y={y} r={c.trained} fill={p("smoke", 0.25, 0.9 + i * 0.1)} flag={p("opposite", 0.3, 0.15)} pulse={p("refused", 0.3)} />
            <div style={{ position: "absolute", left: X0, top: y + ROW - 6, width: X1 - X0, height: 1, background: color.hairline, opacity: rowIn * 0.8 }} />
          </div>
        );
      })}
      <Term x={COLS.base} y={top + 7 * ROW + 30} c={color.ink} def="wrong answers" p={p("opposite", 0.8, 0.4)} size={28}>
        misses:
      </Term>
      <Term x={COLS.trained} y={top + 7 * ROW + 30} c={color.red} defColor={color.red} def="refusals" p={p("refused", 0.8, 0.1)} size={28}>
        misses:
      </Term>
      <Claim kind="measured" note="the study's smoke-test outputs" x={X1 - 640} w={640} align="right" y={TOP + 40} p={p("five", 0.3, 1.2)} />
    </Exhibit>
  );
}

function Header({ x, y, name, p, score, scoreP }: { x: number; y: number; name: string; p: number; score: string; scoreP: number }) {
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "baseline", gap: 22, whiteSpace: "nowrap", opacity: ease.arrive(p) }}>
      <span style={{ ...text("heading"), color: color.ink }}>{name}</span>
      <span style={{ ...text("value"), fontSize: 40, color: color.ink, opacity: ease.arrive(clamp(scoreP)) }}>{score}</span>
    </div>
  );
}

function Cell({ x, y, r, fill, flag, pulse = 0 }: { x: number; y: number; r: { status: string; raw: string; refusal: boolean }; fill: number; flag: number; pulse?: number }) {
  if (fill <= 0) return null;
  const a = ease.arrive(clamp(fill));
  const pass = r.status === "pass";
  const raw = r.raw.replace(/\s+/g, " ").trim();
  const shown = raw.length > 22 ? `${raw.slice(0, 21)}…` : raw;
  const red = r.refusal;
  const box = pass ? 0 : ease.settle(clamp(flag));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 530, height: ROW - 12, opacity: clamp(a * 1.4) }}>
      {box > 0 && <div style={{ position: "absolute", left: -14, top: -2, width: 530 * box + 14, height: ROW - 10, border: `2px solid ${red ? color.red : color.ink}`, background: red ? `${color.redSoft}${Math.round(0x99 * (0.6 + 0.4 * pulse)).toString(16)}` : color.card }} />}
      <span style={{ position: "absolute", left: 0, top: 6, width: 36, ...text("value"), fontSize: 32, color: pass ? color.ink3 : red ? color.red : color.ink }}>{pass ? "✓" : "✕"}</span>
      {!pass && (
        <span style={{ position: "absolute", left: 50, top: 13, ...text("meta"), fontSize: 22, color: red ? color.red : color.ink, whiteSpace: "nowrap", opacity: box }}>
          {red ? `refused · “${shown}”` : `answered “${shown}”`}
        </span>
      )}
    </div>
  );
}
