import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { ParseArgsConfig } from "node:util";
import {
  buildPaths,
  findRepoRoot,
  hashFiles,
  hashOf,
  loadProject,
  validateProject,
  type Lang,
  type Timeline,
} from "@vid/core";
import type { Quality } from "@vid/render";
import { fail, log, progressBar } from "./log.ts";

type Values = Record<string, string | boolean | undefined>;
interface Command {
  summary: string;
  /** Keeps running after run() resolves (servers). */
  persistent?: boolean;
  options?: ParseArgsConfig["options"];
  run(pos: string[], v: Values): Promise<void>;
}

const RENDERER_VERSION = "web-1";

// Heavy modules (Vite, Playwright) load only when a command needs them.
const lazy = {
  server: () => import("../../player/server.ts"),
  plugin: () => import("../../player/vite-plugin.ts"),
  render: () => import("@vid/render"),
};

function need(pos: string[], n: number, usage: string): void {
  if (pos.length < n) fail(`usage: pnpm video ${usage}`);
}

export function listFiles(dir: string, exts = [".ts", ".tsx", ".css", ".py", ".json", ".svg"]): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out.push(...listFiles(p, exts));
    else if (exts.some((x) => p.endsWith(x))) out.push(p);
  }
  return out;
}

/** Timeline for a language: the built one, or an estimated one (with a warning). */
export async function timelineFor(root: string, project: string, lang: Lang): Promise<Timeline & { estimated: boolean }> {
  const payload = (await lazy.plugin()).projectPayload(root, project);
  const tl = payload.timelines[lang];
  if (!tl) fail(`project '${project}' has no '${lang}' language variant`);
  return tl;
}

/** Everything the shared sheet draws for this scene: it depends on neighbours, not only on the scene. */
function filmContextKey(tl: Timeline, sceneId: string): object {
  const i = tl.scenes.findIndex((s) => s.id === sceneId);
  const sc = tl.scenes[i]!;
  const prev = i > 0 ? tl.scenes[i - 1]! : null;
  const rows = tl.headline ?? [];
  const before = rows.filter((r) => r.start < sc.start).slice(-5);
  const during = rows.filter((r) => r.start >= sc.start && r.start < sc.end + 1);
  // The question line: the one standing at the cut (and the one before it, for the change) plus every change during the scene.
  const qs = tl.questions ?? [];
  const qBefore = qs.filter((q) => q.t < sc.start).slice(-2);
  const qDuring = qs.filter((q) => q.t >= sc.start && q.t < sc.end + 1);
  return { start: sc.start, brand: tl.brand, prevSection: prev?.section, prevRows: prev?.headlineRows, rows: [...before, ...during], questions: [...qBefore, ...qDuring] };
}

function sceneHash(root: string, project: string, tl: Timeline, sceneId: string, quality: string): string {
  const scene = tl.scenes.find((s) => s.id === sceneId)!;
  const shared = ["design", "motion", "kit", "player/src"].flatMap((p) => listFiles(join(root, "packages", p)));
  shared.push(join(root, "packages", "render", "src", "web.ts"), join(root, "packages", "render", "src", "ffmpeg.ts"));
  const own = listFiles(join(root, "projects", project, "scenes"));
  return hashOf(RENDERER_VERSION, quality, tl.width, tl.height, tl.fps, { ...scene, start: 0, startFrame: 0 }, filmContextKey(tl, sceneId), hashFiles([...shared, ...own]));
}

