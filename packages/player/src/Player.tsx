/**
 * Interactive preview: scrub, play with the real narration (when built), jump to
 * cues, toggle captions and safe-area guides. Works on the global film frame so a
 * single scene or the whole film can be reviewed.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { Timeline } from "../../core/src/timeline.ts";
import { fileUrl, loadScene } from "./scenes.ts";
import { sceneTiming, Stage, stillScene, Underlay } from "./Stage.tsx";

type TL = Timeline & { estimated: boolean };

export function Player({ project, timelines, initialLang, initialScene }: { project: string; timelines: Record<string, TL>; initialLang: string; initialScene?: string }) {
  const langs = Object.keys(timelines);
  const [lang, setLang] = useState(langs.includes(initialLang) ? initialLang : langs[0]!);
  const tl = timelines[lang]!;
  const [sceneFilter, setSceneFilter] = useState<string>(initialScene ?? "");
  const [frame, setFrame] = useState(() => (initialScene ? tl.scenes.find((s) => s.id === initialScene)?.startFrame ?? 0 : 0));
  const [playing, setPlaying] = useState(false);
  const [showCaps, setShowCaps] = useState(true);
  const [showGuides, setShowGuides] = useState(false);
  const [components, setComponents] = useState<Record<string, ComponentType | Error>>({});
  const audioRef = useRef<HTMLAudioElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const range = useMemo(() => {
    const s = tl.scenes.find((x) => x.id === sceneFilter);
    return s ? [s.startFrame, s.startFrame + s.durationFrames - 1] : [0, tl.durationFrames - 1];
  }, [tl, sceneFilter]);
  const clampF = useCallback((f: number) => Math.min(range[1]!, Math.max(range[0]!, f)), [range]);

  const active = tl.scenes.find((s) => frame >= s.startFrame && frame < s.startFrame + s.durationFrames) ?? tl.scenes[0]!;
  const local = frame - active.startFrame;

  // Load web scene modules on demand.
  useEffect(() => {
    if (active.renderer !== "web" || components[active.id]) return;
    loadScene(project, active.entry).then(
      (C) => setComponents((m) => ({ ...m, [active.id]: C })),
      (e: Error) => setComponents((m) => ({ ...m, [active.id]: e })),
    );
  }, [active, project, components]);

  // Fit stage to window.
  useEffect(() => {
    const fit = () => {
      const el = hostRef.current;
      if (el) setScale(Math.min(el.clientWidth / tl.width, el.clientHeight / tl.height));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [tl]);

  const hasAudio = !tl.estimated;
  const narrationUrl = hasAudio ? fileUrl(`build/${project}/${lang}/audio/narration.wav`) : "";

  // Playback clock: audio when available, wall clock otherwise.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const audio = audioRef.current;
    const t0 = performance.now();
    const f0 = frame;
    if (audio && hasAudio) {
      audio.currentTime = frame / tl.fps;
      void audio.play();
    }
    const tick = () => {
      const f = audio && hasAudio ? Math.round(audio.currentTime * tl.fps) : f0 + Math.round(((performance.now() - t0) / 1000) * tl.fps);
      if (f > range[1]!) {
        setFrame(range[0]!);
        setPlaying(false);
        return;
      }
      setFrame(f);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      audio?.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Keyboard: space play/pause, arrows step, shift+arrows 1 s, [ ] prev/next cue.
  useEffect(() => {
    const cueFrames = tl.scenes.flatMap((s) => Object.values(s.cues).map((c) => s.startFrame + c.frame)).sort((a, b) => a - b);
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.code === "ArrowRight") setFrame((f) => clampF(f + (e.shiftKey ? tl.fps : 1)));
      else if (e.code === "ArrowLeft") setFrame((f) => clampF(f - (e.shiftKey ? tl.fps : 1)));
      else if (e.key === "]") setFrame((f) => clampF(cueFrames.find((c) => c > f) ?? f));
      else if (e.key === "[") setFrame((f) => clampF([...cueFrames].reverse().find((c) => c < f) ?? f));
      else if (e.key === "c") setShowCaps((v) => !v);
      else if (e.key === "g") setShowGuides((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tl, clampF]);

  const t = frame / tl.fps;
  const subLang = Object.keys(tl.captions)[0];
  const caption = subLang ? tl.captions[subLang as "en"]?.find((c) => t >= c.start && t < c.end) : undefined;
  const comp = components[active.id];

  return (
    <div className="player">
      <header>
        <strong>{project}</strong>
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          {langs.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <select value={sceneFilter} onChange={(e) => {
          setSceneFilter(e.target.value);
          const s = tl.scenes.find((x) => x.id === e.target.value);
          setFrame(s ? s.startFrame : 0);
        }}>
          <option value="">Full film</option>
          {tl.scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} ({s.renderer}, {(s.durationFrames / tl.fps).toFixed(1)} s)
            </option>
          ))}
        </select>
        {tl.estimated && <span className="warn">estimated timing: run `pnpm video audio {project}`</span>}
        <span className="grow" />
        <span className="mono">
          {active.id} · f{local}/{active.durationFrames} · {fmt(t)} / {fmt(tl.duration)}
        </span>
      </header>

      <div className="stage-host" ref={hostRef}>
        <div className="stage-scaler" style={{ width: tl.width * scale, height: tl.height * scale }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: tl.width, height: tl.height, position: "relative" }}>
            {active.renderer === "web" &&
              (comp instanceof Error ? (
                <pre className="scene-error">{comp.message}</pre>
              ) : comp ? (
                <Stage Scene={comp} timing={sceneTiming(tl, active.id)} frame={local} />
              ) : null)}
            {active.renderer === "manim" && (
              <>
                <Stage Scene={Underlay} timing={sceneTiming(tl, active.id)} frame={local} />
                <ManimPreview project={project} lang={lang} scene={active.id} time={local / tl.fps} />
              </>
            )}
            {active.renderer === "still" && <Stage Scene={stillScene(fileUrl(`projects/${project}/${active.entry}`))} timing={sceneTiming(tl, active.id)} frame={local} />}
            {showGuides && <div className="guides" />}
            {showCaps && caption && <div className="caption-preview">{caption.text}</div>}
          </div>
        </div>
      </div>

      <footer>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
        <Scrubber tl={tl} frame={frame} range={range as [number, number]} onSeek={(f) => setFrame(clampF(f))} />
        <label>
          <input type="checkbox" checked={showCaps} onChange={(e) => setShowCaps(e.target.checked)} /> captions
        </label>
        <label>
          <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} /> guides
        </label>
      </footer>
      {hasAudio && <audio ref={audioRef} src={narrationUrl} preload="auto" />}
    </div>
  );
}

function ManimPreview({ project, lang, scene, time }: { project: string; lang: string; scene: string; time: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (ref.current && Math.abs(ref.current.currentTime - time) > 0.02) ref.current.currentTime = time;
  }, [time]);
  // The rendered scene already contains the sheet; until it exists, the live sheet shows through.
  if (missing)
    return <pre className="scene-error" style={{ position: "absolute", left: 140, top: 480 }}>Manim scene not rendered yet.{"\n"}pnpm video scene {project} {scene} --lang {lang}</pre>;
  return <video ref={ref} src={fileUrl(`build/${project}/${lang}/scenes/${scene}.draft.mp4`)} muted onError={() => setMissing(true)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

function Scrubber({ tl, frame, range, onSeek }: { tl: TL; frame: number; range: [number, number]; onSeek: (f: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [a, b] = range;
  const pct = (f: number) => `${((f - a) / Math.max(1, b - a)) * 100}%`;
  const seekFromEvent = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    onSeek(Math.round(a + ((clientX - r.left) / r.width) * (b - a)));
  };
  return (
    <div
      className="scrubber"
      ref={ref}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        seekFromEvent(e.clientX);
      }}
      onPointerMove={(e) => e.buttons && seekFromEvent(e.clientX)}
    >
      {tl.scenes.map((s) => (
        <div key={s.id} className="scene-span" style={{ left: pct(s.startFrame), width: `calc(${pct(s.startFrame + s.durationFrames)} - ${pct(s.startFrame)})` }} title={s.id}>
          {s.lines.map((l) => (
            <div key={l.key} className="line-span" style={{ left: `${((l.start - s.start) / (s.end - s.start)) * 100}%`, width: `${((l.end - l.start) / (s.end - s.start)) * 100}%` }} />
          ))}
        </div>
      ))}
      {tl.scenes.flatMap((s) =>
        Object.entries(s.cues)
          .filter(([k]) => !k.includes(":"))
          .map(([k, c]) => <div key={s.id + k} className={`cue${c.estimated ? " est" : ""}`} style={{ left: pct(s.startFrame + c.frame) }} title={k} />),
      )}
      <div className="playhead" style={{ left: pct(frame) }} />
    </div>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
