/**
 * Data as physical objects: populations of dots that move between trays, grids of
 * questions, paired bars, counters and meters. Show the population before the scalar.
 */
import type { CSSProperties, ReactNode } from "react";
import { color, text as textStyle } from "@vid/design";
import { clamp, ease, mix, mixColor, rng, type Ease } from "@vid/motion";

export interface Pt {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Fill a tray from the floor up, row by row, like grain settling. */
export function packTray(n: number, tray: Rect, r = 4.5, gap = 2.2, pad = 10): Pt[] {
  const pitch = 2 * r + gap;
  const cols = Math.max(1, Math.floor((tray.w - 2 * pad + gap) / pitch));
  const used = cols * pitch - gap;
  const x0 = tray.x + (tray.w - used) / 2 + r;
  const floor = tray.y + tray.h - pad - r;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // Stagger alternate rows by half a pitch so piles look packed, not gridded.
    return { x: x0 + col * pitch + (row % 2 ? pitch / 2 : 0) * (col < cols - 1 ? 1 : 0), y: floor - row * pitch * 0.94 };
  });
}

/** Scatter points in a region (deterministic), e.g. for a "cloud" before sorting. */
export function scatter(n: number, area: Rect, seed = 3): Pt[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => ({ x: area.x + r() * area.w, y: area.y + r() * area.h }));
}

export interface DotFieldProps {
  from: Pt[];
  to: Pt[];
  /** Movement progress 0..1 (linear; per-dot easing is applied). */
  p: number;
  fromColor: string[] | string;
  toColor?: string[] | string;
  r?: number;
  /** Fraction of the move spent staggering dot starts (0 = all together). */
  spread?: number;
  /** Order in which dots start (indices); defaults to index order. */
  order?: number[];
  /** Arc height of the path (px): dots lift then fall into place. */
  lift?: number;
  opacity?: number;
  e?: Ease;
}

export function DotField({ from, to, p, fromColor, toColor, r = 4.5, spread = 0.55, order, lift = 60, opacity = 1, e = ease.travel }: DotFieldProps) {
  const n = from.length;
  const rank = new Array<number>(n);
  (order ?? Array.from({ length: n }, (_, i) => i)).forEach((idx, k) => (rank[idx] = k));
  const col = (c: string[] | string | undefined, i: number, fallback: string) => (c === undefined ? fallback : typeof c === "string" ? c : c[i]!);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity }}>
      {from.map((a, i) => {
        const b = to[i] ?? a;
        const delay = n > 1 ? (spread * rank[i]!) / (n - 1) : 0;
        const t = e(clamp((p - delay) / Math.max(1e-6, 1 - spread)));
        const x = mix(a.x, b.x, t);
        const moving = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1;
        const y = mix(a.y, b.y, t) - (moving ? Math.sin(Math.PI * t) * lift : 0);
        const c0 = col(fromColor, i, color.ink3);
        const c1 = col(toColor, i, c0);
        const fill = c0 === c1 ? c0 : mixColor(c0, c1, clamp((t - 0.6) / 0.4));
        return <circle key={i} cx={x} cy={y} r={r} fill={fill} />;
      })}
    </svg>
  );
}

export interface TrayDef {
  id: string;
  label: string;
  sub?: string;
  rect: Rect;
}

/** Decision trays: open boxes with a mono label below. `glow` (0..1) darkens a tray. */
export function Trays({ trays, glow = {}, p = 1, labelP = 1, counts, countP = 1, style }: { trays: TrayDef[]; glow?: Record<string, number>; p?: number; labelP?: number; counts?: Record<string, string>; countP?: number; style?: CSSProperties }) {
  const a = ease.arrive(clamp(p));
  const la = ease.arrive(clamp(labelP));
  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {trays.map((t) => {
          const g = clamp(glow[t.id] ?? 0);
          const { x, y, w, h } = t.rect;
          const d = `M ${x},${y} L ${x},${y + h} L ${x + w},${y + h} L ${x + w},${y}`;
          return (
            <g key={t.id}>
              <rect x={x} y={y} width={w} height={h} fill={mixColor(color.sheet, color.cardShade, 0.5 + g * 0.5)} opacity={a * (0.7 + g * 0.3)} />
              <path d={d} pathLength={1} fill="none" stroke={mixColor(color.ink2, color.ink, g)} strokeWidth={2 + g} strokeDasharray="1 1" strokeDashoffset={1 - a} strokeLinecap="square" />
            </g>
          );
        })}
      </svg>
      {trays.map((t) => (
        <div key={t.id} style={{ position: "absolute", left: t.rect.x, top: t.rect.y + t.rect.h + 18, width: t.rect.w, textAlign: "center", opacity: la, transform: `translateY(${(1 - la) * 8}px)` }}>
          <div style={{ ...textStyle("label"), color: color.ink }}>{t.label}</div>
          {t.sub && <div style={{ ...textStyle("meta"), color: color.ink3, marginTop: 4 }}>{t.sub}</div>}
        </div>
      ))}
      {counts &&
        trays.map((t) =>
          counts[t.id] === undefined ? null : (
            <div key={t.id} style={{ position: "absolute", left: t.rect.x, top: t.rect.y - 64, width: t.rect.w, textAlign: "center", ...textStyle("value"), fontSize: 40, color: color.ink, opacity: ease.arrive(clamp(countP)) }}>
              {counts[t.id]}
            </div>
          ),
        )}
    </div>
  );
}