export const commands: Record<string, Command> = {
  dev: {
    summary: "interactive preview server for a project",
    persistent: true,
    options: { port: { type: "string" } },
    async run(pos, v) {
      need(pos, 1, "dev <project>");
      const root = findRepoRoot();
      loadProject(pos[0]!, root);
      const { url } = await (await lazy.server()).startPlayerServer(root, { port: v.port ? Number(v.port) : undefined });
      log.ok(`preview: ${url}?project=${pos[0]}`);
      log.plain(log.dim("space play/pause · ←/→ frame · shift+←/→ 1 s · [ ] prev/next cue · c captions · g guides"));
    },
  },

  check: {
    summary: "validate project specs, references, claims and (if built) artifacts",
    async run(pos) {
      need(pos, 1, "check <project>");
      const root = findRepoRoot();
      const p = loadProject(pos[0]!, root);
      const problems = validateProject(p);
      const { artifactProblems } = await import("./checks.ts");
      problems.push(...artifactProblems(p));
      for (const pr of problems) (pr.level === "error" ? log.err : log.warn)(`${pr.where}: ${pr.message}`);
      const errors = problems.filter((x) => x.level === "error").length;
      if (errors) fail(`${errors} error(s)`);
      log.ok(`${p.spec.id}: ${p.spec.scenes.length} scenes, ${p.narration.beats.length} beats, ${p.claims.length} claims — no errors`);
    },
  },

  plan: {
    summary: "pacing report: scene durations, words per minute, headline rows: plan <project> [--lang en]",
    options: { lang: { type: "string", default: "en" } },
    async run(pos, v) {
      need(pos, 1, "plan <project>");
      const root = findRepoRoot();
      const p = loadProject(pos[0]!, root);
      const lang = v.lang as Lang;
      const tl = await timelineFor(root, p.spec.id, lang);
      const words = tl.scenes.flatMap((s) => s.lines).reduce((n, l) => n + l.text_en.split(/\s+/).filter(Boolean).length, 0);
      const speech = tl.scenes.flatMap((s) => s.lines).reduce((n, l) => n + (l.end - l.start), 0);
      log.plain(`${p.spec.id} · ${lang} · ${tl.estimated ? "ESTIMATED" : "measured"} timing`);
      for (const s of tl.scenes) {
        const rows = (tl.headline ?? []).filter((r) => r.start >= s.start && r.start < s.end).length;
        log.plain(`  ${s.id.padEnd(16)} ${(s.end - s.start).toFixed(1).padStart(6)} s  ${String(s.lines.length).padStart(2)} lines  ${String(rows).padStart(2)} rows  ${s.renderer}`);
      }
      const lens = (tl.headline ?? []).map((r) => r.text.length);
      log.plain(`  total ${tl.duration.toFixed(1)} s (${(tl.duration / 60).toFixed(2)} min) · speech ${(100 * speech / tl.duration).toFixed(0)}% of runtime · ${words} words · ${(words / (tl.duration / 60)).toFixed(0)} wpm overall`);
      log.plain(`  headline: ${lens.length} rows, longest ${Math.max(0, ...lens)} chars (limit ${p.spec.headline.max_chars})`);
    },
  },

  audio: {
    summary: "narration: TTS + alignment + timeline + subtitles + mix: audio <project> [--lang en|ja|all] [--force]",
    options: { lang: { type: "string", default: "all" }, force: { type: "boolean" }, retries: { type: "string" } },
    async run(pos, v) {
      need(pos, 1, "audio <project>");
      const root = findRepoRoot();
      const p = loadProject(pos[0]!, root);
      const problems = validateProject(p).filter((x) => x.level === "error" && !x.message.startsWith("entry not found"));
      if (problems.length) fail(problems.map((x) => `${x.where}: ${x.message}`).join("\n"));
      const langs = v.lang === "all" ? (Object.keys(p.spec.languages) as Lang[]) : [v.lang as Lang];
      const { buildAudio } = await import("./audio.ts");
      for (const lang of langs) await buildAudio(p, lang, { force: !!v.force, retries: v.retries ? Number(v.retries) : undefined });
    },
  },

  scene: {
    summary: "render one scene: scene <project> <scene> [--lang en] [--quality draft|final] [--force]",
    options: { lang: { type: "string", default: "en" }, quality: { type: "string", default: "draft" }, force: { type: "boolean" }, workers: { type: "string" } },
    async run(pos, v) {
      need(pos, 2, "scene <project> <scene>");
      const [project, sceneId] = pos as [string, string];
      const root = findRepoRoot();
      const lang = v.lang as Lang;
      const quality = v.quality as Quality;
      const out = await renderScene(root, project, lang, sceneId, quality, { force: !!v.force, workers: v.workers ? Number(v.workers) : undefined });
      log.ok(relative(root, out));
    },
  },

  render: {
    summary: "render the film(s): render <project> [--lang en|ja|all] [--quality draft|final] [--force]",
    options: { lang: { type: "string", default: "all" }, quality: { type: "string", default: "draft" }, force: { type: "boolean" }, workers: { type: "string" } },
    async run(pos, v) {
      need(pos, 1, "render <project>");
      const root = findRepoRoot();
      const p = loadProject(pos[0]!, root);
      const errors = validateProject(p).filter((x) => x.level === "error");
      if (errors.length) fail(errors.map((x) => `${x.where}: ${x.message}`).join("\n"));
      const quality = v.quality as Quality;
      if (quality !== "draft" && quality !== "final") fail(`--quality must be draft or final, got '${quality}'`);
      const langs = v.lang === "all" ? (Object.keys(p.spec.languages) as Lang[]) : [v.lang as Lang];
      const { renderFilm } = await import("./render.ts");
      const reports = await renderFilm(p, langs, quality, { force: !!v.force, workers: v.workers ? Number(v.workers) : undefined });
      const warned = reports.filter((r) => r.warnings.length);
      if (warned.length) log.warn(`${warned.length} film(s) have warnings; see the .report.json next to each film`);
    },
  },

  still: {
    summary: "render PNG stills: still <project> <scene> --at 0,45,2.5s,cue:name [--lang]",
    options: { lang: { type: "string", default: "en" }, at: { type: "string", default: "0" }, quality: { type: "string", default: "final" } },
    async run(pos, v) {
      need(pos, 2, "still <project> <scene> --at ...");
      const [project, sceneId] = pos as [string, string];
      const root = findRepoRoot();
      const lang = v.lang as Lang;
      const tl = await timelineFor(root, project, lang);
      const scene = tl.scenes.find((s) => s.id === sceneId) ?? fail(`unknown scene '${sceneId}'`);
      if (scene.renderer === "manim") fail("stills are supported for web and still scenes; render manim scenes with `video scene`");
      const frames = String(v.at)
        .split(",")
        .map((s) => s.trim())
        .map((s) => {
          if (s.startsWith("cue:")) {
            const m = s.slice(4).match(/^([^+-]+)([+-]\d+)?$/) ?? fail(`bad cue ref ${s}`);
            return (scene.cues[m[1]!]?.frame ?? fail(`unknown cue ${m[1]} (known: ${Object.keys(scene.cues).join(", ")})`)) + Number(m[2] ?? 0);
          }
          if (s.endsWith("s")) return Math.round(Number(s.slice(0, -1)) * tl.fps);
          if (s === "end") return scene.durationFrames - 1;
          return Number(s);
        })
        .map((f) => Math.min(Math.max(0, f), scene.durationFrames - 1));
      const { renderStills, closeBrowser } = await lazy.render();
      const { server, url } = await (await lazy.server()).startPlayerServer(root, { quiet: true, port: 5199 });
      try {
        const files = await renderStills({ serverUrl: url, project, lang, scene: sceneId, width: tl.width, height: tl.height, fps: tl.fps, quality: v.quality as Quality, frames, outDir: join(buildPaths(root, project, lang).base, "stills") });
        for (const f of files) log.ok(relative(root, f));
      } finally {
        await closeBrowser();
        await server.close();
      }
    },
  },
};

