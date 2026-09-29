/** Path helpers for hand-built cel art. All coordinates are in character units. */

export type Pt = [number, number];

const f = (n: number) => Math.round(n * 100) / 100;

/**
 * A run of pointed hair strands through alternating valley/tip points, as quadratic
 * curves bowed by `bow` (fraction of each segment's length, + bows to the left of the
 * direction of travel). Returns path commands without the initial M.
 */
export function strands(points: Pt[], bow = 0.18): string {
  let d = "";
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!;
    const [x1, y1] = points[i]!;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const cx = (x0 + x1) / 2 - dy * bow;
    const cy = (y0 + y1) / 2 + dx * bow;
    d += ` Q ${f(cx)},${f(cy)} ${f(x1)},${f(y1)}`;
  }
  return d;
}

/** Mirror a path's x coordinates (for symmetric parts written once). */
export function mirrorX(d: string): string {
  // Paths here are written as "x,y" pairs; negate every x.
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${f(-Number(x))},${y}`);
}

/** Shift every point of a path. */
export function shift(d: string, dx: number, dy: number): string {
  return d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => `${f(Number(x) + dx)},${f(Number(y) + dy)}`);
}

/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Rotate a point about a pivot, degrees. */
export function rot([x, y]: Pt, [px, py]: Pt, deg: number): Pt {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c];
}

/** SVG transform rotating about a pivot. */
export const rotAbout = (deg: number, [x, y]: Pt) => (deg ? `rotate(${f(deg)} ${f(x)} ${f(y)})` : "");
