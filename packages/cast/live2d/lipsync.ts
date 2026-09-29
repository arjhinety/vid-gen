/**
 * Mouth track for a drawn-mouth Live2D model (anime lip flap, 口パク), from phoneme timings.
 *
 * The mouth is an exclusive switch of drawn shapes (psd_prep.MOUTH_SHAPES order), swapped whole.
 * Timing follows hand-drawn practice, not one open-close per syllable: inside speech a loop of
 * open -> half -> open -> closed with holds of 4-7 frames (~6 changes/s at the "standard" pace
 * the owner chose), coloured by the sound being spoken:
 *   - the open drawing is "oh" on a rounded vowel (o, u, w), otherwise "ah";
 *   - a held vowel (>= 200 ms) keeps its own shape;
 *   - a real lip closure (m/b/p >= 50 ms) closes the mouth for at least 2 frames;
 *   - only a real pause (>= 150 ms) stops the flap; the last open drawing stays 2 frames into it;
 *   - the mouth leads the sound by one frame;
 *   - no drawing is shorter than 4 frames (a closure: 2), or it reads as flicker.
 * Measured basis: research audit of 2026-09-29 (hand-drawn loop 6 changes/s, holds 133-233 ms).
 *
 * Pure: the same phones, frame count and seed always give the same track.
 */

export const MOUTH = { closed: 0, small: 1, ah: 2, oh: 3, laugh: 4 } as const;
export const LOOPS = { standard: [6, 5, 5, 4], calm: [7, 6, 6, 4] } as const; // open, half, open, closed (frames at 30 fps)
export type Pace = keyof typeof LOOPS;

/** [start s, end s, phoneme] on the clip's timeline. English phonemes are Kokoro/misaki symbols. */
export type Phone = [number, number, string];

export interface LipSyncOptions {
  fps: number;
  pace?: Pace;
  seed?: number;
  leadFrames?: number;
  tailFrames?: number;
  pauseS?: number;
  sustainS?: number;
  bilabialS?: number;
  minOpen?: number;
  minClosed?: number;
}

// misaki's English symbols (A = eI, I = aI, W = aU, Y = OI, O = oU; ᵊ a reduced schwa)
const OPEN = new Set([..."ɑæaʌɛIW"]);
const ROUND = new Set([..."OoɔYuʊɒw"]);
const NARROW = new Set([..."ɪiAeəᵊɚɜɐ"]);
const BILABIAL = new Set([..."mbp"]);
const BREAK = new Set([..." .,!?;:—…\"“”()"]);

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Speech runs [start s, end s]: phones joined across breaks shorter than `pauseS`. */
export function speechRuns(phones: Phone[], pauseS = 0.15): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  for (const [t0, t1, p] of phones) {
    if (BREAK.has(p)) continue;
    const last = runs[runs.length - 1];
    if (last && t0 - last[1] < pauseS) last[1] = t1;
    else runs.push([t0, t1]);
  }
  return runs;
}

/** Start times of primary-stressed vowels (misaki writes ˈ just before the stressed vowel). */
export function stressTimes(phones: Phone[]): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < phones.length; i++) if (phones[i]![2] === "ˈ") out.push(phones[i + 1]![0]);
  return out;
}

