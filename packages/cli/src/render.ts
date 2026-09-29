/**
 * `video render <project>`: every scene -> one film per language variant.
 *
 * Per language: render (or reuse cached) scenes, mix narration with the optional
 * music bed and cue-pinned SFX, write subtitles (SRT/VTT sidecars, ASS for burn-in),
 * do the single delivery encode, then verify frames, size and loudness and write
 * a report next to the film.
 */
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { buildPaths, cutHits, placeSfx, toAss, toSrt, toVtt, type Lang, type LoadedProject } from "@vid/core";
import { color, layout, type as typeScale } from "@vid/design";
import type { Quality } from "@vid/render";
import { renderCast } from "./cast.ts";
import { renderScene, timelineFor } from "./commands.ts";
import { vidmedia } from "./audio.ts";
import { fail, log, progressBar } from "./log.ts";

export interface FilmReport {
  project: string;
  lang: Lang;
  quality: Quality;
  out: string;
  estimatedTiming: boolean;
  frames: { expected: number; actual: number };
  size: { width: number; height: number };
  duration: number;
  scenes: Array<{ id: string; renderer: string; frames: number; file: string }>;
  audio: null | { file: string; music: boolean; sfx: number; integratedLufs: number; truePeakDbtp: number; targetLufs: number };
  /** The presenter track laid over the picture (projects with `cast`). */
  cast: null | { file: string; x: number; y: number; frames: number; reused: boolean; summary: Record<string, unknown> };
  subtitles: { burned: Lang | null; soft: Lang[]; sidecars: string[] };
  warnings: string[];
  seconds: { scenes: number; encode: number };
}

/**
 * ASS Fontsize is the font's Windows ascent+descent box (the VSFilter convention libass
 * follows), not its em. Archivo: (usWinAscent 1100 + usWinDescent 410) / 1000 upm.
 */
const ARCHIVO_WIN_BOX = 1.51;

export function subtitleStyle(width: number, height: number) {
  const size = typeScale.subtitle.size;
  return {
    width, height,
    font: typeScale.subtitle.family,
    size: Math.round(size * ARCHIVO_WIN_BOX),
    text: color.sheet,
    box: color.ink,
    boxOpacity: 0.78,
    // The last line's baseline sits on layout.subtitleBaseline (below the 860 px safe line).
    marginV: height - layout.subtitleBaseline - Math.round(size * 0.25),
    padding: 12,
  };
}

/**
 * The film's receipts: every claim it shows or says, its class and where it comes from.
 * The stage carries only claim classes; this is where a viewer can audit the rest.
 */
