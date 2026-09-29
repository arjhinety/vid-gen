/**
 * Export design tokens for non-TypeScript renderers (Manim). The TypeScript tokens are
 * the source of truth; tokens.json is generated and checked by tests (design.test.ts).
 *   pnpm video design:export
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BEZIER, FRAMES } from "../motion/src/easing.ts";
import { claimStyle, color, depth, font, layout, motion, syntax, type } from "./src/tokens.ts";

export function tokensJson(): string {
  const fonts = {
    sans: { family: font.sans, files: ["Archivo[wdth,wght].ttf", "Archivo-Italic[wdth,wght].ttf"] },
    mono: { family: font.mono, files: ["JetBrainsMono[wght].ttf"] },
    math: { family: font.math, files: ["STIXTwoMath-Regular.ttf"] },
  };
  return `${JSON.stringify({ color, syntax, fonts, type, layout, motion, depth, bezier: BEZIER, frames: FRAMES, claimStyle }, null, 1)}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = join(dirname(fileURLToPath(import.meta.url)), "tokens.json");
  writeFileSync(out, tokensJson());
  console.log(`wrote ${out}`);
}
