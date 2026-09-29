import { describe, expect, it } from "vitest";
import { enDecimal, enInteger, jaDecimal, jaInteger, jaIntegerKana, missingNumbers, normalizeLine, spokenFor, spokenToDisplay } from "../src/normalize/index.ts";

describe("English numbers", () => {
  it("reads integers the way a calm narrator would", () => {
    expect(enInteger(7)).toBe("seven");
    expect(enInteger(62)).toBe("sixty-two");
    expect(enInteger(453)).toBe("four hundred and fifty-three");
    expect(enInteger(1055)).toBe("one thousand and fifty-five");
    expect(enInteger(1319)).toBe("one thousand, three hundred and nineteen");
    expect(enInteger(173237)).toBe("one hundred and seventy-three thousand, two hundred and thirty-seven");
  });
  it("reads decimals digit by digit after the point", () => {
    expect(enDecimal("0.7548")).toBe("zero point seven five four eight");
    expect(enDecimal("3.5")).toBe("three point five");
  });
});

describe("Japanese numbers", () => {
  it("uses kanji numerals with the 一-omission rules", () => {
    expect(jaInteger(62)).toBe("六十二");
    expect(jaInteger(453)).toBe("四百五十三");
    expect(jaInteger(1055)).toBe("千五十五");
    expect(jaInteger(1319)).toBe("千三百十九");
    expect(jaInteger(10000)).toBe("一万");
    expect(jaInteger(173237)).toBe("十七万三千二百三十七");
    expect(jaDecimal("3.5")).toBe("三点五");
    expect(jaDecimal("0.77")).toBe("れい点七七");
  });
});

describe("normalizeLine", () => {
  it("expands percentages and acronyms and keeps the cue on the expanded word", () => {
    const n = normalizeLine("it called one anyway, [[p62]]62% of the time. F1 rose.", "en");
    expect(n.spoken).toBe("it called one anyway, sixty-two percent of the time. F one rose.");
    expect(n.display).toBe("it called one anyway, 62% of the time. F1 rose.");
    expect(n.spoken.slice(n.cues.p62!)).toMatch(/^sixty-two percent/);
    // The whole expansion maps back to the displayed "62%".
    const s0 = n.spoken.indexOf("sixty");
    const [c0, c1] = spokenToDisplay(n, s0, s0 + "sixty-two percent".length);
    expect(n.display.slice(c0, c1)).toBe("62%");
  });
  it("reads a zero-padded study number digit by digit", () => {
    expect(normalizeLine("Study 001 asked", "en").spoken).toBe("Study zero zero one asked");
  });
  it("replaces Latin tokens inside Japanese text, even next to digits", () => {
    expect(normalizeLine("モデルはQwen3.5です。", "ja").spoken).toBe("モデルはクウェン三点五です。");
    expect(normalizeLine("[[p62]]62%の割合", "ja").spoken).toBe("六十二パーセントの割合");
    expect(normalizeLine("F1スコア", "ja").spoken).toBe("エフワンスコア");
  });
  it("does not touch a token that only contains a lexicon key", () => {
    expect(normalizeLine("AIM and FAIR", "en").spoken).toBe("AIM and FAIR");
  });
  it("uses a say override and still resolves its cues", () => {
    const n = spokenFor("The model is [[model]]Qwen 3.5.", "en", "The model is [[model]]Kwen three point five.");
    expect(n.spoken).toBe("The model is Kwen three point five.");
    expect(n.spoken.slice(n.cues.model!)).toMatch(/^Kwen/);
  });
});

