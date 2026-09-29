/**
 * Timeline assembly: turns the authored project + narration and the *measured*
 * per-line audio (duration + aligned words) into absolute scene timings, cue
 * times and captions for one language variant.
 *
 * Scenes never guess their duration: it is the sum of real speech, authored
 * pauses, the scene's lead-in and its hold.
 */
import { parseCues, type TextMark } from "./cues.ts";
import { buildCaptions, type Caption } from "./captions.ts";
import { buildHeadline, type HeadlineRow } from "./headline.ts";
import type { BeatSpec, Lang, LineSpec, NarrationSpec, ProjectSpec } from "./schema.ts";

export interface AlignedWord {
  /** Word as recognised/aligned. */
  w: string;
  start: number;
  end: number;
  /** Character span in the display text of the line (markers stripped). */
  c0: number;
  c1: number;
}

export interface LineAudio {
  /** Path to the trimmed, loudness-normalised line wav (repo-relative). */
  path: string;
  duration: number;
  words: AlignedWord[] | null;
}

export const lineKey = (beatId: string, index: number) => `${beatId}#${index}`;

export interface CueTime {
  /** Seconds from scene start. */
  t: number;
  /** Frame from scene start. */
  frame: number;
  /** True when no word alignment was available and the time was interpolated. */
  estimated?: boolean;
}

export interface TimelineLine {
  key: string;
  beat: string;
  index: number;
  start: number;
  end: number;
  text: string;
  /** English display text (headline, and English subtitles in non-English variants). */
  text_en: string;
  /** Emphasis marks in `text_en`. */
  marks_en: TextMark[];
  audio: string;
  words: AlignedWord[] | null;
}

export interface TimelineScene {
  id: string;
  renderer: ProjectSpec["scenes"][number]["renderer"];
  entry: string;
  /** Breadcrumb items after the project brand (e.g. ["Study 001", "01 · Post-training"]). */
  section: string[];
  headlineRows: number;
  sheet: boolean;
  start: number;
  end: number;
  startFrame: number;
  durationFrames: number;
  cues: Record<string, CueTime>;
  lines: TimelineLine[];
}

export interface Timeline {
  project: string;
  lang: Lang;
  fps: number;
  width: number;
  height: number;
  duration: number;
  durationFrames: number;
  scenes: TimelineScene[];
  captions: Partial<Record<Lang, Caption[]>>;
  /** The narration as on-screen headline rows (English text, word times in this variant's audio). */
  headline: HeadlineRow[];
  /** The open question on the sheet: each change, at absolute film time (s), in order. */
  questions: QuestionMark[];
  brand: ProjectSpec["brand"];
}

export interface QuestionMark {
  t: number;
  /** null clears the line. */
  text: string | null;
}

function lineText(line: LineSpec, lang: Lang): string {
  const t = lang === "en" ? line.en : line.ja;
  if (t === undefined) throw new Error(`line is missing a '${lang}' text: ${line.en}`);
  return t;
}

export interface BuildOptions {
  lang: Lang;
  subtitleLangs: Lang[];
}

export function buildTimeline(
  project: ProjectSpec,
  narration: NarrationSpec,
  audio: Record<string, LineAudio>,
  opts: BuildOptions,
): Timeline {
  const { fps } = project.format;
  const beats = new Map<string, BeatSpec>(narration.beats.map((b) => [b.id, b]));
  const toFrame = (s: number) => Math.round(s * fps);

  const scenes: TimelineScene[] = [];
  let t = 0;
  for (const sc of project.scenes) {
    const sceneStart = t;
    const cues: Record<string, CueTime> = {};
    const lines: TimelineLine[] = [];
    const setCue = (name: string, abs: number, estimated = false) => {
      const rel = abs - sceneStart;
      cues[name] = { t: round3(rel), frame: toFrame(abs) - toFrame(sceneStart), ...(estimated ? { estimated } : {}) };
    };

    t += sc.lead;
    sc.beats.forEach((beatId, bi) => {
      const beat = beats.get(beatId);
      if (!beat) throw new Error(`scene '${sc.id}' references unknown beat '${beatId}'`);
      setCue(`beat:${beat.id}`, t);
      beat.lines.forEach((line, li) => {
        const key = lineKey(beat.id, li);
        const a = audio[key];
        if (!a) throw new Error(`no audio for line ${key} (${opts.lang}); run the audio step first`);
        const parsed = parseCues(lineText(line, opts.lang));
        const en = parseCues(line.en);
        const start = t;
        setCue(`line:${line.id ?? key}`, start);
        for (const [name, offset] of Object.entries(parsed.cues)) {
          const hit = a.words?.find((w) => w.c1 > offset);
          if (hit) setCue(name, start + hit.start);
          else setCue(name, start + a.duration * (offset / Math.max(1, parsed.text.length)), true);
        }
        t += a.duration;
        lines.push({
          key,
          beat: beat.id,
          index: li,
          start: round3(start),
          end: round3(t),
          text: parsed.text,
          text_en: en.text,
          marks_en: en.marks,
          audio: a.path,
          words: a.words,
        });
        // Silence after the line: an explicit pause always applies (also after a beat's
        // last line); otherwise the default gap applies only between lines.
        const lastLine = li === beat.lines.length - 1;
        t += line.pause ?? (lastLine ? 0 : project.audio.line_gap);
      });
      setCue(`beat-end:${beat.id}`, t);
      const last = bi === sc.beats.length - 1;
      if (!last) t += beat.pause ?? project.audio.beat_gap;
      else if (beat.pause !== undefined) t += Math.max(0, beat.pause - sc.hold);
    });
    t += sc.hold;
    t = Math.max(t, sceneStart + sc.min_duration);

    const startFrame = toFrame(sceneStart);
    scenes.push({
      id: sc.id,
      renderer: sc.renderer,
      entry: sc.entry,
      section: sc.section,
      headlineRows: sc.headline_rows,
      sheet: sc.sheet,
      start: round3(sceneStart),
      end: round3(t),
      startFrame,
      durationFrames: toFrame(t) - startFrame,
      cues,
      lines,
    });
  }

  const allLines = scenes.flatMap((s) => s.lines);
  const captions: Timeline["captions"] = {};
  for (const sub of opts.subtitleLangs) captions[sub] = buildCaptions(allLines, sub, opts.lang);

  return {
    project: project.id,
    lang: opts.lang,
    fps,
    width: project.format.width,
    height: project.format.height,
    duration: round3(t),
    durationFrames: toFrame(t),
    scenes,
    captions,
    headline: project.headline.enabled ? buildHeadline(allLines, opts.lang, project.headline.max_chars) : [],
    questions: questionMarks(project, scenes),
    brand: project.brand,
  };
}

/**
 * The question line's changes at absolute film times: a scene's `question` at its start or
 * at its cues. Separate from buildTimeline so a built timeline can pick up edited questions
 * without re-running the audio step.
 */
export function questionMarks(project: ProjectSpec, scenes: Array<Pick<TimelineScene, "id" | "start" | "cues">>): QuestionMark[] {
  const out: QuestionMark[] = [];
  for (const sc of project.scenes) {
    const s = scenes.find((x) => x.id === sc.id);
    if (!s || sc.question === undefined) continue;
    const evs = typeof sc.question === "string" || sc.question === null ? [{ text: sc.question }] : sc.question;
    for (const ev of evs) {
      const at = "at" in ev && ev.at ? s.cues[ev.at] : { t: 0 };
      if (!at) throw new Error(`scene '${sc.id}': question cue '${(ev as { at: string }).at}' is not a cue of this scene`);
      out.push({ t: round3(s.start + at.t), text: ev.text });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;
