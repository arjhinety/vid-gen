/**
 * Idle and talking body motion for a Live2D character, as pure functions of time.
 *
 * Idle: slow breathing, head and body sway on unrelated periods (5.3 / 4.1 / 6.7 s, so the loop
 * never visibly repeats), eyes drifting, seeded blinks with a 7-frame lid curve.
 * Talking: a slow sway eased in and out over 0.3 s with each speech run (switching it on in one
 * frame made the face jump ~3 px), and soft nods that start 6 frames before the sound they mark
 * (head moves lead speech). No fast bob: a 2.2 Hz bob read as twitchy (audit of 2026-09-29).
 */

export const BLINK = [1, 0.55, 0.1, 0, 0.25, 0.7, 1]; // lid openness per frame of a blink
export const NOD_S = 0.36;
export const NOD_DEG = 2.5;
export const NOD_LEAD_FRAMES = 6;

const sin = (t: number, period: number, phase = 0) => Math.sin((2 * Math.PI * t) / period + phase);
const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Blink start frames: every 2.5-5.5 s from 1.2 s, 15% of them doubled. Consumes `r` in order. */
export function blinkFrames(r: () => number, n: number, fps: number): number[] {
  const blinks: number[] = [];
  for (let t = 1.2; t < n / fps; t += 2.5 + r() * 3) {
    blinks.push(Math.round(t * fps));
    if (r() < 0.15) blinks.push(Math.round(t * fps) + 9); // double blink
  }
  return blinks;
}

export function eyeOpen(f: number, blinks: number[]): number {
  let eye = 1;
  for (const b of blinks) if (f >= b && f < b + BLINK.length) eye = Math.min(eye, BLINK[f - b]!);
  return eye;
}

/** 0 when silent, 1 while talking, eased over 0.3 s at each run's edges. */
export function talkEnvelope(t: number, runs: Array<[number, number]>): number {
  return Math.max(0, ...runs.map(([a, b]) => smooth(Math.min((t - a) / 0.3, (b - t) / 0.3))));
}

/** Head pitch offset (degrees, negative = down) of the nods starting at `nods` (s). */
export function nodAngle(t: number, nods: number[]): number {
  return nods.reduce((y, s) => (t >= s && t < s + NOD_S ? y - (NOD_DEG * (1 - Math.cos((2 * Math.PI * (t - s)) / NOD_S))) / 2 : y), 0);
}

/** Nods for real speech: one as each run starts, then on stressed syllables at least `gapS` apart
 * and not in a run's last 0.4 s. Returned as nod start times (already leading by 6 frames). */
export function nodsForSpeech(runs: Array<[number, number]>, stresses: number[], fps: number, gapS = 1.5): number[] {
  const out: number[] = [];
  for (const [a, b] of runs) {
    let last = a;
    out.push(a);
    for (const s of stresses) if (s > a && s < b - 0.4 && s - last >= gapS) out.push((last = s));
  }
  return out.map((s) => s - NOD_LEAD_FRAMES / fps);
}

/** Every body parameter except the mouth, for frame `f`. */
export function bodyParams(f: number, fps: number, blinks: number[], runs: Array<[number, number]>, nods: number[]): Record<string, number> {
  const t = f / fps;
  const eye = eyeOpen(f, blinks);
  return {
    ParamBreath: 0.5 + 0.5 * sin(t, 3.4),
    ParamAngleX: 9 * sin(t, 5.3) + talkEnvelope(t, runs) * 1.5 * sin(t, 2.8),
    ParamAngleY: 4 * sin(t, 4.1, 1) + nodAngle(t, nods),
    ParamAngleZ: 5 * sin(t, 6.7),
    ParamBodyAngleX: 3 * sin(t, 5.3, -0.4),
    ParamBodyAngleZ: 2 * sin(t, 6.7, -0.3),
    ParamEyeBallX: 0.25 * sin(t, 4.4),
    ParamEyeLOpen: eye,
    ParamEyeROpen: eye,
  };
}
