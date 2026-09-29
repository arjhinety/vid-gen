/**
 * The decision card grammar shared by the "one decision" scenes: a big number and the
 * decision's name, the options as cards (the draft's suggestion gets a DRAFT SUGGESTS
 * tag), and a footer tag with the draft's status. The illustration on the right is each
 * scene's own.
 */
import type { ReactNode } from "react";
import { color, text } from "@vid/design";
import { Term } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { TOP, X0 } from "./layout.ts";

export const OPT_X = X0;
export const OPT_W = 700;

/** "1" in mono, then the decision's name written on, with a one-line definition. */
export function DecisionHead({ n, title, def, p }: { n: number | string; title: string; def?: string; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p * 2));
  return (
    <>
      <div style={{ position: "absolute", left: X0, top: TOP + 4, ...text("bigNumber"), fontSize: 76, color: color.ink, opacity: a }}>{n}</div>
      <Term x={X0 + 90} y={TOP + 14} def={def} p={p}>
        {title}
      </Term>
    </>
  );
}

/** One option. `rec` marks the draft's suggestion; `dim` fades the ones not suggested once it lands. */
export function Option({ y, letter, label, sub, p, rec = false, recP = 0, w = OPT_W, x = OPT_X }: { y: number; letter: string; label: ReactNode; sub?: ReactNode; p: number; rec?: boolean; recP?: number; w?: number; x?: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const r = ease.arrive(clamp(recP));
  const fade = rec ? 1 : 1 - 0.45 * r;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, minHeight: 84, background: color.card, border: `${rec ? 2.5 + r : 2}px solid ${rec ? color.ink : color.hairline}`, borderRadius: 14, padding: "14px 18px 14px 70px", boxSizing: "border-box", opacity: clamp(a * 1.4) * fade, transform: `translateY(${(1 - a) * 10}px)` }}>
      <div style={{ position: "absolute", left: 20, top: 16, ...text("value"), fontSize: 30, color: rec ? color.ink : color.ink3 }}>{letter}</div>
      <div style={{ ...text("data"), fontWeight: 550, fontSize: 28, lineHeight: 1.2, color: color.ink }}>{label}</div>
      {sub && <div style={{ ...text("meta"), fontSize: 20, color: color.ink3, marginTop: 6 }}>{sub}</div>}
      {rec && r > 0 && (
        <div style={{ position: "absolute", right: -12, top: -16, background: color.ink, color: color.card, ...text("label"), fontSize: 18, padding: "4px 10px", borderRadius: 6, transform: `scale(${0.8 + 0.2 * r}) rotate(-2deg)`, opacity: r }}>DRAFT SUGGESTS</div>
      )}
    </div>
  );
}

/** A small plain line of explanation (sans, ink2), written in place. */
export function Why({ x, y, w, p, children, c = color.ink2, size = 26 }: { x: number; y: number; w: number; p: number; children: ReactNode; c?: string; size?: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return <div style={{ position: "absolute", left: x, top: y, width: w, ...text("body"), fontSize: size, lineHeight: 1.3, color: c, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 6}px)` }}>{children}</div>;
}
