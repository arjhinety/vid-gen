/**
 * The kōhai (name to be chosen by the owner): the viewer's stand-in. Eager, quick to
 * guess, honest when confused. A contrast to Graddy-chan: warm caramel hair, blue-teal
 * eyes, a cream cardigan with sleeve paws over the same school's uniform, the first-year
 * blue ribbon (the house "comparison" blue), socks, a notebook, and an ahoge.
 */
import { color } from "@vid/design";
import { PIVOT } from "../chibi/anatomy.ts";
import { mirrorX, rotAbout, strands, type Pt } from "../chibi/paths.ts";
import { Shine } from "./graddy.tsx";
import type { CharacterDef, HairProps, HairSet, Palette } from "../types.ts";

export const KOHAI_PALETTE: Palette = {
  line: "#3A2A2A",
  skin: "#FFEFE6",
  skinShade: "#F6CDBE",
  blush: "#F79A94",
  hair: "#D58A4E",
  hairShade: "#AE6433",
  hairLight: "#F6C58C",
  iris: ["#133F86", "#2C7FD2", "#86DCEB"],
  pupil: "#0B1F45",
  top: "#F3E6CB",
  topShade: "#DCC9A5",
  trim: "#FFFFFF",
  shirt: "#FBFBF8",
  shirtShade: "#D8DBE5",
  tie: color.blue,
  tieShade: "#1C2F9E",
  skirt: "#8E919C",
  skirtShade: "#6F727D",
  legs: "#25232E",
  socks: "#FBFBF8",
  shoes: "#6A3E2C",
  coat: "#FBFBF8",
  coatShade: "#D6DAE4",
  accent: color.blue,
};

const FRINGE: Pt[] = [
  [-110, -350],
  [-104, -330],
  [-92, -352],
  [-80, -328],
  [-66, -350],
  [-52, -330],
  [-38, -352],
  [-22, -332],
  [-8, -350],
  [6, -330],
  [20, -352],
  [34, -332],
  [48, -352],
  [62, -330],
  [76, -350],
  [88, -328],
  [100, -350],
  [106, -332],
  [110, -350],
];

function Crown({ p }: HairProps) {
  const rev = [...FRINGE].reverse();
  const d = "M -110,-350 C -118,-422 -66,-458 0,-458 C 66,-458 118,-422 110,-350" + strands(rev, -0.18) + " Z";
  return (
    <g>
      <path d={d} fill={p.hair} stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
      {["M 0,-457 Q -20,-414 -38,-348", "M 0,-457 Q 4,-414 6,-334", "M 0,-457 Q 30,-414 48,-348", "M -6,-457 Q -60,-434 -80,-332", "M 6,-457 Q 70,-434 88,-332"].map((s) => (
        <path key={s} d={s} fill="none" stroke={p.line} strokeWidth={1.4} opacity={0.45} strokeLinecap="round" />
      ))}
      <Shine p={p} y={4} />
      {/* ahoge */}
      <path d="M -4,-456 C -12,-492 16,-506 24,-486 C 14,-494 4,-486 5,-456 Z" fill={p.hair} stroke={p.line} strokeWidth={2.4} strokeLinejoin="round" />
    </g>
  );
}

const SHORT_LOCK = "M -108,-370 C -114,-320 -108,-282 -98,-258" + strands([[-98, -258], [-90, -272], [-84, -256]], 0.2) + " C -84,-290 -82,-330 -84,-368 Z";

function Side({ p, swing }: HairProps) {
  return (
    <g transform={rotAbout(swing * 0.3, [0, -360])}>
      {[SHORT_LOCK, mirrorX(SHORT_LOCK)].map((d, i) => (
        <g key={i}>
          <path d={d} fill={p.hair} stroke={p.line} strokeWidth={2.8} strokeLinejoin="round" />
          <path d={i ? "M 102,-340 Q 102,-300 96,-272" : "M -102,-340 Q -102,-300 -96,-272"} fill="none" stroke={p.hairLight} strokeWidth={2} opacity={0.65} strokeLinecap="round" />
        </g>
      ))}
    </g>
  );
}

/** Short back hair to the nape (under tails / bob). */
const NAPE = "M 0,-464 C -78,-464 -128,-414 -126,-350 C -124,-306 -114,-284 -100,-272 Q -92,-264 -80,-270 L 80,-270 Q 92,-264 100,-272 C 114,-284 124,-306 126,-350 C 128,-414 78,-464 0,-464 Z";

