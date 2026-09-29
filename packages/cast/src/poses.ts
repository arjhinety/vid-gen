/**
 * Pose presets: the neutral stance and one face per tone. The rig blends these; the
 * model sheet shows them. Tone names match the narration's `tone:` tags.
 */
import type { Face, Pose } from "./types.ts";

export const NEUTRAL_FACE: Face = { eyes: "open", open: 1, look: [0, 0], brows: { raise: 0, tilt: 0 }, mouth: "smile", mouthOpen: 0, blush: 0.2 };

export const NEUTRAL: Pose = {
  lean: 0,
  squash: 1,
  lift: 0,
  head: { tilt: 0, nod: 0, turn: 0 },
  armL: 8,
  armR: 8,
  handL: "rest",
  handR: "rest",
  pointer: null,
  hair: 0,
  face: NEUTRAL_FACE,
};

/** Faces per tone. Graddy's baseline is a knowing half-smile; the kōhai's an open smile. */
export const FACES: Record<string, Partial<Face> & { tilt?: number }> = {
  neutral: {},
  curious: { brows: { raise: 5, tilt: -6 }, mouth: "X", look: [0.4, -0.3], tilt: -7 },
  disbelief: { eyes: "wide", brows: { raise: 8, tilt: 8 }, mouth: "O", mouthOpen: 0.5 },
  irony: { eyes: "half", brows: { raise: 2, tilt: -10 }, mouth: "smirk", look: [-0.5, 0], tilt: 5 },
  gravity: { brows: { raise: -3, tilt: 10 }, mouth: "flat", look: [0, 0.3] },
  surprise: { eyes: "wide", brows: { raise: 10, tilt: 4 }, mouth: "O", mouthOpen: 1 },
  reveal: { brows: { raise: 3, tilt: -8 }, mouth: "grin", look: [0.6, 0] },
  resolve: { brows: { raise: -1, tilt: -6 }, mouth: "smile" },
  warm: { eyes: "smile", brows: { raise: 3, tilt: 6 }, mouth: "smile", blush: 0.75, tilt: -5 },
  teasing: { eyes: "wink", brows: { raise: 4, tilt: -4 }, mouth: "cat", blush: 0.4, tilt: 6 },
  confused: { brows: { raise: 5, tilt: 12 }, mouth: "frown", look: [0, -0.6], tilt: 9 },
  excited: { eyes: "wide", brows: { raise: 8, tilt: 0 }, mouth: "A", mouthOpen: 0.9, blush: 0.5 },
};

export function withFace(pose: Pose, tone: string): Pose {
  const f = FACES[tone] ?? {};
  const { tilt, ...face } = f;
  return { ...pose, head: { ...pose.head, tilt: tilt ?? pose.head.tilt }, face: { ...pose.face, ...face } };
}

export const TONES = Object.keys(FACES);
