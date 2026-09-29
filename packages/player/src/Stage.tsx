import type { ComponentType } from "react";
import { layout, themeVars } from "@vid/design";
import { Exhibit, SheetChrome } from "@vid/kit";
import { FrameProvider, useScene, type SceneTiming } from "@vid/motion";
import type { Timeline } from "../../core/src/timeline.ts";

export function sceneTiming(tl: Timeline, sceneId: string): SceneTiming {
  const i = tl.scenes.findIndex((x) => x.id === sceneId);
  const s = tl.scenes[i];
  if (!s) throw new Error(`unknown scene '${sceneId}'`);
  const prev = i > 0 ? tl.scenes[i - 1]! : null;
  return {
    film: {
      brand: tl.brand ?? { name: "", crumbs: [] },
      section: s.section ?? [],
      prevSection: prev ? (prev.section ?? []) : null,
      headlineRows: s.headlineRows ?? 2,
      prevHeadlineRows: prev ? (prev.headlineRows ?? 2) : null,
      sheet: s.sheet ?? true,
      headline: tl.headline ?? [],
      questions: tl.questions ?? [],
      index: i,
      count: tl.scenes.length,
    },
    id: s.id,
    project: tl.project,
    lang: tl.lang,
    fps: tl.fps,
    width: tl.width,
    height: tl.height,
    durationFrames: s.durationFrames,
    start: s.start,
    cues: s.cues,
    lines: s.lines.map((l) => ({
      key: l.key,
      start: l.start - s.start,
      end: l.end - s.start,
      text: l.text,
      words: l.words?.map((w) => ({ ...w, start: l.start - s.start + w.start, end: l.start - s.start + w.end })),
    })),
  };
}

/** Manim scenes get a web underlay: the shared sheet with nothing on it (the math is overlaid). */
export const Underlay: ComponentType = () => null;

/** Content box for held images: side margins, below the question line (or a 2-row headline), above the lower perforations. */
const STILL_BOX = { x: 120, w: 1680, bottom: 930 };

/** `still` scenes: one image as an exhibit on the sheet (object-fit contain). */
export function stillScene(src: string): ComponentType {
  return function Still() {
    const film = useScene().film;
    const top = film?.headline.length ? layout.exhibitTop2 + 10 : layout.stageTop;
    return (
      <Exhibit>
        <img src={src} style={{ position: "absolute", left: STILL_BOX.x, top, width: STILL_BOX.w, height: STILL_BOX.bottom - top, objectFit: "contain" }} />
      </Exhibit>
    );
  };
}

/**
 * The fixed-size canvas every scene draws into. The shared sheet (grid, breadcrumb,
 * headline) is drawn here from film context, so scenes only draw their exhibit and
 * the chrome matches across cuts.
 */
export function Stage({ Scene, timing, frame }: { Scene: ComponentType; timing: SceneTiming; frame: number }) {
  return (
    <div className="vid-stage" style={{ ...themeVars(), width: timing.width, height: timing.height }} data-scene={timing.id}>
      <FrameProvider frame={frame} scene={timing}>
        <SheetChrome>
          <Scene />
        </SheetChrome>
      </FrameProvider>
    </div>
  );
}
