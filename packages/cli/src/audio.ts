/**
 * `video audio <project>`: narration -> measured timeline.
 *
 * Per language: normalise each line, synthesise the ones not in the cache
 * (engine adapters in py/tts), trim + loudness-match, word-align against the
 * known spoken text, re-synthesise lines whose ASR round-trip is poor, then build
 * timeline.json, subtitles and narration.wav.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  buildPaths,
  buildTimeline,
  EnginesFile,
  LexiconFile,
  loadYaml,
  cachePaths,
  compileLexicon,
  hashFiles,
  hashOf,
  lineKey,
  missingNumbers,
  spokenFor,
  spokenToDisplay,
  toSrt,
  toVtt,
  type AlignedWord,
  type Lang,
  type LineAudio,
  type LoadedProject,
  type Normalized,
  parseProsody,
  type Prosody,
  type VoiceSpec,
} from "@vid/core";
import { fail, log } from "./log.ts";

type EngineDef = import("@vid/core").EngineDef;

export function loadEngines(root: string): Record<string, EngineDef> {
  return loadYaml(join(root, "py", "tts", "engines.yaml"), EnginesFile).engines;
}

/** Max character error rate of the ASR round-trip before a line is re-synthesised. */
const CER_LIMIT: Record<Lang, number> = { en: 0.12, ja: 0.18 };

interface LinePlan {
  key: string; // beat#index
  display: string;
  norm: Normalized;
  seed: number;
  /** Line-level tone (`tone:`); inline `{tone}` tags are in norm.tones. */
  tone?: string;
}

/**
 * What the engine is given for a line: the spoken text, directed by the line's tone
 * through the voice file. Instruction engines get the tone's text as `instruct`; inline
 * engines get it inserted into the text at each `{tone}` tag (or at the start, for a
 * line-level tone). The clean spoken text stays the reference for alignment and the
 * ASR checks, so a tag can never reach the captions or be mistaken for a word.
 */
export function directed(pl: Pick<LinePlan, "norm" | "tone">, voice: Pick<VoiceSpec, "tone_via" | "tones">): { text: string; instruct?: string; prosody?: Prosody; tones: string[] } {
  const { norm } = pl;
  if (voice.tone_via === "none") return { text: norm.spoken, tones: [] };
  if (voice.tone_via === "prosody") {
    const t = pl.tone ?? norm.tones[0]?.name;
    const prosody = t && voice.tones[t] ? parseProsody(voice.tones[t]!) : undefined;
    return { text: norm.spoken, ...(prosody && Object.keys(prosody).length ? { prosody } : {}), tones: t ? [t] : [] };
  }
  if (voice.tone_via === "instruct") {
    const t = pl.tone ?? norm.tones[0]?.name;
    const instruct = t ? voice.tones[t] || undefined : undefined;
    return { text: norm.spoken, ...(instruct ? { instruct } : {}), tones: t ? [t] : [] };
  }
  const marks = norm.tones.length ? norm.tones : pl.tone ? [{ name: pl.tone, at: 0 }] : [];
  let text = norm.spoken;
  for (const m of [...marks].sort((a, b) => b.at - a.at)) text = text.slice(0, m.at) + (voice.tones[m.name] ?? "") + text.slice(m.at);
  return { text, tones: marks.map((m) => m.name) };
}

export function vidmedia(root: string, kind: "prep" | "align" | "mix", job: unknown, jobPath: string): unknown {
  mkdirSync(dirname(jobPath), { recursive: true });
  writeFileSync(jobPath, JSON.stringify(job, null, 1));
  const r = spawnSync("uv", ["run", "--project", join(root, "py", "media"), "--extra", "cuda", "vidmedia", kind, jobPath], {
    stdio: ["ignore", "inherit", "pipe"],
    encoding: "utf8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8", HF_HUB_DISABLE_SYMLINKS_WARNING: "1" },
  });
  if (r.status !== 0) throw new Error(`vidmedia ${kind} failed:\n${(r.stderr ?? "").split("\n").filter((l) => !/Warning/.test(l)).slice(-20).join("\n")}`);
  return JSON.parse(readFileSync(jobPath.replace(/\.json$/, ".results.json"), "utf8"));
}

function runEngine(root: string, engineName: string, engine: EngineDef, voice: Record<string, unknown>, items: Array<{ id: string; text: string; instruct?: string; prosody?: Prosody; out: string; seed: number; lang: Lang }>, jobPath: string) {
  const python = join(root, engine.python);
  if (!existsSync(python)) fail(`TTS engine '${engineName}' is not installed.\nSet it up with:\n  ${engine.setup}`);
  writeFileSync(jobPath, JSON.stringify({ engine: engineName, device: "cuda", voice, items }, null, 1));
  log.step(`${engineName}: synthesising ${items.length} line(s)`);
  const r = spawnSync(python, [join(root, engine.runner), jobPath], {
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, PYTHONIOENCODING: "utf-8", HF_HUB_DISABLE_SYMLINKS_WARNING: "1" },
  });
  const results = JSON.parse(readFileSync(jobPath.replace(/\.json$/, ".results.json"), "utf8")) as {
    peak_vram_mb?: number;
    items: Array<{ id: string; ok: boolean; error?: string }>;
  };
  const failed = results.items.filter((i) => !i.ok);
  if (r.status !== 0 && failed.length === results.items.length) fail(`${engineName} produced no audio:\n${failed.map((f) => `  ${f.id}: ${f.error}`).join("\n")}`);
  for (const f of failed) log.warn(`${engineName}: ${f.id} failed: ${f.error}`);
  return results;
}

