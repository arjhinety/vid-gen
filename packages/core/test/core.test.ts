import { describe, expect, it } from "vitest";
import { assColor, buildCaptions, chunkText, cutHits, parseCues, placeSfx, toAss, toSrt, wrapLines } from "../src/index.ts";
import { buildTimeline, lineKey, type LineAudio } from "../src/timeline.ts";
import { NarrationSpec, ProjectSpec } from "../src/schema.ts";

describe("cue markers", () => {
  it("strips markers and records the offset of the cued word", () => {
    const p = parseCues("The model had [[refuse]]started to refuse.");
    expect(p.text).toBe("The model had started to refuse.");
    expect(p.cues).toEqual({ refuse: 14 });
    expect(p.text.slice(14, 21)).toBe("started");
  });

  it("handles a marker followed by a space and Japanese text", () => {
    expect(parseCues("A [[x]] b").cues).toEqual({ x: 2 });
    const ja = parseCues("モデルは[[refuse]]拒否し始めた。");
    expect(ja.text).toBe("モデルは拒否し始めた。");
    expect(ja.cues.refuse).toBe(4);
  });

  it("rejects duplicate cue names", () => {
    expect(() => parseCues("[[a]]x [[a]]y")).toThrow(/duplicate/);
  });
});

const project = ProjectSpec.parse({
  id: "t",
  title: "t",
  languages: { en: { voice: "v" } },
  audio: { line_gap: 0.3, beat_gap: 0.5 },
  scenes: [
    { id: "a", renderer: "web", entry: "a.tsx", beats: ["b1"], lead: 0.5, hold: 1.0 },
    { id: "b", renderer: "web", entry: "b.tsx", beats: ["b2"], lead: 0.6, hold: 0.8 },
  ],
});
const narration = NarrationSpec.parse({
  beats: [
    { id: "b1", lines: [{ en: "First line." }, { en: "The model had [[refuse]]started to refuse." }] },
    { id: "b2", lines: [{ en: "Short." }] },
  ],
});
const words = [
  { w: "The", start: 0.0, end: 0.2, c0: 0, c1: 3 },
  { w: "model", start: 0.25, end: 0.5, c0: 4, c1: 9 },
  { w: "had", start: 0.5, end: 0.7, c0: 10, c1: 13 },
  { w: "started", start: 0.8, end: 1.2, c0: 14, c1: 21 },
  { w: "to", start: 1.2, end: 1.3, c0: 22, c1: 24 },
  { w: "refuse.", start: 1.3, end: 2.9, c0: 25, c1: 32 },
];
const audio: Record<string, LineAudio> = {
  [lineKey("b1", 0)]: { path: "l0.wav", duration: 2.0, words: null },
  [lineKey("b1", 1)]: { path: "l1.wav", duration: 3.0, words },
  [lineKey("b2", 0)]: { path: "l2.wav", duration: 1.5, words: null },
};

