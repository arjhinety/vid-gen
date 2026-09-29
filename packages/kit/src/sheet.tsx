/**
 * The house sheet (research/reference-videos/experimental-labs/grammar.md):
 * grey grid paper with a mono breadcrumb, the narration as a word-by-word headline,
 * and exhibits that dissolve in and out underneath. The chrome is drawn from
 * film-level context, so it is identical on both sides of every scene cut.
 */
import type { CSSProperties, ReactNode } from "react";
import { color, layout, motion, text as textStyle, type as typeScale, type TypeStyle } from "@vid/design";
import { clamp, ease, mix, mixColor, useCues, useScene, useSceneFrame, type FilmHeadlineRow, type TimeRef } from "@vid/motion";
import { WriteOn } from "./labels.tsx";

const { width: W } = layout;

/** Grid paper, perforations, header band and the desk below the sheet. */
export function Sheet({ grid = true }: { grid?: boolean }) {
  const top = layout.headerHeight;
  const bottom = layout.sheetBottom;
  const perf = (y: number) =>
    Array.from({ length: Math.floor(W / 40) + 1 }, (_, i) => <circle key={i} cx={20 + i * 40} cy={y} r={3.2} fill={color.perf} />);
  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${color.desk} 0%, #C9C9C5 100%)` }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: bottom,
          background: `radial-gradient(ellipse 90% 80% at 28% 22%, #F5F5F2 0%, ${color.sheet} 55%, #E8E8E4 100%)`,
          boxShadow: "0 6px 18px rgba(20,21,22,0.10), 0 1px 0 rgba(20,21,22,0.06)",
        }}
      />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: top, background: `linear-gradient(180deg, #EBEBE8, ${color.sheetShade})` }} />
      <svg width={W} height={bottom} style={{ position: "absolute", left: 0, top: 0 }}>
        {grid && (
          <>
            <defs>
              <pattern id="sheet-minor" width={layout.gridMinor} height={layout.gridMinor} patternUnits="userSpaceOnUse" x={0} y={top}>
                <path d={`M ${layout.gridMinor} 0 L 0 0 0 ${layout.gridMinor}`} fill="none" stroke={color.grid} strokeWidth={1} />
              </pattern>
              <pattern id="sheet-major" width={layout.gridMajor} height={layout.gridMajor} patternUnits="userSpaceOnUse" x={0} y={top}>
                <path d={`M ${layout.gridMajor} 0 L 0 0 0 ${layout.gridMajor}`} fill="none" stroke={color.gridMajor} strokeWidth={1.2} />
              </pattern>
            </defs>
            <rect x={0} y={top} width={W} height={bottom - top} fill="url(#sheet-minor)" />
            <rect x={0} y={top} width={W} height={bottom - top} fill="url(#sheet-major)" />
          </>
        )}
        {perf(layout.perfTop)}
        {perf(layout.perfBottom)}
      </svg>
    </div>
  );
}

/** The Experimental Labs mark: rounded square, three bars, a red dashed leader to a dot. */
export function LogoMark({ size = 30, x = 0, y = 0, dot = 1, style }: { size?: number; x?: number; y?: number; dot?: number; style?: CSSProperties }) {
  const s = size;
  const bar = (x0: number, x1: number, y0: number, y1: number) => <rect x={x0 * s} y={y0 * s} width={(x1 - x0) * s} height={(y1 - y0) * s} fill="#EEEFF1" />;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ position: "absolute", left: x, top: y, overflow: "visible", ...style }}>
      <rect x={0} y={0} width={s} height={s} rx={s * 0.22} fill="#121415" />
      {bar(0.22, 0.78, 0.25, 0.36)}
      {bar(0.22, 0.47, 0.445, 0.555)}
      {bar(0.22, 0.64, 0.64, 0.75)}
      <line x1={0.48 * s} y1={0.5 * s} x2={(0.48 + (0.68 - 0.48) * clamp(dot)) * s} y2={0.5 * s} stroke={color.red} strokeWidth={Math.max(1, s * 0.022)} strokeDasharray={`${s * 0.035} ${s * 0.03}`} />
      <circle cx={0.725 * s} cy={0.5 * s} r={0.05 * s} fill={color.red} opacity={clamp(dot * 2 - 1)} />
    </svg>
  );
}

