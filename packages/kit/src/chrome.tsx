/**
 * Recurring research objects on the sheet: specimen tags for systems and checkpoints,
 * white cards for examples, records and repositories, and hairline rules.
 */
import type { CSSProperties, ReactNode } from "react";
import { color, shadow, text as textStyle } from "@vid/design";
import { clamp, ease } from "@vid/motion";

/** A system under study: mono id, description, and a colour bar binding it to its colour. */
export function SpecimenTag({ id, desc, c = color.neutral, x, y, p = 1, w = 360, style }: { id: string; desc?: string; c?: string; x: number; y: number; p?: number; w?: number; style?: CSSProperties }) {
  const a = ease.arrive(clamp(p));
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: clamp(a * 1.5), transform: `translateY(${(1 - a) * 8}px)`, display: "flex", gap: 12, alignItems: "stretch", ...style }}>
      <div style={{ width: 5, background: c }} />
      <div>
        <div style={{ ...textStyle("value"), fontSize: 24, color: color.ink }}>{id}</div>
        {desc && <div style={{ ...textStyle("meta"), color: color.ink3, marginTop: 3 }}>{desc}</div>}
      </div>
    </div>
  );
}

/**
 * A white card: mono kicker (e.g. "arjhinety/"), a title, body text, and an optional
 * mono footer. Used for examples, records, repositories and callouts.
 */
export function Card({ x, y, w = 420, kicker, title, children, footer, p = 1, rotate = 0, edge, style }: { x: number; y: number; w?: number; kicker?: ReactNode; title?: ReactNode; children?: ReactNode; footer?: ReactNode; p?: number; rotate?: number; edge?: string; style?: CSSProperties }) {
  const a = ease.arrive(clamp(p));
  if (a <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        opacity: clamp(a * 1.5),
        transform: `translateY(${(1 - a) * 12}px) rotate(${rotate}deg)`,
        background: color.card,
        boxShadow: shadow.card,
        borderTop: edge ? `4px solid ${edge}` : undefined,
        padding: "16px 20px 16px",
        ...style,
      }}
    >
      {kicker && <div style={{ ...textStyle("meta"), fontSize: 15, color: color.ink3, marginBottom: 4 }}>{kicker}</div>}
      {title && <div style={{ ...textStyle("heading"), fontSize: 28, color: color.ink, marginBottom: 8 }}>{title}</div>}
      {children && <div style={{ ...textStyle("body"), fontSize: 22, lineHeight: 1.35, color: color.ink2 }}>{children}</div>}
      {footer && <div style={{ ...textStyle("meta"), fontSize: 16, color: color.ink, marginTop: 14, paddingTop: 10, borderTop: `1px solid ${color.hairline}` }}>{footer}</div>}
    </div>
  );
}

/** A hairline rule that draws in. */
export function Rule({ x, y, w, p = 1, c = color.ink2, thickness = 1.5 }: { x: number; y: number; w: number; p?: number; c?: string; thickness?: number }) {
  return <div style={{ position: "absolute", left: x, top: y, width: w * ease.travel(clamp(p)), height: thickness, background: c }} />;
}
