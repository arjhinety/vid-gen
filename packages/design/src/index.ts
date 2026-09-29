import type { CSSProperties } from "react";
import { color, type as typeScale, type TypeName, type TypeStyle } from "./tokens.ts";

export * from "./tokens.ts";

/** CSS variables for every colour token, applied on the stage root. */
export function themeVars(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(color)) {
    if (typeof v === "string") out[`--c-${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`] = v;
  }
  return out;
}

/** Inline style for a type-scale entry (width axis and caps included). */
export function text(style: TypeName, overrides: CSSProperties = {}): CSSProperties {
  const t: TypeStyle = typeScale[style];
  return {
    fontFamily: `"${t.family}"`,
    fontSize: t.size,
    fontWeight: t.weight,
    lineHeight: t.lineHeight,
    letterSpacing: `${t.tracking}em`,
    ...(t.stretch ? { fontStretch: `${t.stretch}%` } : {}),
    ...(t.caps ? { textTransform: "uppercase" } : {}),
    ...overrides,
  };
}
