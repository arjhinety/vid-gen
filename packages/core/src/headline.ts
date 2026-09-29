/**
 * The headline is the narration: each line's English text is cut into phrase rows,
 * and every word gets the time it is spoken, so the page can build word by word.
 *
 * - English audio: word times come from alignment (display-text spans).
 * - Other audio (e.g. the Japanese variant): English words are spread over the
 *   line's real time span in proportion to their position, like subtitles.
 * - Estimated timelines use the same proportional rule.
 */
import type { TextMark } from "./cues.ts";
import type { Lang } from "./schema.ts";
import type { TimelineLine } from "./timeline.ts";

export interface HeadlineWord {
  text: string;
  /** Span in the row text. */
  c0: number;
  c1: number;
  /** Absolute film time the word is spoken (s). */
  start: number;
}

export interface HeadlineRow {
  /** Stable id: `<lineKey>/<row index within the line>`. */
  id: string;
  line: string;
  text: string;
  /** Absolute time of the row's first word (s). */
  start: number;
  /** Absolute end of the row's line (s). */
  lineEnd: number;
  words: HeadlineWord[];
  /** Emphasis spans relative to the row text. */
  marks: TextMark[];
  /** True for the last row of a sentence-final line (ends with . ? !). */
  sentenceEnd: boolean;
}

const BREAK_AFTER = /[,.;:!?—]$/;

/**
 * Split text into rows of at most `maxChars`. A row may end early after punctuation
 * once it is at least `minBreak` long, so phrases stay whole.
 */
export function splitRows(text: string, maxChars: number, minBreak = 14): Array<{ c0: number; c1: number }> {
  const words = [...text.matchAll(/\S+/g)].map((m) => ({ c0: m.index!, c1: m.index! + m[0].length, w: m[0] }));
  const rows: Array<{ c0: number; c1: number }> = [];
  let cur: typeof words = [];
  const len = (ws: typeof words) => (ws.length ? ws[ws.length - 1]!.c1 - ws[0]!.c0 : 0);
  for (const w of words) {
    if (cur.length && len([...cur, w]) > maxChars) {
      rows.push({ c0: cur[0]!.c0, c1: cur[cur.length - 1]!.c1 });
      cur = [];
    }
    cur.push(w);
    if (BREAK_AFTER.test(w.w) && len(cur) >= minBreak) {
      rows.push({ c0: cur[0]!.c0, c1: cur[cur.length - 1]!.c1 });
      cur = [];
    }
  }
  if (cur.length) rows.push({ c0: cur[0]!.c0, c1: cur[cur.length - 1]!.c1 });
  // Balance a short last row with the one before it ("…we forgot" / "to look." becomes
  // "And the one place" / "we forgot to look."), unless the earlier row ends a phrase.
  if (rows.length >= 2) {
    const a = rows[rows.length - 2]!;
    const b = rows[rows.length - 1]!;
    const lastLen = b.c1 - b.c0;
    if (lastLen < maxChars * 0.5 && lastLen < (a.c1 - a.c0) * 0.6 && !BREAK_AFTER.test(text.slice(a.c0, a.c1))) {
      const mid = (a.c0 + b.c1) / 2;
      let best = -1;
      for (let i = a.c0 + 1; i < b.c1; i++) {
        if (text[i] !== " ") continue;
        if (i - a.c0 > maxChars || b.c1 - (i + 1) > maxChars) continue;
        if (best < 0 || Math.abs(i - mid) < Math.abs(best - mid)) best = i;
      }
      if (best > 0) {
        rows[rows.length - 2] = { c0: a.c0, c1: best };
        rows[rows.length - 1] = { c0: best + 1, c1: b.c1 };
      }
    }
  }
  return rows;
}

export function buildHeadline(lines: TimelineLine[], audioLang: Lang, maxChars: number): HeadlineRow[] {
  const out: HeadlineRow[] = [];
  for (const line of lines) {
    const text = line.text_en;
    const dur = Math.max(0.001, line.end - line.start);
    const aligned = audioLang === "en" && line.words?.length ? line.words : null;
    const tokens = [...text.matchAll(/\S+/g)].map((m) => ({ c0: m.index!, c1: m.index! + m[0].length, w: m[0] }));
    // Absolute start per token.
    const starts: Array<number | null> = tokens.map((tk) => {
      if (!aligned) return line.start + dur * 0.92 * (tk.c0 / Math.max(1, text.length));
      const hits = aligned.filter((w) => w.c1 > tk.c0 && w.c0 < tk.c1);
      return hits.length ? line.start + Math.min(...hits.map((h) => h.start)) : null;
    });
    // Fill alignment gaps by interpolating between known neighbours; keep times monotone.
    for (let i = 0; i < starts.length; i++) {
      if (starts[i] !== null) continue;
      let a = i - 1;
      while (a >= 0 && starts[a] === null) a--;
      let b = i + 1;
      while (b < starts.length && starts[b] === null) b++;
      const ta = a >= 0 ? starts[a]! : line.start;
      const tb = b < starts.length ? starts[b]! : line.end;
      const ca = a >= 0 ? tokens[a]!.c0 : 0;
      const cb = b < starts.length ? tokens[b]!.c0 : text.length;
      starts[i] = ta + ((tb - ta) * (tokens[i]!.c0 - ca)) / Math.max(1, cb - ca);
    }
    for (let i = 1; i < starts.length; i++) starts[i] = Math.max(starts[i]!, starts[i - 1]!);

    const rows = splitRows(text, maxChars);
    rows.forEach((r, ri) => {
      const idx = tokens.map((tk, i) => ({ tk, i })).filter(({ tk }) => tk.c0 >= r.c0 && tk.c1 <= r.c1);
      const rowText = text.slice(r.c0, r.c1);
      out.push({
        id: `${line.key}/${ri}`,
        line: line.key,
        text: rowText,
        start: round3(starts[idx[0]!.i]!),
        lineEnd: line.end,
        words: idx.map(({ tk, i }) => ({ text: tk.w, c0: tk.c0 - r.c0, c1: tk.c1 - r.c0, start: round3(starts[i]!) })),
        marks: line.marks_en
          .filter((m) => m.c1 > r.c0 && m.c0 < r.c1)
          .map((m) => ({ kind: m.kind, c0: Math.max(0, m.c0 - r.c0), c1: Math.min(rowText.length, m.c1 - r.c0) })),
        sentenceEnd: ri === rows.length - 1 && /[.?!]["”’)]?$/.test(rowText),
      });
    });
  }
  return out;
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;
