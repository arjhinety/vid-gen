/**
 * Source-file schemas. These are the formats humans and agents author:
 *
 *   projects/<id>/project.yaml     -> ProjectSpec
 *   projects/<id>/script/narration.yaml -> NarrationSpec
 *   voices/<id>.yaml               -> VoiceSpec
 *
 * Everything under build/ is derived from these and never hand-edited.
 */
import { z } from "zod";

export const LANGS = ["en", "ja"] as const;
export const Lang = z.enum(LANGS);
export type Lang = z.infer<typeof Lang>;

export const Renderer = z.enum(["web", "manim", "still"]);
export type Renderer = z.infer<typeof Renderer>;

/** One change of the on-screen open question: appears at `at` (a cue of the scene; default the scene start). `text: null` clears it. */
export const QuestionEvent = z.strictObject({
  at: z.string().optional(),
  text: z.string().nullable(),
});
export type QuestionEvent = z.infer<typeof QuestionEvent>;

/** A scene is one continuous visual space. It may span several narration beats. */
export const SceneSpec = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "scene ids are kebab-case"),
  renderer: Renderer,
  /** web: path to a .tsx module exporting a default scene component.
   *  manim: "path/to/file.py:ClassName". still: an image path. */
  entry: z.string(),
  /** Narration beats spoken over this scene, in order. May be empty for silent scenes. */
  beats: z.array(z.string()).default([]),
  /** Breadcrumb items shown after the project brand while this scene is on screen. */
  section: z.array(z.string()).default([]),
  /** Headline rows kept on screen (the narration). 3 when the exhibit sits low; 0 hides it. */
  headline_rows: z.union([z.literal(0), z.literal(2), z.literal(3)]).default(2),
  /**
   * The open question of the moment, one line at the top of the sheet (English in every
   * variant, like the exhibit labels). A string shows it from the scene start; a list
   * changes it at cues; null clears it. Omitted: whatever the previous scene showed stays.
   */
  question: z.union([z.string(), z.null(), z.array(QuestionEvent).min(1)]).optional(),
  /** Draw the shared sheet (grid, breadcrumb, headline). False for full-bleed cards. */
  sheet: z.boolean().default(true),
  /** Seconds of picture before the first beat starts. The house pace keeps this short. */
  lead: z.number().min(0).default(0.2),
  /** Seconds of picture after the last beat ends. */
  hold: z.number().min(0).default(0.4),
  /** Minimum scene duration in seconds; silent scenes need this. */
  min_duration: z.number().min(0).default(0),
  /** Claim ids (sources/claims.yaml) whose content this scene shows or says. */
  claims: z.array(z.string()).default([]),
  /** Free-form note for the storyboard. */
  note: z.string().optional(),
});
export type SceneSpec = z.infer<typeof SceneSpec>;

export const LanguageVariant = z.strictObject({
  /** voices/<voice>.yaml */
  voice: z.string(),
  /** Subtitle languages produced for this variant. */
  subtitles: z.array(Lang).default(["en"]),
  /** Burn the first subtitle language into the picture (in addition to sidecar files). */
  burn_subtitles: z.boolean().default(false),
});
export type LanguageVariant = z.infer<typeof LanguageVariant>;

