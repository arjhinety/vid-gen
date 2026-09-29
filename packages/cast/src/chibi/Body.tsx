/**
 * The chibi body below the head: legs, skirt, top (blazer or cardigan), the club lab
 * coat, arms with hands, and props. Cel shading: one hard shadow tone per material,
 * light from the upper left.
 */
import type { HandShape, Outfit, Palette, Pose } from "../types.ts";
import { PIVOT } from "./anatomy.ts";
import { mirrorX, rot, rotAbout, type Pt } from "./paths.ts";

const LW = 3; // outline width
const IW = 1.8; // inner line width

export function Legs({ p, o }: { p: Palette; o: Outfit }) {
  const leg = "M -25,-106 C -24,-70 -23,-40 -21,-16 L -9,-16 C -9,-40 -9,-70 -7,-106 Z";
  const shoe = "M -28,-20 C -34,-10 -31,-1 -18,-1 L -5,-1 C -2,-6 -3,-14 -8,-20 Z";
  const sock = "M -24,-62 C -23,-44 -22,-30 -21,-16 L -9,-16 C -9,-30 -9,-44 -8,-62 Z";
  return (
    <g>
      {[leg, mirrorX(leg)].map((d, i) => (
        <path key={i} d={d} fill={o.legs === "tights" ? p.legs : p.skin} stroke={p.line} strokeWidth={LW} strokeLinejoin="round" />
      ))}
      {o.legs === "tights" && <path d="M 12,-100 L 13,-24" stroke="#FFFFFF" strokeWidth={2} opacity={0.18} strokeLinecap="round" />}
      {o.legs === "socks" &&
        [sock, mirrorX(sock)].map((d, i) => (
          <g key={i}>
            <path d={d} fill={p.socks ?? "#FFFFFF"} stroke={p.line} strokeWidth={IW} strokeLinejoin="round" />
            <path d={i ? "M 8,-56 L 24,-56" : "M -24,-56 L -8,-56"} stroke={p.accent} strokeWidth={2.2} />
          </g>
        ))}
      {[shoe, mirrorX(shoe)].map((d, i) => (
        <g key={i}>
          <path d={d} fill={p.shoes} stroke={p.line} strokeWidth={LW} strokeLinejoin="round" />
          <path d={i ? "M 22,-9 Q 17,-5 12,-5" : "M -22,-9 Q -17,-5 -12,-5"} stroke="#FFFFFF" strokeWidth={1.6} opacity={0.35} fill="none" strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

export function Skirt({ p }: { p: Palette }) {
  const skirt = "M -46,-168 L 46,-168 L 68,-104 Q 0,-96 -68,-104 Z";
  // Right-hand pleats in shade (light from the upper left).
  const shade1 = "M 12,-168 L 30,-168 L 44,-103 L 16,-100 Z";
  const shade2 = "M 46,-168 L 68,-104 L 60,-103 Z";
  const shadeL = "M -30,-168 L -12,-168 L -16,-100 L -44,-103 Z";
  return (
    <g>
      <path d={skirt} fill={p.skirt} stroke={p.line} strokeWidth={LW} strokeLinejoin="round" />
      <g opacity={1}>
        {[shade1, shade2, shadeL].map((d, i) => (
          <path key={i} d={d} fill={p.skirtShade} opacity={i === 2 ? 0.55 : 1} />
        ))}
      </g>
      {["M -30,-166 L -44,-104", "M -12,-166 L -16,-101", "M 12,-166 L 16,-101", "M 30,-166 L 44,-104"].map((d) => (
        <path key={d} d={d} stroke={p.line} strokeWidth={IW} strokeLinecap="round" opacity={0.75} />
      ))}
      <path d="M -68,-104 Q 0,-96 68,-104" fill="none" stroke={p.line} strokeWidth={LW} strokeLinecap="round" />
    </g>
  );
}

function Ribbon({ p, y = -208 }: { p: Palette; y?: number }) {
  return (
    <g transform={`translate(0 ${y + 208})`}>
      <path d="M -2,-205 L -9,-186 L -3,-189 L 0,-200 Z" fill={p.tie} stroke={p.line} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M 2,-205 L 9,-186 L 3,-189 L 0,-200 Z" fill={p.tieShade} stroke={p.line} strokeWidth={1.6} strokeLinejoin="round" />
      <path d="M 0,-210 C -6,-219 -17,-221 -18,-212 C -19,-203 -8,-202 0,-206 Z" fill={p.tie} stroke={p.line} strokeWidth={1.8} strokeLinejoin="round" />
      <path d="M 0,-210 C 6,-219 17,-221 18,-212 C 19,-203 8,-202 0,-206 Z" fill={p.tieShade} stroke={p.line} strokeWidth={1.8} strokeLinejoin="round" />
      <rect x={-4} y={-213} width={8} height={9} rx={2.5} fill={p.tie} stroke={p.line} strokeWidth={1.6} />
    </g>
  );
}

export function Torso({ p, o }: { p: Palette; o: Outfit }) {
  if (o.top === "cardigan") {
    const body = "M -40,-248 C -52,-230 -55,-190 -54,-150 Q 0,-144 54,-150 C 55,-190 52,-230 40,-248 Q 0,-256 -40,-248 Z";
    const shade = "M 22,-250 C 40,-222 44,-186 44,-148 L 54,-150 C 55,-190 52,-230 40,-248 Z";
    return (
      <g>
        <path d={body} fill={p.top} stroke={p.line} strokeWidth={LW} strokeLinejoin="round" />
        <path d={shade} fill={p.topShade} />
        {/* shirt collar in a V, with the ribbon */}
        <path d="M -15,-251 L 15,-251 L 0,-212 Z" fill={p.shirt} stroke={p.line} strokeWidth={IW} strokeLinejoin="round" />
        <path d="M -15,-251 L -4,-240 L -9,-252 Z M 15,-251 L 4,-240 L 9,-252 Z" fill={p.shirtShade} />
        <path d="M 0,-212 L 0,-148" stroke={p.line} strokeWidth={IW} opacity={0.7} />
        {[-196, -178, -160].map((y) => (
          <circle key={y} cx={-5} cy={y} r={2.2} fill={p.topShade} stroke={p.line} strokeWidth={1.2} />
        ))}
        <path d="M -54,-156 Q 0,-150 54,-156" fill="none" stroke={p.topShade} strokeWidth={4} opacity={0.9} />
        <Ribbon p={p} y={-214} />
      </g>
    );
  }
  // Blazer with sailor lapels: V opening, trim stripe, ribbon tie.
  const jacket = "M -40,-248 C -50,-232 -52,-196 -50,-160 L 50,-160 C 52,-196 50,-232 40,-248 Q 0,-256 -40,-248 Z";
  const shade = "M 22,-250 C 38,-222 42,-190 40,-160 L 50,-160 C 52,-196 50,-232 40,-248 Z";
  const lapel = "M -17,-251 L -31,-249 L -3,-201 L 0,-206 Z";
  return (
    <g>
      <path d={jacket} fill={p.top} stroke={p.line} strokeWidth={LW} strokeLinejoin="round" />
      <path d={shade} fill={p.topShade} />
      <path d="M -17,-251 L 17,-251 L 0,-206 Z" fill={p.shirt} stroke={p.line} strokeWidth={IW} strokeLinejoin="round" />
      <path d="M 4,-251 L 17,-251 L 6,-226 Z" fill={p.shirtShade} />
      {[lapel, mirrorX(lapel)].map((d, i) => (
        <path key={i} d={d} fill={i ? p.topShade : p.top} stroke={p.line} strokeWidth={IW} strokeLinejoin="round" />
      ))}
      <path d="M -25,-249 L -3,-210 M 25,-249 L 3,-210" stroke={p.trim} strokeWidth={2.2} strokeLinecap="round" />
      {[-190, -173].map((y) => (
        <circle key={y} cx={0} cy={y} r={2.4} fill={p.trim} stroke={p.line} strokeWidth={1.2} />
      ))}
      <path d="M -50,-166 L 50,-166" stroke={p.trim} strokeWidth={1.6} opacity={0.6} />
      <Ribbon p={p} />
    </g>
  );
}

/** The club lab coat: open panels over the uniform, to mid-thigh, with a pen in the pocket. */
export function Coat({ p }: { p: Palette }) {
  const panel = "M -40,-250 C -55,-232 -61,-180 -69,-116 L -31,-113 L -21,-196 L -17,-251 Z";
  return (
    <g>
      <path d={panel} fill={p.coat} stroke={p.line} strokeWidth={LW} strokeLinejoin="round" />
      <path d={mirrorX(panel)} fill={p.coat} stroke={p.line} strokeWidth={LW} strokeLinejoin="round" />
      <path d="M 26,-240 C 40,-212 50,-170 58,-116 L 69,-116 C 61,-180 55,-232 40,-250 Z" fill={p.coatShade} />
      <path d="M -31,-113 L -21,-196 M 31,-113 L 21,-196" stroke={p.coatShade} strokeWidth={3} />
      <path d="M -19,-250 L -27,-222 L -20,-198 M 19,-250 L 27,-222 L 20,-198" fill="none" stroke={p.line} strokeWidth={IW} strokeLinejoin="round" />
      {/* breast pocket with a crimson pen */}
      <path d="M -50,-206 L -32,-206 L -33,-192 L -49,-192 Z" fill="none" stroke={p.line} strokeWidth={1.5} strokeLinejoin="round" />
      <rect x={-44} y={-215} width={3.6} height={12} rx={1.4} fill={p.accent} stroke={p.line} strokeWidth={1.1} />
      <path d="M -60,-150 L -40,-150 L -41,-134 L -58,-134 Z" fill="none" stroke={p.line} strokeWidth={1.5} strokeLinejoin="round" opacity={0.8} />
    </g>
  );
}

function Hand({ shape, p, at, angle }: { shape: HandShape; p: Palette; at: Pt; angle: number }) {
  const [x, y] = at;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      {shape === "point" && <path d="M -2,-4 C -2,-16 4,-18 5,-6" fill={p.skin} stroke={p.line} strokeWidth={2} strokeLinejoin="round" />}
      <circle cx={0} cy={0} r={shape === "fist" ? 8 : 8.8} fill={p.skin} stroke={p.line} strokeWidth={2.4} />
      {shape === "open" && <path d="M -9,-2 C -14,-6 -13,-12 -8,-9" fill={p.skin} stroke={p.line} strokeWidth={2} />}
      <path d="M -4,3 Q 1,6 5,2" stroke={p.skinShade} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    </g>
  );
}

/**
 * One arm, written for the screen-right side and mirrored for the left. `angle` raises
 * it outward about the shoulder.
 */
export function Arm({ side, angle, hand, p, o }: { side: 1 | -1; angle: number; hand: HandShape; p: Palette; o: Outfit }) {
  const sleeveFill = o.coat ? p.coat : p.top;
  const sleeveShade = o.coat ? p.coatShade : p.topShade;
  const paws = o.sleevePaws;
  const sleeve = paws ? "M 31,-247 C 44,-251 55,-243 57,-230 L 64,-178 Q 54,-170 42,-177 L 36,-226 Z" : "M 32,-247 C 44,-250 54,-242 56,-230 L 61,-190 L 45,-186 L 36,-226 Z";
  const pivot = side === 1 ? PIVOT.shoulderR : PIVOT.shoulderL;
  const tr = `${rotAbout(-side * angle, pivot)}`;
  const handAt: Pt = [PIVOT.handR[0] * 1, PIVOT.handR[1]];
  return (
    <g transform={tr}>
      <g transform={side === 1 ? "" : "scale(-1 1)"}>
        <path d={sleeve} fill={sleeveFill} stroke={p.line} strokeWidth={LW} strokeLinejoin="round" />
        <path d={paws ? "M 48,-236 L 56,-182 L 62,-180 L 57,-230 Z" : "M 48,-238 L 54,-190 L 60,-191 L 56,-230 Z"} fill={sleeveShade} />
        {!paws && <path d="M 45,-190 L 61,-194 L 62,-185 L 46,-181 Z" fill={o.coat ? p.coatShade : p.shirt} stroke={p.line} strokeWidth={IW} strokeLinejoin="round" />}
        {paws ? (
          <g>
            <ellipse cx={54} cy={-172} rx={7} ry={4.5} fill={p.skin} stroke={p.line} strokeWidth={2} />
            <path d="M 42,-177 Q 54,-168 64,-178" fill="none" stroke={p.line} strokeWidth={LW} strokeLinecap="round" />
          </g>
        ) : (
          <Hand shape={hand} p={p} at={handAt} angle={0} />
        )}
      </g>
    </g>
  );
}

/** World position of a hand after its arm rotation. */
export function handPos(side: 1 | -1, angle: number): Pt {
  const pivot = side === 1 ? PIVOT.shoulderR : PIVOT.shoulderL;
  const rest = side === 1 ? PIVOT.handR : PIVOT.handL;
  return rot(rest, pivot, -side * angle);
}

export function Pointer({ pose, p }: { pose: Pose; p: Palette }) {
  if (pose.pointer === null) return null;
  const [hx, hy] = handPos(1, pose.armR);
  const a = (pose.pointer * Math.PI) / 180;
  const L = 150;
  const tx = hx - Math.sin(a) * L;
  const ty = hy - Math.cos(a) * L;
  const deg = 180 - pose.pointer;
  return (
    <g>
      <path d={`M ${hx + Math.sin(a) * 14},${hy + Math.cos(a) * 14} L ${tx},${ty}`} stroke={p.line} strokeWidth={6} strokeLinecap="round" />
      <path d={`M ${hx + Math.sin(a) * 14},${hy + Math.cos(a) * 14} L ${tx},${ty}`} stroke="#B98A5A" strokeWidth={3.2} strokeLinecap="round" />
      {/* the ∇ tip */}
      <g transform={`translate(${tx} ${ty}) rotate(${deg})`}>
        <path d="M -8,-12 L 8,-12 L 0,2 Z" fill={p.accent} stroke={p.line} strokeWidth={2} strokeLinejoin="round" />
        <path d="M -3.5,-9.5 L 3.5,-9.5 L 0,-3.5 Z" fill="#FFFFFF" opacity={0.6} />
      </g>
    </g>
  );
}

export function Notebook({ p }: { p: Palette }) {
  // Held against the chest in both arms.
  return (
    <g transform="rotate(-8 -6 -196)">
      <rect x={-34} y={-222} width={46} height={58} rx={3} fill={p.accent} stroke={p.line} strokeWidth={2.6} />
      <rect x={-30} y={-218} width={38} height={50} rx={2} fill="none" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.5} />
      <path d="M -24,-206 L 2,-206 M -24,-198 L -4,-198" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={0.85} />
      <path d="M -34,-218 L -38,-218 M -34,-206 L -38,-206 M -34,-194 L -38,-194 M -34,-182 L -38,-182 M -34,-170 L -38,-170" stroke={p.line} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

export function Neck({ p }: { p: Palette }) {
  return (
    <g>
      <path d="M -11,-266 L -10,-242 L 10,-242 L 11,-266 Z" fill={p.skin} stroke={p.line} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M -11,-264 Q 0,-252 11,-264 L 11,-254 Q 0,-246 -11,-254 Z" fill={p.skinShade} />
    </g>
  );
}
