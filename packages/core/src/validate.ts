/**
 * Cross-file checks that schemas alone cannot express. Returns problems instead
 * of throwing so `video check` can report everything at once.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cueNames, parseCues } from "./cues.ts";
import { parseProsody } from "./schema.ts";
import type { LoadedProject } from "./project.ts";
import type { Lang } from "./schema.ts";

export interface Problem {
  level: "error" | "warn";
  where: string;
  message: string;
}

export function validateProject(p: LoadedProject): Problem[] {
  const out: Problem[] = [];
  const err = (where: string, message: string) => out.push({ level: "error", where, message });
  const warn = (where: string, message: string) => out.push({ level: "warn", where, message });

  const langs = Object.keys(p.spec.languages) as Lang[];
  const beatIds = new Set<string>();
  for (const b of p.narration.beats) {
    if (beatIds.has(b.id)) err(`beat ${b.id}`, "duplicate beat id");
    beatIds.add(b.id);
  }

  // Scenes -> beats: every beat used exactly once, in narration order.
  const used = new Map<string, string>();
  const sceneIds = new Set<string>();
  for (const s of p.spec.scenes) {
    if (sceneIds.has(s.id)) err(`scene ${s.id}`, "duplicate scene id");
    sceneIds.add(s.id);
    for (const b of s.beats) {
      if (!beatIds.has(b)) err(`scene ${s.id}`, `unknown beat '${b}'`);
      if (used.has(b)) err(`scene ${s.id}`, `beat '${b}' already used by scene '${used.get(b)}'`);
      used.set(b, s.id);
    }
    if (!s.beats.length && s.min_duration <= 0) err(`scene ${s.id}`, "silent scene needs min_duration > 0");
    const entryFile = join(p.dir, s.entry.split(":")[0]!);
    if (!existsSync(entryFile)) err(`scene ${s.id}`, `entry not found: ${s.entry}`);
    if (s.renderer === "manim" && !s.entry.includes(":")) err(`scene ${s.id}`, "manim entry must be 'file.py:ClassName'");
  }
  for (const b of beatIds) if (!used.has(b)) warn(`beat ${b}`, "not placed in any scene (will not be rendered)");
  const order = p.spec.scenes.flatMap((s) => s.beats);
  const narrOrder = p.narration.beats.map((b) => b.id).filter((id) => used.has(id));
  if (order.join() !== narrOrder.join()) warn("scenes", "scene beat order differs from narration.yaml order");

  // Audio: files exist; SFX pins name a real scene and one of its cues.
  const { music, sfx } = p.spec.audio;
  if (music?.path && !existsSync(join(p.root, music.path))) err("audio.music", `file not found: ${music.path}`);
  for (const [i, t] of (music?.tracks ?? []).entries()) {
    if (!existsSync(join(p.root, t.path))) err(`audio.music.tracks[${i}]`, `file not found: ${t.path}`);
    if (i > 0 && !p.spec.scenes.some((s) => s.id === t.from)) err(`audio.music.tracks[${i}]`, `unknown scene '${t.from}'`);
  }
  for (const fx of sfx) {
    const [sceneId, cue] = [fx.at.slice(0, fx.at.indexOf(":")), fx.at.slice(fx.at.indexOf(":") + 1)];
    const scene = p.spec.scenes.find((s) => s.id === sceneId);
    if (fx.path && !existsSync(join(p.root, fx.path))) err(`sfx ${fx.at}`, `file not found: ${fx.path}`);
    if (!scene) {
      err(`sfx ${fx.at}`, `unknown scene '${sceneId}'`);
      continue;
    }
    if (/^(line:|beat:|beat-end:)/.test(cue)) continue;
    const beats = p.narration.beats.filter((b) => scene.beats.includes(b.id));
    if (!beats.some((b) => b.lines.some((l) => cueNames(l.en).includes(cue)))) err(`sfx ${fx.at}`, `scene '${sceneId}' has no cue '${cue}'`);
  }

  // Prosody tones must parse (speed / pitch / range, within bounds).
  for (const v of Object.values(p.voices)) {
    if (v?.tone_via !== "prosody") continue;
    for (const [t, spec] of Object.entries(v.tones)) {
      try {
        parseProsody(spec);
      } catch (e) {
        err(`voice ${v.id}`, `tone '${t}': ${(e as Error).message}`);
      }
    }
  }

  // Lines: translations present and cue names identical across languages.
  const claimIds = new Set(p.claims.map((c) => c.id));
  for (const b of p.narration.beats) {
    b.lines.forEach((l, i) => {
      const where = `beat ${b.id} line ${i + 1}`;
      if (langs.includes("ja") && !l.ja) err(where, "missing 'ja' text (Japanese variant is enabled)");
      const en = cueNames(l.en).sort().join();
      if (l.ja !== undefined && cueNames(l.ja).sort().join() !== en)
        err(where, `cue markers differ between en [${en}] and ja [${cueNames(l.ja).sort().join()}]`);
      for (const c of l.claims) if (!claimIds.has(c)) err(where, `unknown claim '${c}'`);
      // Every tone must mean something to the voice that will speak it.
      for (const lang of langs) {
        const v = p.voices[lang];
        if (!v || v.tone_via === "none") continue;
        const texts = [lang === "en" ? l.en : l.ja, lang === "en" ? l.say_en : l.say_ja].filter((t): t is string => !!t);
        const used = [...(l.tone ? [l.tone] : []), ...texts.flatMap((t) => parseCues(t).tones.map((x) => x.name))];
        for (const t of used) if (!(t in v.tones)) err(where, `tone '${t}' is not in voice '${v.id}' (tones: ${Object.keys(v.tones).join(", ") || "none"})`);
      }
    });
  }
  for (const s of p.spec.scenes) for (const c of s.claims) if (!claimIds.has(c)) err(`scene ${s.id}`, `unknown claim '${c}'`);

  // Claims point at real files in the source repository they cite.
  for (const c of p.claims) {
    if (!c.source_path) err(`claim ${c.id}`, "missing source_path");
  }
  return out;
}
