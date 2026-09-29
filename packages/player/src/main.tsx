import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import "@vid/design/theme.css";
import "./player.css";
import type { Timeline } from "../../core/src/timeline.ts";
import { Player } from "./Player.tsx";
import { RenderHost } from "./RenderHost.tsx";
import { fileUrl, loadScene } from "./scenes.ts";
import { sceneTiming, stillScene, Underlay } from "./Stage.tsx";

type TL = Timeline & { estimated: boolean };

async function main() {
  const q = new URLSearchParams(location.search);
  const project = q.get("project");
  const root = createRoot(document.getElementById("root")!);
  if (!project) {
    root.render(<p style={{ padding: 24, fontFamily: "sans-serif" }}>Open with ?project=&lt;id&gt; (use `pnpm video dev &lt;id&gt;`).</p>);
    return;
  }
  const res = await fetch(`/__vid/project/${project}`);
  if (!res.ok) {
    root.render(<pre className="scene-error">{await res.text()}</pre>);
    return;
  }
  const { timelines } = (await res.json()) as { timelines: Record<string, TL> };
  const lang = q.get("lang") ?? Object.keys(timelines)[0]!;
  const scene = q.get("scene") ?? undefined;

  if (q.get("mode") === "render") {
    document.documentElement.classList.add("render-mode");
    const tl = timelines[lang];
    if (!tl || !scene) throw new Error("render mode needs lang and scene");
    // Render-mode timelines can be overridden by the renderer (exact build timeline).
    const s = tl.scenes.find((x) => x.id === scene);
    if (!s) throw new Error(`unknown scene ${scene}`);
    let Scene: ComponentType;
    try {
      Scene = s.renderer === "manim" ? Underlay : s.renderer === "still" ? stillScene(fileUrl(`projects/${project}/${s.entry}`)) : await loadScene(project, s.entry);
    } catch (e) {
      window.__vid = { ready: Promise.reject(e), seek: async () => {}, error: String(e) };
      throw e;
    }
    root.render(<RenderHost Scene={Scene} timing={sceneTiming(tl, scene)} initialFrame={Number(q.get("frame") ?? 0)} />);
    return;
  }
  root.render(
    <StrictMode>
      <Player project={project} timelines={timelines} initialLang={lang} initialScene={scene} />
    </StrictMode>,
  );
}

main().catch((e: Error) => {
  console.error(e);
  if (window.__vid) window.__vid.error = String(e);
  else window.__vid = { ready: Promise.reject(e), seek: async () => {}, error: String(e) };
});
