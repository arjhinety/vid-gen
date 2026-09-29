/**
 * The cast's data model. A character is drawn as a pure function of its definition
 * (palette, outfit, hair) and a pose (body, head, face). Nothing here reads a clock:
 * the rig computes poses from film time, so any frame renders identically in any order.
 *
 * Local coordinates: origin at the feet (bottom centre), y up is negative, about 480
 * units from shoe soles to the top of the hair at scale 1.
 */
import type { ComponentType } from "react";

export type EyeShape = "open" | "wide" | "half" | "smile" | "closed" | "wink";
/** Visemes (X rest, M pressed, A I U E O vowels) plus expression mouths. */
export type MouthShape = "X" | "M" | "A" | "I" | "U" | "E" | "O" | "smile" | "grin" | "smirk" | "flat" | "cat" | "frown";
export type HandShape = "rest" | "point" | "open" | "fist";

export interface Face {
  eyes: EyeShape;
  /** Lid openness 0..1, multiplied into the eye shape (blinks). */
  open: number;
  /** Gaze, each -1..1 (x right, y down). */
  look: [number, number];
  /** Brows: raise in units (up +), tilt in degrees (+ inner ends up = worried, - = cross). */
  brows: { raise: number; tilt: number };
  mouth: MouthShape;
  /** 0..1, how far a vowel mouth is open. */
  mouthOpen: number;
  /** 0..1 cheek blush; above 0.6 the blush lines show. */
  blush: number;
}

export interface Pose {
  /** Body lean about the feet, degrees (+ = clockwise). */
  lean: number;
  /** Vertical squash about the feet: 1 none, < 1 squashed, > 1 stretched (volume kept). */
  squash: number;
  /** Lift off the floor (hops), units. */
  lift: number;
  head: { tilt: number; nod: number; turn: number };
  /** Arm rotation about the shoulder, degrees (+ = raised outward). */
  armL: number;
  armR: number;
  handL: HandShape;
  handR: HandShape;
  /** Pointer angle in the right hand, degrees from pointing straight up (+ = toward the character's left, i.e. screen left). */
  pointer: number | null;
  /** Secondary hair swing, degrees. */
  hair: number;
  face: Face;
}

export interface Palette {
  line: string;
  skin: string;
  skinShade: string;
  blush: string;
  hair: string;
  hairShade: string;
  hairLight: string;
  /** Iris gradient, top to bottom. */
  iris: [string, string, string];
  pupil: string;
  top: string;
  topShade: string;
  trim: string;
  shirt: string;
  shirtShade: string;
  tie: string;
  tieShade: string;
  skirt: string;
  skirtShade: string;
  legs: string;
  socks?: string;
  shoes: string;
  coat: string;
  coatShade: string;
  accent: string;
}

export interface HairProps {
  p: Palette;
  /** Secondary swing, degrees. */
  swing: number;
  /** Unique id prefix for clip paths. */
  uid: string;
}

export interface HairSet {
  /** Behind the head and body (long hair, tails). */
  Back: ComponentType<HairProps>;
  /** Locks framing the face, in front of the face edges. */
  Side: ComponentType<HairProps>;
  /** Bangs and crown, in front of everything on the head. */
  Front: ComponentType<HairProps>;
  /** Accessories drawn last on the head (clips, pins). */
  Extra?: ComponentType<HairProps>;
  /** Points of the bang tips (for the fringe shadow on the face), left to right. */
  fringe: Array<[number, number]>;
}

export interface Outfit {
  top: "blazer" | "cardigan";
  coat: boolean;
  glasses: boolean;
  /** Cardigan sleeves over the hands. */
  sleevePaws: boolean;
  legs: "tights" | "socks";
  prop: "pointer" | "notebook" | null;
}

export interface CharacterDef {
  id: string;
  name: string;
  variant: string;
  /** One-line description of the variant, for the model sheet. */
  note: string;
  palette: Palette;
  outfit: Outfit;
  hair: HairSet;
  /** Overall size relative to the reference height. */
  scale: number;
}