describe("timeline", () => {
  const tl = buildTimeline(project, narration, audio, { lang: "en", subtitleLangs: ["en"] });

  it("derives scene durations from measured speech, pauses, lead and hold", () => {
    // scene a: 0.5 lead + 2.0 + 0.3 gap + 3.0 + 1.0 hold = 6.8 s = 204 frames at 30 fps
    expect(tl.scenes[0]!.start).toBe(0);
    expect(tl.scenes[0]!.end).toBe(6.8);
    expect(tl.scenes[0]!.durationFrames).toBe(204);
    // scene b: 6.8 + 0.6 + 1.5 + 0.8 = 9.7 s; frames 204..291 -> 87
    expect(tl.scenes[1]!.start).toBe(6.8);
    expect(tl.scenes[1]!.end).toBe(9.7);
    expect(tl.scenes[1]!.startFrame).toBe(204);
    expect(tl.scenes[1]!.durationFrames).toBe(87);
    expect(tl.durationFrames).toBe(291);
    // frame counts tile the whole video with no gaps
    expect(tl.scenes.reduce((s, x) => s + x.durationFrames, 0)).toBe(tl.durationFrames);
  });

  it("resolves an inline cue to the aligned word start", () => {
    // line 2 starts at 0.5 + 2.0 + 0.3 = 2.8 s; 'started' begins 0.8 s into it -> 3.6 s = frame 108
    expect(tl.scenes[0]!.cues.refuse).toEqual({ t: 3.6, frame: 108 });
    expect(tl.scenes[0]!.cues["beat:b1"]!.t).toBe(0.5);
  });

  it("marks a cue as estimated when no alignment exists", () => {
    const noWords = { ...audio, [lineKey("b1", 1)]: { ...audio[lineKey("b1", 1)]!, words: null } };
    const t2 = buildTimeline(project, narration, noWords, { lang: "en", subtitleLangs: [] });
    // 14/32 of 3.0 s = 1.3125 s after 2.8 s = 4.1125 s
    expect(t2.scenes[0]!.cues.refuse!.estimated).toBe(true);
    expect(t2.scenes[0]!.cues.refuse!.t).toBeCloseTo(4.1125, 2);
  });

  it("honours an explicit pause on a beat's last line", () => {
    const n2 = NarrationSpec.parse({
      beats: [
        { id: "b1", lines: [{ en: "First line." }, { en: "The model had [[refuse]]started to refuse.", pause: 1.5 }] },
        { id: "b2", lines: [{ en: "Short." }] },
      ],
    });
    const t3 = buildTimeline(project, n2, audio, { lang: "en", subtitleLangs: [] });
    // scene a: 0.5 + 2.0 + 0.3 + 3.0 + 1.5 (pause) + 1.0 (hold) = 8.3 s
    expect(t3.scenes[0]!.end).toBe(8.3);
  });

  it("throws when audio is missing for a line", () => {
    expect(() => buildTimeline(project, narration, {}, { lang: "en", subtitleLangs: [] })).toThrow(/no audio/);
  });
});

describe("captions", () => {
  it("chunks long English sentences within two lines of 42 characters", () => {
    const s =
      "Before any training run, we froze the evaluation set and put it somewhere the training code could not reach.";
    const chunks = chunkText(s, "en");
    expect(chunks.join(" ")).toBe(s);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(84);
    for (const c of chunks) for (const l of wrapLines(c, "en").split("\n")) expect(l.length).toBeLessThanOrEqual(42);
  });

  it("times same-language captions from words and cross-language captions proportionally", () => {
    const line = {
      key: "b#0", beat: "b", index: 0, start: 10, end: 13, audio: "x.wav",
      text: "The model had started to refuse.", marks_en: [], text_en: "The model had started to refuse.", words,
    };
    const en = buildCaptions([line], "en", "en");
    expect(en).toHaveLength(1);
    expect(en[0]!.start).toBe(10); // first word at 0.0
    // English subtitles over a Japanese line span the Japanese line's real time
    const jaLine = { ...line, text: "モデルは拒否し始めた。", words: null };
    const sub = buildCaptions([jaLine], "en", "ja");
    expect(sub[0]!.start).toBe(10);
    expect(sub[0]!.end).toBe(13.25);
    expect(toSrt(sub)).toContain("00:00:10,000 --> 00:00:13,250");
  });
});

describe("ASS subtitles", () => {
  it("encodes colours as &HAABBGGRR with transparency", () => {
    expect(assColor("#16181D", 1)).toBe("&H001D1816");
    expect(assColor("#16181D", 0.75)).toBe("&H401D1816");
  });

  it("writes one dialogue per caption, centisecond times, \N line breaks", () => {
    const ass = toAss(
      [{ start: 61.234, end: 63.5, text: "The defect is the label,\nnot the {refusal}." }],
      { width: 1920, height: 1080, font: "IBM Plex Sans", size: 40, text: "#F3F0E8", box: "#16181D", boxOpacity: 0.75, marginV: 72, padding: 12 },
    );
    expect(ass).toContain("PlayResY: 1080");
    expect(ass).toContain("Style: Default,IBM Plex Sans,40,&H00E8F0F3,&H00E8F0F3,&H401D1816,&HFF1D1816,0,0,0,0,100,100,0,0,3,12,0,2,60,60,72,1");
    expect(ass).toContain("Dialogue: 0,0:01:01.23,0:01:03.50,Default,,0,0,0,,The defect is the label,\\Nnot the \\{refusal\\}.");
  });
});

