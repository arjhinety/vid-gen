/**
 * Experimental Labs house style — design tokens.
 *
 * Single source of truth for colour, type, space and motion. Web scenes read these
 * directly; Manim scenes read the exported tokens.json (`pnpm design:export`,
 * checked by tests).
 *
 * Identity in one line: a lab sheet that works a problem out in front of you. Grey grid
 * paper with a mono breadcrumb; one line at the top holds the open question; below it
 * one exhibit that builds as it is explained, with its terms written onto the objects
 * they name; ink for what was measured, crimson for the turn, and a claim glyph on every
 * result. The sheet comes from the lab's launch film
 * (research/reference-videos/experimental-labs/grammar.md); the pacing and the sparing
 * on-screen text from 3Blue1Brown (research/reference-videos/3b1b-nn-ch1/beats.md).
 */

export const color = {
  // The sheet
  sheet: "#EFEFEC", // grid paper
  sheetShade: "#E6E6E2", // header band, pressed fills
  desk: "#D2D2CE", // the surface below the sheet
  grid: "#E0E0DB", // minor grid (24 px)
  gridMajor: "#D4D4CF", // major grid (96 px)
  perf: "#C6C6C1", // perforation dots
  card: "#FAFAF8", // cards, stamps, figure panels
  cardShade: "#F2F2EF",

  // Ink
  ink: "#141516", // text, measured results, the system under study
  ink2: "#45474B", // secondary text
  ink3: "#65676B", // tertiary text, axis labels, mono sublabels (4.9:1 on the sheet)
  dim: "#9D9E9B", // headline rows already spoken
  hairline: "#BEBEB9", // rules, axes, empty boxes

  // Meaning. Each accent is bound to ONE meaning for a whole film.
  red: "#D21F3C", // the turn: failure, regression, refusal, negation
  redDim: "#E9A3AE", // red inside a spoken (dimmed) headline row
  redSoft: "#F7D9DE",
  blue: "#2B45D6", // a second series / comparison only
  blueSoft: "#D3D9F7",
  neutral: "#8A8C90", // baselines, untrained models

  // Instrument panels: where the machine's literal input/output is shown.
  instrument: "#111214",
  instrument2: "#1C1D20",
  instrumentRule: "#2C2E33",
  instrumentInk: "#E9EAEC",
  instrumentInk2: "#8E9298",

  // Categorical series for comparing systems: baseline, system, comparison, failure. Max 4.
  series: ["#8A8C90", "#141516", "#2B45D6", "#D21F3C"] as const,
} as const;

/** Colours inside instrument panels (code, terminal, model I/O). Restrained on purpose. */
export const syntax = {
  text: "#E9EAEC",
  comment: "#6E737B",
  keyword: "#9DAAF4",
  string: "#F0B2BC",
  number: "#FF8C9E",
  function: "#FFFFFF",
  type: "#C9CCD2",
  punctuation: "#8E9298",
  highlightBg: "#2A3350",
  addBg: "#16322A",
  removeBg: "#4A1C25",
} as const;

export const font = {
  sans: "Archivo",
  mono: "JetBrains Mono",
  math: "STIX Two Math",
} as const;

export interface TypeStyle {
  family: string;
  size: number;
  weight: number;
  lineHeight: number;
  /** em */
  tracking: number;
  /** Width axis (Archivo wdth, %). */
  stretch?: number;
  caps?: boolean;
}

/**
 * Type scale at 1920x1080 (px). The headline is wide and heavy; labels are mono.
 * Sentence case for text; uppercase only for mono labels and the breadcrumb.
 */
export const type = {
  headline: { family: font.sans, size: 80, weight: 660, lineHeight: 1.075, tracking: -0.012, stretch: 118 },
  /** The open question at the top of the sheet. */
  question: { family: font.sans, size: 46, weight: 620, lineHeight: 1.1, tracking: -0.008, stretch: 110 },
  /** A term written onto the object it names ("recall", "the gate"), and its one-line definition. */
  term: { family: font.sans, size: 34, weight: 640, lineHeight: 1.1, tracking: -0.005, stretch: 108 },
  termDef: { family: font.sans, size: 26, weight: 450, lineHeight: 1.3, tracking: 0 },
  display: { family: font.sans, size: 120, weight: 640, lineHeight: 1.0, tracking: -0.02, stretch: 115 },
  title: { family: font.sans, size: 60, weight: 650, lineHeight: 1.08, tracking: -0.01, stretch: 115 },
  heading: { family: font.sans, size: 40, weight: 620, lineHeight: 1.15, tracking: -0.005, stretch: 110 },
  body: { family: font.sans, size: 30, weight: 450, lineHeight: 1.35, tracking: 0 },
  data: { family: font.sans, size: 30, weight: 600, lineHeight: 1.2, tracking: 0 },
  caption: { family: font.sans, size: 22, weight: 450, lineHeight: 1.35, tracking: 0 },
  bigNumber: { family: font.mono, size: 84, weight: 500, lineHeight: 1.0, tracking: -0.02 },
  value: { family: font.mono, size: 30, weight: 500, lineHeight: 1.2, tracking: 0 },
  label: { family: font.mono, size: 24, weight: 500, lineHeight: 1.2, tracking: 0.06, caps: true },
  meta: { family: font.mono, size: 20, weight: 400, lineHeight: 1.3, tracking: 0.02 },
  crumb: { family: font.mono, size: 18, weight: 500, lineHeight: 1, tracking: 0.14, caps: true },
  code: { family: font.mono, size: 24, weight: 400, lineHeight: 1.5, tracking: 0 },
  subtitle: { family: font.sans, size: 34, weight: 500, lineHeight: 1.28, tracking: 0 },
} as const satisfies Record<string, TypeStyle>;
export type TypeName = keyof typeof type;

