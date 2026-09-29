/**
 * The held-out population as dots. One dot per confirmatory item (n = 1,277), with its
 * gold mode and, per system, the mode the model chose, derived from the extracted
 * confusion matrices. Assignment within a (gold, predicted) cell is deterministic.
 */
import { color } from "@vid/design";
import { packTray, type Pt } from "@vid/kit";
import { heldout, MODES, routing } from "./data.ts";
import { DOT_GAP, DOT_R, trays } from "./layout.ts";

type Mode = (typeof MODES)[number];
type Sys = keyof typeof routing;

export interface Dot {
  i: number;
  gold: Mode;
  /** Index of this dot within its gold class (stable across systems). */
  k: number;
}

export const DOTS: Dot[] = MODES.flatMap((g) => Array.from({ length: heldout[g] }, (_, k) => ({ i: 0, gold: g, k }))).map((d, i) => ({ ...d, i }));

/** Predicted mode per dot for a system: fill each gold class's dots cell by cell from the confusion row. */
export function predictions(sys: Sys): Mode[] {
  const cm = routing[sys].confusion;
  const out: Mode[] = new Array(DOTS.length);
  for (const g of MODES) {
    const row = cm[g];
    // Correct predictions first, so the same items stay correct across systems where possible.
    const order: Mode[] = [g, ...MODES.filter((m) => m !== g)];
    let k = 0;
    const cls = DOTS.filter((d) => d.gold === g);
    for (const p of order) for (let c = 0; c < row[p]; c++) out[cls[k++]!.i] = p;
    if (k !== cls.length) throw new Error(`confusion row ${g} sums to ${k}, expected ${cls.length}`);
  }
  return out;
}

/**
 * Positions when each dot sits in the tray given by `modeOf`. Within a tray, dots whose
 * placement is correct pack first (bottom), mistakes pile on top.
 */
export function layoutBy(modeOf: (d: Dot) => Mode, trayTop?: number, trayH?: number): Pt[] {
  const ts = trays(trayTop, trayH);
  const pos: Pt[] = new Array(DOTS.length);
  for (const t of ts) {
    const inTray = DOTS.filter((d) => modeOf(d) === t.id).sort((a, b) => Number(a.gold !== t.id) - Number(b.gold !== t.id) || a.i - b.i);
    const pts = packTray(inTray.length, t.rect, DOT_R, DOT_GAP);
    inTray.forEach((d, j) => (pos[d.i] = pts[j]!));
  }
  return pos;
}

export const goldLayout = (top?: number, h?: number) => layoutBy((d) => d.gold, top, h);
export function systemLayout(sys: Sys, top?: number, h?: number) {
  const pred = predictions(sys);
  return layoutBy((d) => pred[d.i]!, top, h);
}

/** Colour of each dot after a system has placed it. */
export function outcomeColors(sys: Sys): string[] {
  const pred = predictions(sys);
  return DOTS.map((d) => {
    const p = pred[d.i]!;
    if (p === d.gold) return color.ink;
    if (p === "CALL") return color.red; // over-call
    return color.ink3; // other mistakes
  });
}
