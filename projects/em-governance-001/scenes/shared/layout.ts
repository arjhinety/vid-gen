/**
 * Stage geometry shared by every scene: the exhibit area sits below the question line
 * (layout.stageTop) and above the lower perforation row (layout.exhibitBottom).
 */
import { layout } from "@vid/design";

export const X0 = 140;
export const X1 = 1780;
export const TOP = layout.stageTop;
export const BOTTOM = layout.exhibitBottom;
export const CX = 960;
/** The provenance line every scene ends its exhibit with. */
export const CLAIM_Y = TOP + 664;
