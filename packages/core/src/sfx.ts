/** Resolve cue-pinned sound effects to absolute film times. */
import type { ProjectSpec } from "./schema.ts";
import type { Timeline } from "./timeline.ts";

export interface PlacedSfx {
  at: string;
  start: number;
  sound?: string;
  path?: string;
  gain_db: number;
}

export function placeSfx(tl: Timeline, sfx: ProjectSpec["audio"]["sfx"]): PlacedSfx[] {
  return sfx.map((fx) => {
    const i = fx.at.indexOf(":");
    const sceneId = fx.at.slice(0, i);
    const cue = fx.at.slice(i + 1);
    const scene = tl.scenes.find((s) => s.id === sceneId);
    if (!scene) throw new Error(`sfx '${fx.at}': unknown scene '${sceneId}'`);
    const c = scene.cues[cue];
    if (!c) throw new Error(`sfx '${fx.at}': scene '${sceneId}' has no cue '${cue}' (known: ${Object.keys(scene.cues).join(", ")})`);
    const start = Math.max(0, scene.start + c.t + fx.offset);
    return { at: fx.at, start: Math.round(start * 1000) / 1000, gain_db: fx.gain_db, ...(fx.sound ? { sound: fx.sound } : { path: fx.path }) };
  });
}

/** An `impact` on every scene cut (each scene start after the first). */
export function cutHits(tl: Timeline, gain_db: number): PlacedSfx[] {
  return tl.scenes.slice(1).map((s) => ({ at: `cut:${s.id}`, start: Math.round(s.start * 1000) / 1000, gain_db, sound: "impact" }));
}
