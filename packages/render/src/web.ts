/**
 * Web scene renderer: headless Chromium (Playwright) seeks the scene frame by
 * frame through `window.__vid.seek`, screenshots the stage, and pipes frames into
 * FFmpeg. Frame ranges are split across parallel pages; chunks are concatenated
 * losslessly.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { dirname, join } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { ffmpegSync, frameEncoder, QUALITY, writeFrame, type Quality } from "./ffmpeg.ts";

export interface WebRenderOptions {
  serverUrl: string;
  project: string;
  lang: string;
  scene: string;
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  quality: Quality;
  out: string;
  /** Inclusive-exclusive frame range; defaults to the whole scene. */
  range?: [number, number];
  workers?: number;
  onProgress?: (done: number, total: number) => void;
}

let sharedBrowser: Browser | null = null;
export async function browser(): Promise<Browser> {
  // CPU rasterisation by default: deterministic for 2D (SVG/CSS) scenes and keeps
  // the GPU free for TTS. Set VID_GPU=1 for WebGL-heavy scenes.
  const gpu = process.env.VID_GPU === "1";
  sharedBrowser ??= await chromium.launch({
    args: [
      "--disable-lcd-text",
      "--font-render-hinting=none",
      "--force-color-profile=srgb",
      "--hide-scrollbars",
      "--mute-audio",
      ...(gpu ? ["--enable-gpu", "--use-angle=d3d11"] : ["--disable-gpu"]),
    ],
  });
  return sharedBrowser;
}
export async function closeBrowser() {
  await sharedBrowser?.close();
  sharedBrowser = null;
}

/**
 * Open a scene page, retrying once if the dev server refused a connection. Seen once in a
 * full draft render (scene 3 of 11 refused; the identical re-run passed), cause not found:
 * a transient refusal should not cost a half-hour render.
 */
async function openScenePage(o: Pick<WebRenderOptions, "serverUrl" | "project" | "lang" | "scene" | "width" | "height" | "quality">): Promise<{ page: Page; errors: string[] }> {
  try {
    return await openScenePageOnce(o);
  } catch (e) {
    if (!/ERR_CONNECTION_REFUSED|ECONNREFUSED/.test((e as Error).message)) throw e;
    await new Promise((r) => setTimeout(r, 2000));
    return openScenePageOnce(o);
  }
}

async function openScenePageOnce(o: Pick<WebRenderOptions, "serverUrl" | "project" | "lang" | "scene" | "width" | "height" | "quality">): Promise<{ page: Page; errors: string[] }> {
  const b = await browser();
  const ctx = await b.newContext({
    viewport: { width: o.width, height: o.height },
    deviceScaleFactor: QUALITY[o.quality].scale,
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.stack ?? e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const url = `${o.serverUrl.replace(/\/$/, "")}/?project=${o.project}&lang=${o.lang}&scene=${o.scene}&mode=render`;
  try {
    await page.goto(url, { waitUntil: "load", timeout: 120_000 });
    // Fail fast on a page error instead of waiting for the full timeout.
    const deadline = Date.now() + 120_000;
    while (!(await page.evaluate(() => window.__vid !== undefined))) {
      if (errors.length) throw new Error(errors[0]);
      if (Date.now() > deadline) throw new Error("timed out waiting for the render host");
      await page.waitForTimeout(100);
    }
    await page.evaluate(() => window.__vid!.ready);
  } catch (e) {
    const detail = await page.evaluate(() => window.__vid?.error).catch(() => undefined);
    await ctx.close().catch(() => {});
    throw new Error(`scene '${o.scene}' failed to load: ${detail ?? (e as Error).message}\n${errors.join("\n")}`);
  }
  return { page, errors };
}

async function capture(page: Page, frame: number, o: Pick<WebRenderOptions, "width" | "height" | "quality">, type: "jpeg" | "png" = "jpeg"): Promise<Buffer> {
  await page.evaluate((f) => window.__vid!.seek(f), frame);
  return page.screenshot({
    type,
    ...(type === "jpeg" ? { quality: QUALITY[o.quality].jpegQuality } : {}),
    clip: { x: 0, y: 0, width: o.width, height: o.height },
    animations: "disabled",
    caret: "hide",
  });
}

export async function renderWebScene(o: WebRenderOptions): Promise<{ frames: number; seconds: number }> {
  const t0 = performance.now();
  const [a, b] = o.range ?? [0, o.durationFrames];
  const total = b - a;
  if (total <= 0) throw new Error(`empty frame range for ${o.scene}`);
  const workers = Math.max(1, Math.min(o.workers ?? Math.max(1, Math.floor(cpus().length / 3)), 6, Math.ceil(total / 30)));
  const tmp = join(dirname(o.out), `.chunks-${o.scene}-${process.pid}`);
  mkdirSync(tmp, { recursive: true });

  let done = 0;
  const per = Math.ceil(total / workers);
  const chunks = Array.from({ length: workers }, (_, i) => [a + i * per, Math.min(b, a + (i + 1) * per)] as const).filter(([x, y]) => y > x);
  try {
    const parts = await Promise.all(
      chunks.map(async ([from, to], i) => {
        const { page, errors } = await openScenePage(o);
        const part = join(tmp, `part-${String(i).padStart(3, "0")}.mp4`);
        const enc = frameEncoder(part, o.fps, o.quality);
        try {
          for (let f = from; f < to; f++) {
            await writeFrame(enc.proc, await capture(page, f, o));
            done++;
            o.onProgress?.(done, total);
            if (errors.length) throw new Error(`runtime error in scene '${o.scene}' at frame ${f}:\n${errors.join("\n")}`);
          }
        } finally {
          enc.proc.stdin.end();
          await page.context().close();
        }
        await enc.done;
        return part;
      }),
    );
    const list = join(tmp, "list.txt");
    writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
    mkdirSync(dirname(o.out), { recursive: true });
    ffmpegSync(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", o.out]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  return { frames: total, seconds: (performance.now() - t0) / 1000 };
}

/** Render single frames to PNG for inspection (fast feedback without encoding video). */
export async function renderStills(o: Omit<WebRenderOptions, "out" | "range" | "durationFrames"> & { frames: number[]; outDir: string }): Promise<string[]> {
  const { page } = await openScenePage(o);
  mkdirSync(o.outDir, { recursive: true });
  const out: string[] = [];
  try {
    for (const f of o.frames) {
      const p = join(o.outDir, `${o.scene}-f${String(f).padStart(5, "0")}.png`);
      writeFileSync(p, await capture(page, f, o, "png"));
      out.push(p);
    }
  } finally {
    await page.context().close();
  }
  return out;
}
