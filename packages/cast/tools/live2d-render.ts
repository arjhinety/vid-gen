/**
 * Render a Live2D parameter track to video (shared by live2d-clip.ts, live2d-say.ts and the film's
 * cast track, packages/cli/src/cast.ts).
 *
 * Physics (hair sway) is baked in one sequential pass over the track, then every frame is drawn
 * from track + baked physics, so any frame could be rendered alone. By default frames are
 * composited over the sheet colour and encoded as H.264 MP4; with `audio`, that WAV is muxed in
 * (AAC) and the video keeps the track's length. With `alpha`, frames keep their transparency and
 * are encoded as VP9 with an alpha plane (WebM, BT.709 limited range, a few MB for a whole film;
 * read it back with `-c:v libvpx-vp9` before `-i`, or FFmpeg's native decoder drops the alpha).
 */
import type {} from "../live2d/api.ts"; // window.__l2d
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { chromium } from "playwright";
import { startPlayerServer } from "../../player/server.ts";

export interface RenderOptions {
  fps: number;
  width?: number;
  height?: number;
  audio?: string; // absolute path of a WAV to mux in
  port?: number;
  /** Where the model sits in the canvas (stage.ts draw): height share, centre in view units. */
  fit?: { height: number; x: number; y: number };
  /** Transparent VP9 WebM instead of an MP4 over the sheet colour (no audio). */
  alpha?: boolean;
  onFrame?: (done: number, total: number) => void;
  /** Browser instances drawing in parallel (default 3). */
  browsers?: number;
}

/** VP9 + alpha, tagged BT.709 limited range like the scenes, so an overlay in YUV needs no matrix change. */
const ALPHA_FILTER = "scale=out_color_matrix=bt709:out_range=tv,format=yuva420p";
const ALPHA_CODEC = [
  "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-crf", "16", "-b:v", "0", "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1", "-auto-alt-ref", "0",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
];

/** Renders `track` to `out`; returns the drawing time (s), browser start-up excluded. */
export async function renderTrack(root: string, model: string, track: Array<Record<string, number>>, out: string, o: RenderOptions): Promise<{ frames: number; seconds: number }> {
  const W = o.width ?? 720;
  const H = o.height ?? 1080;
  const { fps } = o;
  const n = track.length;
  const K = Math.max(1, Math.min(o.browsers ?? 3, n));
  mkdirSync(dirname(out), { recursive: true });
  const rel = relative(root, join(root, model)).replace(/\\/g, "/");
  const { server, url } = await startPlayerServer(root, { quiet: true, port: o.port ?? 5196 });
  // Frames arrive as WebGL's own buffer: bottom row first, premultiplied alpha.
  const raw = ["-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${W}x${H}`, "-framerate", String(fps), "-i", "-"];
  const straight = "[0:v]vflip,format=gbrap,unpremultiply=inplace=1";
  const video = ["-filter_complex", `${straight}[fg];[1:v][fg]overlay=shortest=1,format=yuv420p`, "-c:v", "libx264", "-crf", "18", "-preset", "medium"];
  const sheet = ["-f", "lavfi", "-i", `color=c=0xEFEFEC:s=${W}x${H}:r=${fps}`];
  const args = o.alpha
    ? ["-y", "-v", "error", ...raw, "-filter_complex", `${straight},${ALPHA_FILTER}[v]`, "-map", "[v]", ...ALPHA_CODEC, "-an", out]
    : o.audio
    ? ["-y", "-v", "error", ...raw, ...sheet, "-i", o.audio, ...video, "-map", "2:a", "-c:a", "aac", "-b:a", "192k", "-t", (n / fps).toFixed(3), out]
    : ["-y", "-v", "error", ...raw, ...sheet, ...video, out];
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  const exit = new Promise<number | null>((res) => ff.on("close", res));
  let seconds = 0;
  // Several browsers (each its own GPU process) draw interleaved frames; every frame is a pure
  // function of track + baked physics, so the order they are drawn in does not matter.
  const browsers = await Promise.all(Array.from({ length: K }, () => chromium.launch({ args: ["--disable-lcd-text", "--force-color-profile=srgb", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] })));
  try {
    const pages = await Promise.all(browsers.map(async (b) => {
      const page = await b.newPage({ viewport: { width: W, height: H } });
      await page.goto(`${url.replace(/\/$/, "")}/live2d.html?model=${encodeURIComponent(rel)}&w=${W}&h=${H}`, { waitUntil: "load" });
      await page.waitForFunction(() => window.__l2d !== undefined, null, { timeout: 60_000 });
      await page.evaluate(() => window.__l2d!.ready);
      return page;
    }));
    const physics = await pages[0]!.evaluate(([tr, f]) => window.__l2d!.bake(tr, f), [track, fps] as const);
    const fit = o.fit ?? { height: 0.94, x: 0, y: -0.02 };
    const frameAt = (f: number) => pages[f % K]!.evaluate(([v, ft]) => window.__l2d!.frame(v, ft), [{ ...track[f], ...physics[f] }, fit] as const);
    const t0 = Date.now();
    for (let f = 0; f < n; f += K) {
      const batch = await Promise.all(Array.from({ length: Math.min(K, n - f) }, (_, k) => frameAt(f + k)));
      for (const b64 of batch) {
        const buf = Buffer.from(b64, "base64");
        if (buf.length !== W * H * 4) throw new Error(`frame of ${buf.length} bytes, expected ${W * H * 4}`);
        if (!ff.stdin.write(buf)) await new Promise((res) => ff.stdin.once("drain", res));
      }
      o.onFrame?.(Math.min(n, f + K), n);
    }
    seconds = (Date.now() - t0) / 1000;
    console.log(`${n} frames in ${seconds.toFixed(1)} s (${K} browser${K > 1 ? "s" : ""})`);
  } finally {
    ff.stdin.end();
    await exit;
    await Promise.all(browsers.map((b) => b.close()));
    await server.close();
  }
  const code = await exit;
  if (code !== 0) throw new Error(`ffmpeg exited with ${code} writing ${out}`);
  return { frames: n, seconds };
}
