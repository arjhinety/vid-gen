/**
 * The presenter's parameter track for a whole film: one entry per frame of the timeline.
 *
 * - Mouth: every line's phones at its place in the film (the timeline's line start), cut back to
 *   the audible audio, through the anime lip-flap loop (lipsync.ts).
 * - Body: idle breathing and sway, seeded blinks, a slow talking sway and nods (motion.ts).
 * - Head: each line's `tone` (the script's delivery direction) as a small head pose, eased in just
 *   before the line and out after it. A curious line followed by a long pause is the viewer's turn
 *   (the scenes draw a ThinkRing there): she holds the questioning tilt through the pause, looking
 *   at the viewer.
 * - Smile: after a warm, resolved or teasing line, in the pause, her eyes switch to the drawn happy
 *   arcs (^^), with the open laughing mouth after warm ones. Switched, never blended: the eye smile
 *   is a pair of drawings, and any value between 0 and 1 shows both at once (a ghosted double eye).
 *   The brow parameters are left alone: on this model the brows sit under the fringe and do not show.
 * - Gaze: when an exhibit moves (a scene cue), she glances at the stage on her right (the
 *   viewer's left), at most once every GLANCE_GAP_S, never in the viewer's turn.
 *
 * Pure: the same inputs always give the same track.
 */
import { heardPhones, MOUTH, type Phone, mouthTrack, mulberry, speechRuns, stressTimes, type Pace } from "./lipsync.ts";
import { blinkFrames, bodyParams, nodsForSpeech } from "./motion.ts";

/** Per-tone head pose (degrees, added to the body's sway), at full strength. */
export const TONE_POSE: Record<string, Record<string, number>> = {
  warm: { ParamAngleZ: 3 },
  resolve: { ParamAngleY: 2 },
  irony: { ParamAngleZ: 6 }, // teasing: a tilt
  curious: { ParamAngleZ: -7 },
  surprise: { ParamAngleY: 3 },
  disbelief: { ParamAngleZ: 4, ParamAngleY: 1 },
  gravity: { ParamAngleY: -3 },
  reveal: { ParamAngleY: 2 },
};
/** Tones followed by a smile in the pause, and whether the mouth laughs (MOUTH.laugh) or stays closed. */
export const SMILE_AFTER: Record<string, { laugh: boolean }> = { warm: { laugh: true }, resolve: { laugh: true }, irony: { laugh: false } };
const SMILE_START_S = 0.1; // after the line's audio ends (the drawn mouth tail is 2 frames)
const SMILE_MAX_S = 1.1;
const SMILE_LAST_MAX_S = 2.5; // the film's last line holds its smile longer
const SMILE_CLEAR_S = 0.35; // eyes open again this long before the next line
const SMILE_MIN_S = 0.5;
/** The viewer's turn: after a curious line, a pause at least this long. */
export const TURN_MIN_S = 2.5;
const ATTACK_S = 0.35;
const RELEASE_S = 0.5;
const GLANCE = { ParamAngleX: -10, ParamEyeBallX: -0.7 };
const GLANCE_GAP_S = 6;
const GLANCE_S = [0.25, 0.7, 0.35] as const; // in, hold, out

export interface FilmLine {
  key: string;
  /** Film seconds. */
  start: number;
  end: number;
  tone?: string;
  /** Seconds of silence until the next line starts (or the film ends). */
  pauseAfter: number;
  /** Phones and quiet stretches in line time (narration.ts). */
  phones: Phone[];
  quiet: Array<[number, number]>;
}

export interface FilmTrackOptions {
  fps: number;
  frames: number;
  lines: FilmLine[];
  /** Film seconds at which an exhibit moves (scene cues, scene starts). */
  cues: number[];
  pace?: Pace;
  seed?: number;
}

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
/** 0 outside [a, b], 1 inside, eased over `up` before a and `down` after b. */
const span = (t: number, a: number, b: number, up: number, down: number) => smooth(Math.min((t - (a - up)) / up, (b + down - t) / down));