function Tail({ p, side, swing, long }: { p: Palette; side: 1 | -1; swing: number; long: number }) {
  const tail =
    "M 104,-372 C 150,-364 170,-300 162,-240 C 158,-" + (200 - long) + " 150," + (-178 + long) + " 154," + (-158 + long) +
    strands([[154, -158 + long], [140, -176 + long], [136, -154 + long], [124, -180 + long]], 0.2) +
    " C 132,-230 130,-300 106,-340 Z";
  const d = side === 1 ? tail : mirrorX(tail);
  const pivot: [number, number] = [side * 110, -364];
  return (
    <g transform={rotAbout(swing * 1.2 * side, pivot)}>
      <path d={d} fill={p.hair} stroke={p.line} strokeWidth={2.8} strokeLinejoin="round" />
      <path d={side === 1 ? "M 146,-320 Q 154,-260 146,-200" : "M -146,-320 Q -154,-260 -146,-200"} fill="none" stroke={p.hairLight} strokeWidth={2.2} opacity={0.6} strokeLinecap="round" />
      <path d={side === 1 ? "M 118,-340 Q 140,-280 136,-200" : "M -118,-340 Q -140,-280 -136,-200"} fill="none" stroke={p.hairShade} strokeWidth={3} opacity={0.5} strokeLinecap="round" />
      <ellipse cx={side * 112} cy={-366} rx={10} ry={14} fill={p.accent} stroke={p.line} strokeWidth={2.2} />
      <path d={`M ${side * 106},-374 Q ${side * 112},-366 ${side * 106},-358`} stroke="#FFFFFF" strokeWidth={1.6} fill="none" opacity={0.6} />
    </g>
  );
}

const nape = (p: Palette, swing: number) => (
  <g transform={rotAbout(swing * 0.4, PIVOT.crown)}>
    <path d={NAPE} fill={p.hair} stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
    <path d="M -96,-330 C -98,-302 -92,-284 -84,-276 L 84,-276 C 92,-284 98,-302 96,-330 Z" fill={p.hairShade} />
  </g>
);

const twinTails: HairSet = {
  Back: ({ p, swing }) => (
    <g>
      <Tail p={p} side={-1} swing={swing} long={0} />
      <Tail p={p} side={1} swing={swing} long={0} />
      {nape(p, swing)}
    </g>
  ),
  Side,
  Front: Crown,
  fringe: FRINGE,
};

const BOB =
  "M 0,-466 C -82,-466 -132,-416 -130,-350 C -128,-300 -122,-266 -114,-246" +
  strands([[-114, -246], [-100, -262], [-92, -244], [-80, -262]], 0.15) +
  " L 80,-262" +
  strands([[80, -262], [92, -244], [100, -262], [114, -246]], 0.15) +
  " C 122,-266 128,-300 130,-350 C 132,-416 82,-466 0,-466 Z";

const bob: HairSet = {
  Back: ({ p, swing }) => (
    <g transform={rotAbout(swing * 0.4, PIVOT.crown)}>
      <path d={BOB} fill={p.hair} stroke={p.line} strokeWidth={3} strokeLinejoin="round" />
      <path d="M -104,-330 C -106,-296 -100,-270 -92,-258 L 92,-258 C 100,-270 106,-296 104,-330 Z" fill={p.hairShade} />
    </g>
  ),
  Side,
  Front: Crown,
  Extra: ({ p }) => (
    <g transform="translate(74 -392) rotate(14)">
      <path d="M 0,-11 L 3,-3.5 L 11,-3.5 L 4.5,1.5 L 7,9.5 L 0,4.5 L -7,9.5 L -4.5,1.5 L -11,-3.5 L -3,-3.5 Z" fill="#FFD34D" stroke={p.line} strokeWidth={1.8} strokeLinejoin="round" />
    </g>
  ),
  fringe: FRINGE,
};

const sidePony: HairSet = {
  Back: ({ p, swing }) => (
    <g>
      <Tail p={p} side={1} swing={swing} long={40} />
      {nape(p, swing)}
    </g>
  ),
  Side,
  Front: Crown,
  fringe: FRINGE,
};

const base = {
  id: "kohai",
  name: "Kōhai (to be named)",
  palette: KOHAI_PALETTE,
  scale: 0.9,
  outfit: { top: "cardigan", coat: false, glasses: false, sleevePaws: true, legs: "socks", prop: "notebook" } as const,
};

export const KOHAI: Record<"A" | "B" | "C", CharacterDef> = {
  A: { ...base, variant: "A", note: "Low twin tails, blue scrunchies", hair: twinTails },
  B: { ...base, variant: "B", note: "Short bob with a star pin", hair: bob },
  C: { ...base, variant: "C", note: "Side ponytail", hair: sidePony },
};
