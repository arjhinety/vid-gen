/**
 * Charts in the house style: black hairline axes with mono ticks, black bars for the
 * system, red dashed lines for what collapsed, line charts drawn by a pen nib in step
 * with the narration, and flow boxes with red crossed-out links.
 */
import type { CSSProperties, ReactNode } from "react";
import { color, text as textStyle } from "@vid/design";
import { clamp, ease, mix } from "@vid/motion";

const svgAbs: CSSProperties = { position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" };

/** A rectangle outline that draws itself (the exhibit frame). */
export function Frame({ x, y, w, h, p = 1, c = color.ink, width = 3 }: { x: number; y: number; w: number; h: number; p?: number; c?: string; width?: number }) {
  if (p <= 0) return null;
  const t = ease.travel(clamp(p));
  return (
    <svg width={1920} height={1080} style={svgAbs}>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={c} strokeWidth={width} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
    </svg>
  );
}

/** Horizontal value axis with mono tick labels (0.00 … 1.00). */
export function ScaleAxis({ x, y, w, ticks, format = (v: number) => v.toFixed(2), min = 0, max = 1, p = 1, note }: { x: number; y: number; w: number; ticks: number[]; format?: (v: number) => string; min?: number; max?: number; p?: number; note?: ReactNode }) {
  if (p <= 0) return null;
  const t = ease.travel(clamp(p));
  const X = (v: number) => x + ((v - min) / (max - min)) * w;
  return (
    <>
      <svg width={1920} height={1080} style={svgAbs}>
        <line x1={x} y1={y} x2={x + w * t} y2={y} stroke={color.ink2} strokeWidth={1.5} />
        {ticks.map((v) => (X(v) <= x + w * t + 0.5 ? <line key={v} x1={X(v)} y1={y} x2={X(v)} y2={y + 12} stroke={color.ink2} strokeWidth={1.5} /> : null))}
      </svg>
      {ticks.map((v) => (
        <div key={v} style={{ position: "absolute", left: X(v) - 50, top: y + 18, width: 100, textAlign: "center", ...textStyle("meta"), color: color.ink3, opacity: clamp((t * w - (X(v) - x)) / 40 + 1) }}>
          {format(v)}
        </div>
      ))}
      {note && <div style={{ position: "absolute", left: x + w / 2 - 300, top: y + 48, width: 600, textAlign: "center", ...textStyle("meta"), color: color.ink3, opacity: t }}>{note}</div>}
    </>
  );
}

export interface HBarProps {
  x: number;
  y: number;
  /** Track width (value 1 = full track). */
  w: number;
  value: number;
  /** Grow progress 0..1. */
  p: number;
  h?: number;
  c?: string;
  /** Printed at the bar end. */
  label?: ReactNode;
  /** Reference tick (e.g. the base model). */
  base?: { value: number; label: string; p?: number };
  /**
   * Collapse progress 0..1: the bar shrinks to `collapseTo`, leaving a red dashed trail
   * back to where it was and a red dot at the old value.
   */
  collapse?: number;
  collapseTo?: number;
  collapseLabel?: ReactNode;
}

export function HBar({ x, y, w, value, p, h = 34, c = color.ink, label, base, collapse = 0, collapseTo = 0, collapseLabel }: HBarProps) {
  if (p <= 0) return null;
  const g = ease.settle(clamp(p));
  const k = ease.travel(clamp(collapse));
  const v = mix(value * g, collapseTo, k);
  const bw = Math.max(0, v * w);
  const trail = k > 0;
  const bp = base ? ease.arrive(clamp(base.p ?? 1)) : 0;
  return (
    <>
      <div style={{ position: "absolute", left: x, top: y, width: Math.max(bw, trail ? 6 : 0), height: h, background: trail ? color.ink : c, backgroundImage: trail ? undefined : `linear-gradient(180deg, ${c}, ${c}ee)` }} />
      {trail && (
        <svg width={1920} height={1080} style={svgAbs}>
          <line x1={x + bw + 6} y1={y + h / 2} x2={x + value * w} y2={y + h / 2} stroke={color.red} strokeWidth={3} strokeDasharray="9 6" opacity={clamp(k * 3)} />
          <circle cx={x + value * w} cy={y + h / 2} r={9} fill={color.red} opacity={clamp(k * 3)} />
        </svg>
      )}
      {base && bp > 0 && (
        <>
          <div style={{ position: "absolute", left: x + base.value * w - 1.5, top: y - 12, width: 3, height: h + 24, background: color.ink2, opacity: bp }} />
          <div style={{ position: "absolute", left: x + base.value * w - 120, top: y - 40, width: 240, textAlign: "center", ...textStyle("meta"), color: color.ink2, opacity: bp }}>{base.label}</div>
        </>
      )}
      {label && !trail && (
        <div style={{ position: "absolute", left: x + bw + 16, top: y + h / 2 - 22, ...textStyle("value"), fontSize: 38, color: c, opacity: clamp(g * 3 - 2), whiteSpace: "nowrap" }}>{label}</div>
      )}
      {trail && collapseLabel && (
        <div style={{ position: "absolute", left: x - 150, top: y + h / 2 - 22, width: 130, textAlign: "right", ...textStyle("value"), fontSize: 38, color: color.red, opacity: clamp(k * 2) }}>{collapseLabel}</div>
      )}
    </>
  );
}

/** A fountain-pen nib: the cursor that draws lines. Tip at (x, y). */
export function PenNib({ x, y, size = 30, opacity = 1 }: { x: number; y: number; size?: number; opacity?: number }) {
  const s = size;
  return (
    <svg width={1920} height={1080} style={{ ...svgAbs, opacity }}>
      <g transform={`translate(${x} ${y}) rotate(-8)`}>
        <path d={`M 0 0 L ${-s * 0.17} ${-s * 0.42} L ${-s * 0.17} ${-s} L ${s * 0.17} ${-s} L ${s * 0.17} ${-s * 0.42} Z`} fill={color.ink} />
        <line x1={0} y1={-s * 0.05} x2={0} y2={-s * 0.5} stroke={color.sheet} strokeWidth={1.4} />
      </g>
    </svg>
  );
}

export interface Series {
  id: string;
  /** Values at each x category (null = missing). */
  values: Array<number | null>;
  c: string;
  /** Draw progress 0..1 along the polyline. */
  p: number;
  width?: number;
  dashed?: boolean;
  /** Label printed at the end once drawn (small mono name + value). */
  name?: string;
  endLabel?: ReactNode;
  /** Show the pen nib at the drawing head. */
  nib?: boolean;
}

/** Categorical line chart (e.g. Base → M0 → M1-v2) with a y scale and mono labels. */
export function LineChart({ x, y, w, h, categories, yMin, yMax, yTicks, series, axisP = 1, title, sub, tickFormat = (v: number) => String(v) }: { x: number; y: number; w: number; h: number; categories: string[]; yMin: number; yMax: number; yTicks: number[]; series: Series[]; axisP?: number; title?: string; sub?: string; tickFormat?: (v: number) => string }) {
  const a = ease.travel(clamp(axisP));
  const X = (i: number) => x + (categories.length === 1 ? w / 2 : (i / (categories.length - 1)) * w);
  const Y = (v: number) => y + h - ((v - yMin) / (yMax - yMin)) * h;
  const nibs: ReactNode[] = [];
  const endLabels: ReactNode[] = [];
  const paths = series.map((s) => {
    const pts = s.values.map((v, i) => (v === null ? null : { x: X(i), y: Y(v) })).filter((q): q is { x: number; y: number } => !!q);
    if (pts.length < 1 || s.p <= 0) return null;
    const segs = pts.slice(1).map((q, i) => Math.hypot(q.x - pts[i]!.x, q.y - pts[i]!.y));
    const total = segs.reduce((m, v) => m + v, 0);
    const t = clamp(s.p);
    let remain = t * total;
    const drawn = [pts[0]!];
    let head = pts[0]!;
    for (let i = 0; i < segs.length; i++) {
      if (remain >= segs[i]!) {
        drawn.push(pts[i + 1]!);
        head = pts[i + 1]!;
        remain -= segs[i]!;
      } else {
        const f = segs[i]! ? remain / segs[i]! : 0;
        head = { x: mix(pts[i]!.x, pts[i + 1]!.x, f), y: mix(pts[i]!.y, pts[i + 1]!.y, f) };
        drawn.push(head);
        break;
      }
    }
    const passed = pts.filter((q) => (q.x - pts[0]!.x) <= (head.x - pts[0]!.x) + 0.5);
    if (s.nib && t > 0 && t < 1) nibs.push(<PenNib key={s.id} x={head.x} y={head.y} />);
    if (t >= 1 && (s.name || s.endLabel)) {
      const last = pts[pts.length - 1]!;
      endLabels.push(
        <div key={s.id} style={{ position: "absolute", left: last.x + 18, top: last.y - 30, whiteSpace: "nowrap", opacity: 1 }}>
          {s.name && <div style={{ ...textStyle("meta"), fontSize: 16, color: s.c }}>{s.name}</div>}
          {s.endLabel && <div style={{ ...textStyle("value"), fontSize: 26, color: s.c, fontWeight: 600 }}>{s.endLabel}</div>}
        </div>,
      );
    }
    return (
      <g key={s.id}>
        <polyline points={drawn.map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke={s.c} strokeWidth={s.width ?? 3} strokeDasharray={s.dashed ? "9 6" : undefined} strokeLinejoin="round" />
        {passed.map((q, i) => (
          <circle key={i} cx={q.x} cy={q.y} r={5.5} fill={s.c} />
        ))}
      </g>
    );
  });
  return (
    <>
      {title && (
        <div style={{ position: "absolute", left: x - 70, top: y - 74, whiteSpace: "nowrap", opacity: a }}>
          <div style={{ ...textStyle("label"), fontSize: 17, color: color.ink2 }}>{title}</div>
          {sub && <div style={{ ...textStyle("meta"), fontSize: 15, color: color.ink3, marginTop: 4 }}>{sub}</div>}
        </div>
      )}
      <svg width={1920} height={1080} style={svgAbs}>
        <line x1={x - 30} y1={y + h} x2={x - 30 + (w + 60) * a} y2={y + h} stroke={color.ink2} strokeWidth={1.5} />
        <line x1={x - 30} y1={y + h} x2={x - 30} y2={y + h - h * a} stroke={color.ink2} strokeWidth={1.5} />
        {yTicks.map((v) => (
          <g key={v} opacity={a}>
            <line x1={x - 36} y1={Y(v)} x2={x - 30} y2={Y(v)} stroke={color.ink2} strokeWidth={1.5} />
            <line x1={x - 30} y1={Y(v)} x2={x + w + 30} y2={Y(v)} stroke={color.gridMajor} strokeWidth={1} />
          </g>
        ))}
        {paths}
      </svg>
      {yTicks.map((v) => (
        <div key={v} style={{ position: "absolute", left: x - 100, top: Y(v) - 11, width: 58, textAlign: "right", ...textStyle("meta"), fontSize: 15, color: color.ink3, opacity: a }}>
          {tickFormat(v)}
        </div>
      ))}
      {categories.map((c, i) => (
        <div key={c} style={{ position: "absolute", left: X(i) - 110, top: y + h + 14, width: 220, textAlign: "center", ...textStyle("meta"), fontSize: 16, color: color.ink2, opacity: a }}>
          {c}
        </div>
      ))}
      {endLabels}
      {nibs}
    </>
  );
}

/** A labelled box in a flow (SPONSORS → COMPUTE → …). */
export function FlowBox({ x, y, w = 200, h = 64, children, p = 1, c = color.ink, fill = color.card }: { x: number; y: number; w?: number; h?: number; children: ReactNode; p?: number; c?: string; fill?: string }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, border: `2px solid ${c}`, background: fill, display: "flex", alignItems: "center", justifyContent: "center", ...textStyle("crumb"), fontSize: 17, color: c, opacity: clamp(a * 1.4), transform: `scale(${0.96 + 0.04 * a})` }}>
      {children}
    </div>
  );
}

