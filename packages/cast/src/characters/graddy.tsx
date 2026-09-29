/**
 * Graddy-chan (グラディ先輩): the senpai. An original character in the cool honour-student
 * archetype, with an onee-san manner. Deliberately not Horikita Suzune: no side braid, no white
 * ribbon, not the ANHS red blazer; instead an ink hair with a blue-violet sheen, a ∇ (nabla)
 * clip, crimson→amber gradient irises, and her school's ink uniform with a crimson ribbon
 * (third-year colour).
 */
import { color } from "@vid/design";
import { PIVOT } from "../chibi/anatomy.ts";
import { mirrorX, rotAbout, strands, type Pt } from "../chibi/paths.ts";
import type { CharacterDef, HairProps, HairSet, Palette } from "../types.ts";

export const GRADDY_PALETTE: Palette = {
  line: "#2A2236",
  skin: "#FFEDE4",
  skinShade: "#F4C9BC",
  blush: "#F39A9E",
  hair: "#302F4A",
  hairShade: "#1C1B2E",
  hairLight: "#7A7EBE",
  iris: ["#6E0F22", "#C9283D", "#F4A640"],
  pupil: "#34060F",
  top: "#2E3654",
  topShade: "#1F253B",
  trim: "#E9E6DC",
  shirt: "#FBFBF8",
  shirtShade: "#D8DBE5",
  tie: color.red,
  tieShade: "#A3122B",
  skirt: "#8E919C",
  skirtShade: "#6F727D",
  legs: "#25232E",
  shoes: "#5A3528",
  coat: "#FBFBF8",
  coatShade: "#D6DAE4",
  accent: color.red,
};

/** Bang tips, left to right (also the fringe shadow on the face). */
const FRINGE: Pt[] = [
  [-114, -358],
  [-108, -330],
  [-98, -356],
  [-86, -326],
  [-72, -356],
  [-60, -334],
  [-46, -364],
  [-32, -336],
  [-18, -358],
  [-6, -320],
  [8, -360],
  [22, -332],
  [38, -364],
  [52, -338],
  [66, -356],
  [80, -326],
  [92, -358],
  [104, -330],
  [114, -358],
];

function Back({ p, swing }: HairProps) {
  const outer =
    "M 0,-464 C -84,-464 -132,-414 -132,-346 C -132,-296 -126,-262 -120,-236 C -114,-206 -116,-180 -120,-150" +
    strands([[-120, -150], [-114, -104], [-104, -136], [-94, -98], [-84, -130], [-74, -110], [-66, -160]], 0.12) +
    " L -58,-206 L 58,-206 L 66,-160" +
    strands([[66, -160], [74, -110], [84, -130], [94, -98], [104, -136], [114, -104], [120, -150]], 0.12) +
    " C 116,-180 114,-206 120,-236 C 126,-262 132,-296 132,-346 C 132,-414 84,-464 0,-464 Z";
  const inner = "M -104,-320 C -108,-260 -104,-200 -98,-150 L -72,-196 L 72,-196 L 98,-150 C 104,-200 108,-260 104,-320 Z";
  return (
    <g transform={rotAbout(swing * 0.5, PIVOT.crown)}>
      <path d={outer} fill={p.hair} stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
      <path d={inner} fill={p.hairShade} />
      <path d="M -118,-290 Q -114,-220 -108,-150 M 118,-290 Q 114,-220 108,-150" fill="none" stroke={p.hairLight} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
      <path d="M -98,-250 Q -94,-190 -86,-132 M 98,-250 Q 94,-190 86,-132" fill="none" stroke={p.line} strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
    </g>
  );
}

const LOCK =
  "M -112,-372 C -118,-320 -112,-250 -100,-196" + strands([[-100, -196], [-89, -214], [-80, -196]], 0.2) + " Q -80,-240 -76,-290 C -74,-320 -78,-350 -84,-372 Z";

