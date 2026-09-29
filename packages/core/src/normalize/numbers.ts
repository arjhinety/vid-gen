/** Number words for spoken narration (English and Japanese). */

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function enBelow1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} hundred`);
  if (r) {
    if (h) parts.push("and");
    parts.push(r < 20 ? ONES[r]! : TENS[Math.floor(r / 10)]! + (r % 10 ? `-${ONES[r % 10]}` : ""));
  }
  return parts.join(" ");
}

/** 1319 -> "one thousand, three hundred and nineteen" (British-style "and", calm narration). */
export function enInteger(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`enInteger: ${n}`);
  if (n < 20) return ONES[n]!;
  const scales: Array<[number, string]> = [
    [1e9, "billion"],
    [1e6, "million"],
    [1e3, "thousand"],
  ];
  const parts: string[] = [];
  let rest = n;
  for (const [v, name] of scales) {
    if (rest >= v) {
      parts.push(`${enBelow1000(Math.floor(rest / v))} ${name}`);
      rest %= v;
    }
  }
  if (rest) parts.push(parts.length && rest < 100 ? `and ${enBelow1000(rest)}` : enBelow1000(rest));
  return parts.join(", ").replace(", and", " and");
}

/** "0.7548" -> "zero point seven five four eight"; "3.5" -> "three point five". */
export function enDecimal(s: string): string {
  const [i, f] = s.split(".");
  const whole = enInteger(Number(i!.replace(/,/g, "")));
  if (!f) return whole;
  return `${whole} point ${[...f].map((d) => ONES[Number(d)]).join(" ")}`;
}

// ---------------------------------------------------------------- Japanese

const JA_DIGIT = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function jaBelow10000(n: number): string {
  let out = "";
  const units: Array<[number, string]> = [
    [1000, "千"],
    [100, "百"],
    [10, "十"],
  ];
  let rest = n;
  for (const [v, name] of units) {
    const d = Math.floor(rest / v);
    if (d) out += (d === 1 ? "" : JA_DIGIT[d]) + name;
    rest %= v;
  }
  if (rest) out += JA_DIGIT[rest];
  return out;
}

/** 1319 -> 千三百十九, 1055 -> 千五十五, 20000 -> 二万. Kanji numerals are read reliably by JA TTS. */
export function jaInteger(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`jaInteger: ${n}`);
  if (n === 0) return "ゼロ";
  const scales: Array<[number, string]> = [
    [1e8, "億"],
    [1e4, "万"],
  ];
  let out = "";
  let rest = n;
  for (const [v, name] of scales) {
    const q = Math.floor(rest / v);
    if (q) out += jaBelow10000(q) + name;
    rest %= v;
  }
  if (rest) out += jaBelow10000(rest);
  return out;
}

const KANA_DIGIT = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];

function kanaBelow10000(n: number): string {
  const th = Math.floor(n / 1000);
  const h = Math.floor((n % 1000) / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  let s = "";
  if (th) s += th === 1 ? "せん" : th === 3 ? "さんぜん" : th === 8 ? "はっせん" : `${KANA_DIGIT[th]}せん`;
  if (h) s += h === 1 ? "ひゃく" : h === 3 ? "さんびゃく" : h === 6 ? "ろっぴゃく" : h === 8 ? "はっぴゃく" : `${KANA_DIGIT[h]}ひゃく`;
  if (t) s += `${t === 1 ? "" : KANA_DIGIT[t]}じゅう`;
  if (o) s += KANA_DIGIT[o];
  return s;
}

/**
 * 1319 -> せんさんびゃくじゅうきゅう, with the sound changes (さんびゃく, ろっぴゃく, はっせん…).
 * For `say_ja` overrides where a TTS misreads kanji numerals: Irodori read 千三百十九 as
 * 1,309 on two seeds; kana leaves it nothing to interpret.
 */
export function jaIntegerKana(n: number): string {
  if (!Number.isInteger(n) || n < 0) throw new Error(`jaIntegerKana: ${n}`);
  if (n === 0) return "ゼロ";
  let out = "";
  let rest = n;
  for (const [v, name] of [[1e8, "おく"], [1e4, "まん"]] as const) {
    const q = Math.floor(rest / v);
    if (q) out += kanaBelow10000(q) + name;
    rest %= v;
  }
  if (rest) out += kanaBelow10000(rest);
  return out;
}

/** "3.5" -> 三点五, "0.77" -> 〇点七七 (digits after the point read one by one). */
export function jaDecimal(s: string): string {
  const [i, f] = s.split(".");
  const whole = jaInteger(Number(i!.replace(/,/g, "")));
  if (!f) return whole;
  return `${whole === "ゼロ" ? "れい" : whole}点${[...f].map((d) => JA_DIGIT[Number(d)]).join("")}`;
}
