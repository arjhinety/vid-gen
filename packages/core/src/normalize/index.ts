/**
 * Display text -> spoken text, with a character map back to the display text.
 *
 * TTS engines misread digits, acronyms and symbols, and Irodori does no text
 * preprocessing at all, so every line passes through this before synthesis. The
 * map lets aligned speech timings land cues and captions on the exact displayed
 * word even when "62%" became "sixty-two percent".
 *
 * Rules are ordered: lexicon entries (exact tokens) first, then numbers.
 * Per-project additions live in projects/<id>/script/lexicon.yaml.
 */
import { parseCues } from "../cues.ts";
import type { Lang } from "../schema.ts";
import { enDecimal, enInteger, jaDecimal, jaInteger, jaIntegerKana } from "./numbers.ts";

export { enInteger, enDecimal, jaInteger, jaDecimal, jaIntegerKana } from "./numbers.ts";

/** A contiguous piece of spoken text and the display span it came from. */
export interface SpokenSpan {
  s0: number;
  s1: number;
  c0: number;
  c1: number;
}

export interface Normalized {
  /** Text sent to TTS (markers removed). */
  spoken: string;
  /** Display text (markers removed); what captions show. */
  display: string;
  /** Monotone spans covering `spoken`; each maps to a display range. */
  spans: SpokenSpan[];
  /** Cue name -> offset in `spoken` where the cued word starts. */
  cues: Record<string, number>;
  /** Tone tags (`{name}`), in order, at their offsets in `spoken`. */
  tones: Array<{ name: string; at: number }>;
}

export type Lexicon = Array<[RegExp, string]>;

