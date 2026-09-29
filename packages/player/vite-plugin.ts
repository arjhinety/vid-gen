/**
 * Dev/render server endpoints for the player:
 *
 *   GET /__vid/project/:id            -> { spec, timelines: { [lang]: Timeline } }
 *                                        (built timeline if present, else an estimated one)
 *   GET /__vid/file?path=<repo-rel>   -> streams a repo file (audio, manim renders); repo-confined
 *
 * The browser never reads the filesystem directly; everything goes through here.
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import type { Plugin } from "vite";
import {
  buildPaths,
  buildTimeline,
  estimateAudio,
  loadProject,
  questionMarks,
  type Lang,
  type Timeline,
} from "../core/src/index.ts";

const MIME: Record<string, string> = {
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".js": "text/javascript",
  ".frag": "text/plain",
  ".vert": "text/plain",
};

export function projectPayload(root: string, id: string) {
  const p = loadProject(id, root);
  const timelines: Partial<Record<Lang, Timeline & { estimated: boolean }>> = {};
  for (const [lang, variant] of Object.entries(p.spec.languages) as Array<[Lang, { subtitles: Lang[] }]>) {
    const built = buildPaths(root, id, lang).timeline;
    if (existsSync(built)) {
      const tl = JSON.parse(readFileSync(built, "utf8")) as Timeline;
      // The question line is authored in project.yaml: re-derive it so edits show without re-running audio.
      timelines[lang] = { ...tl, questions: questionMarks(p.spec, tl.scenes), estimated: false };
    } else {
      const tl = buildTimeline(p.spec, p.narration, estimateAudio(p.narration, lang), { lang, subtitleLangs: variant.subtitles });
      timelines[lang] = { ...tl, estimated: true };
    }
  }
  return { spec: p.spec, timelines };
}

export function vidPlugin(root: string): Plugin {
  return {
    name: "vid-player",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://x");
        try {
          const m = url.pathname.match(/^\/__vid\/project\/([a-z0-9-]+)$/);
          if (m) {
            res.setHeader("content-type", "application/json");
            res.setHeader("cache-control", "no-store");
            res.end(JSON.stringify(projectPayload(root, m[1]!)));
            return;
          }
          if (url.pathname === "/__vid/file") {
            const rel = url.searchParams.get("path") ?? "";
            const abs = resolve(root, normalize(rel));
            if (relative(root, abs).startsWith("..") || relative(root, abs).split(sep)[0] === "..") {
              res.statusCode = 403;
              res.end("outside repository");
              return;
            }
            if (!existsSync(abs)) {
              res.statusCode = 404;
              res.end(`not found: ${rel}`);
              return;
            }
            const size = statSync(abs).size;
            res.setHeader("content-type", MIME[extname(abs).toLowerCase()] ?? "application/octet-stream");
            res.setHeader("accept-ranges", "bytes");
            const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
            if (range) {
              const start = range[1] ? Number(range[1]) : 0;
              const end = range[2] ? Number(range[2]) : size - 1;
              res.statusCode = 206;
              res.setHeader("content-range", `bytes ${start}-${end}/${size}`);
              res.setHeader("content-length", String(end - start + 1));
              createReadStream(abs, { start, end }).pipe(res);
            } else {
              res.setHeader("content-length", String(size));
              createReadStream(abs).pipe(res);
            }
            return;
          }
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end(String((e as Error).stack ?? e));
          return;
        }
        next();
      });
    },
  };
}

export const repoPath = (root: string, ...p: string[]) => join(root, ...p);