describe("number guard (ASR round trip)", () => {
  it("catches a dropped digit that a character error rate would pass", () => {
    const n = normalizeLine("そこで、小学生レベルの算数を[[gsm]]1,319問、出しました。", "ja");
    // Heard by the ASR on the real Irodori take: 千三百九 (1,309).
    expect(missingNumbers(n, "そこで、小学生レベルの算数を千三百九問、出しました。", "ja")).toEqual(["1,319"]);
    expect(missingNumbers(n, "そこで小学生レベルの算数を千三百十九問出しました", "ja")).toEqual([]);
    expect(missingNumbers(n, "そこで、小学生レベルの算数を1319問、出しました。", "ja")).toEqual([]);
  });
  it("accepts digits or words in English transcripts, and checks lexicon terms with digits", () => {
    const n = normalizeLine("So we asked 1,319 questions. The score was F1, at 62%.", "en");
    expect(missingNumbers(n, "So we asked 1,319 questions. The score was F1, at 62%.", "en")).toEqual([]);
    expect(missingNumbers(n, "so we asked one thousand three hundred nineteen questions the score was f one at sixty two percent", "en")).toEqual([]);
    expect(missingNumbers(n, "So we asked 1,390 questions. The score was F1, at 62%.", "en")).toEqual(["1,319"]);
    expect(missingNumbers(n, "So we asked 1,319 questions. The score was F, at 62%.", "en")).toEqual(["F1"]);
  });
});

describe("number guard with say overrides", () => {
  it("checks numbers an override spells the default way, and only those", () => {
    const n = spokenFor("そこで、小学生レベルの算数を[[gsm]]1,319問、出しました。", "ja", "そこで、小学生レベルの算数を[[gsm]]千三百十九問、出しました。");
    expect(missingNumbers(n, "そこで、小学生レベルの算数を千三百九問、出しました。", "ja")).toEqual(["1,319"]);
    // A slip elsewhere in the line is the CER's business, not a number error.
    expect(missingNumbers(n, "そこで、小学生レベルの算数を千三百十九問、だしました。", "ja")).toEqual([]);
    // A deliberate rounding in the override is not checked against the display number.
    const r = spokenFor("On 173,237 conversations.", "en", "On about a hundred and seventy thousand conversations.");
    expect(missingNumbers(r, "On about 170,000 conversations.", "en")).toEqual([]);
  });
});

describe("Japanese kana numbers", () => {
  it("reads integers in kana with the sound changes", () => {
    expect(jaIntegerKana(1319)).toBe("せんさんびゃくじゅうきゅう");
    expect(jaIntegerKana(1055)).toBe("せんごじゅうご");
    expect(jaIntegerKana(3800)).toBe("さんぜんはっぴゃく");
    expect(jaIntegerKana(600)).toBe("ろっぴゃく");
    expect(jaIntegerKana(8000)).toBe("はっせん");
    expect(jaIntegerKana(173237)).toBe("じゅうななまんさんぜんにひゃくさんじゅうなな");
  });
  it("keeps the number guard on when an override spells the number in kana", () => {
    const n = spokenFor("算数を[[gsm]]1,319問、出しました。", "ja", "算数を[[gsm]]せんさんびゃくじゅうきゅう問、出しました。");
    expect(missingNumbers(n, "算数を千三百九問、出しました。", "ja")).toEqual(["1,319"]);
    expect(missingNumbers(n, "算数を千三百十九問、出しました。", "ja")).toEqual([]);
    // The ASR may echo a kana-spelled number back in kana (seen on the real pilot take).
    expect(missingNumbers(n, "算数をせんさんびゃくじゅうきゅう問、出しました。", "ja")).toEqual([]);
    expect(missingNumbers(n, "算数をせんさんびゃくきゅう問、出しました。", "ja")).toEqual(["1,319"]);
  });
  it("skips a name read differently on purpose, even when a short kana reading occurs by chance", () => {
    // Real pilot line: 「研究002」 is read as the name ゼロゼロニ; the 「に」 of 「前に」 is not the number 2.
    const n = spokenFor("研究002は、直す[[explain]]前に、まず説明します。", "ja", "研究ゼロゼロニは、直す[[explain]]前に、まず説明します。");
    expect(missingNumbers(n, "研究ゼロゼロニは、直す前に、まず説明します。", "ja")).toEqual([]);
  });
});
