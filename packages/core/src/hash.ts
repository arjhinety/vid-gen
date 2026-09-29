import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";

/** Stable content hash used as a cache key for TTS, alignment and scene renders. */
export function hashOf(...parts: Array<string | Buffer | object | number | undefined | null>): string {
  const h = createHash("sha256");
  for (const p of parts) {
    if (p === undefined || p === null) h.update("\0null");
    else if (typeof p === "string" || Buffer.isBuffer(p)) h.update(p);
    else h.update(stableStringify(p));
    h.update("\0");
  }
  return h.digest("hex").slice(0, 16);
}

export function hashFiles(paths: string[]): string {
  const h = createHash("sha256");
  for (const p of [...paths].sort()) {
    h.update(p);
    try {
      h.update(readFileSync(p));
    } catch {
      h.update(`missing:${statSync(p, { throwIfNoEntry: false }) ? "?" : "none"}`);
    }
  }
  return h.digest("hex").slice(0, 16);
}

export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .filter((k) => o[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
    .join(",")}}`;
}
