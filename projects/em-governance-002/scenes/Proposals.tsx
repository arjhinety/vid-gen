/**
 * The review pass: the draft's 24 PROVISIONAL proposals as named tiles (from the §18 list);
 * three trays (accept / change / reject); then the worst-day test: two votes against one,
 * and a rule card shielding the one who's outvoted (the crimson idea).
 * Cues: proposals, accept, change, reject, worst, protects.
 */
import { color, shadow, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const COLS = 4;
const TW = 258;
const TH = 52;
const G = 10;

export default function Proposals() {
  const { p } = useProgress();
  const worst = p("worst", 0.1) > 0;
  return (
    <Exhibit from={0}>
      {gov.provisionalList.map((t, i) => {
        const q = ease.arrive(p("proposals", 0.3, i * 0.05));
        if (q <= 0) return null;
        return (
          <div key={t.id} style={{ position: "absolute", left: X0 + (i % COLS) * (TW + G), top: TOP + 20 + Math.floor(i / COLS) * (TH + G), width: TW, height: TH, background: color.card, border: `1.5px solid ${color.ink2}`, borderRadius: 8, opacity: clamp(q * 1.4) * (worst ? 0.45 : 1), transform: `scale(${0.85 + 0.15 * q})`, padding: "0 12px", boxSizing: "border-box", display: "flex", alignItems: "center", ...text("body"), fontSize: 20, lineHeight: 1.1, color: color.ink }}>
            {t.name}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: X0, top: TOP + 20 + 6 * (TH + G) + 4, ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("proposals", 0.3, 1.4)) }}>
        {`${gov.provisional} proposals · marked PROVISIONAL in the draft (§18)`}
      </div>

      {/* Three trays. */}
      {(["accept", "change", "reject"] as const).map((k, i) => {
        const q = ease.arrive(p(k, 0.35));
        if (q <= 0) return null;
        return (
          <div key={k} style={{ position: "absolute", left: 1260, top: TOP + 20 + i * 120, width: 460, height: 100, border: `2.5px solid ${color.ink}`, borderRadius: 14, background: color.cardShade, opacity: clamp(q * 1.4) * (worst ? 0.45 : 1), transform: `translateX(${(1 - q) * 20}px)` }}>
            <div style={{ position: "absolute", left: 22, top: 30, ...text("heading"), fontSize: 36, color: color.ink }}>{k}</div>
            <div style={{ position: "absolute", right: 22, top: 38, ...text("meta"), fontSize: 20, color: color.ink3 }}>{["as written", "edit it", "drop it"][i]}</div>
          </div>
        );
      })}

      {/* The worst-day test. */}
      <Bean who="arjhine" x={560} y={TOP + 640} size={105} p={p("worst", 0.4)} holds="vote" holdP={p("worst", 0.4, 0.4)} mood="flat" />
      <Bean who="alpha" x={720} y={TOP + 640} size={105} p={p("worst", 0.4, 0.1)} holds="vote" holdP={p("worst", 0.4, 0.5)} mood="flat" />
      <Bean who="john" x={1260} y={TOP + 640} size={105} p={p("worst", 0.4, 0.2)} holds="no" holdP={p("worst", 0.4, 0.6)} mood={p("protects", 0.1, 0.8) > 0 ? "open" : "worried"} mark={p("protects", 0.1, 0.8) > 0 ? "heart" : "sweat"} markP={p("worst", 0.4, 0.8)} />
      <RuleCard x={950} y={TOP + 470} p={p("protects", 0.4)} />
      <div style={{ position: "absolute", left: 1370, top: TOP + 500, width: 400, ...text("data"), fontSize: 28, lineHeight: 1.25, color: color.red, opacity: ease.arrive(p("protects", 0.4, 0.6)) }}>
        does it still protect the one who’s outvoted?
      </div>
      <Claim kind="author-interpretation" note="the worst-day test is this film’s suggestion, not the draft’s" x={X0} y={CLAIM_Y + 8} p={p("protects", 0.3, 1.0)} />
    </Exhibit>
  );
}

function RuleCard({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.slam(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 190, height: 150, background: color.card, border: `3px solid ${color.ink}`, borderRadius: "14px 14px 60px 60px", boxShadow: shadow.lifted, opacity: clamp(p * 3), transform: `scale(${1.2 - 0.2 * a}) rotate(-2deg)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...text("label"), fontSize: 20, color: color.ink3 }}>A RULE</div>
      <div style={{ ...text("data"), fontSize: 26, color: color.ink, marginTop: 6 }}>the shield</div>
    </div>
  );
}
