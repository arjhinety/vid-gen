/**
 * The cast: the three founders as little bean characters (plus an outsider and a sponsor),
 * drawn in ink on card so they sit on the sheet like the rest of the exhibit. They are a
 * picture of the draft's roles, not of real people: no likeness, only a name and a tuft
 * (Arjhine a sprout, Alpha an antenna, John a curl, Xynil a zigzag) so the viewer can tell
 * them apart.
 *
 * Pure functions of the frame: idle bob, breathing and blinks come from the scene frame
 * and a per-character seed; pop-ins, hops and hats come from progress values the scene
 * passes in.
 */
import type { ReactNode } from "react";
import { color, text } from "@vid/design";
import { clamp, ease, mix, mixColor, useCues, useScene, useSceneFrame, type TimeRef } from "@vid/motion";

/** p(ref, dur, offset): linear 0..1 from a cue; at(ref, offset): its frame. */
export function useProgress() {
  const cue = useCues();
  const f = useSceneFrame();
  const { fps } = useScene();
  const at = (ref: TimeRef, o = 0) => cue.frame(ref) + Math.round(o * fps);
  const p = (ref: TimeRef, dur = 0.35, o = 0) => clamp((f - at(ref, o)) / (dur * fps));
  return { p, at, f, fps, cue };
}

