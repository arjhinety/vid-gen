/**
 * Render a Live2D model's pose sheet: tsx packages/cast/tools/live2d-poses.ts <model3.json> <out-dir> [--gpu]
 *
 * Draws a fixed set of poses (neutral, head turns, eyes closed, mouth open, body lean)
 * through live2d.html, writes one transparent PNG per pose and a contact sheet on grey,
 * and prints the model's parameter list. Parameter ids follow the Cubism standard
 * (ParamAngleX, ParamEyeLOpen, ParamMouthOpenY, ...); poses naming unknown ids are skipped.
 */
import type {} from "../live2d/api.ts"; // window.__l2d
import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { findRepoRoot } from "@vid/core";
import { startPlayerServer } from "../../player/server.ts";

const [model, outArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!model || !outArg) throw new Error("usage: live2d-poses.ts <model3.json> <out-dir> [--gpu]");
const gpu = process.argv.includes("--gpu");
const root = findRepoRoot();
const out = join(root, outArg);
mkdirSync(out, { recursive: true });
const rel = relative(root, join(root, model)).replace(/\\/g, "/");

const POSES: Record<string, Record<string, number>> = {
  neutral: {},
  "look-left": { ParamAngleX: -30, ParamEyeBallX: -0.8 },
  "look-right": { ParamAngleX: 30, ParamEyeBallX: 0.8 },
  "look-up": { ParamAngleY: 30, ParamEyeBallY: 0.8 },
  "look-down": { ParamAngleY: -30, ParamEyeBallY: -0.8 },
  tilt: { ParamAngleZ: 20 },
  "eyes-closed": { ParamEyeLOpen: 0, ParamEyeROpen: 0 },
  // drawn mouth shapes (exclusive switch: closed 0, small 1, ah 2, oh 3, laugh 4)
  "mouth-ah": { ParamMouthShape: 2 },
  "mouth-oh": { ParamMouthShape: 3 },
  "body-lean": { ParamBodyAngleX: 10, ParamBodyAngleZ: 8 },
  "eye-smile": { ParamEyeSmile: 1, ParamMouthShape: 4 },
};

const W = 768;
const H = 1152;
const { server, url } = await startPlayerServer(root, { quiet: true, port: 5197 });
const browser = await chromium.launch({ args: ["--disable-lcd-text", "--force-color-profile=srgb", ...(gpu ? ["--enable-gpu", "--use-angle=d3d11"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"])] });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const logs: string[] = [];
  page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => logs.push(`pageerror: ${e.stack ?? e.message}`));
  await page.goto(`${url.replace(/\/$/, "")}/live2d.html?model=${encodeURIComponent(rel)}&w=${W}&h=${H}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__l2d !== undefined, null, { timeout: 60_000 });
  const info = await page.evaluate(() => window.__l2d!.ready).catch(async (e: Error) => {
    throw new Error(`${e.message}\n${logs.join("\n")}`);
  });
  writeFileSync(join(out, "params.json"), JSON.stringify(info, null, 1));
  const known = new Set(info.params.map((p) => p.id));
  console.log(`${info.params.length} parameters; physics outputs: ${info.physicsOutputs.length}`);
  const files: string[] = [];
  for (const [name, pose] of Object.entries(POSES)) {
    const values = Object.fromEntries(Object.entries(pose).filter(([k]) => known.has(k)));
    if (Object.keys(pose).length && !Object.keys(values).length) {
      console.log(`skip ${name}: none of ${Object.keys(pose).join(", ")}`);
      continue;
    }
    await page.evaluate((v) => window.__l2d!.draw(v, { height: 0.95, x: 0, y: 0 }), values);
    const file = join(out, `${name}.png`);
    await page.locator("canvas").screenshot({ path: file, omitBackground: true });
    files.push(file);
  }
  // Contact sheet on a mid grey, 5 per row.
  const sheet = join(out, "sheet.png");
  const cols = 5;
  const inputs = files.flatMap((f) => ["-i", f]);
  const layout = files.map((_, i) => `${(i % cols) * W}_${Math.floor(i / cols) * H}`).join("|");
  const rows = Math.ceil(files.length / cols);
  const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", `color=c=0xB8B8B4:s=${cols * W}x${rows * H}[bg];${files.map((_, i) => `[${i}:v]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=0xB8B8B4@0[st];[bg][st]overlay,scale=iw/3:-1`, "-frames:v", "1", sheet], { encoding: "utf8" });
  if (r.status !== 0) console.error(r.stderr);
  else console.log(sheet);
  const warn = logs.filter((l) => /error|warn/i.test(l));
  if (warn.length) console.log(warn.slice(0, 10).join("\n"));
} finally {
  await browser.close();
  await server.close();
}
