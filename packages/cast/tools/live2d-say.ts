/**
 * Render a Live2D character speaking a project's narration lines, lip-synced from the TTS
 * engine's own phoneme timings:
 *
 *   tsx packages/cast/tools/live2d-say.ts <model3.json> <out.mp4> --project <id> [--lang en]
 *       [--lines b01#0..b02#0 | --lines b01#0,b01#1] [--gap 0.7] [--pace standard|calm]
 *
 * The timings (Kokoro's re-predicted phoneme durations, verified against each WAV, with the
 * measured onset and quiet-stretch corrections) come from ../live2d/narration.ts; here the lines
 * are placed one after another with `gap` seconds between them.
 */
import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { findRepoRoot } from "@vid/core";
import { type Phone, mouthTrack, mulberry, speechRuns, stressTimes } from "../live2d/lipsync.ts";
import { blinkFrames, bodyParams, nodsForSpeech } from "../live2d/motion.ts";
import { heardPhones, lineIds, narrationTimings, ONSET_S } from "../live2d/narration.ts";
import { renderTrack } from "./live2d-render.ts";

const LEAD_IN_S = 0.6;
const TAIL_S = 1.0;

const args = process.argv.slice(2);
const flag = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : undefined);
const [model, outArg] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const project = flag("project");
if (!model || !outArg || !project) throw new Error("usage: live2d-say.ts <model3.json> <out.mp4> --project <id> [--lang en] [--lines a..b | a,b] [--gap 0.7] [--pace standard|calm]");
const lang = flag("lang") ?? "en";
const gap = Number(flag("gap") ?? 0.7);
const pace = (flag("pace") ?? "standard") as "standard" | "calm";
const fps = 30;
const root = findRepoRoot();
const out = join(root, outArg);
const work = join(dirname(out), basename(out).replace(/\.mp4$/, ""));

// ---- the project's lines and their timings ------------------------------------------------
const keys = lineIds(root, project, lang);
const sel = flag("lines") ?? `${keys[0]}..${keys[Math.min(4, keys.length - 1)]}`;
const ids = sel.includes("..") ? keys.slice(keys.indexOf(sel.split("..")[0]!), keys.indexOf(sel.split("..")[1]!) + 1) : sel.split(",");
const { lines, tempo } = narrationTimings(root, project, lang, ids, work);

// ---- place the lines one after another ----------------------------------------------------
const phones: Phone[] = [];
const quiet: Array<[number, number]> = [];
const placed: Array<{ id: string; start: number; duration: number; wav: string }> = [];
let t = LEAD_IN_S;
for (const id of ids) {
  const line = lines.get(id)!;
  for (const [a, b, p] of line.phones) phones.push([t + a, t + b, p]);
  for (const [a, b] of line.quiet) quiet.push([t + a, t + b]);
  placed.push({ id, start: t, duration: line.duration, wav: line.wav });
  t += line.duration + gap;
}
const total = t - gap + TAIL_S;
const n = Math.round(total * fps);

// audio: the prepared lines at their places
const audio = join(work, "narration.wav");
const ff = spawnSync("ffmpeg", ["-y", "-v", "error", ...placed.flatMap((p) => ["-i", p.wav]), "-filter_complex",
  `${placed.map((p, i) => `[${i}]adelay=delays=${Math.round(p.start * 1000)}:all=1[a${i}]`).join(";")};${placed.map((_, i) => `[a${i}]`).join("")}amix=inputs=${placed.length}:normalize=0:duration=longest,apad=whole_dur=${total.toFixed(3)}[out]`,
  "-map", "[out]", "-ar", "48000", "-ac", "1", audio], { stdio: ["ignore", "inherit", "inherit"] });
if (ff.status !== 0) throw new Error("ffmpeg could not place the narration");

// ---- track -------------------------------------------------------------------------------
const heard = heardPhones(phones, quiet);
const mouth = mouthTrack(heard, n, { fps, pace, seed: 7 });
const runs = speechRuns(heard);
const nods = nodsForSpeech(runs, stressTimes(heard), fps);
const blinks = blinkFrames(mulberry(11), n, fps);
const track = Array.from({ length: n }, (_, f) => ({ ...bodyParams(f, fps, blinks, runs, nods), ParamMouthShape: mouth[f]! }));

let changes = 0, single = 0;
const talkFrames = runs.reduce((s, [a, b]) => s + (b - a) * fps, 0);
for (let f = 1; f < n; f++) if (mouth[f] !== mouth[f - 1]) changes++;
for (let f = 0, g = 0; f < n; f = g) { g = f; while (g < n && mouth[g] === mouth[f]) g++; if (g - f === 1) single++; }
const summary = { lines: placed, seconds: +total.toFixed(2), frames: n, onset_correction_s: ONSET_S, tempo, pace,
  mouth_changes_per_talk_s: +(changes / (talkFrames / fps)).toFixed(2), single_frame_drawings: single,
  shares: [0, 1, 2, 3].map((k) => +(mouth.filter((m) => m === k).length / n).toFixed(3)), nods: nods.map((x) => +x.toFixed(2)), quiet_stretches: quiet.length };
writeFileSync(join(work, "track.json"), JSON.stringify({ summary, phones: heard, mouth }, null, 1));
console.log(JSON.stringify(summary));

await renderTrack(root, model, track, out, { fps, audio, port: 5198 });
console.log(out);
if (!existsSync(out)) throw new Error("no video written");
