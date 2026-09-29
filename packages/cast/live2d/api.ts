/**
 * The page API of /live2d.html (main.ts), typed once for the page and for the headless drivers
 * (packages/cast/tools). Kept apart from stage.ts so a driver's type-check never loads the
 * Cubism SDK.
 */

export interface ParamInfo {
  id: string;
  min: number;
  max: number;
  def: number;
}

/** Where the model sits in the canvas: its default-pose height as a share of the view, centred at (x, y) in view units (-1..1, y up). */
export interface Fit {
  height: number;
  x: number;
  y: number;
}

export interface Live2DPageApi {
  ready: Promise<{ params: ParamInfo[]; physicsOutputs: string[] }>;
  /** Draws one frame (a pure function of the values). */
  draw(values: Record<string, number>, fit?: Fit): void;
  /** Draws one frame and returns its pixels: base64 RGBA, bottom row first, premultiplied alpha. */
  frame(values: Record<string, number>, fit?: Fit): Promise<string>;
  /** Physics outputs per frame, from one sequential pass over the track. */
  bake(track: Array<Record<string, number>>, fps: number): Array<Record<string, number>>;
  error?: string;
}

declare global {
  interface Window {
    __l2d?: Live2DPageApi;
  }
}
