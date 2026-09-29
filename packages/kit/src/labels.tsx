/**
 * Mono labelling: every exhibit states what it is and where it came from, in small
 * mono type attached to the thing it qualifies ("confirmatory · n=1,277",
 * "gsm8k_scores.json · M1-v2", "NOT MEASURED DATA"). Stamps record verdicts the
 * study itself issued.
 */
import type { CSSProperties, ReactNode } from "react";
import { claimStyle, color, motion, shadow, text as textStyle, type ClaimClass } from "@vid/design";
import { clamp, ease, mix, mixColor } from "@vid/motion";

const appear = (p: number, dy = 6): CSSProperties => {
  const a = ease.arrive(clamp(p));
  return { opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * dy}px)` };
};

/** Uppercase mono label with an optional mono sublabel beneath (e.g. "TOOL-CALL F1" / "confirmatory · n=1,277"). */
export function Label({ x, y, children, sub, p = 1, c = color.ink, w, align = "left", style }: { x: number; y: number; children: ReactNode; sub?: ReactNode; p?: number; c?: string; w?: number; align?: "left" | "right"; style?: CSSProperties }) {
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: align, whiteSpace: "nowrap", ...appear(p), ...style }}>
      <div style={{ ...textStyle("label"), color: c }}>{children}</div>
      {sub && <div style={{ ...textStyle("meta"), color: color.ink3, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/** Small mono text (axis ticks, units, scale notes like "1 cell = 1 question"). */
export function Meta({ x, y, children, p = 1, c = color.ink3, size, align = "left", w, style }: { x: number; y: number; children: ReactNode; p?: number; c?: string; size?: number; align?: "left" | "right" | "center"; w?: number; style?: CSSProperties }) {
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: align, whiteSpace: "nowrap", ...textStyle("meta"), ...(size ? { fontSize: size } : {}), color: c, ...appear(p, 4), ...style }}>
      {children}
    </div>
  );
}

/** A value in mono, e.g. "0.755" or "refused 1,319 / 1,319". */
export function Value({ x, y, children, p = 1, c = color.ink, size, style }: { x: number; y: number; children: ReactNode; p?: number; c?: string; size?: number; style?: CSSProperties }) {
  if (p <= 0) return null;
  return <div style={{ position: "absolute", left: x, top: y, whiteSpace: "nowrap", ...textStyle("value"), ...(size ? { fontSize: size } : {}), color: c, ...appear(p), ...style }}>{children}</div>;
}

/** Boxed mono source reference: the file (or report line) a number was read from. */
export function SourceTag({ x, y, children, p = 1, style }: { x: number; y: number; children: ReactNode; p?: number; style?: CSSProperties }) {
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, whiteSpace: "nowrap", border: `1.5px solid ${color.hairline}`, background: `${color.card}cc`, padding: "5px 12px", ...textStyle("meta"), color: color.ink2, ...appear(p), ...style }}>
      {children}
    </div>
  );
}

/**
 * A verdict label that lands with a slam and a slight tilt: `head` in red (FROZEN,
 * RULE 01, PROMOTED), then mono detail lines. Only for things the study itself decided.
 * `stack` puts the detail on its own line under the head (no separator).
 */
export function Stamp({ x, y, head, children, p, headColor = color.red, tilt = motion.stampTilt, w, stack = false, style }: { x: number; y: number; head?: ReactNode; children?: ReactNode; p: number; headColor?: string; tilt?: number; w?: number; stack?: boolean; style?: CSSProperties }) {
  if (p <= 0) return null;
  const a = ease.slam(clamp(p));
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        transform: `rotate(${tilt}deg) scale(${mix(1.25, 1, a)})`,
        transformOrigin: "50% 50%",
        opacity: clamp(p * 3),
        border: `2.5px solid ${color.ink}`,
        background: color.card,
        padding: "8px 16px",
        boxShadow: shadow.card,
        whiteSpace: "nowrap",
        filter: a < 1 ? `blur(${(1 - a) * 2}px)` : undefined,
        ...textStyle("meta"),
        fontSize: 20,
        lineHeight: 1.45,
        color: color.ink,
        ...style,
      }}
    >
      {head && <span style={{ color: headColor, fontWeight: 600, letterSpacing: "0.04em" }}>{head}</span>}
      {head && children && (stack ? <br /> : <span style={{ color: color.ink3 }}> · </span>)}
      {children}
    </div>
  );
}

/**
 * Provenance: claim-class glyph, class label and source in one mono line. Speculation
 * reads "NOT MEASURED" and is never styled like a measurement.
 */
export function Claim({ kind, source, note, x, y, p = 1, align = "left", w, style }: { kind: ClaimClass; source?: string; note?: string; x: number; y: number; p?: number; align?: "left" | "right"; w?: number; style?: CSSProperties }) {
  if (p <= 0) return null;
  const c = claimStyle[kind];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: align, whiteSpace: "nowrap", ...textStyle("meta"), color: color.ink3, ...appear(p, 4), ...style }}>
      <span style={{ color: c.color }}>{c.glyph} </span>
      <span style={{ color: c.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</span>
      {note && <span> · {note}</span>}
      {source && <span> · {source}</span>}
    </div>
  );
}

/** A figure caption line in the house style: "FIG. · … · NOT MEASURED DATA". */
export function FigLabel({ x, y, children, p = 1, w, align = "left" }: { x: number; y: number; children: ReactNode; p?: number; w?: number; align?: "left" | "center" }) {
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: align, whiteSpace: "nowrap", ...textStyle("crumb"), fontSize: 16, color: color.ink3, ...appear(p, 4) }}>
      FIG. <span style={{ margin: "0 0.4em" }}>·</span>
      {children}
    </div>
  );
}

const INK_FAINT = "#C8C8C4";

/**
 * Text written on letter by letter as `p` goes 0 -> 1 (each character fades up over a few
 * characters' worth of the write). The one text animation for words that name things.
 */
export function WriteOn({ text, p, c = color.ink }: { text: string; p: number; c?: string }) {
  if (p >= 1) return <>{text}</>;
  const chars = [...text];
  const n = chars.length;
  const soft = Math.min(1, 6 / Math.max(1, n));
  return (
    <>
      {chars.map((ch, i) => {
        const q = clamp((p * (1 + soft) - i / n) / soft);
        return (
          <span key={i} style={{ opacity: q, color: q < 1 ? mixColor(INK_FAINT, c, q) : c }}>
            {ch}
          </span>
        );
      })}
    </>
  );
}

/**
 * A term written onto the object it names, with an optional one-line definition
 * (3Blue1Brown's "Neuron → thing that holds a number"). The term writes on first, then
 * the definition; a leader line can tie it to a point on the object. Terms stay while
 * their object is on screen: they replace the running caption as the film's vocabulary.
 */
export function Term({ x, y, children, def, p, c = color.ink, defColor = color.ink2, align = "left", w, below = true, leader, size, style }: {
  x: number;
  y: number;
  children: string;
  def?: string;
  /** Write-on progress: the term over 0..0.55, the definition over 0.4..1. */
  p: number;
  c?: string;
  defColor?: string;
  align?: "left" | "center" | "right";
  w?: number;
  /** Definition under the term (default) or after it on the same line. */
  below?: boolean;
  /** A hairline from `from` to `to` (absolute px), drawn with the term. */
  leader?: { from: [number, number]; to: [number, number] };
  size?: number;
  style?: CSSProperties;
}) {
  if (p <= 0) return null;
  const pt = clamp(def ? p / 0.55 : p);
  const pd = def ? clamp((p - 0.4) / 0.6) : 0;
  const lp = ease.settle(clamp(p * 1.6));
  return (
    <>
      {leader && (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
          <line x1={leader.from[0]} y1={leader.from[1]} x2={mix(leader.from[0], leader.to[0], lp)} y2={mix(leader.from[1], leader.to[1], lp)} stroke={c} strokeWidth={1.8} />
          <circle cx={leader.to[0]} cy={leader.to[1]} r={4} fill={c} opacity={clamp(lp * 3 - 2)} />
        </svg>
      )}
      <div style={{ position: "absolute", left: x, top: y, width: w, textAlign: align, whiteSpace: "nowrap", ...style }}>
        <span style={{ ...textStyle("term"), ...(size ? { fontSize: size } : {}), color: c }}>
          <WriteOn text={children} p={pt} c={c} />
        </span>
        {def && pd > 0 && (
          <span style={{ display: below ? "block" : "inline", marginLeft: below ? 0 : "0.6em", marginTop: below ? 6 : 0, ...textStyle("termDef"), color: defColor }}>
            <WriteOn text={def} p={pd} c={defColor} />
          </span>
        )}
      </div>
    </>
  );
}