export function mouthTrack(phones: Phone[], n: number, o: LipSyncOptions): number[] {
  const { fps } = o;
  const loop = LOOPS[o.pace ?? "standard"];
  const lead = o.leadFrames ?? 1;
  const tail = o.tailFrames ?? 2;
  const pauseS = o.pauseS ?? 0.15;
  const sustainS = o.sustainS ?? 0.2;
  const bilabialS = o.bilabialS ?? 0.05;
  const minOpen = o.minOpen ?? 4;
  const minClosed = o.minClosed ?? 2;
  const r = mulberry(o.seed ?? 7);

  // per-frame features, sampled one frame ahead (the mouth leads the sound)
  const speech = new Array<boolean>(n).fill(false);
  const vowel = new Array<number | null>(n).fill(null);
  const held = new Array<number | null>(n).fill(null);
  const closure = new Array<boolean>(n).fill(false);
  let cur: number | null = null;
  let k = 0;
  for (let f = 0; f < n; f++) {
    const tc = (f + 0.5 + lead) / fps;
    while (k < phones.length && phones[k]![1] <= tc) k++;
    const ph = phones[k];
    if (!ph || ph[0] > tc) continue;
    const [t0, t1, p] = ph;
    const d = t1 - t0;
    if (BREAK.has(p)) {
      speech[f] = d < pauseS && f > 0 && speech[f - 1]!;
      continue;
    }
    speech[f] = true;
    const cls = OPEN.has(p) ? MOUTH.ah : ROUND.has(p) ? MOUTH.oh : NARROW.has(p) ? MOUTH.small : null;
    if (cls !== null) cur = cls;
    vowel[f] = cur;
    if (cls !== null && d >= sustainS) held[f] = cls;
    if (BILABIAL.has(p) && d >= bilabialS) closure[f] = true;
  }

  // the loop, interrupted by closures and held vowels
  const seq = new Array<number>(n).fill(MOUTH.closed);
  let step = 0;
  for (let f = 0; f < n; ) {
    if (!speech[f]) {
      step = 0;
      f++;
      continue;
    }
    if (closure[f]) {
      let g = f;
      while (g < n && closure[g]) g++;
      g = Math.min(n, Math.max(g, f + minClosed));
      seq.fill(MOUTH.closed, f, g);
      f = g;
      step = 0; // a real closure stands in for the loop's closed step
      continue;
    }
    const v = held[f];
    if (v !== null && v !== undefined) {
      let g = f;
      while (g < n && held[g] === v) g++;
      seq.fill(v, f, g);
      f = g;
      step = 1; // continue with the half-open drawing
      continue;
    }
    const s = step % 4;
    const hold = s === 3 ? loop[3] : Math.max(minOpen, loop[s]! + [-1, 0, 0, 1][Math.floor(r() * 4)]!);
    const shape = s === 1 ? MOUTH.small : s === 3 ? MOUTH.closed : vowel[f] === MOUTH.oh ? MOUTH.oh : MOUTH.ah;
    let g = f;
    while (g < Math.min(n, f + hold) && speech[g] && !closure[g] && held[g] === null) g++;
    g = Math.max(g, f + 1);
    seq.fill(shape, f, g);
    f = g;
    step++;
  }

  // the last open drawing stays a moment into each pause
  for (let f = 1; f < n; f++) {
    if (speech[f - 1] && !speech[f] && seq[f - 1] !== MOUTH.closed) {
      for (let g = f; g < Math.min(n, f + tail) && !speech[g]; g++) seq[g] = seq[f - 1]!;
    }
  }
  return enforceMinHold(seq, minOpen, minClosed);
}

/** Runs shorter than their minimum join a neighbour; a short closure first borrows frames from
 * its longer neighbour (a lip closure should be seen, not deleted). */
export function enforceMinHold(seq: number[], minOpen = 4, minClosed = 2): number[] {
  const runs: Array<[number, number]> = [];
  for (const v of seq) {
    const last = runs[runs.length - 1];
    if (last && last[0] === v) last[1]++;
    else runs.push([v, 1]);
  }
  const min = (v: number) => (v === MOUTH.closed ? minClosed : minOpen);
  for (let changed = true; changed && runs.length > 1; ) {
    changed = false;
    for (let i = 0; i < runs.length; i++) {
      const [v, l] = runs[i]!;
      if (l >= min(v)) continue;
      const nbs = [i - 1, i + 1].filter((j) => j >= 0 && j < runs.length);
      const nb = nbs.reduce((a, b) => (runs[b]![1] > runs[a]![1] ? b : a));
      if (v === MOUTH.closed) {
        const need = min(v) - l;
        if (runs[nb]![1] - min(runs[nb]![0]) >= need) {
          runs[nb]![1] -= need;
          runs[i]![1] += need;
          changed = true;
          break;
        }
      }
      runs[nb]![1] += l;
      runs.splice(i, 1);
      for (let j = 0; j < runs.length - 1; ) {
        if (runs[j]![0] === runs[j + 1]![0]) {
          runs[j]![1] += runs[j + 1]![1];
          runs.splice(j + 1, 1);
        } else j++;
      }
      changed = true;
      break;
    }
  }
  return runs.flatMap(([v, l]) => new Array<number>(l).fill(v));
}

/** Phones cut back to where the audio is actually sounding: a phrase's last phone that runs on over
 * the silence ends where the silence starts, and nothing is left inside a quiet stretch. */
export function heardPhones(phones: Phone[], quiet: Array<[number, number]>): Phone[] {
  const heard: Phone[] = [];
  for (const [a0, b0, p] of phones) {
    let a = a0, b = b0;
    for (const [q0, q1] of quiet) {
      if (q0 <= a && a < q1) a = q1;
      if (a < q0 && q0 < b) b = q0;
    }
    if (b > a) heard.push([a, b, p]);
  }
  return heard;
}
