/** Checks over build artifacts (run by `video check` when they exist). */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildPaths, type LoadedProject, type Problem, type Timeline, type Lang } from "@vid/core";

export function artifactProblems(p: LoadedProject): Problem[] {
  const out: Problem[] = [];
  for (const lang of Object.keys(p.spec.languages) as Lang[]) {
    const paths = buildPaths(p.root, p.spec.id, lang);
    if (!existsSync(paths.timeline)) {
      out.push({ level: "warn", where: `build/${lang}`, message: "no narration built yet (timing is estimated)" });
      continue;
    }
    const tl = JSON.parse(readFileSync(paths.timeline, "utf8")) as Timeline;
    // Frames tile the film exactly.
    let expect = 0;
    for (const s of tl.scenes) {
      if (s.startFrame !== expect) out.push({ level: "error", where: `timeline ${lang}/${s.id}`, message: `starts at frame ${s.startFrame}, expected ${expect}` });
      expect = s.startFrame + s.durationFrames;
      for (const [k, c] of Object.entries(s.cues)) {
        if (c.estimated) out.push({ level: "warn", where: `timeline ${lang}/${s.id}`, message: `cue '${k}' is estimated (no word alignment)` });
        if (c.frame < 0 || c.frame >= s.durationFrames) out.push({ level: "error", where: `timeline ${lang}/${s.id}`, message: `cue '${k}' at frame ${c.frame} outside scene (${s.durationFrames} frames)` });
      }
      for (const l of s.lines) if (!existsSync(join(p.root, l.audio))) out.push({ level: "error", where: `timeline ${lang}/${s.id}`, message: `missing audio ${l.audio}` });
    }
    if (expect !== tl.durationFrames) out.push({ level: "error", where: `timeline ${lang}`, message: `scenes cover ${expect} frames, film has ${tl.durationFrames}` });
    // Captions: ordered, non-overlapping, inside the film, never longer than two lines.
    for (const [sub, caps] of Object.entries(tl.captions)) {
      caps!.forEach((c, i) => {
        const where = `captions ${lang}/${sub} #${i + 1}`;
        if (c.end <= c.start) out.push({ level: "error", where, message: "non-positive duration" });
        if (i && c.start < caps![i - 1]!.end - 1e-3) out.push({ level: "error", where, message: "overlaps previous caption" });
        if (c.end > tl.duration + 0.5) out.push({ level: "error", where, message: "ends after the film" });
        if (c.text.split("\n").length > 2) out.push({ level: "error", where, message: "more than two lines" });
      });
    }
  }
  return out;
}
