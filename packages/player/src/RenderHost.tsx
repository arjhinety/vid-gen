/**
 * Headless render mode. The renderer drives this page through `window.__vid`:
 *
 *   await window.__vid.ready          // scene module + fonts loaded
 *   await window.__vid.seek(frame)    // render that frame synchronously, wait for paint
 *
 * Scenes are pure functions of the frame, so frames can be rendered in any order
 * and in parallel pages.
 */
import { useEffect, useState, type ComponentType } from "react";
import { flushSync } from "react-dom";
import { whenIdle, type SceneTiming } from "@vid/motion";
import { Stage } from "./Stage.tsx";

declare global {
  interface Window {
    __vid?: {
      ready: Promise<{ durationFrames: number; fps: number; width: number; height: number }>;
      seek(frame: number): Promise<void>;
      error?: string;
    };
  }
}

const nextPaint = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export function RenderHost({ Scene, timing, initialFrame }: { Scene: ComponentType; timing: SceneTiming; initialFrame: number }) {
  const [frame, setFrame] = useState(initialFrame);

  useEffect(() => {
    let resolveReady!: (v: { durationFrames: number; fps: number; width: number; height: number }) => void;
    const ready = new Promise<{ durationFrames: number; fps: number; width: number; height: number }>((r) => (resolveReady = r));
    window.__vid = {
      ready,
      async seek(f: number) {
        flushSync(() => setFrame(f));
        await whenIdle();
        await nextPaint();
      },
    };
    document.fonts.ready.then(whenIdle).then(nextPaint).then(() =>
      resolveReady({ durationFrames: timing.durationFrames, fps: timing.fps, width: timing.width, height: timing.height }),
    );
  }, [timing]);

  return <Stage Scene={Scene} timing={timing} frame={frame} />;
}
