import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ease as easings, type Ease } from "./easing.ts";
import { progress } from "./interpolate.ts";

export interface CueTime {
  t: number;
  frame: number;
  estimated?: boolean;
}

export interface SceneWord {
  w: string;
  /** Seconds from scene start. */
  start: number;
  end: number;
  /** Character span in the line's display text. */
  c0: number;
  c1: number;
}

export interface SceneLine {
  key: string;
  /** Seconds from scene start. */
  start: number;
  end: number;
  text: string;
  words?: SceneWord[];
}

/** One on-screen headline row (the narration), absolute film times. Mirrors core's HeadlineRow. */
export interface FilmHeadlineRow {
  id: string;
  line: string;
  text: string;
  start: number;
  lineEnd: number;
  words: Array<{ text: string; c0: number; c1: number; start: number }>;
  marks: Array<{ kind: "accent" | "strike"; c0: number; c1: number }>;
  sentenceEnd: boolean;
}

/** What a scene knows about the film around it: shared chrome must match across cuts. */
export interface FilmContext {
  brand: { name: string; place?: string; crumbs: string[] };
  /** This scene's breadcrumb section, and the previous scene's (for the change at the cut). */
  section: string[];
  prevSection: string[] | null;
  /** Visible headline rows for this scene and the previous one (0 hides the headline). */
  headlineRows: number;
  prevHeadlineRows: number | null;
  /** Whether this scene sits on the shared sheet (grid, header, headline). */
  sheet: boolean;
  headline: FilmHeadlineRow[];
  /** The open question line: each change at absolute film time (s); null clears it. */
  questions: Array<{ t: number; text: string | null }>;
  index: number;
  count: number;
}

/** Everything a scene may know about time. Derived from build/<project>/<lang>/timeline.json. */
export interface SceneTiming {
  id: string;
  project: string;
  lang: string;
  fps: number;
  width: number;
  height: number;
  durationFrames: number;
  /** Absolute start of the scene in the full video (seconds). */
  start: number;
  cues: Record<string, CueTime>;
  lines: SceneLine[];
  /** Film-level context (absent in isolated tests). */
  film?: FilmContext;
}

interface FrameState {
  /** Frame relative to the innermost <Sequence>. */
  frame: number;
  /** Frame relative to the scene start. */
  sceneFrame: number;
  scene: SceneTiming;
}

const FrameContext = createContext<FrameState | null>(null);

export function FrameProvider({ frame, scene, children }: { frame: number; scene: SceneTiming; children: ReactNode }) {
  const value = useMemo(() => ({ frame, sceneFrame: frame, scene }), [frame, scene]);
  return <FrameContext.Provider value={value}>{children}</FrameContext.Provider>;
}

function useFrameState(): FrameState {
  const s = useContext(FrameContext);
  if (!s) throw new Error("useFrame/useCues must be used inside a scene rendered by the vid player");
  return s;
}

/** Current frame (local to the nearest <Sequence>). */
export const useFrame = () => useFrameState().frame;
export const useSceneFrame = () => useFrameState().sceneFrame;
export const useScene = () => useFrameState().scene;
/** Current scene time in seconds. */
export function useTime() {
  const s = useFrameState();
  return s.sceneFrame / s.scene.fps;
}

/** Reference to a moment: a cue name, or seconds from scene start. */
export type TimeRef = string | number;

export interface AtOptions {
  /** Duration in seconds. */
  dur?: number;
  /** Shift in seconds relative to the reference (negative = anticipate). */
  offset?: number;
  ease?: Ease;
}

export interface Cues {
  /** Frame (scene-relative) of a cue or time reference. */
  frame(ref: TimeRef): number;
  has(name: string): boolean;
  /** Eased 0..1 progress of an animation that starts at `ref`. */
  at(ref: TimeRef, opts?: AtOptions): number;
  /** Eased 0..1 progress across the interval between two references. */
  span(from: TimeRef, to: TimeRef, e?: Ease): number;
  /** True while the scene is between two references. */
  between(from: TimeRef, to: TimeRef): boolean;
}

export function useCues(): Cues {
  const { sceneFrame, scene } = useFrameState();
  return useMemo(() => {
    const frameOf = (ref: TimeRef): number => {
      if (typeof ref === "number") return Math.round(ref * scene.fps);
      const c = scene.cues[ref];
      if (!c) {
        const known = Object.keys(scene.cues).join(", ");
        throw new Error(`scene '${scene.id}': unknown cue '${ref}'. Known cues: ${known}`);
      }
      return c.frame;
    };
    return {
      frame: frameOf,
      has: (name) => name in scene.cues,
      at: (ref, o = {}) =>
        progress(sceneFrame, frameOf(ref) + Math.round((o.offset ?? 0) * scene.fps), Math.round((o.dur ?? 0.6) * scene.fps), o.ease ?? easings.out),
      span: (a, b, e = easings.inOut) => {
        const fa = frameOf(a);
        return progress(sceneFrame, fa, frameOf(b) - fa, e);
      },
      between: (a, b) => sceneFrame >= frameOf(a) && sceneFrame < frameOf(b),
    };
  }, [sceneFrame, scene]);
}

/** Shift time for children: inside, useFrame() counts from `from`. Hidden outside [from, from+dur). */
export function Sequence({ from, dur, children, keepMounted = false }: { from: number; dur?: number; children: ReactNode; keepMounted?: boolean }) {
  const s = useFrameState();
  const local = s.frame - from;
  const visible = local >= 0 && (dur === undefined || local < dur);
  if (!visible && !keepMounted) return null;
  return <FrameContext.Provider value={{ ...s, frame: local }}>{children}</FrameContext.Provider>;
}
