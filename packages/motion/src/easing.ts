/**
 * Easing curves. Named curves are the motion vocabulary: pick by role, never by taste.
 * Values were fitted to frame-by-frame measurements of the motion-craft references
 * (research/reference-videos/motion-craft.md §4). None of them overshoots.
 *
 *   arrive  element/word entrances, push-ins          16 f (10 f in high-energy moments)
 *   settle  brackets, connectors, highlight resizes   21 f
 *   travel  wipes, panel moves, pans                  18–24 f
 *   glide   big layout transforms, title -> running head, camera   34 f
 *   exit    leaving elements (accelerate away)        6–8 f
 *   slam    cold open only                            6–8 f
 */
export type Ease = (t: number) => number;

/** CSS-compatible cubic-bezier(x1, y1, x2, y2). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Ease {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dsx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) return t;
      const d = dsx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (hi - lo > 1e-6) {
      if (sx(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  };
  return (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : sy(solve(x)));
}

export const BEZIER = {
  arrive: [0.25, 1, 0.5, 1],
  settle: [0.3, 0.15, 0, 1],
  travel: [0.65, 0.15, 0.1, 1],
  glide: [0.72, 0.12, 0.18, 0.96],
  exit: [0.32, 0, 0.67, 0],
  slam: [0.3, 0, 0.1, 1],
} as const;

const make = (k: keyof typeof BEZIER) => {
  const [x1, y1, x2, y2] = BEZIER[k];
  return cubicBezier(x1, y1, x2, y2);
};

export const ease = {
  linear: ((t: number) => t) as Ease,
  arrive: make("arrive"),
  settle: make("settle"),
  travel: make("travel"),
  glide: make("glide"),
  exit: make("exit"),
  slam: make("slam"),
  /** Alias: default for "something appears". */
  out: make("arrive"),
  /** Alias: default for "something moves between two meaningful places". */
  inOut: make("travel"),
} as const;

export type EaseName = keyof typeof ease;

/**
 * Durations in frames at 30 fps, measured from the house film
 * (research/reference-videos/experimental-labs/grammar.md). Convert with `f / fps`.
 */
export const FRAMES = {
  word: 5,
  scroll: 8,
  arrive: 10,
  settle: 14,
  travel: 16,
  glide: 18,
  pan: 24,
  exhibitIn: 11,
  exhibitOut: 9,
  exit: 7,
  slam: 7,
  stagger: 4,
} as const;
