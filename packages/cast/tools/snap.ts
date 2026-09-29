/**
 * Screenshot cast model sheets: tsx packages/cast/tools/snap.ts graddy kohai graddy-faces
 * Writes build/cast/<sheet>.png (1920×1080).
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { findRepoRoot } from "@vid/core";
import { startPlayerServer } from "../../player/server.ts";

const sheets = process.argv.slice(2);
if (!sheets.length) throw new Error("usage: snap.ts <sheet> [<sheet> ...]");
const root = findRepoRoot();
const out = join(root, "build", "cast");
mkdirSync(out, { recursive: true });

const { server, url } = await startPlayerServer(root, { quiet: true, port: 5198 });
const browser = await chromium.launch({ args: ["--disable-lcd-text", "--font-render-hinting=none", "--force-color-profile=srgb", "--disable-gpu"] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.stack ?? e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const s of sheets) {
    await page.goto(`${url.replace(/\/$/, "")}/cast.html?sheet=${s}`, { waitUntil: "load" });
    await page.waitForFunction(() => window.__castReady !== undefined, null, { timeout: 60_000 });
    await page.evaluate(() => window.__castReady);
    if (errors.length) throw new Error(errors.join("\n"));
    const file = join(out, `${s}.png`);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    console.log(file);
  }
} finally {
  await browser.close();
  await server.close();
}

declare global {
  interface Window {
    __castReady?: Promise<void>;
  }
}