/** Pop with a little overshoot (characters only; the sheet itself never bounces). */
export function pop(t: number): number {
  const x = clamp(t);
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export type Who = "arjhine" | "alpha" | "john" | "xynil" | "outsider" | "sponsor" | "plain";
export type Mood = "smile" | "open" | "o" | "flat" | "worried" | "sleepy";
export type HatKind = "member" | "trustee" | "officer" | "tophat";
export type Holds = "vote" | "no" | "bag" | "doc" | null;
export type Mark = "!" | "?" | "sweat" | "heart" | "zz";

const NAMES: Record<Who, string> = { arjhine: "Arjhine", alpha: "Alpha", john: "John", xynil: "Xynil", outsider: "outsider", sponsor: "sponsor", plain: "" };
const SEED: Record<Who, number> = { arjhine: 0.3, alpha: 1.7, john: 2.9, xynil: 3.6, outsider: 4.1, sponsor: 5.3, plain: 6.1 };
const BLUSH = "#F0B7BF"; // character paint, not a data colour

export const FOUNDERS: Array<"arjhine" | "alpha" | "john"> = ["arjhine", "alpha", "john"];

export interface BeanProps {
  who: Who;
  /** Feet position (design px). */
  x: number;
  y: number;
  /** Body height in px. */
  size?: number;
  /** Arrival 0..1 (pops in). */
  p?: number;
  mood?: Mood;
  hat?: HatKind | null;
  /** Hat arrival 0..1 (drops onto the head). */
  hatP?: number;
  holds?: Holds;
  /** Raised-arm progress 0..1 for `holds`. */
  holdP?: number;
  /** One hop, 0..1. */
  hop?: number;
  /** 0 present .. 1 stepped out (faded, greyed). */
  dim?: number;
  mark?: Mark;
  markP?: number;
  facing?: 1 | -1;
  /** Name under the feet; `false` hides it; a string overrides it. */
  name?: string | false;
  nameP?: number;
  fill?: string;
}

export function Bean({ who, x, y, size = 150, p = 1, mood = "smile", hat = null, hatP = 1, holds = null, holdP = 1, hop = 0, dim = 0, mark, markP = 1, facing = 1, name, nameP, fill = color.card }: BeanProps) {
  const f = useSceneFrame();
  const { fps } = useScene();
  if (p <= 0) return null;
  const t = f / fps;
  const seed = SEED[who];
  const u = size / 100;
  const s = pop(p);
  const bob = Math.sin(t * Math.PI * 1.1 + seed * 2) * 1.4;
  const breathe = 1 + Math.sin(t * Math.PI * 0.9 + seed) * 0.012;
  const jump = Math.sin(Math.PI * clamp(hop)) * 14;
  const period = 3.1 + seed * 0.37;
  const blink = (t + seed) % period < 0.11 ? 0.15 : 1;
  const ink = mixColor(color.ink, color.dim, dim);
  const body = mixColor(fill, color.sheetShade, dim);
  const alpha = clamp(p * 3) * (1 - dim * 0.45);
  const hp = hat ? ease.slam(clamp(hatP)) : 0;
  const hatLift = hat ? mix(-40, 0, hp) : 0;
  const hatH = hat === "trustee" || hat === "tophat" ? 26 : hat === "officer" ? 24 : hat === "member" ? 13 : 0;
  const acc = hp > 0.5 ? hatH : 0;
  const raise = ease.settle(clamp(holdP));
  const label = name === false ? null : name ?? NAMES[who];

  return (
    <div style={{ position: "absolute", left: x - 0.7 * size, top: y - 1.5 * size, width: 1.4 * size, height: 1.5 * size + 40, opacity: alpha, pointerEvents: "none" }}>
      <svg width={1.4 * size} height={1.6 * size} viewBox="-70 -150 140 160" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g transform={`translate(0 ${-jump - bob * (1 - dim)}) scale(${facing * s} ${s * breathe})`} strokeLinecap="round" strokeLinejoin="round">
          {/* shadow */}
          <ellipse cx={0} cy={2 + jump + bob} rx={30 - jump * 0.6} ry={4} fill={color.ink} opacity={0.08} />
          {/* feet */}
          <ellipse cx={-15} cy={-3} rx={11} ry={6} fill={ink} />
          <ellipse cx={15} cy={-3} rx={11} ry={6} fill={ink} />
          {/* arms */}
          <path d="M -37 -46 Q -47 -38 -49 -28" fill="none" stroke={ink} strokeWidth={4.5} />
          {holds ? (
            <path d={`M 37 -50 Q ${mix(48, 50, raise)} ${mix(-40, -70, raise)} ${mix(50, 52, raise)} ${mix(-28, -88, raise)}`} fill="none" stroke={ink} strokeWidth={4.5} />
          ) : (
            <path d="M 37 -46 Q 47 -38 49 -28" fill="none" stroke={ink} strokeWidth={4.5} />
          )}
          {/* body */}
          <rect x={-40} y={-106} width={80} height={102} rx={38} fill={body} stroke={ink} strokeWidth={3.6} />
          {/* face */}
          <Face mood={mood} blink={blink} ink={ink} dim={dim} />
          {who === "outsider" && <Glasses ink={ink} />}
          {/* accessory, lifted onto the hat when one is worn */}
          <g transform={`translate(0 ${-acc})`}>
            <Accessory who={who} ink={ink} body={body} />
          </g>
          {hat && hp > 0 && (
            <g transform={`translate(0 ${hatLift})`} opacity={clamp(hp * 2)}>
              <Hat kind={hat} ink={ink} />
            </g>
          )}
          {holds && raise > 0 && <Held kind={holds} ink={ink} raise={raise} />}
        </g>
        {mark && markP > 0 && <MarkGlyph mark={mark} p={markP} ink={ink} t={t} />}
      </svg>
      {label && (
        <div style={{ position: "absolute", left: 0, width: 1.4 * size, top: 1.5 * size + 8, textAlign: "center", ...text("meta"), fontSize: Math.max(20, Math.round(size * 0.15)), color: mixColor(color.ink2, color.dim, dim), opacity: clamp((nameP ?? p) * 2), whiteSpace: "nowrap" }}>
          {label}
        </div>
      )}
    </div>
  );
}

function Face({ mood, blink, ink, dim }: { mood: Mood; blink: number; ink: string; dim: number }) {
  const eyeRy = mood === "sleepy" ? 1.2 : 5 * blink;
  return (
    <g>
      <ellipse cx={-14} cy={-64} rx={5} ry={eyeRy} fill={ink} />
      <ellipse cx={14} cy={-64} rx={5} ry={eyeRy} fill={ink} />
      {blink === 1 && mood !== "sleepy" && (
        <>
          <circle cx={-12.3} cy={-66} r={1.7} fill={color.card} />
          <circle cx={15.7} cy={-66} r={1.7} fill={color.card} />
        </>
      )}
      <ellipse cx={-25} cy={-51} rx={7} ry={4} fill={BLUSH} opacity={0.85 * (1 - dim)} />
      <ellipse cx={25} cy={-51} rx={7} ry={4} fill={BLUSH} opacity={0.85 * (1 - dim)} />
      {mood === "smile" && <path d="M -6 -54 Q 0 -47 6 -54" fill="none" stroke={ink} strokeWidth={3} />}
      {mood === "open" && <path d="M -7 -55 Q 0 -42 7 -55 Z" fill={ink} />}
      {mood === "o" && <ellipse cx={0} cy={-51} rx={3.4} ry={4.2} fill={ink} />}
      {mood === "flat" && <path d="M -5 -52 L 5 -52" stroke={ink} strokeWidth={3} />}
      {mood === "worried" && <path d="M -7 -50 Q -3.5 -54 0 -50 Q 3.5 -46 7 -50" fill="none" stroke={ink} strokeWidth={2.8} />}
      {mood === "sleepy" && <path d="M -4 -52 Q 0 -49 4 -52" fill="none" stroke={ink} strokeWidth={2.6} />}
    </g>
  );
}

function Glasses({ ink }: { ink: string }) {
  return (
    <g fill="none" stroke={ink} strokeWidth={2.4}>
      <circle cx={-14} cy={-64} r={10} />
      <circle cx={14} cy={-64} r={10} />
      <path d="M -4 -65 Q 0 -68 4 -65" />
    </g>
  );
}

function Accessory({ who, ink, body }: { who: Who; ink: string; body: string }) {
  if (who === "arjhine")
    return (
      <g stroke={ink} strokeWidth={3}>
        <path d="M 0 -106 L 0 -121" fill="none" />
        <path d="M 0 -120 Q -14 -134 -20 -122 Q -10 -114 0 -120 Z" fill={body} />
        <path d="M 0 -121 Q 12 -138 20 -127 Q 11 -117 0 -121 Z" fill={body} />
      </g>
    );
  if (who === "alpha")
    return (
      <g>
        <path d="M 2 -106 Q 4 -118 8 -128" fill="none" stroke={ink} strokeWidth={3} />
        <circle cx={9} cy={-132} r={5.5} fill={ink} />
      </g>
    );
  if (who === "xynil") return <path d="M -12 -104 L -6 -122 L 0 -110 L 6 -126 L 12 -104" fill="none" stroke={ink} strokeWidth={3.2} strokeLinejoin="round" />;
  if (who === "john") return <path d="M -2 -105 C -14 -122 10 -132 10 -118 C 10 -110 0 -110 2 -116" fill="none" stroke={ink} strokeWidth={3.2} />;
  return null;
}

function Hat({ kind, ink }: { kind: HatKind; ink: string }) {
  if (kind === "member")
    return (
      <g>
        <ellipse cx={-2} cy={-104} rx={31} ry={9} fill={color.ink2} stroke={ink} strokeWidth={2.4} />
        <circle cx={-2} cy={-114} r={3.5} fill={ink} />
      </g>
    );
  if (kind === "trustee" || kind === "tophat")
    return (
      <g>
        <rect x={-21} y={-129} width={42} height={24} rx={3} fill={ink} />
        <rect x={-21} y={-113} width={42} height={5} fill={kind === "tophat" ? color.ink3 : color.card} opacity={0.9} />
        <rect x={-32} y={-108} width={64} height={5} rx={2.5} fill={ink} />
      </g>
    );
  return (
    <g>
      <path d="M -29 -103 Q -27 -128 0 -129 Q 27 -128 29 -103 Z" fill={ink} />
      <ellipse cx={18} cy={-103} rx={21} ry={4.2} fill={ink} />
      <rect x={-8} y={-121} width={16} height={7} rx={2} fill={color.card} />
    </g>
  );
}

/** A hat on its own (the hat rack), drawn at `size` px wide around (x, y). */
export function HatIcon({ kind, x, y, size = 90, p = 1 }: { kind: HatKind; x: number; y: number; size?: number; p?: number }) {
  if (p <= 0) return null;
  const s = (size / 70) * pop(p);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <g transform={`translate(${x} ${y}) scale(${s}) translate(0 116)`} opacity={clamp(p * 3)}>
        <Hat kind={kind} ink={color.ink} />
      </g>
    </svg>
  );
}