/** Base lexicons. Keys are matched as whole tokens (case-sensitive). */
export const BASE_LEXICON: Record<Lang, Array<[string, string]>> = {
  en: [
    ["F1", "F one"],
    ["SFT", "S F T"],
    ["DPO", "D P O"],
    ["GSM8K", "G S M eight K"],
    ["MMLU-Pro", "M M L U Pro"],
    ["IFEval", "I F Eval"],
    ["JSON", "Jason"],
    ["LoRA", "Laura"],
    ["VRAM", "V RAM"],
    ["GPU", "G P U"],
    ["Qwen", "Kwen"],
    ["AI", "A I"],
    ["vs", "versus"],
  ],
  ja: [
    ["F1", "エフワン"],
    ["SFT", "エスエフティー"],
    ["DPO", "ディーピーオー"],
    ["GSM8K", "ジーエスエムエイトケー"],
    ["MMLU-Pro", "エムエムエルユープロ"],
    ["IFEval", "アイエフエバル"],
    ["Qwen", "クウェン"],
    ["AI", "エーアイ"],
    ["JSON", "ジェイソン"],
    ["GPU", "ジーピーユー"],
  ],
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function compileLexicon(lang: Lang, extra: Array<[string, string]> = []): Lexicon {
  const entries = [...extra, ...BASE_LEXICON[lang]];
  // Latin tokens need word boundaries; in Japanese text they sit between kana/kanji.
  // Boundaries are checked only against characters of the same class as the key's
  // edge, so "Qwen3.5" still matches "Qwen" but "AIM" never matches "AI".
  const edge = (ch: string) => (/[0-9]/.test(ch) ? "[A-Za-z0-9]" : "[A-Za-z]");
  return entries.map(([k, v]) => [new RegExp(`(?<!${edge(k[0]!)})${escapeRe(k)}(?!${edge(k[k.length - 1]!)})`, "y"), v]);
}

const EN_NUM = /(?<![A-Za-z0-9])(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(%?)/y;
const JA_NUM = /(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?(%?)/y;

function speakNumber(lang: Lang, intPart: string, frac: string | undefined, pct: string): string {
  const raw = intPart.replace(/,/g, "") + (frac ?? "");
  if (lang === "en") {
    // Leading zeros are read digit by digit ("001" -> "zero zero one").
    const words = /^0\d+$/.test(intPart) && !frac ? [...intPart].map((d) => enInteger(Number(d))).join(" ") : frac ? enDecimal(raw) : enInteger(Number(raw));
    return words + (pct ? " percent" : "");
  }
  const words = /^0\d+$/.test(intPart) && !frac ? [...intPart].map((d) => (d === "0" ? "ゼロ" : jaInteger(Number(d)))).join("") : frac ? jaDecimal(raw) : jaInteger(Number(raw));
  return words + (pct ? "パーセント" : "");
}

/** Normalise a display line (may contain [[cue]] markers). */
export function normalizeLine(raw: string, lang: Lang, lexicon: Lexicon = compileLexicon(lang)): Normalized {
  const { text: display, cues: displayCues, tones: displayTones } = parseCues(raw);
  let spoken = "";
  const spans: Array<SpokenSpan & { copy: boolean }> = [];
  const numRe = lang === "en" ? EN_NUM : JA_NUM;
  let i = 0;
  const emit = (out: string, c0: number, c1: number, copy = false) => {
    spans.push({ s0: spoken.length, s1: spoken.length + out.length, c0, c1, copy });
    spoken += out;
  };
  outer: while (i < display.length) {
    for (const [re, rep] of lexicon) {
      re.lastIndex = i;
      const m = re.exec(display);
      if (m) {
        emit(rep, i, i + m[0].length);
        i += m[0].length;
        continue outer;
      }
    }
    numRe.lastIndex = i;
    const n = numRe.exec(display);
    if (n) {
      emit(speakNumber(lang, n[1]!, n[2], n[3]!), i, i + n[0].length);
      i += n[0].length;
      continue;
    }
    // Copy one character through unchanged.
    emit(display[i]!, i, i + 1, true);
    i++;
  }
  const merged = mergeCopies(spans);
  const toneAt = mapCues(Object.fromEntries(displayTones.map((t, i) => [String(i), t.at])), merged);
  return { spoken, display, spans: merged, cues: mapCues(displayCues, merged), tones: displayTones.map((t, i) => ({ name: t.name, at: toneAt[String(i)]! })) };
}

/**
 * Merge runs of copied characters into single spans (smaller, easier to read). Only true
 * copies merge: a rewrite that happens to keep its length ("1,319" -> 千三百十九) stays its
 * own span, so it can still be traced to its display text.
 */
function mergeCopies(spans: Array<SpokenSpan & { copy: boolean }>): SpokenSpan[] {
  const out: Array<SpokenSpan & { copy: boolean }> = [];
  for (const s of spans) {
    const p = out[out.length - 1];
    if (p && p.copy && s.copy && p.s1 === s.s0 && p.c1 === s.c0) {
      p.s1 = s.s1;
      p.c1 = s.c1;
    } else out.push({ ...s });
  }
  return out.map(({ copy: _copy, ...s }) => s);
}

function mapCues(displayCues: Record<string, number>, spans: SpokenSpan[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, c] of Object.entries(displayCues)) {
    const sp = spans.find((s) => s.c0 <= c && c < s.c1) ?? spans.find((s) => s.c0 >= c);
    out[name] = sp ? sp.s0 + (sp.s1 - sp.s0 === sp.c1 - sp.c0 ? c - sp.c0 : 0) : 0;
  }
  return out;
}

/** Map a character range in spoken text back to the display range it came from. */
export function spokenToDisplay(n: Normalized, s0: number, s1: number): [number, number] {
  let c0 = Infinity;
  let c1 = -Infinity;
  for (const sp of n.spans) {
    if (sp.s1 <= s0 || sp.s0 >= s1) continue;
    const identity = sp.s1 - sp.s0 === sp.c1 - sp.c0;
    const a = identity ? sp.c0 + Math.max(0, s0 - sp.s0) : sp.c0;
    const b = identity ? sp.c0 + Math.min(sp.s1, s1) - sp.s0 : sp.c1;
    c0 = Math.min(c0, a);
    c1 = Math.max(c1, b);
  }
  return Number.isFinite(c0) ? [c0, c1] : [0, 0];
}

/**
 * Numbers of a line that did not survive the ASR round trip. A character error rate
 * treats "千三百九" for "千三百十九" (1,309 for 1,319) as a 4 % slip; in a research film it is
 * a wrong result. Every span the normaliser produced from display text containing a digit
 * (numbers, and lexicon terms like F1) must reappear in the transcript, after the
 * transcript itself goes through the same normaliser (so "1,319", "1319" and
 * "one thousand three hundred nineteen" all count). Returns the display text of each miss.
 */
export function missingNumbers(n: Normalized, hyp: string, lang: Lang, lexicon?: Lexicon): string[] {
  const canon = (s: string) =>
    lang === "en" ? s.toLowerCase().replace(/\band\b/g, "").replace(/[^a-z]/g, "") : s.replace(/[\s、。，．,.!?！？「」『』・:：]/g, "");
  const clean = hyp.normalize("NFKC").replace(/[*~[\]]/g, "");
  const heard = canon(normalizeLine(clean, lang, lexicon).spoken);
  // The numbers come from the display text, read the default way. A `say_*` override
  // that spells a number the same way is checked too; one that reads it differently
  // (a deliberate rounding) is skipped.
  const ref = normalizeLine(n.display, lang, lexicon);
  const sent = canon(n.spoken);
  const out: string[] = [];
  for (const sp of ref.spans) {
    const disp = ref.display.slice(sp.c0, sp.c1);
    const said = ref.spoken.slice(sp.s0, sp.s1);
    if (!/[0-9]/.test(disp) || said === disp) continue;
    const want = canon(said);
    // Japanese overrides may spell an integer in kana; the ASR still writes kanji or digits.
    // Only for plain quantities (no leading zeros: "002" is a name) whose kana reading is long
    // enough not to occur by chance: に or さん would match 「前に」 or 「さん」 anywhere.
    const int = /^[1-9]\d{0,2}(,\d{3})*$|^[1-9]\d*$/.test(disp) ? Number(disp.replace(/,/g, "")) : null;
    const kana = lang === "ja" && int !== null ? jaIntegerKana(int) : "";
    const sentAsIs = sent.includes(want) || (kana.length >= 4 && sent.includes(kana));
    const heardOk = heard.includes(want) || (kana.length >= 4 && heard.includes(kana));
    if (want && sentAsIs && !heardOk) out.push(disp);
  }
  return out;
}

/**
 * Spoken text for a line: an explicit `say` override (which carries its own cue
 * markers, so cues still resolve) or the normalised display text.
 */
export function spokenFor(display: string, lang: Lang, say?: string, lexicon?: Lexicon): Normalized {
  if (!say) return normalizeLine(display, lang, lexicon);
  // The override is itself normalised (numbers inside it still get expanded),
  // but its spans refer to the override text, not the display text. Map them to
  // display coordinates proportionally; cue offsets come from the override's markers.
  const n = normalizeLine(say, lang, lexicon);
  const parsed = parseCues(display);
  const disp = parsed.text;
  const ratio = disp.length / Math.max(1, n.display.length);
  // Tone tags normally live in the override; if only the display text has them, place them proportionally.
  const tones = n.tones.length ? n.tones : parsed.tones.map((t) => ({ name: t.name, at: Math.min(n.spoken.length, Math.round((t.at / Math.max(1, disp.length)) * n.spoken.length)) }));
  return {
    ...n,
    tones,
    display: disp,
    spans: n.spans.map((s) => ({ ...s, c0: Math.floor(s.c0 * ratio), c1: Math.ceil(s.c1 * ratio) })),
  };
}
