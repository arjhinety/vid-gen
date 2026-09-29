/**
 * Closed-form damped spring, so the value at any frame is computed directly
 * (no accumulated simulation state -> seekable and deterministic).
 */
export interface SpringConfig {
  /** Stiffness k. */
  stiffness?: number;
  /** Damping c. */
  damping?: number;
  mass?: number;
}

export const springs = {
  /** Settles without overshoot: for data and diagrams. */
  calm: { stiffness: 120, damping: 26, mass: 1 },
  /** Slight overshoot: for objects that "arrive" with physical presence. */
  physical: { stiffness: 170, damping: 18, mass: 1 },
  /** Heavier, slower: for large structures and camera. */
  heavy: { stiffness: 80, damping: 20, mass: 1.4 },
} satisfies Record<string, SpringConfig>;

/** Spring position from 0 to 1 at `t` seconds after release. */
export function spring(t: number, cfg: SpringConfig = springs.calm): number {
  if (t <= 0) return 0;
  const k = cfg.stiffness ?? 120;
  const c = cfg.damping ?? 26;
  const m = cfg.mass ?? 1;
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  // x(t) = 1 - displacement(t), starting at displacement 1 with zero velocity
  let disp: number;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    disp = Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  } else if (zeta === 1) {
    disp = Math.exp(-w0 * t) * (1 + w0 * t);
  } else {
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - s);
    const r2 = -w0 * (zeta + s);
    disp = (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }
  return 1 - disp;
}
