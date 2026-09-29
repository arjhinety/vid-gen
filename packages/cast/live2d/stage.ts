/**
 * Deterministic Live2D stage: loads a Cubism model (model3.json + moc3 + textures +
 * physics) with the official Cubism Web Framework and draws it on a transparent WebGL
 * canvas with parameters set explicitly for each frame. No timers, motions, random
 * blinks or breath helpers run here: a frame is a pure function of the parameter values
 * handed to `draw`. Physics is history-dependent, so it is never evaluated while drawing;
 * `bakePhysics` runs one sequential pass over a whole parameter track instead and returns
 * the physics outputs per frame, which are then drawn like any other parameter.
 *
 * Lives outside packages/cast/src so the repo typecheck does not pull in the vendored
 * framework (third_party/CubismWebFramework, Live2D Open Software License; the Core is
 * Live2D's redistributable, loaded as a global by live2d.html).
 */
import { CubismFramework, LogLevel, Option } from "../../../third_party/CubismWebFramework/src/live2dcubismframework";
import { CubismMatrix44 } from "../../../third_party/CubismWebFramework/src/math/cubismmatrix44";
import { CubismUserModel } from "../../../third_party/CubismWebFramework/src/model/cubismusermodel";
import type { CubismModel } from "../../../third_party/CubismWebFramework/src/model/cubismmodel";
import { CubismPhysics } from "../../../third_party/CubismWebFramework/src/physics/cubismphysics";
import { CubismShaderManager_WebGL } from "../../../third_party/CubismWebFramework/src/rendering/cubismshader_webgl";
import type { ParamInfo } from "./api.ts";
export type { ParamInfo };

export const fileUrl = (repoRel: string) => `/__vid/file?path=${encodeURIComponent(repoRel)}`;
const SHADERS = "third_party/CubismWebFramework/Shaders/WebGL/";

let started = false;
function startFramework() {
  if (started) return;
  const opt = new Option();
  opt.logFunction = (m: string) => console.log(`[cubism] ${m}`);
  opt.loggingLevel = LogLevel.LogLevel_Warning;
  CubismFramework.startUp(opt);
  CubismFramework.initialize();
  started = true;
}

interface Model3 {
  FileReferences: { Moc: string; Textures: string[]; Physics?: string };
}


class Holder extends CubismUserModel {}

export class Live2DStage {
  readonly gl: WebGLRenderingContext;
  private holder = new Holder();
  private physicsJson: ArrayBuffer | null = null;
  private ids = new Map<string, number>();
  params: ParamInfo[] = [];
  /** Extent of the model at its default pose, in model units: [minX, minY, maxX, maxY]. */
  bounds: [number, number, number, number] = [-1, -1, 1, 1];
  /** Physics output parameter ids (their values come from the baked table, never live). */
  physicsOutputs: string[] = [];

