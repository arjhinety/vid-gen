/**
 * The cast pass: a project's presenter (spec.cast, a Live2D model) as one transparent track the
 * length of the film, laid over the picture at compose time.
 *
 * The track is built from the same timeline the scenes were cut to: every line's mouth timings
 * (packages/cast/live2d/narration.ts) at the line's start, each line's `tone` from the script as
 * a small expression, and the scenes' cues as moments she glances at the stage
 * (packages/cast/live2d/film.ts). The render is cached by content: model files, the cast code and
 * the track itself.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPaths, hashFiles, hashOf, lineKey, type Lang, type LoadedProject, type Timeline } from "@vid/core";
import { QUALITY, type Quality } from "@vid/render";
import { filmTrack, type FilmLine } from "../../cast/live2d/film.ts";
import { narrationTimings } from "../../cast/live2d/narration.ts";
import { listFiles } from "./commands.ts";
import { fail, log, progressBar } from "./log.ts";

const CAST_VERSION = "cast-1";
const here = (f: string) => join(dirname(fileURLToPath(import.meta.url)), f);

export interface CastResult {
  file: string;
  x: number;
  y: number;
  frames: number;
  reused: boolean;
  summary: Record<string, unknown>;
}

export async function renderCast(p: LoadedProject, lang: Lang, tl: Timeline, quality: Quality, opts: { force?: boolean } = {}): Promise<CastResult | null> {
  const cast = p.spec.cast;
  if (!cast) return null;
  const { root } = p;
  const work = join(buildPaths(root, p.spec.id, lang).base, "cast");
  mkdirSync(work, { recursive: true });

  // The script's direction for each line (tone), by line key.
  const tones = new Map<string, string | undefined>();
  for (const b of p.narration.beats) b.lines.forEach((l, i) => tones.set(lineKey(b.id, i), l.tone));

  const tlLines = tl.scenes.flatMap((s) => s.lines);
  const timings = narrationTimings(root, p.spec.id, lang, tlLines.map((l) => l.key), work);
  const lines: FilmLine[] = tlLines.map((l, i) => {
    const m = timings.lines.get(l.key)!;
    const next = tlLines[i + 1]?.start ?? tl.duration;
    return { key: l.key, start: l.start, end: l.end, tone: tones.get(l.key), pauseAfter: Math.max(0, next - l.end), phones: m.phones, quiet: m.quiet };
  });
  // Exhibit moments: every named cue (not the line anchors) and every cut.
  const cues = tl.scenes.flatMap((s) => [s.start + 0.4, ...Object.entries(s.cues).filter(([k]) => !k.startsWith("line:")).map(([, c]) => s.start + c.t)]);
  const { track, summary, heard, mouth, glances } = filmTrack({ fps: tl.fps, frames: tl.durationFrames, lines, cues, pace: cast.pace, seed: cast.seed });

  const scale = QUALITY[quality].scale;
  const box = { x: Math.round(cast.box.x * scale), y: Math.round(cast.box.y * scale), w: even(cast.box.w * scale), h: even(cast.box.h * scale) };
  if (cast.box.x + cast.box.w > tl.width || cast.box.y + cast.box.h > tl.height) fail(`cast.box ${JSON.stringify(cast.box)} leaves the ${tl.width}x${tl.height} frame`);
  const modelDir = dirname(join(root, cast.model));
  const castCode = [...listFiles(join(root, "packages", "cast", "live2d")), join(root, "packages", "cast", "tools", "live2d-render.ts"), join(root, "packages", "player", "live2d.html"), here("cast.ts")];
  const key = hashOf(CAST_VERSION, quality, box, cast.fit, tl.fps, hashFiles([...listFiles(modelDir, [".json", ".moc3", ".png"]), ...castCode]), hashOf(track));
  const out = join(work, `cast.${quality}.webm`);
  const keyFile = `${out}.key`;
  writeFileSync(join(work, "track.json"), JSON.stringify({ summary, glances: glances.map((g) => +g.toFixed(2)), phones: heard, mouth }, null, 1));

  const reused = !opts.force && existsSync(out) && existsSync(keyFile) && readFileSync(keyFile, "utf8") === key;
  if (reused) {
    log.step(`cast: reused ${relative(root, out)}`);
  } else {
    const { renderTrack } = await import("../../cast/tools/live2d-render.ts");
    const bar = progressBar(`  cast ${lang}`);
    const t0 = performance.now();
    await renderTrack(root, cast.model, track, out, { fps: tl.fps, width: box.w, height: box.h, fit: cast.fit, alpha: true, port: 5197, onFrame: bar });
    writeFileSync(keyFile, key);
    log.step(`cast: ${track.length} frames in ${((performance.now() - t0) / 1000).toFixed(0)} s → ${relative(root, out)}`);
  }
  return { file: out, x: box.x, y: box.y, frames: track.length, reused, summary };
}

/** x264/yuv420 need even sizes. */
const even = (v: number) => 2 * Math.round(v / 2);
