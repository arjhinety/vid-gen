/** Thin, explicit FFmpeg helpers. Every invocation is logged on failure with its full argv. */
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";

export class FfmpegError extends Error {
  constructor(
    public args: string[],
    public stderr: string,
  ) {
    super(`ffmpeg failed: ffmpeg ${args.join(" ")}\n${stderr.split("\n").slice(-15).join("\n")}`);
  }
}

export function ffmpegSync(args: string[]): void {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { encoding: "utf8", maxBuffer: 64 * 2 ** 20 });
  if (r.status !== 0) throw new FfmpegError(args, r.stderr ?? "");
}

export function ffprobeJson(file: string): { streams: Array<Record<string, unknown>>; format: Record<string, unknown> } {
  const r = spawnSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffprobe failed on ${file}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

/** Video encode settings. Intermediate scene files are high quality; the final pass re-encodes. */
export const QUALITY = {
  draft: { scale: 0.5, crf: 26, preset: "veryfast", jpegQuality: 80 },
  final: { scale: 1, crf: 14, preset: "medium", jpegQuality: 95 },
} as const;
export type Quality = keyof typeof QUALITY;

/** sRGB screenshots -> BT.709 limited-range yuv420p, tagged correctly so players don't shift colours. */
export const COLOR_ARGS = [
  "-vf",
  "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
  "-color_primaries", "bt709",
  "-color_trc", "bt709",
  "-colorspace", "bt709",
  "-color_range", "tv",
];

/** Spawn an encoder that reads JPEG/PNG frames from stdin. */
export function frameEncoder(out: string, fps: number, q: Quality): { proc: ChildProcessWithoutNullStreams; done: Promise<void> } {
  const { crf, preset } = QUALITY[q];
  const args = [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "image2pipe", "-framerate", String(fps), "-i", "-",
    ...COLOR_ARGS,
    "-c:v", "libx264", "-preset", preset, "-crf", String(crf),
    "-g", String(fps * 2), "-bf", "2", "-movflags", "+faststart",
    out,
  ];
  const proc = spawn("ffmpeg", args, { stdio: ["pipe", "pipe", "pipe"] });
  let stderr = "";
  proc.stderr.on("data", (d) => (stderr += String(d)));
  const done = new Promise<void>((resolve, reject) => {
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new FfmpegError(args, stderr))));
  });
  return { proc, done };
}

export async function writeFrame(proc: ChildProcessWithoutNullStreams, buf: Buffer): Promise<void> {
  if (!proc.stdin.write(buf)) await new Promise<void>((r) => proc.stdin.once("drain", () => r()));
}
