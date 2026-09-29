/**
 * A project's narration as mouth timings, one entry per line, in the line's own time (0 = the
 * first sample of the prepared line WAV that the timeline places). Shared by live2d-say.ts (a
 * clip of a few lines) and the film's cast track (every line, at its place in the film).
 *
 * English (Kokoro): py/tts/kokoro/timings.py re-predicts each line's phoneme durations for the
 * text, voice and speed of the project's TTS job; every line's total is checked against its cached
 * WAV to the sample, and nothing is returned if any line does not match. Times are then moved onto
 * the prepared line (tempo, trimmed head). Japanese (Irodori) has no timings here yet.
 *
 * Two corrections come from measurement on the 62 Study 001 English lines (2026-09-29):
 *   - speech starts a median 35 ms before Kokoro's predicted phone start (81 onsets, IQR 20-55 ms);
 *   - the last phone of a phrase runs on over the trailing silence, so wherever the audio itself is
 *     quiet for >= 120 ms the mouth is closed, whatever the phones say (`quiet`, `heardPhones`).
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadProject, type Lang } from "@vid/core";
import type { Phone } from "./lipsync.ts";
export { heardPhones } from "./lipsync.ts";

export const ONSET_S = -0.035; // measured: actual speech onset minus Kokoro's predicted phone start
const QUIET_DB = 30; // below the line's peak 10 ms level by this much = quiet
const QUIET_MIN_S = 0.12;
const KOKORO_PY = "py/tts/kokoro/.venv/Scripts/python.exe"; // as in py/tts/engines.yaml

export interface LineMouth {
  id: string;
  /** The prepared line WAV (absolute) and its length (s). */
  wav: string;
  duration: number;
  /** Phones in line time, clipped to [0, duration]. */
  phones: Phone[];
  /** Stretches (line time) where the audio is quiet for >= 120 ms. */
  quiet: Array<[number, number]>;
}

export interface NarrationTimings {
  lines: Map<string, LineMouth>;
  tempo: number;
  /** True when the Kokoro pass was skipped because the same job already had verified results. */
  reused: boolean;
}

/** Every built line's key, in script order (build/<project>/<lang>/audio/lines.json). */
export function lineIds(root: string, project: string, lang: string): string[] {
  return Object.keys(readLines(root, project, lang));
}

function readLines(root: string, project: string, lang: string) {
  return JSON.parse(readFileSync(join(root, "build", project, lang, "audio", "lines.json"), "utf8")) as Record<string, { path: string; duration: number }>;
}

/**
 * Mouth timings for `ids` (keys like "l01#0"). `work` holds the Kokoro job and its results; when
 * the job is unchanged and its results all verified, Kokoro is not run again.
 */