describe("sound effects", () => {
  const tl = buildTimeline(project, narration, audio, { lang: "en", subtitleLangs: ["en"] });
  const sfx = (xs: unknown[]) => ProjectSpec.shape.audio.parse({ sfx: xs }).sfx;

  it("pins an effect to a scene cue in absolute film time", () => {
    // cue 'refuse' is 3.6 s into scene a (which starts at 0); beat b2 starts 0.6 s into scene b (6.8 s).
    const placed = placeSfx(tl, sfx([{ at: "a:refuse", sound: "tick", offset: -0.1 }, { at: "b:beat:b2", sound: "stamp", gain_db: -18 }]));
    expect(placed).toEqual([
      { at: "a:refuse", start: 3.5, gain_db: -24, sound: "tick" },
      { at: "b:beat:b2", start: 7.4, gain_db: -18, sound: "stamp" },
    ]);
  });

  it("rejects unknown cues and ambiguous sources", () => {
    expect(() => placeSfx(tl, sfx([{ at: "a:nope", sound: "tick" }]))).toThrow(/no cue 'nope'/);
    expect(() => sfx([{ at: "a:refuse", sound: "tick", path: "x.wav" }])).toThrow(/exactly one/);
  });

  it("puts an impact on every cut, not on the first scene's start", () => {
    // Scene b starts at 6.8 s (see above); scene a at 0 gets none.
    expect(cutHits(tl, -16)).toEqual([{ at: "cut:b", start: 6.8, gain_db: -16, sound: "impact" }]);
  });

  it("takes a music file or the procedural bed, never both or neither", () => {
    const music = (m: unknown) => ProjectSpec.shape.audio.parse({ music: m }).music;
    expect(music({ procedural: "pulse" })).toMatchObject({ procedural: "pulse", bpm: 96, gain_db: -24, duck_db: -10, cut_hits_db: null });
    expect(music({ path: "bed.wav", gain_db: -20 })).toMatchObject({ path: "bed.wav", gain_db: -20 });
    expect(() => music({ path: "bed.wav", procedural: "pulse" })).toThrow(/exactly one/);
    expect(() => music({ gain_db: -20 })).toThrow(/exactly one/);
  });
});

describe("question line", () => {
  const withQuestions = (qa: unknown, qb: unknown) =>
    ProjectSpec.parse({
      ...project,
      scenes: [
        { ...project.scenes[0]!, question: qa },
        { ...project.scenes[1]!, question: qb },
      ],
    });

  it("places a string at the scene start and a cued change at the cue's word", () => {
    const tl = buildTimeline(withQuestions([{ text: "Why?" }, { at: "refuse", text: "And then?" }], null), narration, audio, { lang: "en", subtitleLangs: [] });
    // scene a starts at 0; `refuse` is line 2's "started": 0.5 lead + 2.0 + 0.3 gap + 0.8 = 3.6 s. Scene b starts at 6.8 s and clears it.
    expect(tl.questions).toEqual([
      { t: 0, text: "Why?" },
      { t: 3.6, text: "And then?" },
      { t: 6.8, text: null },
    ]);
  });

  it("leaves the standing question alone when a scene says nothing", () => {
    const tl = buildTimeline(withQuestions("Why?", undefined), narration, audio, { lang: "en", subtitleLangs: [] });
    expect(tl.questions).toEqual([{ t: 0, text: "Why?" }]);
  });

  it("rejects a cue the scene doesn't have", () => {
    expect(() => buildTimeline(withQuestions([{ at: "nope", text: "?" }], undefined), narration, audio, { lang: "en", subtitleLangs: [] })).toThrow(/not a cue of this scene/);
  });
});
