import { describe, expect, it } from "vitest";
import { normalizeLine, parseCues, parseProsody } from "@vid/core";
import { directed } from "../src/audio.ts";

const irodori = { tone_via: "inline" as const, tones: { reveal: "⏸️⏸️😎💥", gravity: "😟😖" } };
const qwen = { tone_via: "instruct" as const, tones: { irony: "Dry and ironic.", gravity: "Grave and slow." } };
const kokoro = { tone_via: "none" as const, tones: {} };
const kokoroDirected = { tone_via: "prosody" as const, tones: { gravity: "speed=0.88 pitch=-2.5 range=0.6", neutral: "" } };

describe("tone tags", () => {
  it("are stripped from the display text and located where the directed stretch starts", () => {
    const p = parseCues("統計の問題ではありません。[[title]]{reveal}空っぽの箱。");
    expect(p.text).toBe("統計の問題ではありません。空っぽの箱。");
    expect(p.tones).toEqual([{ name: "reveal", at: 13 }]);
    expect(p.cues.title).toBe(13);
  });

  it("map to the spoken text through number expansion", () => {
    const n = normalizeLine("It added [[seven]]{irony}7 correct calls out of 453.", "en");
    expect(n.spoken).toBe("It added seven correct calls out of four hundred and fifty-three.");
    expect(n.tones).toEqual([{ name: "irony", at: 9 }]);
  });
});

describe("directed()", () => {
  it("inserts an inline engine's emoji at the tag, leaving the clean text as the reference", () => {
    const norm = normalizeLine("統計の問題ではありません。{reveal}空っぽの箱。", "ja");
    const d = directed({ norm }, irodori);
    expect(d.text).toBe("統計の問題ではありません。⏸️⏸️😎💥空っぽの箱。");
    expect(norm.spoken).toBe("統計の問題ではありません。空っぽの箱。");
    expect(d.tones).toEqual(["reveal"]);
  });

  it("puts a line-level tone at the start for an inline engine, and inline tags win over it", () => {
    expect(directed({ norm: normalizeLine("一問残らず拒否しました。", "ja"), tone: "gravity" }, irodori).text).toBe("😟😖一問残らず拒否しました。");
    expect(directed({ norm: normalizeLine("拒否は{reveal}消えました。", "ja"), tone: "gravity" }, irodori).text).toBe("拒否は⏸️⏸️😎💥消えました。");
  });

  it("sends an instruction engine the tone's text and the clean words", () => {
    const d = directed({ norm: normalizeLine("Preference training barely moved it.", "en"), tone: "irony" }, qwen);
    expect(d).toEqual({ text: "Preference training barely moved it.", instruct: "Dry and ironic.", tones: ["irony"] });
    // No tone: no instruction, so the voice's own default applies.
    expect(directed({ norm: normalizeLine("Plain line.", "en") }, qwen)).toEqual({ text: "Plain line.", tones: [] });
  });

  it("ignores tones for an engine that takes none", () => {
    expect(directed({ norm: normalizeLine("{gravity}Plain line.", "en"), tone: "gravity" }, kokoro)).toEqual({ text: "Plain line.", tones: [] });
  });
});

describe("prosody direction", () => {
  it("parses a spec and rejects unknown terms or values out of bounds", () => {
    expect(parseProsody("speed=0.88 pitch=-2.5 range=0.6")).toEqual({ speed: 0.88, pitch: -2.5, range: 0.6 });
    expect(parseProsody("")).toEqual({});
    expect(() => parseProsody("tempo=1.1")).toThrow(/bad prosody term/);
    expect(() => parseProsody("pitch=9")).toThrow(/outside -6..6/);
  });

  it("gives the engine the clean words and the tone's prosody", () => {
    const d = directed({ norm: normalizeLine("Both trained checkpoints refused every single one.", "en"), tone: "gravity" }, kokoroDirected);
    expect(d).toEqual({ text: "Both trained checkpoints refused every single one.", prosody: { speed: 0.88, pitch: -2.5, range: 0.6 }, tones: ["gravity"] });
    // An empty spec directs nothing (and so keeps the undirected cache key).
    expect(directed({ norm: normalizeLine("Plain.", "en"), tone: "neutral" }, kokoroDirected)).toEqual({ text: "Plain.", tones: ["neutral"] });
  });
});