/** Mono breadcrumb in the header band; the scene's section cross-fades at the cut. */
export function Breadcrumb() {
  const scene = useScene();
  const f = useSceneFrame();
  const film = scene.film;
  if (!film) return null;
  const head = [film.brand.name, film.brand.place, ...film.brand.crumbs].filter(Boolean) as string[];
  const cur = [...head, ...film.section];
  const prev = film.prevSection ? [...head, ...film.prevSection] : cur;
  const same = prev.join("|") === cur.join("|");
  const out = same ? 1 : clamp(1 - f / 4);
  const inn = same ? 1 : ease.arrive(clamp((f - 3) / 6));
  const row = (items: string[], o: number, dy: number) => (
    <div style={{ position: "absolute", left: 128, top: 50, transform: `translateY(${dy - 9}px)`, opacity: o, whiteSpace: "nowrap", ...textStyle("crumb"), color: color.ink2 }}>
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span style={{ color: color.ink3, margin: "0 0.55em" }}>·</span>}
          {it}
        </span>
      ))}
    </div>
  );
  return (
    <>
      <LogoMark size={30} x={84} y={36} />
      {!same && out > 0 && row(prev, out, 0)}
      {row(cur, inn, (1 - inn) * 6)}
    </>
  );
}

// ------------------------------------------------------------------ headline

const LEAD = 2 / 30; // a row appears this long before its first word is spoken
const INK_FAINT = "#C8C8C4";

let measurer: HTMLSpanElement | null = null;
/** Rendered width of a line of text in a type style (the headline's by default; fonts must be loaded). */
function measure(textContent: string, size: number, t: TypeStyle = typeScale.headline): number {
  if (typeof document === "undefined") return 0;
  if (!measurer) {
    measurer = document.createElement("span");
    Object.assign(measurer.style, { position: "absolute", left: "-99999px", top: "0", whiteSpace: "pre", visibility: "hidden" });
    document.body.appendChild(measurer);
  }
  Object.assign(measurer.style, { fontFamily: `"${t.family}"`, fontWeight: String(t.weight), fontStretch: `${t.stretch ?? 100}%`, letterSpacing: `${t.tracking}em`, fontSize: `${size}px` });
  measurer.textContent = textContent;
  return measurer.getBoundingClientRect().width;
}

/**
 * The narration as headline. Each word lands (5 f, small rise) as it is spoken; when a
 * new row starts, the stack scrolls up (8 f) and the spoken row dims to grey (red to
 * pink). Accent and strike marks come from the script (`*…*`, `~~…~~`).
 */
export function Headline({ x = layout.headlineX, top = layout.headlineTop, maxWidth = W - 2 * layout.headlineX }: { x?: number; top?: number; maxWidth?: number }) {
  const scene = useScene();
  const f = useSceneFrame();
  const film = scene.film;
  if (!film || !film.headline.length) return null;
  const T = scene.start + f / scene.fps;
  const rows = film.headline;
  let c = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]!.start - LEAD <= T) c = i;
    else break;
  }
  if (c < 0) return null;

  // Visible-row limit, animated at the cut when it changes between scenes.
  const R = mix(film.prevHeadlineRows ?? film.headlineRows, film.headlineRows, ease.arrive(clamp(f / 8)));
  if (R <= 0.01) return null;
  const baseOf = (i: number) => Math.max(0, i - (R - 1));
  const sp = ease.arrive(clamp((T - (rows[c]!.start - LEAD)) / motion.scroll));
  const base = c > 0 ? mix(baseOf(c - 1), baseOf(c), sp) : baseOf(c);
  const size = typeScale.headline.size;
  const pitch = layout.headlineRow;

  const shown: ReactNode[] = [];
  for (let i = Math.max(0, c - 4); i <= c; i++) {
    const row = rows[i]!;
    const slot = i - base;
    // Rows leave by scrolling above the top slot (fading as they go), never by popping.
    const vis = clamp(1 + slot * 1.6);
    if (vis <= 0.001) continue;
    // Dim once the next row starts.
    const next = rows[i + 1];
    const dimP = next && next.start - LEAD <= T ? ease.arrive(clamp((T - (next.start - LEAD)) / motion.scroll)) : 0;
    const width = measure(row.text, size);
    const fs = width > maxWidth ? (size * maxWidth) / width : size;
    shown.push(<HeadlineRowView key={row.id} row={row} T={T} dimP={dimP} x={x} y={top + slot * pitch} size={fs} opacity={vis} />);
  }
  return <>{shown}</>;
}