/** Number that rolls between values. `format` controls digits; tabular figures keep width stable. */
export function Counter({ from = 0, to, p, format = (v) => Math.round(v).toLocaleString("en-US"), style }: { from?: number; to: number; p: number; format?: (v: number) => string; style?: CSSProperties }) {
  const v = mix(from, to, ease.settle(clamp(p)));
  return <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>{format(v)}</span>;
}

/** A small derived fraction: numerator / denominator = value, built left to right. */
export function Fraction({ num, den, result, p, color: c = color.ink, size = 44 }: { num: ReactNode; den: ReactNode; result?: ReactNode; p: number; color?: string; size?: number }) {
  const a = ease.arrive(clamp(p * 1.6));
  const b = ease.arrive(clamp(p * 1.6 - 0.6));
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: size * 0.45, ...textStyle("value"), fontSize: size, color: c, fontVariantNumeric: "tabular-nums" }}>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", opacity: a }}>
        <span>{num}</span>
        <span style={{ height: 2, alignSelf: "stretch", background: c, margin: "4px 0" }} />
        <span>{den}</span>
      </div>
      {result !== undefined && <span style={{ opacity: b, transform: `translateX(${(1 - b) * 16}px)` }}>= {result}</span>}
    </div>
  );
}

export interface CellGridProps {
  n: number;
  cols: number;
  x: number;
  y: number;
  cell?: number;
  gap?: number;
  /** Fill for cell i at the current frame (the scene computes waves). */
  fill: (i: number) => string;
  /** Outline-only cells (e.g. incorrect answers). */
  hollow?: (i: number) => boolean;
  /** Per-cell visibility 0..1. */
  show?: (i: number) => number;
}

export function CellGrid({ n, cols, x, y, cell = 14, gap = 3, fill, hollow, show }: CellGridProps) {
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {Array.from({ length: n }, (_, i) => {
        const s = show ? show(i) : 1;
        if (s <= 0) return null;
        const cx = x + (i % cols) * (cell + gap);
        const cy = y + Math.floor(i / cols) * (cell + gap);
        const f = fill(i);
        const h = hollow?.(i);
        const k = cell * (0.4 + 0.6 * ease.arrive(clamp(s)));
        const o = (cell - k) / 2;
        return h ? (
          <rect key={i} x={cx + o + 0.75} y={cy + o + 0.75} width={k - 1.5} height={k - 1.5} rx={2} fill="none" stroke={f} strokeWidth={1.5} opacity={clamp(s * 2)} />
        ) : (
          <rect key={i} x={cx + o} y={cy + o} width={k} height={k} rx={2} fill={f} opacity={clamp(s * 2)} />
        );
      })}
    </svg>
  );
}

export interface BarGroup {
  label: string;
  bars: Array<{ value: number; color: string; label?: string; note?: string }>;
}

/** Paired horizontal bars (percent scale), values printed at the bar end. */
export function BarPairs({ groups, x, y, w, rowH = 118, barH = 30, p, max = 100, unit = "%", labelW = 300 }: { groups: BarGroup[]; x: number; y: number; w: number; rowH?: number; barH?: number; p: number; max?: number; unit?: string; labelW?: number }) {
  const scale = (w - labelW - 120) / max;
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w }}>
      {groups.map((g, gi) => {
        const gp = ease.settle(clamp(p * 1.3 - gi * 0.15));
        return (
          <div key={g.label} style={{ position: "absolute", top: gi * rowH, left: 0, width: w, height: rowH }}>
            <div style={{ position: "absolute", left: 0, top: 6, width: labelW - 24, ...textStyle("label"), color: color.ink, opacity: clamp(gp * 3), transform: `translateX(${(1 - clamp(gp * 3)) * -12}px)` }}>{g.label}</div>
            {g.bars.map((b, bi) => {
              const bw = b.value * scale * gp;
              const top = 4 + bi * (barH + 10);
              return (
                <div key={bi}>
                  <div style={{ position: "absolute", left: labelW, top, width: bw, height: barH, background: b.color, borderRadius: 3 }} />
                  <div style={{ position: "absolute", left: labelW + bw + 12, top: top - 2, ...textStyle("value"), fontSize: 26, color: b.color, opacity: clamp(gp * 2 - 1), whiteSpace: "nowrap" }}>
                    {b.value.toFixed(1)}
                    {unit}
                    {b.note && <span style={{ ...textStyle("meta"), color: color.ink3, marginLeft: 12 }}>{b.note}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Track with a fill and a labelled floor line (e.g. agreement vs a pre-registered floor). */
export function Meter({ x, y, w, value, floor, p, fillColor = color.ink, floorLabel }: { x: number; y: number; w: number; value: number; floor: number; p: number; fillColor?: string; floorLabel?: string }) {
  const v = value * ease.settle(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 90 }}>
      <div style={{ position: "absolute", left: 0, top: 30, width: w, height: 22, background: color.cardShade, border: `1.5px solid ${color.hairline}` }} />
      <div style={{ position: "absolute", left: 0, top: 30, width: w * v, height: 22, background: fillColor }} />
      <div style={{ position: "absolute", left: w * floor - 1.5, top: 14, width: 3, height: 54, background: color.red }} />
      {floorLabel && <div style={{ position: "absolute", right: w * (1 - floor) - 10, top: 72, ...textStyle("meta"), color: color.red, whiteSpace: "nowrap", textAlign: "right" }}>{floorLabel}</div>}
      <div style={{ position: "absolute", left: 0, top: -18, ...textStyle("value"), fontSize: 34, color: color.ink }}>{v.toFixed(3)}</div>
    </div>
  );
}
