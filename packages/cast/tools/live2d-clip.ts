/**
 * Render a short test clip of a Live2D model "talking": tsx packages/cast/tools/live2d-clip.ts <model3.json> <out.mp4> [--seconds 8] [--fps 30] [--pace standard|calm]
 *
 * No audio: the talking is three made-up phrases. The parameter track is a pure function of the
 * frame (breathing, sway, a seeded blink schedule, a lip flap of drawn mouth shapes in phrases,
 * nods). For a character speaking real narration, see live2d-say.ts.
 */
import { join } from "node:path";
import { findRepoRoot } from "@vid/core";
import { LOOPS, MOUTH, mulberry } from "../live2d/lipsync.ts";
import { blinkFrames, bodyParams } from "../live2d/motion.ts";
import { renderTrack } from "./live2d-render.ts";

const args = process.argv.slice(2);
const opt = (k: string, d: number) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? Number(args[i + 1]) : d;
};
const [model, outArg] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!model || !outArg) throw new Error("usage: live2d-clip.ts <model3.json> <out.mp4> [--seconds 8] [--fps 30] [--pace standard|calm]");
const root = findRepoRoot();
const out = join(root, outArg);
const fps = opt("fps", 30);
const n = Math.round(opt("seconds", 8) * fps);

// ---- deterministic track ------------------------------------------------------------------
const r = mulberry(7);
const blinks = blinkFrames(r, n, fps);
// phrases: talk 0.4-2.6 s, pause, talk 3.4-5.9 s, pause, talk 6.5-7.6 s
const phrases: Array<[number, number]> = [[0.4, 2.6], [3.4, 5.9], [6.5, 7.6]];

// Lip flap without words: the loop of lipsync.ts (open -> half -> open -> closed, holds of 4-7
// frames) with a random open shape, since there are no vowels to choose it.
const pace = args.includes("--pace") ? args[args.indexOf("--pace") + 1]! : "standard";
if (!(pace in LOOPS)) throw new Error(`--pace must be one of ${Object.keys(LOOPS).join(", ")}`);
const loop = LOOPS[pace as keyof typeof LOOPS];
const MIN_OPEN = 4; // frames; shorter drawings read as flicker
const MIN_CLOSED = 2;
const TAIL = 2; // the last open drawing stays this many frames into the silence
const mouth = new Array<number>(n).fill(MOUTH.closed);
for (const [a, b] of phrases) {
  const end = Math.min(n, Math.round(b * fps));
  let f = Math.round(a * fps);
  for (let step = 0; f < end; step++) {
    const k = step % 4;
    const shape = k === 1 ? MOUTH.small : k === 3 ? MOUTH.closed : r() < 0.68 ? MOUTH.ah : MOUTH.oh;
    const hold = k === 3 ? loop[3] : Math.max(MIN_OPEN, loop[k]! + [-1, 0, 0, 1][Math.floor(r() * 4)]!);
    mouth.fill(shape, f, Math.min(end, f + hold));
    f += hold;
  }
  if (mouth[end - 1] !== MOUTH.closed) mouth.fill(mouth[end - 1]!, end, Math.min(n, end + TAIL));
}
// a drawing cut short by a phrase end joins the drawing before it
for (let i = 0; i < n; ) {
  let j = i;
  while (j < n && mouth[j] === mouth[i]) j++;
  if (i > 0 && j - i < (mouth[i] === MOUTH.closed ? MIN_CLOSED : MIN_OPEN) && j < n && mouth[j] === MOUTH.closed) mouth.fill(mouth[i - 1]!, i, j);
  i = j;
}

// Nods: one as each phrase starts, then now and then within it (no stressed syllables to pick).
const nods: number[] = [];
for (const [a, b] of phrases) {
  nods.push(a - 6 / fps);
  for (let t = a + 1.1 + r() * 0.4; t < b - 0.5; t += 1.1 + r() * 0.4) if (r() < 0.6) nods.push(t - 6 / fps);
}

const track = Array.from({ length: n }, (_, f) => ({ ...bodyParams(f, fps, blinks, phrases, nods), ParamMouthShape: mouth[f]! }));
{
  let changes = 0;
  for (let f = 1; f < n; f++) if (mouth[f] !== mouth[f - 1]) changes++;
  const talkFrames = phrases.reduce((s, [a, b]) => s + Math.round(b * fps) - Math.round(a * fps), 0);
  console.log(`mouth: ${changes} changes over ${(talkFrames / fps).toFixed(1)} s of talk (${(changes / (talkFrames / fps)).toFixed(1)}/s), loop ${loop.join("-")}; nods at ${nods.map((x) => x.toFixed(2)).join(", ")} s`);
}

await renderTrack(root, model, track, out, { fps });
console.log(`blinks at frames ${blinks.join(", ")}`);
console.log(out);
