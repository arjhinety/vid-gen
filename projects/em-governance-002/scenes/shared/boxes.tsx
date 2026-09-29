/**
 * Two small building blocks for the company scenes: a labelled entity box (the lab, a
 * company, a foundation) and a plain note line written in place.
 */
import type { ReactNode } from "react";
import { color, text } from "@vid/design";
import { clamp, ease } from "@vid/motion";

/** An entity: mono kicker, sans title, optional children inside. Dashed = not yet real / for-profit. */
export function Box({ x, y, w, h, kicker, title, p, dashed = false, children }: { x: number; y: number; w: number; h: number; kicker: string; title?: string; p: number; dashed?: boolean; children?: ReactNode }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box", borderRadius: 18, background: color.card, border: dashed ? `2.5px dashed ${color.ink2}` : `2.5px solid ${color.ink}`, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 8}px)` }}>
      <div style={{ position: "absolute", left: 24, top: 18, ...text("label"), fontSize: 20, color: color.ink3 }}>{kicker}</div>
      {title && <div style={{ position: "absolute", left: 24, right: 20, top: 52, ...text("heading"), fontSize: 34, lineHeight: 1.1, color: color.ink }}>{title}</div>}
      {children}
    </div>
  );
}

/** A line of explanation (sans) that arrives in place. */
export function Note({ x, y, w, p, children, c = color.ink2, size = 24, weight, align = "left" }: { x: number; y: number; w: number; p: number; children: ReactNode; c?: string; size?: number; weight?: number; align?: "left" | "center" | "right" }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: align, ...text("body"), fontSize: size, fontWeight: weight, lineHeight: 1.3, color: c, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 6}px)` }}>
      {children}
    </div>
  );
}

/** A mono section label (e.g. WHERE THE LAB STOPS). */
export function Kicker({ x, y, p, children, c = color.ink3 }: { x: number; y: number; p: number; children: string; c?: string }) {
  if (p <= 0) return null;
  return <div style={{ position: "absolute", left: x, top: y, ...text("label"), fontSize: 20, color: c, opacity: ease.arrive(clamp(p)), whiteSpace: "nowrap" }}>{children}</div>;
}