export async function renderScene(
  root: string,
  project: string,
  lang: Lang,
  sceneId: string,
  quality: Quality,
  opts: { force?: boolean; workers?: number; server?: { url: string } } = {},
): Promise<string> {
  const tl = await timelineFor(root, project, lang);
  const scene = tl.scenes.find((s) => s.id === sceneId) ?? fail(`unknown scene '${sceneId}' in ${project}`);
  if (tl.estimated) log.warn(`${lang}: using ESTIMATED timing (no narration built yet)`);
  const paths = buildPaths(root, project, lang);
  const out = paths.scene(sceneId, quality);
  const metaPath = paths.sceneMeta(sceneId, quality);
  const here = (f: string) => join(root, "packages", "cli", "src", f);
  const key =
    scene.renderer === "web"
      ? sceneHash(root, project, tl, sceneId, quality)
      : scene.renderer === "still"
        ? hashOf(sceneHash(root, project, tl, sceneId, quality), hashFiles([join(root, "projects", project, scene.entry)]))
        : hashOf("manim", sceneHash(root, project, tl, sceneId, quality), hashFiles([...listFiles(join(root, "projects", project, "scenes", "manim")), ...listFiles(join(root, "py", "manim", "src")), here("manim.ts"), join(root, "packages", "design", "tokens.json"), ...listFiles(join(root, "projects", project, "data"), [".json", ".csv"])]));
  if (!opts.force && existsSync(out) && existsSync(metaPath)) {
    const meta = JSON.parse(readFileSync(metaPath, "utf8")) as { key: string };
    if (meta.key === key) {
      log.step(`${sceneId}: cached`);
      return out;
    }
  }
  // Web pages draw every web/still scene, and the sheet underneath every manim scene.
  const renderWeb = async (target: string) => {
    const { renderWebScene, closeBrowser } = await lazy.render();
    const own = opts.server ? null : await (await lazy.server()).startPlayerServer(root, { quiet: true, port: 5199 });
    const serverUrl = opts.server?.url ?? own!.url;
    try {
      const r = await renderWebScene({
        serverUrl, project, lang, scene: sceneId, width: tl.width, height: tl.height, fps: tl.fps,
        durationFrames: scene.durationFrames, quality, out: target, workers: opts.workers,
        onProgress: progressBar(`  ${sceneId}${target === out ? "" : " (sheet)"}`),
      });
      log.step(`${sceneId}: ${r.frames} frames in ${r.seconds.toFixed(1)} s (${(r.frames / r.seconds).toFixed(1)} fps)`);
    } finally {
      if (own) {
        await closeBrowser();
        await own.server.close();
      }
    }
  };
  if (scene.renderer === "web" || scene.renderer === "still") {
    await renderWeb(out);
  } else if (scene.renderer === "manim") {
    const { renderManimScene, compositeOverlay } = await import("./manim.ts");
    const underlay = out.replace(/\.mp4$/, ".sheet.mp4");
    const overlay = out.replace(/\.mp4$/, ".overlay.mov");
    await renderWeb(underlay);
    await renderManimScene(root, project, lang, tl, sceneId, quality, overlay);
    compositeOverlay(underlay, overlay, out, scene.durationFrames, tl.fps, quality);
  } else {
    fail(`renderer '${scene.renderer}' cannot be rendered to video yet`);
  }
  writeFileSync(metaPath, JSON.stringify({ key, estimated: tl.estimated, durationFrames: scene.durationFrames, renderedAt: new Date().toISOString() }, null, 1));
  return out;
}
