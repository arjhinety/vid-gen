/**
 * Decision 2, the office address. An address plate under a magnifying glass: the address
 * becomes a PUBLIC RECORD (the crimson idea); a worried bean at a home door for option B.
 * Cues: office, public, keep, home.
 */
import { color, shadow, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { DecisionHead, Option } from "./shared/decision.tsx";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

export default function D2Office() {
  const { p } = useProgress();
  const recP = p("keep", 0.4);
  const plate = ease.arrive(p("office", 0.5, 0.3));
  const glass = ease.travel(p("public", 0.6));
  return (
    <Exhibit from={0}>
      <DecisionHead n={2} title="office address" def="where the lab officially lives" p={p("office", 1.0)} />
      <Option y={TOP + 130} letter="A" label="an address you can keep for years" sub="not a home, if there’s another choice" p={p("keep", 0.4, -0.2)} rec recP={recP} />
      <Option y={TOP + 250} letter="B" label="a founder’s home" sub="that home address becomes public" p={p("home", 0.4)} recP={recP} />
      <Option y={TOP + 370} letter="C" label="a co-working space or university" p={p("home", 0.4, 0.6)} recP={recP} />

      {/* The address plate and the public eye. */}
      <div style={{ position: "absolute", left: 1040, top: TOP + 150, width: 520, height: 170, background: color.card, border: `3px solid ${color.ink}`, borderRadius: 12, boxShadow: shadow.card, opacity: clamp(plate * 1.4), transform: `translateY(${(1 - plate) * 12}px)` }}>
        <div style={{ position: "absolute", left: 24, top: 18, ...text("label"), fontSize: 20, color: color.ink3 }}>PRINCIPAL OFFICE</div>
        <div style={{ position: "absolute", left: 24, top: 60, ...text("value"), fontSize: 30, color: color.ink }}>____________, ______</div>
        <div style={{ position: "absolute", left: 24, top: 110, ...text("data"), fontSize: 30, color: color.ink }}>Philippines</div>
      </div>
      {glass > 0 && (
        <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          <g transform={`translate(${1430 - 120 * glass} ${TOP + 330 - 60 * glass})`} opacity={clamp(glass * 2)}>
            <circle r={62} fill="rgba(250,250,248,0.35)" stroke={color.ink} strokeWidth={6} />
            <path d="M 44 44 L 96 96" stroke={color.ink} strokeWidth={12} strokeLinecap="round" />
          </g>
        </svg>
      )}
      <div style={{ position: "absolute", left: 1040, top: TOP + 350, ...text("label"), fontSize: 24, color: color.red, opacity: ease.arrive(p("public", 0.3, 0.5)) }}>PUBLIC RECORD</div>
      <div style={{ position: "absolute", left: 1040, top: TOP + 386, ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("public", 0.3, 0.8)) }}>anyone can look it up in the government’s files</div>
      <Bean who="john" x={1560} y={TOP + 620} size={110} p={p("home", 0.5, -0.2)} mood="worried" mark="sweat" markP={p("home", 0.4, 0.3)} />

      <DocTag x={X0} y={TOP + 500} p={p("home", 0.3, 1.0)}>
        {"FOUNDER REVIEW 2 · blocks the Articles · GDR-034"}
      </DocTag>
      <Claim kind="design" note="the draft’s suggestion; the address is required in the Articles" x={X0} y={CLAIM_Y} p={p("home", 0.3, 1.3)} />
    </Exhibit>
  );
}
