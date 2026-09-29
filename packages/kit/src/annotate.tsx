/**
 * Red marks drawn over the evidence: circles, underlines, strikes, brackets, ticks and
 * arrows (crisp, nearly straight: a lab sheet, not a sketchbook). Provenance labels
 * live in labels.tsx.
 */
import { color, text as textStyle } from "@vid/design";
import { clamp, ease, rng } from "@vid/motion";

export type PenShape = "circle" | "underline" | "strike" | "bracket" | "tick" | "arrow";

/** Hand-drawn path for a pen mark around/along a box. Deterministic per seed. */
export function penPath(shape: PenShape, x: number, y: number, w: number, h: number, seed = 1, wobble = 0.35): string {
  const r = rng(seed);
  const j = (a: number) => (r() - 0.5) * a * wobble;
  switch (shape) {
    case "circle": {
      // A loop that starts upper-left, goes round ~1.08 turns, and overshoots its start.
      const cx = x + w / 2;
      const cy = y + h / 2;
      // Pad more vertically than horizontally so the loop clears neighbouring words.
      const rx = w / 2 + Math.min(18, 6 + w * 0.02);
      const ry = h / 2 + 12;
      const pts: string[] = [];
      const n = 44;
      const start = -2.4 + j(0.3);
      for (let i = 0; i <= n; i++) {
        const t = start + (i / n) * Math.PI * 2 * 1.08;
        const wob = 1 + Math.sin(t * 3 + seed) * 0.025 + j(0.012);
        pts.push(`${(cx + Math.cos(t) * rx * wob).toFixed(1)},${(cy + Math.sin(t) * ry * wob * (1 + i / n / 14)).toFixed(1)}`);
      }
      return `M ${pts[0]} ` + pts.slice(1).map((p) => `L ${p}`).join(" ");
    }
    case "underline": {
      const yy = y + h + 6;
      return `M ${x - 4},${yy + j(3)} C ${x + w * 0.3},${yy + 4 + j(3)} ${x + w * 0.7},${yy - 3 + j(3)} ${x + w + 6},${yy + 2 + j(3)}`;
    }
    case "strike": {
      const yy = y + h * 0.55;
      return `M ${x - 8},${yy + 4 + j(3)} L ${x + w + 8},${yy - 6 + j(3)}`;
    }
    case "bracket": {
      const d = 16;
      return `M ${x - 6 + d},${y - 10} L ${x - 6},${y - 10 + j(2)} L ${x - 8 + j(2)},${y + h + 10} L ${x - 6 + d},${y + h + 10 + j(2)}`;
    }
    case "tick": {
      return `M ${x},${y + h * 0.55} L ${x + w * 0.35},${y + h} L ${x + w},${y}`;
    }
    case "arrow": {
      const x2 = x + w;
      const y2 = y + h;
      const mx = (x + x2) / 2 + j(20);
      const my = Math.min(y, y2) - 40;
      const ang = Math.atan2(y2 - my, x2 - mx);
      const a1 = ang + Math.PI * 0.82;
      const a2 = ang - Math.PI * 0.82;
      return `M ${x},${y} Q ${mx},${my} ${x2},${y2} M ${x2 + Math.cos(a1) * 18},${y2 + Math.sin(a1) * 18} L ${x2},${y2} L ${x2 + Math.cos(a2) * 18},${y2 + Math.sin(a2) * 18}`;
    }
  }
}

/** A pen stroke drawn on over its progress `p` (0..1). Coordinates are stage pixels. */
export function PenMark({ shape, x, y, w, h, p, seed = 1, stroke = color.red, width = 3.2 }: { shape: PenShape; x: number; y: number; w: number; h: number; p: number; seed?: number; stroke?: string; width?: number }) {
  if (p <= 0) return null;
  const d = penPath(shape, x, y, w, h, seed);
  const t = ease.settle(clamp(p));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }}>
      <path d={d} pathLength={1} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 1" strokeDashoffset={1 - t} opacity={0.94} />
    </svg>
  );
}

/** A short red note next to a mark (mono, small). */
export function PenNote({ x, y, p, children, w = 360 }: { x: number; y: number; p: number; children: string; w?: number }) {
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: a, transform: `translateY(${(1 - a) * 6}px)`, ...textStyle("meta"), fontSize: 20, lineHeight: 1.35, color: color.red }}>
      {children}
    </div>
  );
}

/** Declares a colour encoding once, on first use (analysis.md rule 13). */
export function ColorKey({ items, x, y, p = 1 }: { items: Array<{ color: string; label: string; shape?: "dot" | "bar" }>; x: number; y: number; p?: number }) {
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", gap: 26, opacity: a }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: it.shape === "bar" ? 22 : 12, height: 12, borderRadius: it.shape === "bar" ? 2 : 6, background: it.color }} />
          <span style={{ ...textStyle("meta"), fontSize: 18, color: color.ink2 }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}