export const ProjectSpec = z.strictObject({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string(),
  description: z.string().default(""),
  format: z
    .strictObject({
      width: z.number().int().positive().default(1920),
      height: z.number().int().positive().default(1080),
      fps: z.number().int().positive().default(30),
    })
    .prefault({}),
  /** Design-system theme name. */
  theme: z.string().default("experimental-labs"),
  /** Publisher shown at the head of the breadcrumb on every sheet. */
  brand: z
    .strictObject({
      name: z.string().default("Experimental Labs"),
      place: z.string().optional(),
      /** Crumbs after the brand on every scene, before the scene's own section. */
      crumbs: z.array(z.string()).default([]),
    })
    .prefault({}),
  /**
   * The narration as a word-by-word on-screen headline. Suits short films (the 96 s launch
   * film); in a long explainer it turns watching into reading, so turn it off and use
   * per-scene `question` lines and labels on the exhibits instead.
   */
  headline: z
    .strictObject({
      enabled: z.boolean().default(true),
      /** Max characters per headline row. */
      max_chars: z.number().int().min(16).default(34),
    })
    .prefault({}),
  languages: z.partialRecord(Lang, LanguageVariant),
  script: z.string().default("script/narration.yaml"),
  claims: z.string().default("sources/claims.yaml"),
  audio: z
    .strictObject({
      /** Integrated loudness target for the final mix (LUFS). */
      target_lufs: z.number().default(-16),
      /** Default silence between lines inside a beat (seconds). */
      line_gap: z.number().min(0).default(0.28),
      /** Default silence between beats (seconds). */
      beat_gap: z.number().min(0).default(0.6),
      /** A bed under the narration, ducked under speech by the timeline. */
      music: z
        .strictObject({
          /** A licensed audio file (repo-relative), looped to length ... */
          path: z.string().optional(),
          /** ... or the license-free procedural bed (py/media/src/vidmedia/bed.py), bars fitted so every cut is a downbeat ... */
          procedural: z.enum(["pulse"]).optional(),
          /**
           * ... or licensed tracks, each from a scene to the next track's scene (the first from
           * the film start, the last to the film end), cross-faded across the cut. A long track is
           * trimmed (the last one from its start, so its composed ending lands on the last frame);
           * a short one repeats a stretch of its middle (py/media/src/vidmedia/tracks.py).
           */
          tracks: z
            .array(
              z.strictObject({
                path: z.string(),
                /** Scene the track starts at (ignored for the first track: the film start). */
                from: z.string(),
                /** Which end of the file is kept when it is longer than its stretch. Default: "start"; "end" for the last track. */
                align: z.enum(["start", "end"]).optional(),
              }),
            )
            .min(1)
            .optional(),
          /** Cross-fade between tracks (s). */
          xfade: z.number().min(0).default(3),
          bpm: z.number().min(60).max(160).default(96),
          /** Bed loudness relative to the voice target before ducking (LU). */
          gain_db: z.number().default(-24),
          duck_db: z.number().default(-10),
          /** Peak level (dBFS) of an `impact` on every scene cut; null for none. Not ducked. */
          cut_hits_db: z.number().nullable().default(null),
        })
        .refine((x) => [x.path, x.procedural, x.tracks].filter(Boolean).length === 1, "give exactly one of path, procedural or tracks")
        .nullable()
        .default(null),
      /** Sound effects pinned to cues: `at` is "<scene>:<cue>" (any cue of that scene, e.g. "training:promoted"). */
      sfx: z
        .array(
          z
            .strictObject({
              at: z.string().regex(/^[^:]+:.+$/, "expected <scene>:<cue>"),
              offset: z.number().default(0),
              /** Procedural sound (py/media/src/vidmedia/sfx.py) ... */
              sound: z.enum(["tick", "thump", "whoosh", "stamp", "impact"]).optional(),
              /** ... or a licensed audio file (repo-relative). */
              path: z.string().optional(),
              /** Peak level of the effect (dBFS). */
              gain_db: z.number().default(-24),
            })
            .refine((x) => !!x.sound !== !!x.path, "give exactly one of sound or path"),
        )
        .default([]),
    })
    .prefault({}),
  /**
   * A Live2D presenter over the whole film (the lesson films): rendered as its own transparent
   * track, lip-synced from the narration's timings, and laid over the picture at compose time in
   * `box` (frame px; the scenes keep that lane empty). Absent: no character, and the compose is
   * exactly as before.
   */
  cast: z
    .strictObject({
      /** The model's .model3.json (repo-relative). */
      model: z.string(),
      box: z.strictObject({ x: z.number().int().min(0), y: z.number().int().min(0), w: z.number().int().positive(), h: z.number().int().positive() }),
      /** The character's height as a share of the box, and its centre in view units (-1..1, y up). */
      fit: z.strictObject({ height: z.number().positive().max(1).default(0.8), x: z.number().default(0), y: z.number().default(0) }).prefault({}),
      /** Mouth-flap pace (packages/cast/live2d/lipsync.ts). */
      pace: z.enum(["standard", "calm"]).default("standard"),
      seed: z.number().int().default(7),
    })
    .optional(),
  scenes: z.array(SceneSpec).min(1),
});
export type ProjectSpec = z.infer<typeof ProjectSpec>;

/**
 * One spoken sentence, authored in parallel languages.
 * Display text may contain cue markers: `[[name]]` placed immediately before the
 * word at which an animation should fire. The same cue names must appear in every
 * language so both timelines expose the same cues.
 */
export const LineSpec = z.strictObject({
  id: z.string().optional(),
  en: z.string(),
  ja: z.string().optional(),
  /** Spoken-form overrides. Default: display text run through the language lexicon. */
  say_en: z.string().optional(),
  say_ja: z.string().optional(),
  /** Silence after this line, overriding audio.line_gap. */
  pause: z.number().min(0).optional(),
  /**
   * How the voice should deliver the line (a word from the voices' `tones` tables, e.g.
   * "gravity", "reveal"). Inline `{tone}` tags in a language's text override it there and
   * place the direction at a clause. Omitted: neutral.
   */
  tone: z.string().regex(/^[a-z][a-z-]*$/).optional(),
  /** Claim ids this sentence asserts. */
  claims: z.array(z.string()).default([]),
});
export type LineSpec = z.infer<typeof LineSpec>;

