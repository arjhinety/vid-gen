import { ease as easings, type Ease } from "./easing.ts";

export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export interface InterpolateOptions {
  ease?: Ease;
  clamp?: boolean;
}

/** Piecewise-linear map of `x` through `input` -> `output`, with optional easing per segment. */
export function interpolate(x: number, input: readonly number[], output: readonly number[], opts: InterpolateOptions = {}): number {
  if (input.length !== output.length || input.length < 2) throw new Error("interpolate: ranges must have equal length >= 2");
  const doClamp = opts.clamp ?? true;
  const e = opts.ease ?? easings.linear;
  if (x <= input[0]!) return doClamp ? output[0]! : extrapolate(x, 0);
  if (x >= input[input.length - 1]!) return doClamp ? output[output.length - 1]! : extrapolate(x, input.length - 2);
  let i = 0;
  while (x > input[i + 1]!) i++;
  const t = (x - input[i]!) / (input[i + 1]! - input[i]!);
  return mix(output[i]!, output[i + 1]!, e(t));

  function extrapolate(v: number, seg: number) {
    const t = (v - input[seg]!) / (input[seg + 1]! - input[seg]!);
    return mix(output[seg]!, output[seg + 1]!, t);
  }
}

/** Normalised, eased progress of `frame` through [start, start + dur). */
export function progress(frame: number, start: number, dur: number, e: Ease = easings.out): number {
  if (dur <= 0) return frame >= start ? 1 : 0;
  return e(clamp((frame - start) / dur));
}

// ---- colour interpolation in OKLab (perceptually even blends) ----

type RGB = [number, number, number];

export function parseColor(c: string): RGB {
  const m = c.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) throw new Error(`mixColor expects #rrggbb, got ${c}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toLin = (v: number) => {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const fromLin = (v: number) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(clamp(c) * 255);
};

function rgbToOklab([r, g, b]: RGB): RGB {
  const [lr, lg, lb] = [toLin(r), toLin(g), toLin(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

export function mixColor(a: string, b: string, t: number): string {
  const A = rgbToOklab(parseColor(a));
  const B = rgbToOklab(parseColor(b));
  const [r, g, bl] = oklabToRgb([mix(A[0], B[0], t), mix(A[1], B[1], t), mix(A[2], B[2], t)]);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}
