import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tokensJson } from "../export.ts";
import { col, colSpan, color, layout } from "../src/tokens.ts";

describe("design tokens", () => {
  it("tokens.json (used by Manim) is up to date with tokens.ts — run `pnpm video design:export`", () => {
    const committed = readFileSync(join(__dirname, "..", "tokens.json"), "utf8");
    expect(committed).toBe(tokensJson());
  });

  it("the 12-column grid spans exactly the content width", () => {
    expect(col(0)).toBe(layout.margin);
    expect(col(0) + colSpan(12)).toBeCloseTo(layout.width - layout.margin, 6);
  });

  it("every colour token is a 6-digit hex", () => {
    for (const [k, v] of Object.entries(color)) {
      if (typeof v === "string") expect(v, k).toMatch(/^#[0-9A-F]{6}$/i);
      else for (const s of v) expect(s, k).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it("sheet and ink meet WCAG AAA contrast for body text", () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
    };
    const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
    expect(ratio(color.ink, color.sheet)).toBeGreaterThan(7);
    expect(ratio(color.instrumentInk, color.instrument)).toBeGreaterThan(7);
    // Secondary text and mono sublabels stay readable on the sheet (AA / AA-large).
    expect(ratio(color.ink2, color.sheet)).toBeGreaterThan(4.5);
    expect(ratio(color.ink3, color.sheet)).toBeGreaterThan(3);
    // The crimson carries meaning in running text, so it must read as text too.
    expect(ratio(color.red, color.sheet)).toBeGreaterThan(4.5);
  });
});