export const BeatSpec = z.strictObject({
  id: z.string(),
  /** What the viewer should understand after this beat (storyboard intent). */
  intent: z.string().optional(),
  lines: z.array(LineSpec).min(1),
  /** Silence after the beat, overriding audio.beat_gap. */
  pause: z.number().min(0).optional(),
});
export type BeatSpec = z.infer<typeof BeatSpec>;

export const NarrationSpec = z.strictObject({
  beats: z.array(BeatSpec).min(1),
});
export type NarrationSpec = z.infer<typeof NarrationSpec>;

/** A reusable narrator voice. Engine-specific settings live in `params`. */
export const VoiceSpec = z.strictObject({
  id: z.string(),
  lang: Lang,
  engine: z.string(),
  description: z.string().default(""),
  params: z.record(z.string(), z.unknown()).default({}),
  /**
   * How this engine takes direction: `instruct` sends the tone's text as the line's
   * instruction (Qwen3 CustomVoice); `inline` inserts it into the spoken text at the tone
   * tag, or at the start of the line (Irodori emoji); `prosody` edits the engine's own
   * predicted pace and pitch contour for the line ("speed=0.9 pitch=-1.5 range=0.75";
   * Kokoro); `none` ignores tones.
   */
  tone_via: z.enum(["instruct", "inline", "prosody", "none"]).default("none"),
  /** Tone word -> what the engine is given for it (an instruction, an emoji string, or a prosody spec). */
  tones: z.record(z.string(), z.string()).default({}),
  /** Speed factor applied to every line after synthesis, pitch and formants kept (FFmpeg rubberband). 1 = as synthesised. */
  tempo: z.number().min(0.8).max(1.3).default(1),
  /** Provenance of any reference audio (must be synthetic or licensed). */
  provenance: z.string().default(""),
});
export type VoiceSpec = z.infer<typeof VoiceSpec>;

export interface Prosody {
  /** Pace multiplier (0.7-1.3). */
  speed?: number;
  /** Semitones added to the pitch contour (-6..6). */
  pitch?: number;
  /** Scale of the contour around its median (0.3-2): > 1 livelier, < 1 flatter. */
  range?: number;
}
const PROSODY_BOUNDS: Record<keyof Prosody, [number, number]> = { speed: [0.7, 1.3], pitch: [-6, 6], range: [0.3, 2] };

/** Parse a prosody spec like "speed=0.9 pitch=-1.5 range=0.75"; throws on unknown keys or out-of-range values. */
export function parseProsody(spec: string): Prosody {
  const out: Prosody = {};
  for (const part of spec.trim().split(/\s+/).filter(Boolean)) {
    const m = /^(speed|pitch|range)=(-?\d+(?:\.\d+)?)$/.exec(part);
    if (!m) throw new Error(`bad prosody term '${part}' (expected speed=, pitch= or range=)`);
    const k = m[1] as keyof Prosody;
    const v = Number(m[2]);
    const [lo, hi] = PROSODY_BOUNDS[k];
    if (v < lo || v > hi) throw new Error(`prosody ${k}=${v} is outside ${lo}..${hi}`);
    out[k] = v;
  }
  return out;
}

export const ClaimClass = z.enum([
  "measured",
  "author-interpretation",
  "hypothesis",
  "limitation",
  "speculation",
  "design",
]);

export const Claim = z.looseObject({
  id: z.string(),
  text: z.string(),
  class: z.string(),
  source_path: z.string(),
  source_locator: z.string().optional(),
});
export type Claim = z.infer<typeof Claim>;

/** py/tts/engines.yaml: TTS engines, each in its own Python environment. */
export const EngineDef = z.looseObject({
  /** Interpreter of the engine's isolated environment (repo-relative). */
  python: z.string(),
  /** Job-protocol adapter script (py/tts/<engine>/run.py). */
  runner: z.string(),
  /** How to install the environment (shown when it is missing). */
  setup: z.string(),
  langs: z.array(Lang).min(1),
});
export type EngineDef = z.infer<typeof EngineDef>;
export const EnginesFile = z.strictObject({ engines: z.record(z.string(), EngineDef) });

/** projects/<id>/script/lexicon.yaml: per-language pronunciation overrides (display -> spoken). */
export const LexiconFile = z.partialRecord(Lang, z.record(z.string(), z.string()));