function Held({ kind, ink, raise }: { kind: Exclude<Holds, null>; ink: string; raise: number }) {
  const y = mix(-30, -100, raise);
  if (kind === "vote" || kind === "no")
    return (
      <g transform={`translate(54 ${y}) rotate(${mix(20, -6, raise)})`}>
        <rect x={-15} y={-20} width={30} height={26} rx={3} fill={color.card} stroke={ink} strokeWidth={2.6} />
        {kind === "vote" ? (
          <path d="M -8 -8 L -2 -1 L 9 -14" fill="none" stroke={ink} strokeWidth={3.2} />
        ) : (
          <path d="M -6 -13 L 6 -1 M 6 -13 L -6 -1" fill="none" stroke={color.red} strokeWidth={3.2} />
        )}
      </g>
    );
  if (kind === "bag")
    return (
      <g transform={`translate(58 ${mix(-18, -60, raise)})`}>
        <path d="M -8 -24 L 8 -24 L 5 -18 Q 20 -8 16 6 Q 12 16 0 16 Q -12 16 -16 6 Q -20 -8 -5 -18 Z" fill={color.card} stroke={ink} strokeWidth={2.6} />
        <path d="M -6 -18 L 6 -18" stroke={ink} strokeWidth={2.6} />
        <circle cx={0} cy={2} r={5} fill="none" stroke={ink} strokeWidth={2.2} />
      </g>
    );
  return (
    <g transform={`translate(56 ${y}) rotate(${mix(10, -4, raise)})`}>
      <rect x={-13} y={-18} width={26} height={32} fill={color.card} stroke={ink} strokeWidth={2.4} />
      <path d="M -7 -9 H 7 M -7 -2 H 7 M -7 5 H 3" stroke={ink} strokeWidth={2} />
    </g>
  );
}

