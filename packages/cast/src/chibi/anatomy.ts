/**
 * Chibi proportions (about 2.5 heads): the head spans roughly -476..-252, the body
 * -252..0. Pivots are the joints the rig rotates about.
 */
import type { Pt } from "./paths.ts";

export const EYE_X = 40;
export const EYE_Y = -306;
export const MOUTH_Y = -273;

export const PIVOT = {
  /** Head tilt/nod: the base of the skull. */
  neck: [0, -262] as Pt,
  /** Arms: the shoulders (screen left, screen right). */
  shoulderL: [-40, -243] as Pt,
  shoulderR: [40, -243] as Pt,
  /** Hands at rest (arm angle 0). */
  handL: [-54, -176] as Pt,
  handR: [54, -176] as Pt,
  /** Long hair swings from the crown. */
  crown: [0, -400] as Pt,
};

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