function Side({ p, swing }: HairProps) {
  return (
    <g transform={rotAbout(swing * 0.25, [0, -360])}>
      {[LOCK, mirrorX(LOCK)].map((d, i) => (
        <g key={i}>
          <path d={d} fill={p.hair} stroke={p.line} strokeWidth={2.8} strokeLinejoin="round" />
          <path d={i ? "M 98,-344 Q 98,-280 92,-228" : "M -98,-344 Q -98,-280 -92,-228"} fill="none" stroke={p.line} strokeWidth={1.4} opacity={0.55} strokeLinecap="round" />
          <path d={i ? "M 104,-330 Q 104,-280 99,-240" : "M -104,-330 Q -104,-280 -99,-240"} fill="none" stroke={p.hairLight} strokeWidth={2} opacity={0.6} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

function Front({ p }: HairProps) {
  const rev = [...FRINGE].reverse();
  const d = "M -114,-358 C -122,-424 -70,-458 0,-458 C 70,-458 122,-424 114,-358" + strands(rev, -0.14) + " Z";
  return (
    <g>
      <path d={d} fill={p.hair} stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
      {/* strand lines from a side part */}
      {["M -30,-455 Q -44,-414 -60,-340", "M -30,-455 Q -14,-404 -6,-326", "M -22,-455 Q 16,-424 22,-338", "M -14,-456 Q 52,-436 80,-332", "M -34,-455 Q -80,-432 -100,-340"].map((s) => (
        <path key={s} d={s} fill="none" stroke={p.line} strokeWidth={1.5} opacity={0.5} strokeLinecap="round" />
      ))}
      <Shine p={p} />
      <path d="M -32,-458 Q -30,-442 -26,-432" fill="none" stroke={p.line} strokeWidth={2} strokeLinecap="round" />
    </g>
  );
}

/** The gloss ring across the crown: segmented along the head's curve, broken at the part. */
export function Shine({ p, y = 0 }: { p: Palette; y?: number }) {
  return (
    <g transform={`translate(0 ${y})`} fill="none" strokeLinecap="round">
      <path d="M -88,-392 Q -64,-420 -38,-428" stroke={p.hairLight} strokeWidth={8} strokeDasharray="13 6" opacity={0.85} />
      <path d="M -20,-432 Q 44,-432 88,-392" stroke={p.hairLight} strokeWidth={8} strokeDasharray="15 6" opacity={0.85} />
      <path d="M -66,-412 Q -52,-424 -40,-428 M -8,-440 Q 30,-440 58,-424" stroke={p.hairLight} strokeWidth={2.6} opacity={0.55} />
    </g>
  );
}

/** The ∇ clip on her left side lock (screen left). */
function Clip({ p }: HairProps) {
  return (
    <g transform="translate(-100 -348) rotate(-8)">
      <path d="M -11,-9 L 11,-9 L 0,10 Z" fill={p.accent} stroke={p.line} strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M -5,-5.5 L 5,-5.5 L 0,3.5 Z" fill="none" stroke="#FFFFFF" strokeWidth={1.6} strokeLinejoin="round" opacity={0.85} />
    </g>
  );
}

const HAIR: HairSet = { Back, Side, Front, Extra: Clip, fringe: FRINGE };

const base = { id: "graddy", name: "Graddy-chan", palette: GRADDY_PALETTE, hair: HAIR, scale: 1 };

export const GRADDY: Record<"A" | "B" | "C", CharacterDef> = {
  A: { ...base, variant: "A", note: "School uniform: ink blazer, sailor lapels, crimson ribbon", outfit: { top: "blazer", coat: false, glasses: false, sleevePaws: false, legs: "tights", prop: "pointer" } },
  B: { ...base, variant: "B", note: "Uniform + research-club lab coat", outfit: { top: "blazer", coat: true, glasses: false, sleevePaws: false, legs: "tights", prop: "pointer" } },
  C: { ...base, variant: "C", note: "Lab coat + half-rim glasses (the reveal glint)", outfit: { top: "blazer", coat: true, glasses: true, sleevePaws: false, legs: "tights", prop: "pointer" } },
};
