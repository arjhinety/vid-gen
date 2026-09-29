import { describe, expect, it } from "vitest";
import { buildHeadline, parseCues, splitRows, type TimelineLine } from "../src/index.ts";

describe("emphasis markup", () => {
  it("strips *accent* and ~~strike~~ and keeps offsets in the clean text", () => {
    const p = parseCues("Then the model [[stop]]*stopped answering*. We're not a ~~consultancy~~.");
    expect(p.text).toBe("Then the model stopped answering. We're not a consultancy.");
    expect(p.cues).toEqual({ stop: 15 });
    expect(p.marks).toEqual([
      { kind: "accent", c0: 15, c1: 32 },
      { kind: "strike", c0: 46, c1: 57 },
    ]);
    expect(p.text.slice(15, 32)).toBe("stopped answering");
    expect(p.text.slice(46, 57)).toBe("consultancy");
  });

  it("rejects an unclosed mark", () => {
    expect(() => parseCues("a *b c")).toThrow(/unclosed \*/);
  });
});

describe("headline rows", () => {
  it("cuts at punctuation once a row is long enough, never beyond max chars", () => {
    const t = "Serious, technical research, done in the open, for the public interest.";
    const rows = splitRows(t, 38).map((r) => t.slice(r.c0, r.c1));
    expect(rows).toEqual(["Serious, technical research,", "done in the open,", "for the public interest."]);
    for (const r of rows) expect(r.length).toBeLessThanOrEqual(38);
  });

  it("balances a short last row instead of stranding it", () => {
    const t = "This is how that happened. And the one place we forgot to look.";
    expect(splitRows(t, 34).map((r) => t.slice(r.c0, r.c1))).toEqual(["This is how that happened.", "And the one place", "we forgot to look."]);
    const u = "The model we trained doesn't even try.";
    expect(splitRows(u, 34).map((r) => u.slice(r.c0, r.c1))).toEqual(["The model we trained", "doesn't even try."]);
  });

  const text = "We improved the metric. Then the model stopped answering.";
  const line = (words: TimelineLine["words"]): TimelineLine => ({
    key: "b01#0", beat: "b01", index: 0, start: 10, end: 14, audio: "x.wav",
    text, text_en: text, marks_en: parseCues("We improved the metric. Then the model *stopped answering*.").marks, words,
  });

  it("times words from alignment on English audio, and carries marks into row coordinates", () => {
    const words = [
      { w: "We", start: 0.0, end: 0.2, c0: 0, c1: 2 },
      { w: "improved", start: 0.2, end: 0.6, c0: 3, c1: 11 },
      { w: "the", start: 0.6, end: 0.7, c0: 12, c1: 15 },
      { w: "metric.", start: 0.7, end: 1.2, c0: 16, c1: 23 },
      { w: "Then", start: 1.5, end: 1.7, c0: 24, c1: 28 },
      { w: "the", start: 1.7, end: 1.8, c0: 29, c1: 32 },
      { w: "model", start: 1.8, end: 2.1, c0: 33, c1: 38 },
      { w: "stopped", start: 2.2, end: 2.6, c0: 39, c1: 46 },
      { w: "answering.", start: 2.6, end: 3.4, c0: 47, c1: 57 },
    ];
    const rows = buildHeadline([line(words)], "en", 38);
    expect(rows.map((r) => r.text)).toEqual(["We improved the metric.", "Then the model stopped answering."]);
    expect(rows[1]!.start).toBe(11.5);
    expect(rows[1]!.words.map((w) => w.start)).toEqual([11.5, 11.7, 11.8, 12.2, 12.6]);
    // "stopped answering" is [15, 32) within the second row.
    expect(rows[1]!.marks).toEqual([{ kind: "accent", c0: 15, c1: 32 }]);
    expect(rows[1]!.sentenceEnd).toBe(true);
  });

  it("spreads English words proportionally over a Japanese line", () => {
    const rows = buildHeadline([line(null)], "ja", 38);
    // word at char 24 of 57 over 4 s * 0.92: 10 + 3.68 * 24/57 = 11.549
    expect(rows[1]!.start).toBe(11.549);
    expect(rows[0]!.words[0]!.start).toBe(10);
  });
});