export async function buildAudio(p: LoadedProject, lang: Lang, opts: { force?: boolean; retries?: number } = {}) {
  const root = p.root;
  const variant = p.spec.languages[lang];
  const voice = p.voices[lang];
  if (!variant || !voice) fail(`${p.spec.id} has no '${lang}' variant`);
  if (voice.lang !== lang) fail(`voice '${voice.id}' is ${voice.lang}, but is used for ${lang}`);
  const engines = loadEngines(root);
  const engine = engines[voice.engine] ?? fail(`unknown TTS engine '${voice.engine}' (see py/tts/engines.yaml)`);
  if (!engine.langs.includes(lang)) fail(`engine '${voice.engine}' does not speak ${lang}`);

  const paths = buildPaths(root, p.spec.id, lang);
  const cache = cachePaths(root);
  const ttsDir = cache.tts(voice.engine);
  mkdirSync(ttsDir, { recursive: true });
  mkdirSync(join(paths.audioDir, "lines"), { recursive: true });
  // Fresh per run: job and result files from an earlier run must never read as this run's.
  const work = join(paths.audioDir, "jobs");
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });

  const lexFile = join(p.dir, "script", "lexicon.yaml");
  const projectLex = existsSync(lexFile) ? (loadYaml(lexFile, LexiconFile)[lang] ?? {}) : {};
  const lexicon = compileLexicon(lang, Object.entries(projectLex));
  const adapterVersion = hashFiles([join(root, engine.runner), join(root, "py", "tts", "_protocol.py")]);
  const baseSeed = Number(voice.params.seed ?? 0);

  // 1. Plan lines.
  const plans: LinePlan[] = [];
  for (const b of p.narration.beats) {
    b.lines.forEach((l, i) => {
      const display = lang === "en" ? l.en : l.ja;
      if (display === undefined) fail(`beat ${b.id} line ${i + 1} has no ${lang} text`);
      const say = lang === "en" ? l.say_en : l.say_ja;
      plans.push({ key: lineKey(b.id, i), display, norm: spokenFor(display, lang, say, lexicon), seed: baseSeed, ...(l.tone ? { tone: l.tone } : {}) });
    });
  }
  const direction = new Map(plans.map((pl) => [pl.key, directed(pl, voice)]));
  // A neutral line keeps its old key (and its cached audio); a directed one adds its direction.
  const ttsKey = (pl: LinePlan, seed: number) => {
    const d = direction.get(pl.key)!;
    if (d.text === pl.norm.spoken && !d.instruct && !d.prosody) return hashOf(voice.engine, adapterVersion, voice.params, pl.norm.spoken, seed);
    return d.prosody ? hashOf(voice.engine, adapterVersion, voice.params, d.text, d.prosody, seed) : hashOf(voice.engine, adapterVersion, voice.params, d.text, d.instruct ?? null, seed);
  };
  const wavFor = (pl: LinePlan, seed: number) => join(ttsDir, `${ttsKey(pl, seed)}.wav`);

  // 2. Synthesise, prep, align; retry poor lines with new seeds.
  const retries = opts.retries ?? 2;
  // A take is better when fewer of its numbers were misheard, then when its CER is lower.
  type Take = { seed: number; cer: number; missing: string[]; prepped: string; words: Array<{ w: string; start: number; end: number; s0: number; s1: number }>; duration: number };
  const better = (a: Take, b: Take | undefined) => !b || a.missing.length < b.missing.length || (a.missing.length === b.missing.length && a.cer < b.cer);
  const failing = (t: Take | undefined) => !t || t.cer > CER_LIMIT[lang] || t.missing.length > 0;
  const best = new Map<string, Take>();
  let todo = plans;
  for (let attempt = 0; attempt <= retries && todo.length; attempt++) {
    const seedOf = (pl: LinePlan) => pl.seed + attempt * 1009;
    const missing = todo.filter((pl) => opts.force || !existsSync(wavFor(pl, seedOf(pl))));
    if (missing.length) {
      runEngine(root, voice.engine, engine, voice.params, missing.map((pl) => {
        const d = direction.get(pl.key)!;
        return { id: pl.key, text: d.text, ...(d.instruct ? { instruct: d.instruct } : {}), ...(d.prosody ? { prosody: d.prosody } : {}), out: wavFor(pl, seedOf(pl)), seed: seedOf(pl), lang };
      }), join(work, `tts-${attempt}.json`));
    }
    const ready = todo.filter((pl) => existsSync(wavFor(pl, seedOf(pl))));
    const prepOut = (pl: LinePlan) => join(paths.audioDir, "takes", `${pl.key.replace("#", "_")}-s${seedOf(pl)}.wav`);
    const prep = vidmedia(root, "prep", { target_lufs: -19, tempo: voice.tempo, items: ready.map((pl) => ({ id: pl.key, src: wavFor(pl, seedOf(pl)), out: prepOut(pl) })) }, join(work, `prep-${attempt}.json`)) as Array<{ id: string; duration: number }>;
    const durations = new Map(prep.map((x) => [x.id, x.duration]));
    const align = vidmedia(root, "align", { lang, items: ready.map((pl) => ({ id: pl.key, wav: prepOut(pl), text: pl.norm.spoken })) }, join(work, `align-${attempt}.json`)) as Array<{ id: string; cer: number; hyp: string; words: Array<{ w: string; start: number; end: number; s0: number; s1: number }> }>;
    for (const a of align) {
      const pl = ready.find((x) => x.key === a.id)!;
      const take: Take = { seed: seedOf(pl), cer: a.cer, missing: missingNumbers(pl.norm, a.hyp, lang, lexicon), prepped: prepOut(pl), words: a.words, duration: durations.get(a.id)! };
      if (better(take, best.get(a.id))) best.set(a.id, take);
    }
    todo = todo.filter((pl) => failing(best.get(pl.key)));
    if (todo.length && attempt < retries) {
      const why = todo.map((pl) => `${pl.key}${best.get(pl.key)?.missing.length ? ` (heard wrong: ${best.get(pl.key)!.missing.join(", ")})` : ""}`);
      log.warn(`${lang}: ${todo.length} line(s) above CER ${CER_LIMIT[lang]} or with a misheard number; re-synthesising with new seeds: ${why.join(" · ")}`);
    }
  }

  // 3. Assemble LineAudio records in display coordinates.
  const audio: Record<string, LineAudio> = {};
  const qa: Array<{ key: string; cer: number; numbers_misheard: string[]; seed: number; display: string; spoken: string; tones?: string[]; sent?: string; instruct?: string; prosody?: Prosody }> = [];
  for (const pl of plans) {
    const b = best.get(pl.key) ?? fail(`no usable audio for ${pl.key}`);
    const finalWav = join(paths.audioDir, "lines", `${pl.key.replace("#", "_")}.wav`);
    copyFileSync(b.prepped, finalWav);
    const words: AlignedWord[] = b.words.map((w) => {
      const [c0, c1] = spokenToDisplay(pl.norm, w.s0, w.s1);
      return { w: w.w.trim(), start: w.start, end: w.end, c0, c1 };
    });
    audio[pl.key] = { path: relative(root, finalWav).replace(/\\/g, "/"), duration: b.duration, words };
    const d = direction.get(pl.key)!;
    qa.push({ key: pl.key, cer: b.cer, numbers_misheard: b.missing, seed: b.seed, display: pl.display, spoken: pl.norm.spoken, ...(d.tones.length ? { tones: d.tones, sent: d.text, ...(d.instruct ? { instruct: d.instruct } : {}), ...(d.prosody ? { prosody: d.prosody } : {}) } : {}) });
    if (b.cer > CER_LIMIT[lang]) log.warn(`${lang} ${pl.key}: CER ${b.cer.toFixed(3)} after retries; listen to ${relative(root, finalWav)}`);
    if (b.missing.length) log.warn(`${lang} ${pl.key}: the ASR still hears ${b.missing.join(", ")} wrong after retries; listen to ${relative(root, finalWav)} (a TTS misreading is a factual error)`);
  }
  writeFileSync(paths.lines, JSON.stringify(audio, null, 1));
  writeFileSync(join(paths.audioDir, "qa.json"), JSON.stringify({ engine: voice.engine, voice: voice.id, cerLimit: CER_LIMIT[lang], lines: qa }, null, 1));

  // 4. Timeline, subtitles, mix.
  const tl = buildTimeline(p.spec, p.narration, audio, { lang, subtitleLangs: variant.subtitles });
  writeFileSync(paths.timeline, JSON.stringify(tl, null, 1));
  for (const [sub, caps] of Object.entries(tl.captions)) {
    writeFileSync(paths.subtitles(sub as Lang, "srt"), toSrt(caps!));
    writeFileSync(paths.subtitles(sub as Lang, "vtt"), toVtt(caps!));
  }
  const mix = vidmedia(root, "mix", {
    duration: tl.duration,
    target_lufs: p.spec.audio.target_lufs,
    out: paths.narrationWav,
    items: tl.scenes.flatMap((s) => s.lines.map((l) => ({ wav: join(root, l.audio), start: l.start }))),
    // Sample-peak ceiling with headroom for AAC's inter-sample overs (delivery target: <= -1 dBTP).
    ceiling_dbfs: -2.0,
  }, join(work, "mix.json")) as { lufs_after: number; peak_dbfs: number };
  const meanCer = qa.reduce((s, x) => s + x.cer, 0) / qa.length;
  log.ok(`${lang}: ${plans.length} lines · ${tl.duration.toFixed(1)} s · mean CER ${meanCer.toFixed(3)} · ${mix.lufs_after} LUFS, peak ${mix.peak_dbfs} dBFS`);
  return tl;
}
