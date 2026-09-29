/**
 * Geometry of the film's persistent objects on the sheet. Scenes that share an object
 * import the same numbers, so the last frame of one scene and the first frame of the
 * next agree. The stage sits below the question line (layout.stageTop) and above the
 * lower perforation row (layout.exhibitBottom).
 */
import { layout } from "@vid/design";
import type { Rect, TrayDef } from "@vid/kit";
import { MODES } from "./data.ts";

export const X0 = 140;
export const X1 = 1780;
export const TOP = layout.stageTop;
export const BOTTOM = layout.exhibitBottom;

const TRAY_W = 330;
const TRAY_GAP = (X1 - X0 - 4 * TRAY_W) / 3;
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
