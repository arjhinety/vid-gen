/**
 * The chibi face: skin, fringe shadow, blush, eyes, nose, mouth. Eyes sit at
 * (±40, -306), the mouth at (0, -273), the chin at -256. Eye parts are written once for
 * the screen-right eye (outward = +x) and mirrored; highlights stay on the same screen
 * side in both eyes (one light source, upper left).
 */
import type { Face as FaceT, MouthShape, Palette } from "../types.ts";
import { clamp01, EYE_Y, EYE_X, MOUTH_Y } from "./anatomy.ts";
import type { Pt } from "./paths.ts";

export const FACE_PATH = "M -80,-352 C -82,-300 -64,-272 -34,-261 Q 0,-250 34,-261 C 64,-272 82,-300 80,-352 Z";

const EYE_WHITE = "M -17,-6 C -12,-24 14,-26 21,-12 C 22,10 8,22 -4,22 C -14,20 -18,8 -17,-6 Z";
const EYE_LASH = "M -18,-5 C -12,-27 15,-30 24,-13 L 29,-18 L 23,-7 C 13,-21 -10,-21 -15,-2 Z";
const EYE_BOTTOM = 22;
const EYE_TOP = -26;

export function FaceSkin({ p, uid, fringe }: { p: Palette; uid: string; fringe: Pt[] }) {
  // Fringe shadow: the bang tips cast a band of shade on the forehead and upper cheeks.
  const pts = fringe.map(([x, y]) => [x, y + 11] as Pt);
  const shade = `M ${pts[0]![0]},-400 ${pts.map(([x, y]) => `L ${x},${y}`).join(" ")} L ${pts[pts.length - 1]![0]},-400 Z`;
  return (
    <g>
      <clipPath id={`${uid}-face`}>
        <path d={FACE_PATH} />
      </clipPath>
      <path d={FACE_PATH} fill={p.skin} stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
      <path d={shade} fill={p.skinShade} clipPath={`url(#${uid}-face)`} />
    </g>
  );
}

export function Blush({ p, amount }: { p: Palette; amount: number }) {
  const a = 0.22 + 0.5 * clamp01(amount);
  const lines = amount > 0.6;
  return (
    <g>
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={s * 50} cy={-283} rx={14} ry={6.5} fill={p.blush} opacity={a} />
          {lines &&
            [-7, 0, 7].map((dx) => (
              <path key={dx} d={`M ${s * 50 + dx - 2},-279 L ${s * 50 + dx + 3},-288`} stroke={p.blush} strokeWidth={2} strokeLinecap="round" opacity={0.9} />
            ))}
        </g>
      ))}
    </g>
  );
}

