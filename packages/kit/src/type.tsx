/**
 * Typography inside exhibits: plain styled text, typing streams (who is writing is
 * told by the rate) and editor-style marks. The narration itself is the Headline
 * (sheet.tsx).
 */
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { color, text as textStyle, type TypeName } from "@vid/design";
import { clamp, ease, rng, useScene, useSceneFrame } from "@vid/motion";

export function T({ as = "div", s = "body", c, style, children }: { as?: "div" | "span"; s?: TypeName; c?: string; style?: CSSProperties; children: ReactNode }) {
  const Tag = as;
  return <Tag style={{ ...textStyle(s), color: c, ...style }}>{children}</Tag>;
}

export type TypeMode = "human" | "machine";

/** Per-character reveal times (seconds) for a typing stream. Deterministic. */
export function typingSchedule(text: string, mode: TypeMode, seed = 1, rate?: number): number[] {
  const r = rng(seed);
  const cps = rate ?? (mode === "human" ? 10 : 75);
  const out: number[] = [];
  let t = 0;
  for (const ch of text) {
    out.push(t);
    let dt = 1 / cps;
    if (mode === "human") {
      dt *= 0.6 + r() * 0.8; // ±40 % jitter
      if (/[.,?!:;]/.test(ch)) dt += 0.15 + r() * 0.25;
    }
    t += dt;
  }
  out.push(t);
  return out;
}

/**
 * Text that types itself: humans at ~10 chars/s with jitter and punctuation pauses,
 * machines at ~75 chars/s. Rate tells the viewer who is "writing".
 */
export function TypeStream({ text, at, mode = "machine", rate, caret = true, seed = 1, s = "body", c, style }: { text: string; at: number; mode?: TypeMode; rate?: number; caret?: boolean; seed?: number; s?: TypeName; c?: string; style?: CSSProperties }) {
  const f = useSceneFrame();
  const { fps } = useScene();
  const sched = useMemo(() => typingSchedule(text, mode, seed, rate), [text, mode, seed, rate]);
  const t = (f - at) / fps;
  if (t < 0) return caret ? <div style={{ ...textStyle(s), color: c, ...style }}>{caretEl(true, t, c)}</div> : null;
  let n = 0;
  while (n < text.length && sched[n + 1]! <= t) n++;
  const typing = n < text.length;
  return (
    <div style={{ ...textStyle(s), color: c, whiteSpace: "pre-wrap", ...style }}>
      {text.slice(0, n)}
      {caret && caretEl(!typing, t - sched[text.length]!, c)}
    </div>
  );
}

function caretEl(idle: boolean, idleT: number, c?: string) {
  // Solid while typing; blinks 530/530 ms when idle.
  const on = !idle || Math.floor(Math.max(0, idleT) / 0.53) % 2 === 0;
  return <span style={{ display: "inline-block", width: 3, height: "0.92em", marginLeft: 2, verticalAlign: "-0.1em", background: c ?? color.ink, opacity: on ? 1 : 0 }} />;
}

export type MarkKind = "highlight" | "strike" | "underline";
export interface Mark {
  /** Substring to mark (first occurrence), or [start, end) character offsets. */
  at: string | [number, number];
  kind: MarkKind;
  /** Draw progress 0..1. */
  p: number;
  color?: string;
}

/**
 * Editor-style marks swept across text: a highlight fills behind the words (text stays
 * ink), a strike or underline draws left to right. No measuring needed: the marks are
 * CSS gradients sized by progress on inline spans.
 */
export function Marked({ text, marks, s = "body", c, style }: { text: string; marks: Mark[]; s?: TypeName; c?: string; style?: CSSProperties }) {
  const ranges = marks
    .map((m) => {
      const [a, b] = typeof m.at === "string" ? [text.indexOf(m.at), text.indexOf(m.at) + m.at.length] : m.at;
      return a >= 0 ? { ...m, a, b } : null;
    })
    .filter((x): x is Mark & { a: number; b: number } => !!x)
    .sort((x, y) => x.a - y.a);
  const parts: ReactNode[] = [];
  let pos = 0;
  ranges.forEach((m, i) => {
    if (m.a > pos) parts.push(text.slice(pos, m.a));
    const col = m.color ?? color.red;
    const p = clamp(m.p);
    const bg =
      m.kind === "highlight"
        ? { backgroundImage: `linear-gradient(${col}38, ${col}38)`, backgroundSize: `${p * 100}% 100%`, backgroundPosition: "0 0" }
        : m.kind === "strike"
          ? { backgroundImage: `linear-gradient(${col}, ${col})`, backgroundSize: `${p * 100}% 0.09em`, backgroundPosition: "0 58%" }
          : { backgroundImage: `linear-gradient(${col}, ${col})`, backgroundSize: `${p * 100}% 0.08em`, backgroundPosition: "0 96%" };
    parts.push(
      <span key={i} style={{ backgroundRepeat: "no-repeat", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone", padding: m.kind === "highlight" ? "0 0.08em" : undefined, margin: m.kind === "highlight" ? "0 -0.08em" : undefined, ...bg }}>
        {text.slice(m.a, m.b)}
      </span>,
    );
    pos = m.b;
  });
  if (pos < text.length) parts.push(text.slice(pos));
  return <div style={{ ...textStyle(s), color: c, ...style }}>{parts}</div>;
}
