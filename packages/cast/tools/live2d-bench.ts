/**
 * Measure how fast this machine renders a Live2D model, and check that the fast capture path
 * gives the same pixels as a page screenshot (docs/cast.md, "Rendering speed"):
 *
 *   tsx packages/cast/tools/live2d-bench.ts <model3.json> [--size 520x864] [--frames 90] [--browsers 1,3]
 *
 * 1. Capture, one page: `locator.screenshot()` (PNG through the compositor) against `__l2d.frame()`
 *    (gl.readPixels, raw RGBA), frames per second each, and the largest pixel difference between
 *    the two for the same pose after un-premultiplying.
 * 2. End to end: renderTrack() with `alpha` (VP9 + alpha WebM) on an idle track, for each browser
 *    count, frames per second once the browsers are up. Numbers vary with machine load; run it twice.
 */
import type {} from "../live2d/api.ts"; // window.__l2d
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { findRepoRoot } from "@vid/core";
import { startPlayerServer } from "../../player/server.ts";
import { mulberry } from "../live2d/lipsync.ts";
import { blinkFrames, bodyParams } from "../live2d/motion.ts";
import { renderTrack } from "./live2d-render.ts";

const args = process.argv.slice(2);
const flag = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : undefined);
const model = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!model) throw new Error("usage: live2d-bench.ts <model3.json> [--size 520x864] [--frames 90] [--browsers 1,3]");
const [W, H] = (flag("size") ?? "520x864").split("x").map(Number) as [number, number];
const N = Number(flag("frames") ?? 90);
const counts = (flag("browsers") ?? "1,3").split(",").map(Number);
const root = findRepoRoot();
const fps = 30;
const fit = { height: 0.78, x: 0, y: -0.05 };
const pose = (f: number) => bodyParams(f, fps, [], [], []);

// ---- 1. capture methods, one page ---------------------------------------------------------
const { server, url } = await startPlayerServer(root, { quiet: true, port: 5195 });
const browser = await chromium.launch({ args: ["--disable-lcd-text", "--force-color-profile=srgb", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(`${url.replace(/\/$/, "")}/live2d.html?model=${encodeURIComponent(model)}&w=${W}&h=${H}`, { waitUntil: "load" });
await page.waitForFunction(() => window.__l2d !== undefined, null, { timeout: 60_000 });
await page.evaluate(() => window.__l2d!.ready);
const renderer = await page.evaluate(() => {
  const gl = document.querySelector("canvas")!.getContext("webgl");
  const d = gl?.getExtension("WEBGL_debug_renderer_info");
  return d ? String(gl!.getParameter(d.UNMASKED_RENDERER_WEBGL)) : "unknown";
});
let t0 = Date.now();
for (let f = 0; f < N; f++) {
  await page.evaluate(([v, ft]) => window.__l2d!.draw(v, ft), [pose(f), fit] as const);
  await page.locator("canvas").screenshot({ omitBackground: true, type: "png" });
}
const shotFps = N / ((Date.now() - t0) / 1000);
t0 = Date.now();
for (let f = 0; f < N; f++) await page.evaluate(([v, ft]) => window.__l2d!.frame(v, ft), [pose(f), fit] as const);
const readFps = N / ((Date.now() - t0) / 1000);

// Same pose both ways. The screenshot is decoded by FFmpeg (no image library needed here).
const tmp = join(root, "build", "cast", "bench");
mkdirSync(tmp, { recursive: true });
const v = { ...pose(17), ParamMouthShape: 2 };
await page.evaluate(([vv, ft]) => window.__l2d!.draw(vv, ft), [v, fit] as const);
await page.locator("canvas").screenshot({ path: join(tmp, "shot.png"), omitBackground: true, type: "png" });
const read = Buffer.from(await page.evaluate(([vv, ft]) => window.__l2d!.frame(vv, ft), [v, fit] as const), "base64");
await browser.close();
await server.close();
const { spawnSync } = await import("node:child_process");
const dec = spawnSync("ffmpeg", ["-v", "error", "-i", join(tmp, "shot.png"), "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { maxBuffer: W * H * 8 });
const shot = dec.stdout;
let alphaMax = 0, opaqueMax = 0, edgeMax = 0;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const s = (y * W + x) * 4, r = ((H - 1 - y) * W + x) * 4; // readPixels is bottom row first
    const a = read[r + 3]!;
    alphaMax = Math.max(alphaMax, Math.abs(shot[s + 3]! - a));
    for (let c = 0; c < 3; c++) {
      const straight = a ? Math.min(255, Math.round((read[r + c]! * 255) / a)) : 0;
      const d = Math.abs(shot[s + c]! - straight);
      if (shot[s + 3]! >= 250) opaqueMax = Math.max(opaqueMax, d);
      else if (shot[s + 3]! > 10) edgeMax = Math.max(edgeMax, d);
    }
  }
}

// ---- 2. end to end, VP9 + alpha -------------------------------------------------------------
const blinks = blinkFrames(mulberry(11), N * 3, fps);
const track = Array.from({ length: N * 3 }, (_, f) => bodyParams(f, fps, blinks, [], []));
const endToEnd: Record<string, number> = {};
for (const k of counts) {
  const out = join(tmp, `bench-${k}.webm`);
  const { seconds } = await renderTrack(root, model, track, out, { fps, width: W, height: H, fit, alpha: true, browsers: k, port: 5194 });
  endToEnd[`${k} browser${k > 1 ? "s" : ""}`] = +(track.length / seconds).toFixed(1);
}
rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({
  size: `${W}x${H}`, renderer,
  capture_fps: { screenshot: +shotFps.toFixed(1), readPixels: +readFps.toFixed(1) },
  same_pixels: { alpha_max_diff: alphaMax, opaque_rgb_max_diff: opaqueMax, edge_rgb_max_diff: edgeMax },
  end_to_end_fps: endToEnd,
}, null, 1));
