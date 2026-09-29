/**
 * Optics: depth layers, a 2-D camera (following pans) and focus-pull entrances.
 * The sheet itself lives in sheet.tsx.
 */
import type { CSSProperties, ReactNode } from "react";
import { depth, motion } from "@vid/design";
import { clamp, ease, mix, useScene, useSceneFrame, type Ease } from "@vid/motion";

export type DepthName = keyof typeof depth;

/**
 * A depth layer. `focus` blends from its own depth (0) to fully in focus (1), which
 * is how a rack focus hands attention between layers.
 */
export function Layer({ at = "subject", focus = 0, style, children }: { at?: DepthName; focus?: number; style?: CSSProperties; children: ReactNode }) {
  const d = depth[at];
  const blur = mix(d.blur, 0, focus);
  const opacity = mix(d.opacity, 1, focus);
  return (
    <div style={{ position: "absolute", inset: 0, filter: blur > 0.05 ? `blur(${blur}px)` : undefined, opacity, ...style }}>{children}</div>
  );
}

/** Rack focus: out over 8 f, in over 10 f; returns the extra blur (px) to apply at the current frame. */
export function rackBlur(frame: number, at: number, peak = 14): number {
  const out = 8;
  const inn = 10;
  if (frame < at - out || frame > at + inn) return 0;
  if (frame <= at) return peak * ease.travel((frame - (at - out)) / out);
  return peak * (1 - ease.arrive((frame - at) / inn));
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

/**
 * 2-D camera over a world larger than the frame. Pass keyframes (scene frame -> state);
 * moves between keyframes are following pans (`motion.pan`, glide ease). The sheet's
 * chrome does not move with it: put only the exhibit inside.
 */
export function Camera({ keys, drift = 0, children }: { keys: Array<[number, CameraState]>; drift?: number; children: ReactNode }) {
  const f = useSceneFrame();
  const { fps, width, height } = useScene();
  const s = cameraAt(keys, f, fps);
  const z = s.zoom * (1 + drift * (f / fps));
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        transformOrigin: "0 0",
        transform: `translate(${width / 2}px, ${height / 2}px) scale(${z}) translate(${-s.x}px, ${-s.y}px)`,
      }}
    >
      {children}
    </div>
  );
}

export function cameraAt(keys: Array<[number, CameraState]>, frame: number, fps: number, e: Ease = ease.glide, moveFrames = Math.round(motion.pan * fps)): CameraState {
  if (!keys.length) return { x: 960, y: 540, zoom: 1 };
  let cur = keys[0]![1];
  for (let i = 1; i < keys.length; i++) {
    const [start, next] = keys[i]!;
    if (frame < start) break;
    const t = e(clamp((frame - start) / moveFrames));
    cur = { x: mix(cur.x, next.x, t), y: mix(cur.y, next.y, t), zoom: mix(cur.zoom, next.zoom, t) };
  }
  return cur;
}

export interface FocusPullProps {
  /** Entrance progress 0..1 (usually `cue.at(...)` with ease.linear; the curve is applied here). */
  enter: number;
  /** Exit progress 0..1 (optional). */
  exit?: number;
  /** Starting scale of the entrance (1.2 calm, up to 1.8 in high-energy moments). */
  from?: number;
  blur?: number;
  dy?: number;
  style?: CSSProperties;
  children: ReactNode;
}

/** Arrive out of focus and slightly large, settle sharp. Exit shrinks and defocuses. */
export function FocusPull({ enter, exit = 0, from = 1.06, blur = 4, dy = 0, style, children }: FocusPullProps) {
  if (enter <= 0) return null;
  const a = ease.arrive(clamp(enter));
  const x = ease.exit(clamp(exit));
  if (x >= 1) return null;
  const scale = mix(from, 1, a) * mix(1, 0.9, x);
  const b = mix(blur, 0, a) + mix(0, blur, x);
  const opacity = Math.min(clamp(enter * 2.2), 1 - x);
  return (
    <div
      style={{
        ...style,
        opacity,
        transform: `translateY(${(1 - a) * dy}px) scale(${scale})`,
        filter: b > 0.05 ? `blur(${b}px)` : undefined,
        transformOrigin: style?.transformOrigin ?? "50% 50%",
      }}
    >
      {children}
    </div>
  );
}

/** Absolutely positioned box in stage pixels. */
export function At({ x, y, w, h, style, children }: { x: number; y: number; w?: number; h?: number; style?: CSSProperties; children?: ReactNode }) {
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>{children}</div>;
}
