/**
 * Instrument panels: the machine's world (model I/O, terminals, code), near-black like
 * a device screen on the sheet. They enter with a travel wipe; content starts once the
 * wipe is ~90 % done.
 */
import type { CSSProperties, ReactNode } from "react";
import { color, shadow, text as textStyle } from "@vid/design";
import { clamp, ease } from "@vid/motion";

export interface InstrumentPanelProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Wipe progress 0..1 (linear; eased here). */
  enter: number;
  /** Wipe direction. */
  from?: "left" | "right" | "top" | "bottom";
  title?: string;
  /** Small right-aligned tag (e.g. checkpoint id). */
  tag?: string;
  tagColor?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function InstrumentPanel({ x, y, w, h, enter, from = "right", title, tag, tagColor, style, children }: InstrumentPanelProps) {
  if (enter <= 0) return null;
  const p = ease.travel(clamp(enter));
  const inset = (1 - p) * 100;
  const clip =
    from === "right" ? `inset(0 0 0 ${inset}%)` : from === "left" ? `inset(0 ${inset}% 0 0)` : from === "top" ? `inset(0 0 ${inset}% 0)` : `inset(${inset}% 0 0 0)`;
  const contentOpacity = clamp((enter - 0.85) / 0.15);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        clipPath: clip,
        background: color.instrument,
        borderRadius: 10,
        boxShadow: shadow.instrument,
        overflow: "hidden",
        ...style,
      }}
    >
      {(title || tag) && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, height: 54, padding: "0 24px", borderBottom: `1px solid ${color.instrumentRule}`, opacity: contentOpacity }}>
          <div style={{ display: "flex", gap: 7 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: 5, background: color.instrumentRule }} />
            ))}
          </div>
          <div style={{ ...textStyle("caption"), fontFamily: '"JetBrains Mono"', fontSize: 19, color: color.instrumentInk2 }}>{title}</div>
          <div style={{ flex: 1 }} />
          {tag && (
            <div style={{ ...textStyle("caption"), fontFamily: '"JetBrains Mono"', fontSize: 18, color: tagColor ?? color.instrumentInk, border: `1px solid ${tagColor ?? color.instrumentRule}`, borderRadius: 6, padding: "3px 10px" }}>
              {tag}
            </div>
          )}
        </div>
      )}
      <div style={{ position: "relative", padding: "22px 28px", color: color.instrumentInk, opacity: contentOpacity, fontFamily: '"JetBrains Mono"', fontSize: 28, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}