function Eye({ side, face, p, uid }: { side: 1 | -1; face: FaceT; p: Palette; uid: string }) {
  const s = side;
  const shape = face.eyes === "wink" && s === -1 ? "closed" : face.eyes === "wink" ? "open" : face.eyes;
  const open = clamp01(face.open) * (shape === "half" ? 0.55 : 1);
  const wide = shape === "wide";
  const cx = s * EYE_X;
  const tr = `translate(${cx} ${EYE_Y}) scale(${s * (wide ? 1.06 : 1)} ${wide ? 1.06 : 1})`;

  if (shape === "closed" || shape === "smile" || open < 0.12) {
    // Closed lids: relaxed (a soft downward curve) or a happy arch.
    const d = shape === "smile" ? "M -17,8 Q 4,-12 25,6" : "M -17,4 Q 4,16 25,0";
    return (
      <g transform={tr}>
        <path d={d} fill="none" stroke={p.line} strokeWidth={4.2} strokeLinecap="round" />
        <path d={shape === "smile" ? "M 25,6 L 30,2" : "M 25,0 L 30,-4"} stroke={p.line} strokeWidth={3} strokeLinecap="round" />
      </g>
    );
  }

  const gx = face.look[0] * 5 * s;
  const gy = face.look[1] * 4;
  const lid = `translate(0 ${EYE_BOTTOM}) scale(1 ${open}) translate(0 ${-EYE_BOTTOM})`;
  const lashDrop = (1 - open) * (EYE_BOTTOM - EYE_TOP) * 0.92;
  const pr = wide ? 0.7 : 1;
  const clip = `${uid}-eye${s}`;
  return (
    <g transform={tr}>
      <clipPath id={clip}>
        <path d={EYE_WHITE} transform={lid} />
      </clipPath>
      <path d={EYE_WHITE} transform={lid} fill="#FFFFFF" />
      <g clipPath={`url(#${clip})`}>
        {/* shade the lid casts on the eye white */}
        <path d="M -20,-30 L 26,-30 L 26,-8 C 12,-18 -8,-18 -20,-2 Z" transform={`translate(0 ${lashDrop})`} fill={p.skinShade} opacity={0.55} />
        <g transform={`translate(${gx} ${gy})`}>
          <ellipse cx={2} cy={2} rx={15} ry={20} fill={`url(#${uid}-iris)`} stroke={p.pupil} strokeWidth={1.4} />
          <path d="M -14,-6 C -10,-20 14,-20 17,-6 C 10,-12 -6,-12 -14,-6 Z" fill={p.pupil} opacity={0.45} />
          <ellipse cx={2} cy={4} rx={6.5 * pr} ry={10 * pr} fill={p.pupil} />
          <ellipse cx={-5 * s + 2} cy={-7} rx={5.5} ry={7} fill="#FFFFFF" />
          <circle cx={7 * s + 2} cy={12} r={2.8} fill="#FFFFFF" />
          <path d="M -8,14 Q 2,20 12,14" stroke="#FFFFFF" strokeWidth={1.4} fill="none" opacity={0.55} />
        </g>
      </g>
      <g transform={`translate(0 ${lashDrop})`}>
        <path d={EYE_LASH} fill={p.line} />
        <path d="M -8,-28 Q 6,-34 19,-26" fill="none" stroke={p.line} strokeWidth={1.4} strokeLinecap="round" opacity={open > 0.6 ? 0.8 : 0} />
      </g>
      <path d="M 19,2 Q 16,15 6,21" fill="none" stroke={p.line} strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

export function Eyes({ face, p, uid }: { face: FaceT; p: Palette; uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-iris`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.iris[0]} />
          <stop offset="0.55" stopColor={p.iris[1]} />
          <stop offset="1" stopColor={p.iris[2]} />
        </linearGradient>
      </defs>
      <Eye side={-1} face={face} p={p} uid={uid} />
      <Eye side={1} face={face} p={p} uid={uid} />
    </g>
  );
}

/** Brows, drawn over the fringe (the anime convention) so expressions always read. */
export function Brows({ face, p }: { face: FaceT; p: Palette }) {
  return (
    <g opacity={0.92}>
      {([-1, 1] as const).map((s) => (
        <g key={s} transform={`translate(${s * EYE_X} ${EYE_Y - face.brows.raise}) scale(${s} 1)`}>
          <g transform={`rotate(${face.brows.tilt} 5 -43)`} fill="none" strokeLinecap="round">
            <path d="M -12,-40 Q 4,-47 22,-41" stroke={p.hairLight} strokeWidth={6.5} opacity={0.55} />
            <path d="M -12,-40 Q 4,-47 22,-41" stroke={p.line} strokeWidth={3.2} />
          </g>
        </g>
      ))}
    </g>
  );
}

export function Nose({ p }: { p: Palette }) {
  return <path d="M 1,-291 L -1.5,-286" stroke={p.line} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />;
}

const MOUTH_LINES: Partial<Record<MouthShape, string>> = {
  X: "M -6,0 Q 0,2.5 6,0",
  M: "M -6.5,0.5 L 6.5,0.5",
  smile: "M -9,-2 Q 0,7 9,-2",
  smirk: "M -8,1 Q 1,3 9,-3",
  flat: "M -7,1 L 7,1",
  cat: "M -9,-1 Q -4.5,5 0,0 Q 4.5,5 9,-1",
  frown: "M -7,3 Q 0,-2 7,3",
};

/** Open mouth outlines at full opening, top edge at y = -3 (mouth-local). */
const MOUTH_OPEN: Partial<Record<MouthShape, { w: number; h: number; round: boolean; teeth: boolean }>> = {
  A: { w: 10, h: 13, round: false, teeth: false },
  I: { w: 12, h: 6, round: false, teeth: true },
  U: { w: 4.5, h: 8, round: true, teeth: false },
  E: { w: 10.5, h: 9, round: false, teeth: true },
  O: { w: 7, h: 11, round: true, teeth: false },
  grin: { w: 12, h: 9, round: false, teeth: true },
};

export function Mouth({ face, p }: { face: FaceT; p: Palette }) {
  const shape = face.mouth;
  const line = MOUTH_LINES[shape];
  if (line) {
    return (
      <g transform={`translate(0 ${MOUTH_Y})`}>
        <path d={line} fill="none" stroke={p.line} strokeWidth={shape === "M" ? 3 : 2.4} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  const o = MOUTH_OPEN[shape]!;
  const k = shape === "grin" ? 1 : 0.25 + 0.75 * clamp01(face.mouthOpen);
  const w = o.w;
  const h = Math.max(2.5, o.h * k);
  const top = -3;
  const d = o.round
    ? `M 0,${top} C ${w},${top} ${w},${top + h} 0,${top + h} C ${-w},${top + h} ${-w},${top} 0,${top} Z`
    : `M ${-w},${top} Q 0,${top - 1.5} ${w},${top} Q ${w * 0.8},${top + h} 0,${top + h} Q ${-w * 0.8},${top + h} ${-w},${top} Z`;
  return (
    <g transform={`translate(0 ${MOUTH_Y})`}>
      <path d={d} fill="#7A2331" stroke={p.line} strokeWidth={2.2} strokeLinejoin="round" />
      {h > 5 && !o.teeth && <ellipse cx={0} cy={top + h - 2.4} rx={w * 0.5} ry={Math.min(3, h * 0.28)} fill="#E57C86" />}
      {o.teeth && <path d={`M ${-w * 0.8},${top + 0.6} L ${w * 0.8},${top + 0.6} L ${w * 0.7},${top + 2.8} L ${-w * 0.7},${top + 2.8} Z`} fill="#FFFFFF" />}
    </g>
  );
}
