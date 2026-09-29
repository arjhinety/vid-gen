/**
 * Forms and checklists: facts that fill in as they are said (a field gets its value,
 * a box gets its tick, an option gets struck out in red).
 */
import type { CSSProperties, ReactNode } from "react";
import { color, text as textStyle } from "@vid/design";
import { clamp, ease } from "@vid/motion";

/** A labelled field: tiny mono key above, value in the sans, a rule underneath. */
export function Field({ x, y, w, label, children, p = 1, ruleP, c = color.ink }: { x: number; y: number; w: number; label: string; children?: ReactNode; p?: number; ruleP?: number; c?: string }) {
  const a = ease.arrive(clamp(p));
  const r = ease.travel(clamp(ruleP ?? p * 1.5));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w }}>
      <div style={{ ...textStyle("crumb"), fontSize: 13, color: color.ink3, opacity: clamp(r * 2) }}>{label}</div>
      <div style={{ ...textStyle("data"), fontWeight: 500, fontSize: 28, color: c, marginTop: 8, height: 36, whiteSpace: "nowrap", opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 6}px)` }}>{children}</div>
      <div style={{ height: 1.5, width: w * r, background: color.ink2, marginTop: 8 }} />
    </div>
  );
}

/** A checkbox whose tick draws in; optional label. `strike` draws a red line through the label. */
export function Checkbox({ x, y, label, tick = 0, strike = 0, cross = 0, p = 1, size = 28, c = color.ink, style }: { x: number; y: number; label?: ReactNode; tick?: number; strike?: number; cross?: number; p?: number; size?: number; c?: string; style?: CSSProperties }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const t = ease.settle(clamp(tick));
  const s = ease.settle(clamp(strike));
  const x2 = ease.settle(clamp(cross));
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: size * 0.55, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 6}px)`, whiteSpace: "nowrap", ...style }}>
      <svg width={size} height={size} style={{ overflow: "visible", flex: "none" }}>
        <rect x={1} y={1} width={size - 2} height={size - 2} fill={color.card} stroke={c} strokeWidth={2} />
        {t > 0 && <path d={`M ${size * 0.2} ${size * 0.52} L ${size * 0.42} ${size * 0.75} L ${size * 0.82} ${size * 0.22}`} pathLength={1} fill="none" stroke={c} strokeWidth={3} strokeLinecap="square" strokeDasharray="1 1" strokeDashoffset={1 - t} />}
        {x2 > 0 && (
          <path d={`M ${size * 0.2} ${size * 0.2} L ${size * 0.8} ${size * 0.8} M ${size * 0.8} ${size * 0.2} L ${size * 0.2} ${size * 0.8}`} pathLength={1} fill="none" stroke={color.red} strokeWidth={3} strokeDasharray="1 1" strokeDashoffset={1 - x2} />
        )}
      </svg>
      {label !== undefined && (
        <span
          style={{
            ...textStyle("data"),
            fontWeight: 500,
            fontSize: size * 1.05,
            color: s > 0 ? color.red : c,
            opacity: s > 0 ? 0.9 : 1,
            backgroundImage: s > 0 ? `linear-gradient(${color.red}, ${color.red})` : undefined,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${s * 100}% 3px`,
            backgroundPosition: "0 55%",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

/** A small boxed mono tag (scope chips, run types like SFT / DPO). `strike` draws a red line through it. */
export function Tag({ children, p = 1, c = color.ink2, fill, strike = 0, style }: { children: ReactNode; p?: number; c?: string; fill?: string; strike?: number; style?: CSSProperties }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const s = ease.settle(clamp(strike));
  return (
    <span
      style={{
        display: "inline-block",
        border: `1.5px solid ${s > 0 ? color.redDim : c}`,
        backgroundColor: fill,
        padding: "2px 9px",
        ...textStyle("meta"),
        fontSize: 16,
        color: s > 0 ? color.red : fill ? color.card : c,
        opacity: clamp(a * 1.4),
        transform: `scale(${0.92 + 0.08 * a})`,
        whiteSpace: "nowrap",
        backgroundImage: s > 0 ? `linear-gradient(${color.red}, ${color.red})` : undefined,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${s * 100}% 2.5px`,
        backgroundPosition: "0 55%",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
