/**
 * Caption chunking. Cues never cross sentence boundaries, because every narration
 * line is a separately synthesised sentence with a measured start/end.
 *
 * - Same-language subtitles: chunk by aligned word timings.
 * - Cross-language subtitles (e.g. English over Japanese narration): the English
 *   sentence is split into readable chunks and spread over the Japanese
 *   sentence's real time span in proportion to chunk length.
 */
import type { Lang } from "./schema.ts";
import type { AlignedWord, TimelineLine } from "./timeline.ts";

export interface Caption {
  start: number;
  end: number;
  text: string;
}

export const CAPTION_RULES = {
  en: { maxLineChars: 42, maxLines: 2, minDur: 0.9, maxDur: 6.5 },
  ja: { maxLineChars: 20, maxLines: 2, minDur: 0.9, maxDur: 6.5 },
} as const;

const BREAK_AFTER = /[.,;:!?—、。！？]$/;

/** Split text into chunks that fit maxLines x maxLineChars, preferring punctuation. */
export function chunkText(text: string, lang: Lang): string[] {
  const { maxLineChars, maxLines } = CAPTION_RULES[lang];
  const limit = maxLineChars * maxLines;
  if (lang === "ja") return chunkChars(text, limit);
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let cur: string[] = [];
  const len = (ws: string[]) => ws.join(" ").length;
  for (const w of words) {
    if (cur.length && len([...cur, w]) > limit) {
      chunks.push(cur.join(" "));
      cur = [];
    }
    cur.push(w);
    // Break early at punctuation once the chunk is reasonably full.
    if (BREAK_AFTER.test(w) && len(cur) >= limit * 0.45) {
      chunks.push(cur.join(" "));
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur.join(" "));
  return mergeTiny(chunks, limit);
}

function chunkChars(text: string, limit: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const ch of text) {
    cur += ch;
    if (cur.length >= limit || (BREAK_AFTER.test(ch) && cur.length >= limit * 0.45)) {
      out.push(cur);
      cur = "";
    }
  }
  if (cur.trim()) out.push(cur);
  return mergeTiny(out, limit);
}

/** Avoid orphan chunks of one or two words. */
function mergeTiny(chunks: string[], limit: number): string[] {
  const out: string[] = [];
  for (const c of chunks) {
    const prev = out[out.length - 1];
    if (prev !== undefined && c.length < 12 && prev.length + c.length + 1 <= limit * 1.1) out[out.length - 1] = `${prev} ${c}`;
    else out.push(c);
  }
  return out;
}

