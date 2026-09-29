/**
 * /live2d.html?model=<repo-relative .model3.json>&w=<px>&h=<px>
 *
 * Exposes window.__l2d for a headless driver:
 *   await __l2d.ready                      -> { params, physicsOutputs }
 *   __l2d.draw(values, fit?)               -> draws one frame (pure function of values)
 *   await __l2d.frame(values, fit?)        -> draws one frame and returns its pixels: base64 RGBA,
 *                                             bottom row first, premultiplied alpha (WebGL's own
 *                                             buffer; 10x faster than a page screenshot)
 *   __l2d.bake(track, fps)                 -> physics outputs per frame (one sequential pass)
 */
import "./api.ts"; // window.__l2d's type
import { Live2DStage } from "./stage.ts";

const q = new URLSearchParams(location.search);
const model = q.get("model");
const canvas = document.createElement("canvas");
canvas.width = Number(q.get("w") ?? 1024);
canvas.height = Number(q.get("h") ?? 1536);
canvas.style.display = "block";
document.body.style.margin = "0";
document.body.style.background = "transparent";
document.body.appendChild(canvas);

let stage: Live2DStage | null = null;
const ready = (async () => {
  if (!model) throw new Error("missing ?model=<repo-relative .model3.json>");
  stage = await Live2DStage.load(canvas, model);
  return { params: stage.params, physicsOutputs: stage.physicsOutputs };
})();
ready.catch((e: Error) => {
  console.error(e);
  if (window.__l2d) window.__l2d.error = String(e.stack ?? e);
});

window.__l2d = {
  ready,
  draw: (values, fit) => stage!.draw(values, fit),
  frame: (values, fit) => {
    stage!.draw(values, fit);
    const gl = stage!.gl;
    const px = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
    // The browser's own base64 (a data: URL) is far faster than building a string in JS.
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).slice(String(r.result).indexOf(",") + 1));
      r.onerror = () => rej(r.error);
      r.readAsDataURL(new Blob([px]));
    });
  },
  bake: (track, fps) => stage!.bakePhysics(track, fps),
};
