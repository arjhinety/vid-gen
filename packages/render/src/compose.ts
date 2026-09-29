/**
 * Final assembly: concatenate the rendered scenes, burn or attach subtitles, mux the
 * mixed audio, and verify what came out. Scene files are mezzanine-quality
 * intermediates; this is the one lossy delivery encode.
 */
import { spawn, spawnSync } from "node:child_process";
import { FfmpegError, type Quality } from "./ffmpeg.ts";

/** Delivery encode. `tune animation` suits flat paper + hairline content; aq-mode 3 resists banding in the lamp gradient. */
export const DELIVERY = {
  draft: { crf: 24, preset: "veryfast" },
  final: { crf: 17, preset: "slow" },
} as const;

export interface ComposeInput {
  /** Scene videos in film order (same size, fps and pixel format). */
  scenes: string[];
  /** Mixed audio covering the whole timeline, or null for a silent draft. */
  audio: string | null;
  /** SRT files attached as selectable mov_text tracks. */
  softSubs: { path: string; lang: string }[];
  /** ASS file burned into the picture. Paths are relative to `cwd` (libass filter args cannot take drive colons). */
  burn: { ass: string; fontsDir: string } | null;
  fps: number;
  durationFrames: number;
  quality: Quality;
  out: string;
  title?: string;
  /** A transparent track (the cast) laid over the picture at (x, y) before any burn-in; `inputArgs` go before its `-i`. */
  overlay?: { path: string; x: number; y: number; inputArgs?: string[] };
}

const ISO639_2: Record<string, string> = { en: "eng", ja: "jpn" };

export function composeArgs(i: ComposeInput): string[] {
  if (!i.scenes.length) throw new Error("nothing to compose: no scenes");
  const n = i.scenes.length;
  const args: string[] = [];
  for (const s of i.scenes) args.push("-i", s);
  const audioIdx = i.audio ? n : -1;
  if (i.audio) args.push("-i", i.audio);
  const subBase = n + (i.audio ? 1 : 0);
  for (const s of i.softSubs) args.push("-i", s.path);
  const overlayIdx = i.overlay ? subBase + i.softSubs.length : -1;
  if (i.overlay) args.push(...(i.overlay.inputArgs ?? []), "-i", i.overlay.path);

  const cat = `${i.scenes.map((_, k) => `[${k}:v]`).join("")}concat=n=${n}:v=1:a=0,setsar=1`;
  // Both sides are BT.709 limited-range YUV, so the blend happens in YUV with no matrix change.
  const over = i.overlay ? `[bg];[${overlayIdx}:v]format=yuva420p[fg];[bg][fg]overlay=x=${i.overlay.x}:y=${i.overlay.y}:format=yuv420:eof_action=pass` : "";
  const burn = i.burn ? `,subtitles=filename=${i.burn.ass}:fontsdir=${i.burn.fontsDir}` : "";
  args.push("-filter_complex", `${cat}${over}${burn}[v]`, "-map", "[v]");
  if (audioIdx >= 0) args.push("-map", `${audioIdx}:a:0`);
  i.softSubs.forEach((_, k) => args.push("-map", `${subBase + k}:s:0`));

  const { crf, preset } = DELIVERY[i.quality];
  args.push(
    "-c:v", "libx264", "-preset", preset, "-crf", String(crf), "-tune", "animation", "-x264-params", "aq-mode=3",
    "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
    "-g", String(i.fps * 2), "-bf", "2",
    "-frames:v", String(i.durationFrames),
  );
  if (audioIdx >= 0) args.push("-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", (i.durationFrames / i.fps).toFixed(3));
  if (i.softSubs.length) args.push("-c:s", "mov_text");
  i.softSubs.forEach((s, k) => args.push(`-metadata:s:s:${k}`, `language=${ISO639_2[s.lang] ?? s.lang}`));
  if (i.title) args.push("-metadata", `title=${i.title}`);
  args.push("-movflags", "+faststart", i.out);
  return args;
}

/** Run ffmpeg with progress callbacks (frames written). */
export function ffmpegRun(args: string[], opts: { cwd?: string; onFrame?: (frame: number) => void } = {}): Promise<void> {
  const full = ["-hide_banner", "-loglevel", "error", "-y", "-nostats", "-progress", "pipe:1", ...args];
  return new Promise((resolve, reject) => {
    const p = spawn("ffmpeg", full, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    let buf = "";
    p.stderr.on("data", (d) => (err += String(d)));
    p.stdout.on("data", (d) => {
      buf += String(d);
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) if (l.startsWith("frame=")) opts.onFrame?.(Number(l.slice(6)));
    });
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve() : reject(new FfmpegError(args, err))));
  });
}

export interface Loudness {
  integrated: number;
  truePeak: number;
}

/** EBU R128 integrated loudness and true peak of a file's first audio stream. */
export function measureLoudness(file: string): Loudness {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-map", "0:a:0", "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 64 * 2 ** 20 });
  if (r.status !== 0) throw new Error(`loudness measurement failed on ${file}: ${r.stderr.slice(-800)}`);
  const summary = r.stderr.slice(r.stderr.lastIndexOf("Summary:"));
  const i = /I:\s+(-?[\d.]+|-inf) LUFS/.exec(summary);
  const tp = /True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(summary);
  if (!i || !tp) throw new Error(`could not parse ebur128 summary for ${file}`);
  const num = (s: string) => (s === "-inf" ? -Infinity : Number(s));
  return { integrated: num(i[1]!), truePeak: num(tp[1]!) };
}