/** Wrap one chunk into at most two balanced lines. */
export function wrapLines(chunk: string, lang: Lang): string {
  const { maxLineChars } = CAPTION_RULES[lang];
  if (chunk.length <= maxLineChars) return chunk;
  if (lang === "ja") {
    const mid = Math.ceil(chunk.length / 2);
    return `${chunk.slice(0, mid)}\n${chunk.slice(mid)}`;
  }
  const mid = chunk.length / 2;
  let best = -1;
  for (let i = 0; i < chunk.length; i++) {
    if (chunk[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return best < 0 ? chunk : `${chunk.slice(0, best)}\n${chunk.slice(best + 1)}`;
}

/** Map chunk boundaries onto aligned words (same-language case). */
function timeChunksByWords(text: string, chunks: string[], words: AlignedWord[], lineStart: number): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let charPos = 0;
  for (const c of chunks) {
    const found = text.indexOf(c, charPos);
    const c0 = found < 0 ? charPos : found;
    const c1 = c0 + c.length;
    charPos = c1;
    const inside = words.filter((w) => w.c0 < c1 && w.c1 > c0);
    if (!inside.length) {
      spans.push([NaN, NaN]);
      continue;
    }
    spans.push([lineStart + inside[0]!.start, lineStart + inside[inside.length - 1]!.end]);
  }
  return spans;
}

function timeChunksProportionally(chunks: string[], start: number, end: number): Array<[number, number]> {
  const total = chunks.reduce((s, c) => s + c.length, 0) || 1;
  const spans: Array<[number, number]> = [];
  let t = start;
  for (const c of chunks) {
    const d = (end - start) * (c.length / total);
    spans.push([t, t + d]);
    t += d;
  }
  return spans;
}

export function buildCaptions(lines: TimelineLine[], subLang: Lang, audioLang: Lang): Caption[] {
  const out: Caption[] = [];
  for (const line of lines) {
    const text = subLang === audioLang ? line.text : subLang === "en" ? line.text_en : line.text;
    const chunks = chunkText(text, subLang);
    let spans =
      subLang === audioLang && line.words?.length
        ? timeChunksByWords(text, chunks, line.words, line.start)
        : timeChunksProportionally(chunks, line.start, line.end);
    if (spans.some(([a, b]) => Number.isNaN(a) || Number.isNaN(b))) {
      spans = timeChunksProportionally(chunks, line.start, line.end);
    }
    chunks.forEach((c, i) => {
      out.push({ start: spans[i]![0], end: spans[i]![1], text: wrapLines(c, subLang) });
    });
  }
  return settle(out, CAPTION_RULES[subLang].minDur);
}

/** Enforce minimum duration, extend into silence a little, and remove overlaps. */
function settle(caps: Caption[], minDur: number): Caption[] {
  const r = (x: number) => Math.round(x * 1000) / 1000;
  return caps.map((c, i) => {
    const next = caps[i + 1];
    const ceiling = next ? next.start - 0.04 : c.end + 0.6;
    const end = Math.min(Math.max(c.end + 0.25, c.start + minDur), Math.max(ceiling, c.end));
    return { start: r(c.start), end: r(end), text: c.text };
  });
}

const ts = (t: number, sep: string) => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
};

export const toSrt = (caps: Caption[]) =>
  caps.map((c, i) => `${i + 1}\n${ts(c.start, ",")} --> ${ts(c.end, ",")}\n${c.text}\n`).join("\n");

export const toVtt = (caps: Caption[]) =>
  ["WEBVTT", "", ...caps.map((c) => `${ts(c.start, ".")} --> ${ts(c.end, ".")}\n${c.text}\n`)].join("\n");

/** Burn-in style for `toAss`, in the video's pixel space. Colours are #RRGGBB. */
export interface AssStyle {
  width: number;
  height: number;
  font: string;
  /** ASS Fontsize at `height`: the font's win ascent+descent box in px, not its em. */
  size: number;
  text: string;
  box: string;
  /** Box opacity, 0..1. */
  boxOpacity: number;
  /** Distance from the frame bottom to the bottom of the box (px). */
  marginV: number;
  /** Box padding around the glyphs (px). */
  padding: number;
}

/** #RRGGBB + opacity -> ASS &HAABBGGRR (AA is transparency). */
export function assColor(hex: string, opacity = 1): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) throw new Error(`bad colour ${hex}`);
  const a = Math.round((1 - opacity) * 255);
  const h = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
  return `&H${h(a)}${m[3]!.toUpperCase()}${m[2]!.toUpperCase()}${m[1]!.toUpperCase()}`;
}

const assTime = (t: number) => {
  const cs = Math.round(t * 100);
  const h = Math.floor(cs / 360_000);
  const m = Math.floor((cs % 360_000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};

/**
 * Advanced SubStation subtitles for burning in with libass: an opaque-box style
 * (BorderStyle 3) so captions stay legible over any scene. Line breaks come from
 * our own wrapping (WrapStyle 2 disables libass wrapping).
 */
export function toAss(caps: Caption[], st: AssStyle): string {
  const style = [
    "Default", st.font, st.size, assColor(st.text), assColor(st.text), assColor(st.box, st.boxOpacity), assColor(st.box, 0),
    0, 0, 0, 0, 100, 100, 0, 0, 3, st.padding, 0, 2, 60, 60, st.marginV, 1,
  ].join(",");
  const esc = (s: string) => s.replace(/[{}]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\N");
  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${st.width}`,
    `PlayResY: ${st.height}`,
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.709",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: ${style}`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...caps.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Default,,0,0,0,,${esc(c.text)}`),
    "",
  ].join("\n");
}