export function narrationTimings(root: string, project: string, lang: string, ids: string[], work: string): NarrationTimings {
  if (lang !== "en") throw new Error(`no phoneme timings for '${lang}' yet (Kokoro/English only)`);
  const audioDir = join(root, "build", project, lang, "audio");
  const lines = readLines(root, project, lang);
  if (!ids.length || ids.some((id) => !lines[id])) throw new Error(`unknown line in [${ids.join(", ")}]`);

  // What each line's final take was made from: the text and direction sent to the engine (qa.json;
  // cached lines leave no TTS job behind), and its raw WAV, head trim and tempo (the prep job of the
  // attempt that made the chosen take, matched by its seed).
  const qa = JSON.parse(readFileSync(join(audioDir, "qa.json"), "utf8")) as { engine: string; lines: Array<{ key: string; seed: number; spoken: string; sent?: string; prosody?: Record<string, number> }> };
  if (qa.engine !== "kokoro") throw new Error(`${project}/${lang}: engine '${qa.engine}' has no timing extractor (Kokoro only)`);
  const voice = loadProject(project, root).voices[lang as Lang]?.params ?? (() => { throw new Error(`${project}: no '${lang}' voice`); })();
  const takes = new Map<string, { text: string; prosody?: Record<string, number>; wav: string; head: number; tempo: number }>();
  const jobs = readdirSync(join(audioDir, "jobs")).filter((f) => /^prep-\d+\.json$/.test(f)).sort();
  for (const q of qa.lines) {
    const take = `${q.key.replace("#", "_")}-s${q.seed}.wav`;
    for (const j of jobs) {
      const prep = JSON.parse(readFileSync(join(audioDir, "jobs", j), "utf8")) as { tempo?: number; items: Array<{ id: string; src: string; out: string }> };
      const it = prep.items.find((x) => x.id === q.key && x.out.replace(/\\/g, "/").endsWith(`/${take}`));
      if (!it) continue;
      const r = (JSON.parse(readFileSync(join(audioDir, "jobs", j.replace(/\.json$/, ".results.json")), "utf8")) as Array<{ id: string; trimmed_head: number }>).find((x) => x.id === q.key);
      if (!r) throw new Error(`${q.key}: ${j} has no result`);
      takes.set(q.key, { text: q.sent ?? q.spoken, ...(q.prosody ? { prosody: q.prosody } : {}), wav: it.src, head: r.trimmed_head, tempo: Number(prep.tempo ?? 1) });
    }
  }
  const tempos = new Set([...takes.values()].map((t) => t.tempo));
  if (tempos.size > 1) throw new Error(`prep jobs disagree on tempo (${[...tempos].join(", ")})`);
  const tempo = [...tempos][0] ?? 1;

  // ---- Kokoro's phoneme timings, verified against each cached WAV ---------------------------
  mkdirSync(work, { recursive: true });
  const jobPath = join(work, "timings.json");
  const resultsPath = jobPath.replace(/\.json$/, ".results.json");
  const job = JSON.stringify({ voice, device: "cpu", items: ids.map((id) => {
    const it = takes.get(id) ?? (() => { throw new Error(`${id}: no prep record of its final take`); })();
    return { id, text: it.text, ...(it.prosody ? { prosody: it.prosody } : {}), wav: it.wav };
  }) }, null, 1);
  type Result = { items: Array<{ id: string; ok: boolean; error?: string; match?: boolean; phones: Phone[] }> };
  const verified = (r: Result) => r.items.length === ids.length && r.items.every((t) => t.ok && t.match === true);
  let reused = false;
  if (existsSync(jobPath) && existsSync(resultsPath) && readFileSync(jobPath, "utf8") === job && verified(JSON.parse(readFileSync(resultsPath, "utf8")) as Result)) {
    reused = true;
  } else {
    writeFileSync(jobPath, job);
    const py = spawnSync(join(root, KOKORO_PY), [join(root, "py/tts/kokoro/timings.py"), jobPath], { stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
    if (py.status !== 0) throw new Error("kokoro timings failed");
  }
  const timing = JSON.parse(readFileSync(resultsPath, "utf8")) as Result;
  for (const t of timing.items) {
    if (!t.ok) throw new Error(`${t.id}: ${t.error}`);
    if (t.match !== true) throw new Error(`${t.id}: re-predicted durations do not match its WAV; timings would be wrong`);
  }

  // ---- move phones onto the prepared line, find quiet stretches ------------------------------
  const out = new Map<string, LineMouth>();
  for (const id of ids) {
    const line = lines[id]!;
    const head = takes.get(id)!.head;
    const wav = join(root, line.path);
    const phones: Phone[] = [];
    for (const [a, b, p] of timing.items.find((x) => x.id === id)!.phones) {
      const a2 = (a + ONSET_S) / tempo - head, b2 = (b + ONSET_S) / tempo - head;
      if (b2 > 0 && a2 < line.duration) phones.push([Math.max(0, a2), Math.min(line.duration, b2), p]);
    }
    out.set(id, { id, wav, duration: line.duration, phones, quiet: quietStretches(wav) });
  }
  return { lines: out, tempo, reused };
}

function quietStretches(file: string): Array<[number, number]> {
  const { sr, x } = wavMono16(file);
  const hop = Math.round(sr * 0.01);
  const db = Array.from({ length: Math.floor(x.length / hop) }, (_, k) => {
    let s = 0;
    for (let i = k * hop; i < (k + 1) * hop; i++) s += x[i]! * x[i]!;
    return 10 * Math.log10(s / hop + 1e-12);
  });
  const peak = Math.max(...db);
  const quiet: Array<[number, number]> = [];
  for (let k = 0; k < db.length; ) {
    let j = k;
    while (j < db.length && db[j]! < peak - QUIET_DB) j++;
    if ((j - k) * 0.01 >= QUIET_MIN_S) quiet.push([k * 0.01, j * 0.01]);
    k = Math.max(j, k + 1);
  }
  return quiet;
}

function wavMono16(file: string): { sr: number; x: Float32Array } {
  const b = readFileSync(file);
  let o = 12, sr = 0, ch = 1, bits = 16;
  while (o + 8 <= b.length) {
    const id = b.toString("ascii", o, o + 4), size = b.readUInt32LE(o + 4);
    if (id === "fmt ") { ch = b.readUInt16LE(o + 10); sr = b.readUInt32LE(o + 12); bits = b.readUInt16LE(o + 22); }
    if (id === "data") {
      if (bits !== 16) throw new Error(`${file}: ${bits}-bit WAV, expected 16`);
      const n = Math.floor(size / 2 / ch), x = new Float32Array(n);
      for (let i = 0; i < n; i++) x[i] = b.readInt16LE(o + 8 + i * 2 * ch) / 32768;
      return { sr, x };
    }
    o += 8 + size + (size % 2);
  }
  throw new Error(`${file}: no data chunk`);
}