  private constructor(readonly canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true });
    if (!gl) throw new Error("WebGL is not available (launch Chromium with the GPU or SwiftShader enabled)");
    this.gl = gl;
  }

  /** `model3` is the repo-relative path of the .model3.json. */
  static async load(canvas: HTMLCanvasElement, model3: string): Promise<Live2DStage> {
    startFramework();
    const s = new Live2DStage(canvas);
    const dir = model3.slice(0, model3.lastIndexOf("/") + 1);
    const spec = (await (await fetch(fileUrl(model3))).json()) as Model3;
    const moc = await (await fetch(fileUrl(dir + spec.FileReferences.Moc))).arrayBuffer();
    s.holder.loadModel(moc, true);
    const model = s.model;
    for (let i = 0; i < model.getParameterCount(); i++) {
      const raw = model.getParameterId(i).getString() as unknown as string | { s: string };
      const id = typeof raw === "string" ? raw : raw.s;
      s.ids.set(id, i);
      s.params.push({ id, min: model.getParameterMinimumValue(i), max: model.getParameterMaximumValue(i), def: model.getParameterDefaultValue(i) });
    }
    s.setAll({});
    model.update();
    s.bounds = s.measure();
    if (spec.FileReferences.Physics) {
      const buf = await (await fetch(fileUrl(dir + spec.FileReferences.Physics))).arrayBuffer();
      s.physicsJson = buf;
      const json = JSON.parse(new TextDecoder().decode(buf)) as { PhysicsSettings: Array<{ Output: Array<{ Destination: { Id: string } }> }> };
      s.physicsOutputs = [...new Set(json.PhysicsSettings.flatMap((ps) => ps.Output.map((o) => o.Destination.Id)))];
    }
    s.holder.createRenderer(canvas.width, canvas.height);
    const r = s.holder.getRenderer();
    r.startUp(s.gl);
    r.setIsPremultipliedAlpha(true);
    await Promise.all(spec.FileReferences.Textures.map((t, i) => s.loadTexture(fileUrl(dir + t)).then((tex) => r.bindTexture(i, tex))));
    await s.waitForShaders();
    return s;
  }

  get model(): CubismModel {
    return this.holder.getModel();
  }

  private async loadTexture(url: string): Promise<WebGLTexture> {
    const img = new Image();
    img.src = url;
    await img.decode();
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  /** The shader sources are fetched asynchronously by the framework; drawing before they land draws nothing. */
  private async waitForShaders() {
    const shader = () => CubismShaderManager_WebGL.getInstance().getShader(this.gl);
    for (let i = 0; i < 400; i++) {
      this.draw({});
      if (shader()?._isShaderLoaded) {
        this.draw({});
        return;
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    throw new Error("Live2D shaders did not load (check the shader path)");
  }

  private measure(): [number, number, number, number] {
    const m = this.model;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < m.getDrawableCount(); i++) {
      const v = m.getDrawableVertices(i);
      for (let k = 0; k + 1 < v.length; k += 2) {
        x0 = Math.min(x0, v[k]!); x1 = Math.max(x1, v[k]!);
        y0 = Math.min(y0, v[k + 1]!); y1 = Math.max(y1, v[k + 1]!);
      }
    }
    return [x0, y0, x1, y1];
  }

  private setAll(values: Record<string, number>) {
    const m = this.model;
    for (const p of this.params) m.setParameterValueByIndex(this.ids.get(p.id)!, values[p.id] ?? p.def);
  }

  /**
   * Draw one frame. `fit` places the model: the model's canvas is scaled so its height
   * spans `fit.height` of the view (1 = full canvas height), centred at (x, y) in view
   * units (-1..1), with y up.
   */
  draw(values: Record<string, number>, fit = { height: 1, x: 0, y: 0 }) {
    const gl = this.gl;
    this.setAll(values);
    this.model.update();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Fit the default-pose extent: its height spans fit.height of the view, centred at (fit.x, fit.y).
    const [bx0, by0, bx1, by1] = this.bounds;
    const k = (2 * fit.height) / (by1 - by0);
    const sx = (k * this.canvas.height) / this.canvas.width;
    const sy = k;
    const tx = fit.x - sx * ((bx0 + bx1) / 2);
    const ty = fit.y - sy * ((by0 + by1) / 2);
    const proj = new CubismMatrix44();
    proj.setMatrix(new Float32Array([sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1]));
    const r = this.holder.getRenderer();
    r.setMvpMatrix(proj);
    r.setRenderState(null as unknown as WebGLFramebuffer, [0, 0, this.canvas.width, this.canvas.height]);
    r.drawModel(fileUrl(SHADERS));
  }

  /**
   * One sequential physics pass over a parameter track (one entry per frame at `fps`).
   * Returns, per frame, the values physics writes (hair sway etc.). Deterministic: the
   * same track always yields the same table, so frames can then be drawn in any order.
   */
  bakePhysics(track: Array<Record<string, number>>, fps: number, substeps = 2): Array<Record<string, number>> {
    if (!this.physicsJson) return track.map(() => ({}));
    const m = this.model;
    // A fresh solver per bake: the same track always starts from the same particle state.
    const physics = CubismPhysics.create(this.physicsJson, this.physicsJson.byteLength);
    this.setAll(track[0] ?? {});
    physics.stabilization(m);
    const out: Array<Record<string, number>> = [];
    for (const values of track) {
      this.setAll(values);
      for (let k = 0; k < substeps; k++) physics.evaluate(m, 1 / fps / substeps);
      const row: Record<string, number> = {};
      for (const id of this.physicsOutputs) {
        const i = this.ids.get(id);
        if (i !== undefined) row[id] = m.getParameterValueByIndex(i);
      }
      out.push(row);
    }
    CubismPhysics.delete(physics);
    return out;
  }
}
