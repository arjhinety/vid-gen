/**
 * Model sheets for the cast, opened as /cast.html?sheet=<name> (see packages/player/cast.html).
 * A headless browser screenshots them (packages/cast/tools/snap.ts); `window.__castReady`
 * resolves once fonts are loaded.
 */
import type { ReactElement } from "react";
import { createRoot } from "react-dom/client";
import "@vid/design/theme.css";
import { color } from "@vid/design";
import { Chibi } from "../chibi/Chibi.tsx";
import { GRADDY } from "../characters/graddy.tsx";
import { KOHAI } from "../characters/kohai.tsx";
import { NEUTRAL, TONES, withFace } from "../poses.ts";
import type { CharacterDef, Pose } from "../types.ts";

declare global {
  interface Window {
    __castReady?: Promise<void>;
  }
}

const W = 1920;
const H = 1080;

function Grid() {
  return (
    <g>
      <rect width={W} height={H} fill={color.sheet} />
      {Array.from({ length: W / 24 + 1 }, (_, i) => (
        <path key={`v${i}`} d={`M ${i * 24},0 L ${i * 24},${H}`} stroke={i % 4 ? color.grid : color.gridMajor} strokeWidth={1} />
      ))}
      {Array.from({ length: H / 24 + 1 }, (_, i) => (
        <path key={`h${i}`} d={`M 0,${i * 24} L ${W},${i * 24}`} stroke={i % 4 ? color.grid : color.gridMajor} strokeWidth={1} />
      ))}
    </g>
  );
}

const label = (x: number, y: number, text: string, size = 22, weight = 600, fill: string = color.ink) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="Archivo" fontSize={size} fontWeight={weight} fill={fill}>
    {text}
  </text>
);

/** Showcase stance: pointer raised for the senpai, notebook for the kōhai. */
function stance(c: CharacterDef): Pose {
  return c.outfit.prop === "pointer" ? { ...NEUTRAL, armR: 34, pointer: -28, armL: 6 } : { ...NEUTRAL, face: { ...NEUTRAL.face, mouth: "grin" }, armR: 10 };
}

function Variants({ set, title }: { set: Record<string, CharacterDef>; title: string }) {
  const cs = Object.values(set);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Grid />
      {label(W / 2, 64, title, 34, 700)}
      {cs.map((c, i) => {
        const x = 360 + i * 600;
        return (
          <g key={c.variant}>
            <g transform={`translate(${x} 900) scale(1.55)`}>
              <ellipse cx={0} cy={0} rx={70} ry={9} fill={color.ink} opacity={0.08} />
              <Chibi c={c} pose={stance(c)} />
            </g>
            {label(x, 960, `${c.variant}`, 30, 800)}
            {label(x, 996, c.note, 20, 400, color.ink2)}
          </g>
        );
      })}
    </svg>
  );
}

/** Head-and-shoulders crops of every tone face, plus the mouth set. */
function Expressions({ c, title }: { c: CharacterDef; title: string }) {
  const cols = 6;
  const tones = TONES;
  const mouths = ["X", "M", "A", "I", "U", "E", "O"] as const;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Grid />
      {label(W / 2, 56, title, 30, 700)}
      {tones.map((t, i) => {
        const x = 170 + (i % cols) * 316;
        const y = 330 + Math.floor(i / cols) * 330;
        return (
          <g key={t}>
            <svg x={x - 150} y={y - 240} width={300} height={260} viewBox="-150 -480 300 260" overflow="hidden">
              <Chibi c={c} pose={withFace(NEUTRAL, t)} />
            </svg>
            {label(x, y + 42, t, 22, 700)}
          </g>
        );
      })}
      {mouths.map((m, i) => {
        const x = 330 + i * 210;
        return (
          <g key={m}>
            <svg x={x - 80} y={880} width={160} height={120} viewBox="-60 -330 120 90" overflow="hidden">
              <Chibi c={c} pose={{ ...NEUTRAL, face: { ...NEUTRAL.face, mouth: m, mouthOpen: 1 } }} />
            </svg>
            {label(x, 1030, m, 22, 700)}
          </g>
        );
      })}
    </svg>
  );
}

const SHEETS: Record<string, () => ReactElement> = {
  graddy: () => <Variants set={GRADDY} title="Graddy-chan · variants" />,
  kohai: () => <Variants set={KOHAI} title="Kōhai · variants" />,
  "graddy-faces": () => <Expressions c={GRADDY.B} title="Graddy-chan · faces (tone) and mouths (viseme)" />,
  "kohai-faces": () => <Expressions c={KOHAI.A} title="Kōhai · faces (tone) and mouths (viseme)" />,
};

const name = new URLSearchParams(location.search).get("sheet") ?? "graddy";
const Sheet = SHEETS[name] ?? (() => <p>unknown sheet {name}; known: {Object.keys(SHEETS).join(", ")}</p>);
document.body.style.margin = "0";
createRoot(document.getElementById("root")!).render(<Sheet />);
window.__castReady = document.fonts.ready.then(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