export function filmTrack(o: FilmTrackOptions) {
  const { fps, frames: n } = o;
  const phones: Phone[] = [];
  const quiet: Array<[number, number]> = [];
  for (const l of o.lines) {
    for (const [a, b, p] of l.phones) phones.push([l.start + a, l.start + b, p]);
    for (const [a, b] of l.quiet) quiet.push([l.start + a, l.start + b]);
  }
  const heard = heardPhones(phones, quiet);
  const mouth = mouthTrack(heard, n, { fps, pace: o.pace ?? "standard", seed: o.seed ?? 7 });
  const runs = speechRuns(heard);
  const nods = nodsForSpeech(runs, stressTimes(heard), fps);
  const blinks = blinkFrames(mulberry((o.seed ?? 7) + 4), n, fps);

  // Head poses: [from, to] with the tone held over it.
  const poses = o.lines.flatMap((l) => {
    const turn = l.tone === "curious" && l.pauseAfter >= TURN_MIN_S;
    const pose = l.tone ? TONE_POSE[l.tone] : undefined;
    const hold = turn ? l.pauseAfter : Math.min(1.2, Math.max(0.3, l.pauseAfter * 0.6));
    return pose ? [{ a: l.start - 0.15, b: l.end + hold, v: pose }] : [];
  });
  // Smiles: frame ranges [f0, f1) in the pause after a line.
  const smiles = o.lines.flatMap((l, i) => {
    const sm = l.tone ? SMILE_AFTER[l.tone] : undefined;
    if (!sm) return [];
    const len = Math.min(i === o.lines.length - 1 ? SMILE_LAST_MAX_S : SMILE_MAX_S, l.pauseAfter - SMILE_START_S - SMILE_CLEAR_S);
    if (len < SMILE_MIN_S) return [];
    const f0 = Math.round((l.end + SMILE_START_S) * fps);
    return [{ f0, f1: Math.min(n, f0 + Math.round(len * fps)), laugh: sm.laugh }];
  });
  const turns = o.lines.filter((l) => l.tone === "curious" && l.pauseAfter >= TURN_MIN_S).map((l) => [l.end - 0.3, l.end + l.pauseAfter + 0.3] as const);

  // Glances at the stage.
  const glances: number[] = [];
  for (const c of [...o.cues].sort((a, b) => a - b)) {
    const s = c - 0.1;
    if (s < 1 || s + GLANCE_S[0] + GLANCE_S[1] + GLANCE_S[2] > n / fps) continue;
    if (glances.length && s - glances[glances.length - 1]! < GLANCE_GAP_S) continue;
    if (turns.some(([a, b]) => s + 1.3 > a && s < b)) continue;
    glances.push(s);
  }

  const track = Array.from({ length: n }, (_, f) => {
    const t = f / fps;
    const v: Record<string, number> = { ...bodyParams(f, fps, blinks, runs, nods), ParamMouthShape: mouth[f]!, ParamEyeSmile: 0 };
    const add = (vals: Record<string, number>, w: number) => {
      if (w > 0) for (const [k, x] of Object.entries(vals)) v[k] = (v[k] ?? 0) + x * w;
    };
    for (const p of poses) add(p.v, span(t, p.a, p.b, ATTACK_S, RELEASE_S));
    for (const g of glances) add(GLANCE, span(t, g + GLANCE_S[0], g + GLANCE_S[0] + GLANCE_S[1], GLANCE_S[0], GLANCE_S[2]));
    v.ParamEyeBallX = Math.max(-1, Math.min(1, v.ParamEyeBallX ?? 0));
    const sm = smiles.find((x) => f >= x.f0 && f < x.f1);
    if (sm) {
      v.ParamEyeSmile = 1;
      if (sm.laugh && mouth[f] === MOUTH.closed) v.ParamMouthShape = MOUTH.laugh;
    }
    return v;
  });

  let changes = 0, single = 0;
  const talkS = runs.reduce((s, [a, b]) => s + (b - a), 0);
  for (let f = 1; f < n; f++) if (mouth[f] !== mouth[f - 1]) changes++;
  for (let f = 0, g = 0; f < n; f = g) { g = f; while (g < n && mouth[g] === mouth[f]) g++; if (g - f === 1) single++; }
  const tones: Record<string, number> = {};
  for (const l of o.lines) if (l.tone) tones[l.tone] = (tones[l.tone] ?? 0) + 1;
  const summary = {
    frames: n, lines: o.lines.length, phones: heard.length, talk_s: +talkS.toFixed(1),
    mouth_changes_per_talk_s: +(changes / talkS).toFixed(2), single_frame_drawings: single,
    shares: [0, 1, 2, 3, 4].map((k) => +(mouth.filter((m) => m === k).length / n).toFixed(3)),
    nods: nods.length, blinks: blinks.length, glances: glances.length, viewer_turns: turns.length, smiles: smiles.length, tones,
  };
  return { track, summary, heard, mouth, glances };
}
