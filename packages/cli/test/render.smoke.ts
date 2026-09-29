/**
 * End-to-end render smoke test (`pnpm test:render`): renders the fixture project in both
 * languages at draft quality from scratch and checks what the films' reports claim
 * against the files themselves (frame counts, size, subtitle tracks, sidecars).
 * Not part of `pnpm test`: it drives Chromium and FFmpeg and takes ~30 s.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findRepoRoot } from "@vid/core";

const root = findRepoRoot();
const failures: string[] = [];
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "✓" : "✗"} ${what}`);
  if (!ok) failures.push(what);
};

const cli = [join(root, "node_modules", "tsx", "dist", "cli.mjs"), join(root, "packages", "cli", "src", "index.ts")];
const run = spawnSync(process.execPath, [...cli, "render", "smoke-test", "--lang", "all", "--quality", "draft", "--force"], { cwd: root, stdio: "inherit" });
check(run.status === 0, "render exits 0");

for (const lang of ["en", "ja"]) {
  const base = join(root, "build", "smoke-test", `smoke-test.${lang}.draft`);
  const reportPath = `${base}.report.json`;
  check(existsSync(reportPath), `${lang}: report written`);
  if (!existsSync(reportPath)) continue;
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const probe = spawnSync("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "stream=codec_type,width,height,nb_read_frames", "-of", "json", `${base}.mp4`], { encoding: "utf8" });
  const streams = JSON.parse(probe.stdout).streams as Array<{ codec_type: string; width?: number; height?: number; nb_read_frames?: string }>;
  const video = streams.find((s) => s.codec_type === "video")!;
  const decoded = Number(video.nb_read_frames);
  check(decoded === report.frames.expected, `${lang}: decoded frames ${decoded} = expected ${report.frames.expected}`);
  check(report.scenes.reduce((s: number, x: { frames: number }) => s + x.frames, 0) === report.frames.expected, `${lang}: scene frames sum to the film`);
  check(video.width === 960 && video.height === 540, `${lang}: draft size 960x540 (got ${video.width}x${video.height})`);
  const subs = streams.filter((s) => s.codec_type === "subtitle").length;
  check(subs === report.subtitles.soft.length, `${lang}: ${subs} soft subtitle track(s) = report's ${report.subtitles.soft.length}`);
  for (const f of report.subtitles.sidecars) check(existsSync(join(root, f)) && readFileSync(join(root, f), "utf8").includes("-->"), `${lang}: sidecar ${f}`);
  check(report.scenes.some((s: { renderer: string }) => s.renderer === "still"), `${lang}: still scene rendered`);
}

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nrender smoke test passed");
