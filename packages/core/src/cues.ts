/**
 * Narration markup. Everything here is stripped before TTS, captions and alignment;
 * offsets refer to the clean display text.
 *
 * - Cue markers `[[name]]` sit immediately before the word at which something should
 *   happen. After TTS and alignment each cue resolves to that word's start time.
 * - Emphasis for the on-screen headline: `*the turn*` is set in the accent colour,
 *   `~~a negation~~` is struck through in the accent colour.
 * - Tone tags `{name}` direct the voice from that point (e.g. `{reveal}空っぽの箱`). Only the
 *   TTS adapter sees them, translated through the voice file's `tones` table.
 *
 *   en: "Then the model *stopped answering*."
 *   en: "We're not a ~~consultancy~~."
 *   ja: "モデルは[[refuse]]拒否し始めていたのです。"
 */

const TOKEN_RE = /\[\[([a-z0-9][a-z0-9_.-]*)\]\]|\{([a-z][a-z-]*)\}|~~|\*/g;
const CUE_RE = /\[\[([a-z0-9][a-z0-9_.-]*)\]\]/g;

export type MarkKind = "accent" | "strike";

export interface TextMark {
  kind: MarkKind;
  /** Character span [c0, c1) in the clean text. */
  c0: number;
  c1: number;
}

export interface ParsedLine {
  /** Display text with markup removed (whitespace normalised). */
  text: string;
  /** Cue name -> character offset into `text` where the cued word starts. */
  cues: Record<string, number>;
  /** Emphasis spans for the headline. */
  marks: TextMark[];
  /** Tone tags, in order: name and character offset into `text` where the directed stretch starts. */
  tones: Array<{ name: string; at: number }>;
}

export function parseCues(raw: string): ParsedLine {
  raw = raw.replace(/\s+/g, " ");
  const cues: Record<string, number> = {};
  const marks: TextMark[] = [];
  const tones: Array<{ name: string; at: number }> = [];
  const open: Partial<Record<MarkKind, number>> = {};
  let text = "";
  let last = 0;
  for (const m of raw.matchAll(TOKEN_RE)) {
    text += raw.slice(last, m.index);
    last = m.index! + m[0].length;
    if (m[1]) {
      const name = m[1];
      if (name in cues) throw new Error(`duplicate cue [[${name}]] in line: ${raw}`);
      cues[name] = text.length;
      continue;
    }
    if (m[2]) {
      tones.push({ name: m[2], at: text.length });
      continue;
    }
    const kind: MarkKind = m[0] === "*" ? "accent" : "strike";
    if (open[kind] === undefined) open[kind] = text.length;
    else {
      marks.push({ kind, c0: open[kind]!, c1: text.length });
      delete open[kind];
    }
  }
  text += raw.slice(last);
  const unclosed = Object.keys(open);
  if (unclosed.length) throw new Error(`unclosed ${unclosed.map((k) => (k === "accent" ? "*" : "~~")).join(", ")} in line: ${raw}`);
  return collapseSpaces(text, cues, marks, tones);
}

function collapseSpaces(text: string, cues: Record<string, number>, marks: TextMark[], tones: Array<{ name: string; at: number }>): ParsedLine {
  let out = "";
  const map: number[] = []; // old index -> new index
  for (let i = 0; i < text.length; i++) {
    map[i] = out.length;
    const ch = text[i]!;
    if (ch === " " && (out.length === 0 || out.endsWith(" "))) continue;
    out += ch;
  }
  map[text.length] = out.length;
  const trimmedStart = out.length - out.trimStart().length;
  const final = out.trim();
  const at = (i: number) => Math.min(Math.max(0, map[i]! - trimmedStart), final.length);
  const remapped: Record<string, number> = {};
  for (const [k, v] of Object.entries(cues)) {
    remapped[k] = at(v);
    // A marker placed before a space should point at the next word.
    while (final[remapped[k]!] === " ") remapped[k]!++;
  }
  const spans = marks
    .map((m) => {
      let c0 = at(m.c0);
      let c1 = at(m.c1);
      while (final[c0] === " " && c0 < c1) c0++;
      while (final[c1 - 1] === " " && c1 > c0) c1--;
      return { ...m, c0, c1 };
    })
    .filter((m) => m.c1 > m.c0)
    .sort((a, b) => a.c0 - b.c0);
  const tonesAt = tones.map((t) => {
    let a = at(t.at);
    while (final[a] === " ") a++;
    return { name: t.name, at: a };
  });
  return { text: final, cues: remapped, marks: spans, tones: tonesAt };
}

export function stripCues(raw: string): string {
  return parseCues(raw).text;
}

export function cueNames(raw: string): string[] {
  return [...raw.matchAll(CUE_RE)].map((m) => m[1]!);
}