/** A connector polyline that draws in; red dashed for links that must not exist. */
export function Link({ points, p = 1, c = color.ink, dashed = false, width = 2 }: { points: Array<[number, number]>; p?: number; c?: string; dashed?: boolean; width?: number }) {
  if (p <= 0) return null;
  const t = ease.travel(clamp(p));
  return (
    <svg width={1920} height={1080} style={svgAbs}>
      {dashed ? (
        <polyline points={points.map(([a, b]) => `${a},${b}`).join(" ")} fill="none" stroke={c} strokeWidth={width} strokeDasharray="10 7" opacity={t} />
      ) : (
        <polyline points={points.map(([a, b]) => `${a},${b}`).join(" ")} fill="none" stroke={c} strokeWidth={width} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
      )}
    </svg>
  );
}

/** A dashed arc over a flow from x1 to x2 (e.g. sponsors ⇢ conclusions). */
export function Arc({ x1, x2, y, height, p = 1, c = color.red }: { x1: number; x2: number; y: number; height: number; p?: number; c?: string }) {
  if (p <= 0) return null;
  const t = ease.travel(clamp(p));
  const mx = (x1 + x2) / 2;
  return (
    <svg width={1920} height={1080} style={svgAbs}>
      <defs>
        <clipPath id={`arc-${x1}-${x2}-${y}`}>
          <rect x={Math.min(x1, x2) - 10} y={y - height - 20} width={Math.abs(x2 - x1) * t + 20} height={height + 40} />
        </clipPath>
      </defs>
      <path d={`M ${x1} ${y} Q ${mx} ${y - height * 2} ${x2} ${y}`} fill="none" stroke={c} strokeWidth={2.5} strokeDasharray="9 7" clipPath={`url(#arc-${x1}-${x2}-${y})`} />
    </svg>
  );
}

/** A red ✕ that strikes through a link. */
export function Cross({ x, y, size = 30, p = 1, c = color.red }: { x: number; y: number; size?: number; p?: number; c?: string }) {
  if (p <= 0) return null;
  const t = ease.slam(clamp(p));
  const s = size / 2;
  return (
    <svg width={1920} height={1080} style={svgAbs}>
      <g transform={`translate(${x} ${y}) scale(${mix(1.5, 1, t)})`} opacity={clamp(p * 3)}>
        <path d={`M ${-s} ${-s} L ${s} ${s} M ${s} ${-s} L ${-s} ${s}`} stroke={c} strokeWidth={4} strokeLinecap="square" />
      </g>
    </svg>
  );
}