export function receipts(p: LoadedProject): string {
  const ids = new Set([...p.spec.scenes.flatMap((s) => s.claims), ...p.narration.beats.flatMap((b) => b.lines.flatMap((l) => l.claims))]);
  const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  const rows = p.claims.filter((c) => ids.has(c.id)).map((c) => `| \`${c.id}\` | ${c.class} | ${cell(c.text)} | \`${cell(c.source_path)}\`${c.source_locator ? ` ${cell(c.source_locator)}` : ""} |`);
  return [
    `# Receipts: ${p.spec.title}`,
    "",
    `Every claim this film shows or says (${rows.length}), its class, and the file it was read from. Sources are in the repository the claims file names; the film shows only the class of each claim.`,
    "",
    "| Claim | Class | What the film says | Source |",
    "|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

/** Each track's stretch of the film: from its scene's start (the first from 0) to the next track's. */
export function placeTracks(tracks: Array<{ path: string; from: string; align?: "start" | "end" }>, tl: { duration: number; scenes: Array<{ id: string; start: number }> }, root: string) {
  const starts = tracks.map((t, i) => (i === 0 ? 0 : (tl.scenes.find((s) => s.id === t.from) ?? fail(`music track ${t.path}: unknown scene '${t.from}'`)).start));
  return tracks.map((t, i) => ({ path: join(root, t.path), start: starts[i]!, end: starts[i + 1] ?? tl.duration, align: t.align ?? (i === tracks.length - 1 ? "end" : "start") }));
}

export async function renderFilm(p: LoadedProject, langs: Lang[], quality: Quality, opts: { force?: boolean; workers?: number } = {}): Promise<FilmReport[]> {
  const { root, spec } = p;
  const render = await import("@vid/render");
  const needsWeb = spec.scenes.some((s) => s.renderer === "web");
  const player = needsWeb ? await (await import("../../player/server.ts")).startPlayerServer(root, { quiet: true, port: 5199 }) : null;
  const reports: FilmReport[] = [];
  try {
    for (const lang of langs) {
      const variant = spec.languages[lang] ?? fail(`project has no '${lang}' variant`);
      const tl = await timelineFor(root, spec.id, lang);
      const paths = buildPaths(root, spec.id, lang);
      const warnings: string[] = [];
      const warn = (m: string) => (warnings.push(m), log.warn(`${lang}: ${m}`));
      if (tl.estimated) warn("ESTIMATED timing (no narration built): silent film, subtitles on estimated times");
      log.plain(`\n${spec.id} · ${lang} · ${quality} · ${tl.scenes.length} scenes · ${tl.duration.toFixed(1)} s`);

      // 1. Scenes (cached by content hash).
      const t0 = performance.now();
      const scenes: FilmReport["scenes"] = [];
      for (const sc of tl.scenes) {
        const file = await renderScene(root, spec.id, lang, sc.id, quality, { force: opts.force, workers: opts.workers, server: player ?? undefined });
        const got = Number(render.ffprobeJson(file).streams.find((s) => s.codec_type === "video")?.nb_frames ?? -1);
        if (got !== sc.durationFrames) fail(`${sc.id}: scene file has ${got} frames, timeline wants ${sc.durationFrames} (${relative(root, file)})`);
        scenes.push({ id: sc.id, renderer: sc.renderer, frames: got, file: relative(root, file).replace(/\\/g, "/") });
      }
      const sceneSeconds = (performance.now() - t0) / 1000;

      // 1b. The presenter, one transparent track over the whole film (projects with `cast`).
      const cast = tl.estimated ? null : await renderCast(p, lang, tl, quality, { force: opts.force });
      if (spec.cast && !cast) warn("cast skipped: estimated timing has no mouth timings");
      if (cast && cast.frames !== tl.durationFrames) fail(`cast track has ${cast.frames} frames, timeline wants ${tl.durationFrames}`);

      // 2. Audio: narration, plus a ducked bed and SFX when the project asks for them.
      let audioFile: string | null = null;
      let placedSfx = 0;
      if (!tl.estimated) {
        if (!existsSync(paths.narrationWav)) fail(`${lang}: ${relative(root, paths.narrationWav)} is missing; run \`pnpm video audio ${spec.id} --lang ${lang}\``);
        audioFile = paths.narrationWav;
        const { music, sfx } = spec.audio;
        if (music || sfx.length) {
          const placed = [
            ...placeSfx(tl, sfx).map((x) => (x.path ? { ...x, path: join(root, x.path) } : x)),
            ...(music?.cut_hits_db != null ? cutHits(tl, music.cut_hits_db) : []),
          ];
          placedSfx = placed.length;
          const out = join(paths.audioDir, "mix.wav");
          vidmedia(root, "mix", {
            duration: tl.duration,
            target_lufs: spec.audio.target_lufs,
            out,
            items: [{ wav: paths.narrationWav, start: 0 }],
            speech: tl.scenes.flatMap((s) => s.lines.map((l) => [l.start, l.end])),
            music: music ? { ...music, path: music.path ? join(root, music.path) : undefined, tracks: music.tracks ? placeTracks(music.tracks, tl, root) : undefined, sections: tl.scenes.map((s) => s.start) } : null,
            sfx: placed,
            // Sample-peak ceiling. AAC adds inter-sample overs: at -1.5 the Kokoro EN film measured
            // exactly -1.0 dBTP (the delivery limit), so keep 1 dB of margin.
            ceiling_dbfs: -2.0,
          }, join(paths.audioDir, "work", "film-mix.json"));
          audioFile = out;
        }
      }

      // 3. Subtitles, written from the same timeline the picture was cut to.
      const style = subtitleStyle(tl.width, tl.height);
      const sidecars: string[] = [];
      for (const [sub, caps] of Object.entries(tl.captions) as [Lang, NonNullable<(typeof tl.captions)[Lang]>][]) {
        writeFileSync(paths.subtitles(sub, "srt"), toSrt(caps));
        writeFileSync(paths.subtitles(sub, "vtt"), toVtt(caps));
        writeFileSync(join(paths.base, `subtitles.${sub}.ass`), toAss(caps, style));
      }
      const burned = variant.burn_subtitles ? (variant.subtitles[0] ?? null) : null;
      const soft = variant.subtitles.filter((s) => s !== burned);

      // 4. Delivery encode.
      const out = paths.output(quality);
      const t1 = performance.now();
      const fontsDir = relative(paths.base, join(root, "packages", "design", "fonts")).replace(/\\/g, "/");
      const args = render.composeArgs({
        scenes: scenes.map((s) => join(root, s.file)),
        audio: audioFile,
        softSubs: soft.map((s) => ({ path: paths.subtitles(s, "srt"), lang: s })),
        burn: burned ? { ass: `subtitles.${burned}.ass`, fontsDir } : null,
        fps: tl.fps,
        durationFrames: tl.durationFrames,
        quality,
        out,
        title: `${spec.title} (${lang})`,
        overlay: cast ? { path: cast.file, x: cast.x, y: cast.y, inputArgs: ["-c:v", "libvpx-vp9"] } : undefined,
      });
      const bar = progressBar(`  encode ${lang}`);
      await render.ffmpegRun(args, { cwd: paths.base, onFrame: (f) => bar(Math.min(f, tl.durationFrames), tl.durationFrames) });
      bar(tl.durationFrames, tl.durationFrames);
      const encodeSeconds = (performance.now() - t1) / 1000;

      // 5. Verify.
      const probe = render.ffprobeJson(out);
      const v = probe.streams.find((s) => s.codec_type === "video")!;
      const frames = Number(v.nb_frames);
      if (frames !== tl.durationFrames) warn(`film has ${frames} frames, timeline wants ${tl.durationFrames}`);
      const subsIn = probe.streams.filter((s) => s.codec_type === "subtitle").length;
      if (subsIn !== soft.length) warn(`expected ${soft.length} subtitle track(s), found ${subsIn}`);
      let audio: FilmReport["audio"] = null;
      if (audioFile) {
        const a = probe.streams.find((s) => s.codec_type === "audio");
        if (!a) warn("audio stream missing from the film");
        const ld = render.measureLoudness(out);
        if (Math.abs(ld.integrated - spec.audio.target_lufs) > 1) warn(`integrated loudness ${ld.integrated} LUFS, target ${spec.audio.target_lufs}`);
        if (ld.truePeak > -1) warn(`true peak ${ld.truePeak} dBTP exceeds -1 dBTP`);
        audio = { file: relative(root, audioFile).replace(/\\/g, "/"), music: !!spec.audio.music, sfx: placedSfx, integratedLufs: ld.integrated, truePeakDbtp: ld.truePeak, targetLufs: spec.audio.target_lufs };
      }
      for (const sub of variant.subtitles) {
        for (const ext of ["srt", "vtt"] as const) {
          const dst = out.replace(/\.mp4$/, `.${sub}.${ext}`);
          copyFileSync(paths.subtitles(sub, ext), dst);
          sidecars.push(relative(root, dst).replace(/\\/g, "/"));
        }
      }

      const report: FilmReport = {
        project: spec.id, lang, quality,
        out: relative(root, out).replace(/\\/g, "/"),
        estimatedTiming: tl.estimated,
        frames: { expected: tl.durationFrames, actual: frames },
        size: { width: Number(v.width), height: Number(v.height) },
        duration: Number(probe.format.duration),
        scenes,
        audio,
        cast: cast ? { ...cast, file: relative(root, cast.file).replace(/\\/g, "/") } : null,
        subtitles: { burned, soft, sidecars },
        warnings,
        seconds: { scenes: Math.round(sceneSeconds * 10) / 10, encode: Math.round(encodeSeconds * 10) / 10 },
      };
      writeFileSync(out.replace(/\.mp4$/, ".report.json"), JSON.stringify(report, null, 1));
      writeFileSync(out.replace(/\.mp4$/, ".receipts.md"), receipts(p));
      const loud = audio ? ` · ${audio.integratedLufs} LUFS, TP ${audio.truePeakDbtp} dBTP` : " · silent";
      log.ok(`${report.out} · ${frames} frames · ${report.size.width}x${report.size.height}${loud}${burned ? ` · burned ${burned} subs` : ""} · encode ${report.seconds.encode} s`);
      reports.push(report);
    }
  } finally {
    if (player) {
      await (await import("@vid/render")).closeBrowser();
      await player.server.close();
    }
  }
  return reports;
}
