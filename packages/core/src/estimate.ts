/**
 * Provisional line durations from text length, so scenes can be authored and
 * previewed before any TTS has run. Every cue derived from this is flagged
 * `estimated`, and `video check` warns if a final render still uses them.
 */
import { parseCues } from "./cues.ts";
import type { Lang, NarrationSpec } from "./schema.ts";
import { lineKey, type LineAudio } from "./timeline.ts";

/** Typical calm narration rates. */
export const SPEECH_RATE = {
  en: { wordsPerSec: 2.55 }, // ~153 wpm
  ja: { charsPerSec: 7.0 }, // morae-ish; kana/kanji mix
} as const;

export function estimateDuration(text: string, lang: Lang): number {
  if (lang === "ja") return Math.max(0.8, [...text.replace(/\s/g, "")].length / SPEECH_RATE.ja.charsPerSec);
  const words = text.split(/\s+/).filter(Boolean).length;
  const commas = (text.match(/[,;:—]/g) ?? []).length;
  return Math.max(0.8, words / SPEECH_RATE.en.wordsPerSec + commas * 0.15);
}

export function estimateAudio(narration: NarrationSpec, lang: Lang): Record<string, LineAudio> {
  const out: Record<string, LineAudio> = {};
  for (const b of narration.beats) {
    b.lines.forEach((l, i) => {
      const raw = lang === "en" ? l.en : (l.ja ?? l.en);
      out[lineKey(b.id, i)] = { path: "", duration: estimateDuration(parseCues(raw).text, lang), words: null };
    });
  }
  return out;
}
