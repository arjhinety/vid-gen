/**
 * Manim scene renderer. Writes the scene's timing (cues, exact duration) as JSON, runs
 * Manim in its own environment (py/manim) with a transparent background, and normalises
 * the output to the exact frame count (alpha kept). `compositeOverlay` then lays it over
 * the web-rendered sheet (grid, breadcrumb, headline), so manim scenes share the chrome.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Lang, Timeline } from "@vid/core";
import { COLOR_ARGS, ffmpegSync, ffprobeJson, QUALITY, type Quality } from "@vid/render";
import { fail, log } from "./log.ts";

/** Frames Manim may be off by before we treat it as a timing bug rather than rounding. */
const MAX_FRAME_DRIFT = 3;

export async function renderManimScene(root: string, project: string, lang: Lang, tl: Timeline, sceneId: string, quality: Quality, out: string) {
  const scene = tl.scenes.find((s) => s.id === sceneId)!;
  const [file, cls] = scene.entry.split(":") as [string, string];
  const src = join(root, "projects", project, file);
  if (!existsSync(src)) fail(`manim scene file not found: ${src}`);
  mkdirSync(dirname(out), { recursive: true });
  const timingPath = out.replace(/\.(mp4|mov)$/, ".timing.json");
  writeFileSync(timingPath, JSON.stringify({ fps: tl.fps, durationFrames: scene.durationFrames, cues: scene.cues, lang, width: tl.width, height: tl.height }, null, 1));

  const scale = QUALITY[quality].scale;
  const w = Math.round(tl.width * scale);
  const h = Math.round(tl.height * scale);
  const media = join(dirname(out), `.manim-${sceneId}-${process.pid}`);
  const t0 = performance.now();
  const r = spawnSync(
    "uv",
    ["run", "--project", join(root, "py", "manim"), "manim", "render", src, cls, "--transparent", "--format", "mov", "--fps", String(tl.fps), "-r", `${w},${h}`, "--media_dir", media, "--disable_caching", "--progress_bar", "none", "-v", "WARNING"],
    { encoding: "utf8", env: { ...process.env, VID_SCENE_JSON: timingPath, VID_TRANSPARENT: "1", PYTHONIOENCODING: "utf-8" }, cwd: dirname(src), maxBuffer: 64 * 2 ** 20 },
  );
  if (r.status !== 0) {
    const tail = `${r.stdout}\n${r.stderr}`.split("\n").filter((l) => l.trim() && !/SyntaxWarning|re\.match/.test(l)).slice(-25).join("\n");
    rmSync(media, { recursive: true, force: true });
    fail(`manim failed for ${sceneId}:\n${tail}`);
  }
  const rendered = findMp4(media, `${cls}.mov`) ?? fail(`manim produced no ${cls}.mov for ${sceneId} (looked in ${media})`);
  const got = Number(ffprobeJson(rendered).streams.find((s) => s.codec_type === "video")?.nb_frames ?? 0);
  const want = scene.durationFrames;
  if (Math.abs(got - want) > MAX_FRAME_DRIFT) {
    log.warn(`${sceneId}: manim rendered ${got} frames, timeline wants ${want}; the scene's waits do not match its cues`);
  }
  // Pad (clone last frame) or trim to the exact frame count, keeping the alpha channel.
  ffmpegSync(["-i", rendered, "-vf", `tpad=stop_mode=clone:stop=${Math.max(0, want - got) + 2},format=argb`, "-frames:v", String(want), "-c:v", "qtrle", "-an", out]);
  rmSync(media, { recursive: true, force: true });
  log.step(`${sceneId}: manim ${got} → ${want} frames in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}

/** Lay the transparent manim render over the sheet underlay (in RGB, so no matrix shift) and encode like web scenes. */
export function compositeOverlay(underlay: string, overlay: string, out: string, frames: number, fps: number, quality: Quality) {
  const { crf, preset } = QUALITY[quality];
  ffmpegSync([
    "-i", underlay,
    "-i", overlay,
    "-filter_complex",
    "[0:v]scale=in_color_matrix=bt709:in_range=tv,format=gbrp[bg];[1:v]format=gbrap[fg];[bg][fg]overlay=format=gbrp:eof_action=repeat,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[v]",
    "-map", "[v]",
    "-frames:v", String(frames),
    ...COLOR_ARGS.slice(2),
    "-c:v", "libx264", "-preset", preset, "-crf", String(crf), "-g", String(fps * 2), "-movflags", "+faststart", "-an",
    out,
  ]);
}

/** Manim's combined movie; never a clip from partial_movie_files (NTFS lists that dir first). */
function findMp4(dir: string, name: string): string | null {
  if (!existsSync(dir)) return null;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "partial_movie_files") continue;
      const f = findMp4(p, name);
      if (f) return f;
    } else if (e === name) return p;
  }
  return null;
}