function MarkGlyph({ mark, p, ink, t }: { mark: Mark; p: number; ink: string; t: number }) {
  const a = pop(p);
  const wig = Math.sin(t * 6) * 2;
  const g = (children: ReactNode) => (
    <g transform={`translate(44 -126) scale(${a}) rotate(${wig})`} opacity={clamp(p * 3)}>
      {children}
    </g>
  );
  if (mark === "!" || mark === "?")
    return g(
      <text x={0} y={0} textAnchor="middle" fontFamily="Archivo" fontWeight={800} fontSize={40} fill={ink}>
        {mark}
      </text>,
    );
  if (mark === "sweat") return g(<path d="M 0 -26 Q -10 -8 -8 -2 Q -6 6 0 6 Q 6 6 8 -2 Q 10 -8 0 -26 Z" fill={color.card} stroke={ink} strokeWidth={2.4} />);
  if (mark === "heart") return g(<path d="M 0 2 C -20 -10 -14 -28 0 -18 C 14 -28 20 -10 0 2 Z" fill={color.card} stroke={ink} strokeWidth={2.6} />);
  return g(
    <text x={0} y={0} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight={600} fontSize={24} fill={ink}>
      zz
    </text>,
  );
}

/** The draft's own status label on a rule (PROVISIONAL · GDR-012), in the mono tag style. */
export function DocTag({ x, y, p = 1, children, c = color.ink2 }: { x: number; y: number; p?: number; children: ReactNode; c?: string }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, border: `1.5px solid ${c}`, padding: "3px 10px", ...text("meta"), fontSize: 20, color: c, background: color.card, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 5}px)`, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

/** A rounded plaque (a place or a body): mono kicker and a sans title. */
export function Plaque({ x, y, w, h, kicker, title, p = 1, dashed = false, dark = false, children }: { x: number; y: number; w: number; h: number; kicker?: string; title?: ReactNode; p?: number; dashed?: boolean; dark?: boolean; children?: ReactNode }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 18,
        background: dark ? color.instrument : color.card,
        border: dashed ? `2.5px dashed ${color.ink2}` : dark ? "none" : `2.5px solid ${color.ink}`,
        opacity: clamp(a * 1.4),
        transform: `translateY(${(1 - a) * 10}px) scale(${mix(0.97, 1, a)})`,
      }}
    >
      {kicker && <div style={{ position: "absolute", left: 24, top: 18, ...text("label"), fontSize: 20, color: dark ? color.instrumentInk2 : color.ink3 }}>{kicker}</div>}
      {title && <div style={{ position: "absolute", left: 24, right: 24, top: 50, ...text("heading"), fontSize: 34, lineHeight: 1.15, color: dark ? color.instrumentInk : color.ink }}>{title}</div>}
      {children}
    </div>
  );
}

/** An arrow (polyline with a head) that draws in. */
export function Arrow({ points, p = 1, c = color.ink, width = 3, dashed = false, head = true }: { points: Array<[number, number]>; p?: number; c?: string; width?: number; dashed?: boolean; head?: boolean }) {
  if (p <= 0) return null;
  const tt = ease.travel(clamp(p));
  const [ax, ay] = points[points.length - 2]!;
  const [bx, by] = points[points.length - 1]!;
  const ang = Math.atan2(by - ay, bx - ax);
  const hl = 14;
  const hx1 = bx - hl * Math.cos(ang - 0.45);
  const hy1 = by - hl * Math.sin(ang - 0.45);
  const hx2 = bx - hl * Math.cos(ang + 0.45);
  const hy2 = by - hl * Math.sin(ang + 0.45);
  const d = points.map(([px, py]) => `${px},${py}`).join(" ");
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      {dashed ? (
        <polyline points={d} fill="none" stroke={c} strokeWidth={width} strokeDasharray="10 7" opacity={tt} />
      ) : (
        <polyline points={d} fill="none" stroke={c} strokeWidth={width} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - tt} />
      )}
      {head && tt > 0.9 && <path d={`M ${hx1} ${hy1} L ${bx} ${by} L ${hx2} ${hy2}`} fill="none" stroke={c} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" opacity={clamp((tt - 0.9) * 10)} />}
    </svg>
  );
}

/** A sans line written on letter by letter (for short rule text on cards). */
export function Line({ x, y, children, p = 1, size = 30, c = color.ink, w, weight = 500, align = "left" }: { x: number; y: number; children: ReactNode; p?: number; size?: number; c?: string; w?: number; weight?: number; align?: "left" | "center" | "right" }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: align, ...text("body"), fontSize: size, fontWeight: weight, lineHeight: 1.25, color: c, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 6}px)`, whiteSpace: w ? "normal" : "nowrap" }}>
      {children}
    </div>
  );
}
