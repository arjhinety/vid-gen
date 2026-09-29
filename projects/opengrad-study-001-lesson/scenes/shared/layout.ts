/**
 * Geometry of the film's persistent objects on the sheet. Scenes that share an object
 * import the same numbers, so the last frame of one scene and the first frame of the
 * next agree. The stage sits below the question line (layout.stageTop) and above the
 * lower perforation row (layout.exhibitBottom). Forked from the pilot for the lesson: the stage
 * is narrower (X1) so the character lane on the right stays free.
 */
import { layout } from "@vid/design";
import type { Rect, TrayDef } from "@vid/kit";
import { MODES } from "./data.ts";

export const X0 = 140;
/** The lesson's stage ends here: Graddy-chan stands in the lane to the right (LANE). */
export const X1 = 1380;
export const TOP = layout.stageTop;
export const BOTTOM = layout.exhibitBottom;
/** The character lane (the cast layer is composited here; exhibits never enter it). */
export const LANE = { x: 1420, w: 480, top: TOP - 60, bottom: 1080 } as const;

const TRAY_GAP = 50;
const TRAY_W = (X1 - X0 - 3 * TRAY_GAP) / 4;
const trayRect = (i: number, top: number, h: number): Rect => ({ x: X0 + i * (TRAY_W + TRAY_GAP), y: top, w: TRAY_W, h });

export const TRAY_LABELS: Record<(typeof MODES)[number], { label: string; sub: string }> = {
  CALL: { label: "CALL", sub: "call a tool" },
  CLARIFY: { label: "CLARIFY", sub: "ask what's missing" },
  UNSUPPORTED: { label: "UNSUPPORTED", sub: "decline" },
  ANSWER: { label: "ANSWER", sub: "just answer" },
};

/** The four decision trays (a persistent object: four-moves, empty-bin, what-next). */
export function trays(top = 470, h = 300): TrayDef[] {
  return MODES.map((m, i) => ({ id: m, ...TRAY_LABELS[m], rect: trayRect(i, top, h) }));
}

export const DOT_R = 3.6;
export const DOT_GAP = 1.6;
