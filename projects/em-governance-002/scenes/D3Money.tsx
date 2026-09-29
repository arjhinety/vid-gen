/**
 * Decision 3, the starting money. Three equal coin stacks under the founders; a public
 * contributors list; "no ownership"; and the foundation trap, a name plate struck in red
 * with the one-million-peso minimum (the crimson idea).
 * Cues: money, equal, listed, noown, foundation.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { gov, peso } from "./shared/data.ts";
import { DecisionHead, Option } from "./shared/decision.tsx";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

export default function D3Money() {
  const { p } = useProgress();
  const recP = p("equal", 0.4);
  return (
    <Exhibit from={0}>
      <DecisionHead n={3} title="starting money" def="the capital each founder puts in" p={p("money", 1.0)} />
      <Option y={TOP + 130} letter="A" label="a modest, equal amount each" p={p("equal", 0.4, -0.2)} rec recP={recP} />
      <Option y={TOP + 230} letter="B" label="unequal amounts" p={p("equal", 0.4, 0.6)} recP={recP} />
      <Option y={TOP + 330} letter="C" label="one founder puts in all of it" p={p("equal", 0.4, 1.0)} recP={recP} />

      {FOUNDERS.map((w, i) => (
        <div key={w}>
          <Bean who={w} x={1080 + i * 220} y={TOP + 250} size={100} p={p("money", 0.5, 0.3 + i * 0.1)} mood="smile" />
          <Coins x={1080 + i * 220} y={TOP + 336} n={4} p={p("equal", 0.6, 0.2 + i * 0.1)} />
        </div>
      ))}
      <div style={{ position: "absolute", left: 1000, top: TOP + 366, width: 700, ...text("meta"), fontSize: 20, color: color.ink2, textAlign: "center", opacity: ease.arrive(p("listed", 0.3)) }}>
        names and amounts: listed in public
      </div>
      <div style={{ position: "absolute", left: 1000, top: TOP + 400, width: 700, textAlign: "center", opacity: ease.arrive(p("noown", 0.3)) }}>
        <Tag p={1} strike={p("noown", 0.4, 0.3)} c={color.ink} style={{ fontSize: 22 }}>
          shares
        </Tag>
        <span style={{ ...text("meta"), fontSize: 20, color: color.ink2, marginLeft: 12 }}>putting money in gives no ownership</span>
      </div>

      {/* The foundation trap. */}
      <div style={{ position: "absolute", left: 1040, top: TOP + 470, width: 620, height: 110, border: `2.5px solid ${color.red}`, borderRadius: 12, background: color.card, opacity: ease.arrive(p("foundation", 0.4)), transform: "rotate(-1deg)" }}>
        <div style={{ position: "absolute", left: 22, top: 14, ...text("label"), fontSize: 18, color: color.red }}>DON’T NAME IT</div>
        <div style={{ position: "absolute", left: 22, top: 46, ...text("data"), fontSize: 30, color: color.ink, backgroundImage: `linear-gradient(${color.red}, ${color.red})`, backgroundRepeat: "no-repeat", backgroundSize: `${ease.settle(p("foundation", 0.5, 0.6)) * 100}% 3px`, backgroundPosition: "0 55%" }}>
          “Experimental Machines Foundation”
        </div>
      </div>
      <div style={{ position: "absolute", left: 1040, top: TOP + 596, ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("foundation", 0.4, 1.0)) }}>
        {`“foundation” triggers a ${peso(gov.foundationMinimum)} minimum`}
      </div>

      <DocTag x={X0} y={TOP + 460} p={p("noown", 0.3, 0.6)}>
        {"FOUNDER REVIEW 3 · blocks the Articles"}
      </DocTag>
      <Claim kind="design" note="the draft’s suggestion; the capital rule is marked “verify”" x={X0} y={CLAIM_Y} p={p("foundation", 0.3, 1.4)} />
    </Exhibit>
  );
}

/** A small stack of coins (drawn, no currency glyph). */
function Coins({ x, y, n, p }: { x: number; y: number; n: number; p: number }) {
  if (p <= 0) return null;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {Array.from({ length: n }, (_, i) => {
        const q = ease.arrive(clamp(p * n - i));
        return (
          <g key={i} transform={`translate(${x} ${y - i * 9 - (1 - q) * 20})`} opacity={q}>
            <ellipse rx={30} ry={9} fill={color.cardShade} stroke={color.ink} strokeWidth={2.4} />
          </g>
        );
      })}
    </svg>
  );
}