function HeadlineRowView({ row, T, dimP, x, y, size, opacity }: { row: FilmHeadlineRow; T: number; dimP: number; x: number; y: number; size: number; opacity: number }) {
  const markAt = (c0: number) => row.marks.find((m) => c0 >= m.c0 && c0 < m.c1);
  const ink = mixColor(color.ink, color.dim, dimP);
  const red = mixColor(color.red, color.redDim, dimP);
  return (
    <div style={{ position: "absolute", left: x, top: y, whiteSpace: "pre", opacity, ...textStyle("headline"), fontSize: size, color: ink }}>
      {row.words.map((w, k) => {
        const p = ease.arrive(clamp((T - w.start + 1 / 30) / motion.word));
        const strikeP = ease.settle(clamp((T - w.start - 0.12) / motion.settle));
        // Split the word where marks begin/end, so "guess." strikes "guess" and not the period.
        const cuts = new Set([w.c0, w.c1]);
        for (const m of row.marks) {
          if (m.c0 > w.c0 && m.c0 < w.c1) cuts.add(m.c0);
          if (m.c1 > w.c0 && m.c1 < w.c1) cuts.add(m.c1);
        }
        const edges = [...cuts].sort((a, b) => a - b);
        return (
          <span key={k}>
            <span style={{ display: "inline-block", opacity: clamp(p * 1.3), transform: `translateY(${(1 - p) * 7}px)` }}>
              {edges.slice(0, -1).map((a, j) => {
                const b = edges[j + 1]!;
                const m = markAt(a);
                const c = m ? red : ink;
                const strike = m?.kind === "strike" ? strikeP : 0;
                return (
                  <span
                    key={j}
                    style={{
                      color: p < 1 ? mixColor(INK_FAINT, c, p) : c,
                      backgroundImage: strike > 0 ? `linear-gradient(${c}, ${c})` : undefined,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: `${strike * 100}% 0.075em`,
                      backgroundPosition: "0 58%",
                    }}
                  >
                    {row.text.slice(a, b)}
                  </span>
                );
              })}
            </span>
            {k < row.words.length - 1 ? " " : ""}
          </span>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ the open question

/** Seconds per character of the write-on, and its bounds. */
const Q_CHAR = 0.024;
const Q_WRITE = { min: 0.5, max: 1.1 };
const Q_OUT = 0.3;

/**
 * The open question of the moment (3Blue1Brown's "Why the layers?"): one line under the
 * header band, written on letter by letter when it is first asked and left alone until
 * the film moves to the next question, even across cuts. It is the only running text on
 * the sheet: the narration itself is never shown.
 */
export function QuestionLine({ x = layout.questionX, top = layout.questionTop, maxWidth = W - 2 * layout.questionX }: { x?: number; top?: number; maxWidth?: number }) {
  const scene = useScene();
  const f = useSceneFrame();
  const qs = scene.film?.questions;
  if (!qs?.length) return null;
  const T = scene.start + f / scene.fps;
  let c = -1;
  for (let i = 0; i < qs.length; i++) {
    if (qs[i]!.t <= T + 1e-6) c = i;
    else break;
  }
  if (c < 0) return null;
  // The text on screen before event c (events that repeat the standing text change nothing).
  let before: string | null = null;
  let since = -1;
  for (let i = 0; i <= c; i++) {
    const t = qs[i]!.text;
    if (i === c) {
      if (t === before) since = -1;
      else since = qs[i]!.t;
      break;
    }
    before = t;
  }
  const now = qs[c]!.text;
  if (since < 0) return now ? <QuestionText text={now} x={x} top={top} maxWidth={maxWidth} write={1} /> : null;
  const dt = T - since;
  const out = before ? ease.exit(clamp(dt / Q_OUT)) : 1;
  const delay = before ? Q_OUT * 0.7 : 0;
  const dur = now ? Math.min(Q_WRITE.max, Math.max(Q_WRITE.min, now.length * Q_CHAR)) : 1;
  const write = clamp((dt - delay) / dur);
  return (
    <>
      {before && out < 1 && <QuestionText text={before} x={x} top={top} maxWidth={maxWidth} write={1} opacity={1 - out} dy={-10 * out} />}
      {now && write > 0 && <QuestionText text={now} x={x} top={top} maxWidth={maxWidth} write={write} />}
    </>
  );
}

function QuestionText({ text, x, top, maxWidth, write, opacity = 1, dy = 0 }: { text: string; x: number; top: number; maxWidth: number; write: number; opacity?: number; dy?: number }) {
  const t = typeScale.question;
  const width = measure(text, t.size, t);
  const fs = width > maxWidth ? (t.size * maxWidth) / width : t.size;
  const bar = ease.arrive(clamp(write * 4));
  return (
    <div style={{ position: "absolute", left: x, top: top + dy, opacity, whiteSpace: "pre" }}>
      <div style={{ position: "absolute", left: -22, top: fs * 0.18, width: 5, height: fs * 0.86 * bar, background: color.red }} />
      <div style={{ ...textStyle("question"), fontSize: fs, color: color.ink }}>
        <WriteOn text={text} p={write} />
      </div>
    </div>
  );
}

/** Everything a sheet scene shares: background under the exhibit; header, question line and headline over it. */
export function SheetChrome({ children }: { children?: ReactNode }) {
  const film = useScene().film;
  if (film && !film.sheet) return <>{children}</>;
  return (
    <>
      <Sheet />
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
      <Breadcrumb />
      <QuestionLine />
      <Headline />
    </>
  );
}

// ------------------------------------------------------------------ exhibits

export interface ExhibitProps {
  /** When the exhibit arrives (cue or seconds). Default: scene start. `false`: already there at the cut. */
  from?: TimeRef | false;
  /** When it leaves (cue or seconds). Default: dissolves out by the end of the scene. `false`: stays through the cut. */
  until?: TimeRef | false;
  /** Horizontal glide into place after arriving (px), e.g. from centre to its final column. */
  glide?: { dx: number; at: TimeRef };
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * One figure on the sheet. Arrives with a short fade and scale (11 f), leaves with a
 * dissolve (9 f), so consecutive exhibits are separated by a beat of empty sheet
 * under the running headline, as in the house film.
 */
export function Exhibit({ from = 0, until, glide, style, children }: ExhibitProps) {
  const f = useSceneFrame();
  const scene = useScene();
  const cue = useCues();
  const inF = from === false ? -1e9 : cue.frame(from);
  const outLen = Math.round(motion.exhibitOut * scene.fps);
  const outF = until === false ? 1e9 : until === undefined ? scene.durationFrames - outLen : cue.frame(until);
  const a = from === false ? 1 : ease.arrive(clamp((f - inF) / (motion.exhibitIn * scene.fps)));
  const z = until === false ? 0 : ease.exit(clamp((f - outF) / outLen));
  if (a <= 0 || z >= 1) return null;
  const g = glide ? ease.glide(clamp((f - cue.frame(glide.at)) / (motion.glide * scene.fps))) : 1;
  const dx = glide ? mix(glide.dx, 0, g) : 0;
  const blur = (1 - a) * 3 + z * 2;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: a * (1 - z),
        transform: `translateX(${dx}px) scale(${mix(0.985, 1, a) * mix(1, 0.99, z)})`,
        transformOrigin: "50% 60%",
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
