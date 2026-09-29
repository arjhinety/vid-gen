/** Canonical build-artifact layout. All generated files live under build/<project>/. */
import { join } from "node:path";
import type { Lang } from "./schema.ts";

export function buildPaths(root: string, project: string, lang: Lang) {
  const base = join(root, "build", project, lang);
  return {
    base,
    audioDir: join(base, "audio"),
    /** Per-line measured audio + alignment (LineAudio records keyed by beat#index). */
    lines: join(base, "audio", "lines.json"),
    narrationWav: join(base, "audio", "narration.wav"),
    timeline: join(base, "timeline.json"),
    scenesDir: join(base, "scenes"),
    scene: (id: string, quality: string) => join(base, "scenes", `${id}.${quality}.mp4`),
    sceneMeta: (id: string, quality: string) => join(base, "scenes", `${id}.${quality}.json`),
    subtitles: (sub: Lang, ext: "srt" | "vtt") => join(base, `subtitles.${sub}.${ext}`),
    output: (quality: string) => join(root, "build", project, `${project}.${lang}.${quality}.mp4`),
  };
}

/** Repo-wide caches shared by all projects (content-addressed). */
export function cachePaths(root: string) {
  const base = join(root, ".cache");
  return {
    base,
    tts: (engine: string) => join(base, "tts", engine),
    align: join(base, "align"),
    equations: join(base, "equations"),
  };
}