/** 8 px base unit. */
export const space = { u: 8, xs: 8, s: 16, m: 24, l: 40, xl: 64, xxl: 96 } as const;

/** 1920x1080 sheet layout. */
export const layout = {
  width: 1920,
  height: 1080,
  margin: 120,
  gutter: 24,
  columns: 12,
  /** Header band with the breadcrumb. */
  headerHeight: 90,
  /** Grid spacing (px): minor and major lines. */
  gridMinor: 24,
  gridMajor: 96,
  /** Perforation dot rows and the bottom edge of the sheet. */
  perfTop: 110,
  perfBottom: 968,
  sheetBottom: 992,
  /** Headline: left edge, top of the first row, row pitch. */
  headlineX: 140,
  headlineTop: 104,
  headlineRow: 86,
  /** Maximum characters in one headline row. */
  headlineChars: 34,
  /** Top of the exhibit area below a 2-row / 3-row headline. */
  exhibitTop2: 320,
  exhibitTop3: 404,
  /** The open question: left edge and top of its line (projects without a headline). */
  questionX: 140,
  questionTop: 128,
  /** Top of the stage below the question line. */
  stageTop: 236,
  /** Exhibits stay above this line (the lower perforation row). */
  exhibitBottom: 940,
  /** Burned subtitles (only when a variant asks for them) sit on this baseline, in the desk band. */
  subtitleBaseline: 1046,
  /** Title-safe inset (10 %) and action-safe inset (5 %). */
  titleSafe: { x: 192, y: 108 },
  actionSafe: { x: 96, y: 54 },
} as const;

export function col(n: number): number {
  const w = (layout.width - 2 * layout.margin - (layout.columns - 1) * layout.gutter) / layout.columns;
  return layout.margin + n * (w + layout.gutter);
}
export function colSpan(n: number): number {
  const w = (layout.width - 2 * layout.margin - (layout.columns - 1) * layout.gutter) / layout.columns;
  return n * w + (n - 1) * layout.gutter;
}

/**
 * Motion vocabulary (seconds at 30 fps; curves in packages/motion/src/easing.ts).
 * Measured from the house film: fast, continuous, never frozen, never bouncy.
 */
export const motion = {
  word: 5 / 30, // a headline word lands (ease.arrive)
  scroll: 8 / 30, // the headline stack scrolls a row (ease.arrive)
  arrive: 10 / 30, // element entrance (ease.arrive)
  settle: 14 / 30, // ticks, strikes, connectors landing (ease.settle)
  travel: 16 / 30, // moves between positions (ease.travel)
  glide: 18 / 30, // an exhibit gliding to its final layout (ease.glide)
  exhibitIn: 11 / 30,
  exhibitOut: 9 / 30,
  exit: 7 / 30, // leaving (ease.exit)
  slam: 7 / 30, // stamps
  staggerItem: 4 / 30,
  /** Camera pan that follows content growing off-frame (ease.travel). */
  pan: 24 / 30,
  /** Rotation of stamps (deg). */
  stampTilt: -1.5,
} as const;

/** Depth layers: blur (px), opacity and parallax factor. */
export const depth = {
  subject: { blur: 0, opacity: 1, parallax: 1 },
  context: { blur: 3, opacity: 0.55, parallax: 0.6 },
  ambient: { blur: 8, opacity: 0.3, parallax: 0.3 },
} as const;

export const shadow = {
  card: "0 10px 26px rgba(20, 21, 22, 0.08), 0 1px 3px rgba(20, 21, 22, 0.08)",
  lifted: "0 18px 44px rgba(20, 21, 22, 0.12), 0 2px 6px rgba(20, 21, 22, 0.08)",
  instrument: "0 24px 56px rgba(17, 18, 20, 0.28), 0 3px 10px rgba(17, 18, 20, 0.18)",
} as const;

/** Claim classes and their glyphs (provenance labels). Speculation is never drawn like fact. */
export const claimStyle = {
  measured: { glyph: "●", label: "measured", color: color.ink },
  "author-interpretation": { glyph: "◐", label: "interpretation", color: color.ink2 },
  hypothesis: { glyph: "○", label: "hypothesis", color: color.ink2 },
  limitation: { glyph: "△", label: "limitation", color: color.ink2 },
  speculation: { glyph: "◌", label: "not measured", color: color.ink3 },
  design: { glyph: "■", label: "design", color: color.ink2 },
} as const;
export type ClaimClass = keyof typeof claimStyle;

export const tokens = { color, syntax, font, type, space, layout, motion, depth, shadow, claimStyle } as const;
export default tokens;
