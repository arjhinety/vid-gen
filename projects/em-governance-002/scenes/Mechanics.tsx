/**
 * The mechanics as a By-Laws settings form that fills in as each item is named; the two
 * blanks the draft leaves for the founders stay empty, outlined in red (the crimson idea).
 * Cues: mechanics, terms, officers, proxies, sign, titles, limit.
 */
import type { ReactNode } from "react";
import { color, shadow, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

export default function Mechanics() {
  const { p } = useProgress();
  const sheet = ease.arrive(p("mechanics", 0.5));
  return (
    <Exhibit from={0}>
      <div style={{ position: "absolute", left: X0, top: TOP + 10, width: 1380, height: 610, background: color.card, boxShadow: shadow.card, opacity: clamp(sheet * 1.4), transform: `translateY(${(1 - sheet) * 12}px)` }}>
        <div style={{ position: "absolute", left: 32, top: 24, ...text("label"), fontSize: 20, color: color.ink3 }}>BY-LAWS · SETTINGS TO CHOOSE</div>
      </div>
      <Row x={X0 + 32} y={TOP + 80} label="TRUSTEE TERMS" p={p("terms", 0.4)} note={`law allows up to ${gov.termCap}`}>
        {`${gov.termRecommended} years, staggered`}
      </Row>
      <Row x={X0 + 32} y={TOP + 210} label="OFFICERS CHOSEN BY" p={p("officers", 0.4)} note="or directly by members">
        the Board
      </Row>
      <Row x={X0 + 32} y={TOP + 340} label="PROXY VOTES" p={p("proxies", 0.4)} note="or no proxies">
        {gov.proxyRule}
      </Row>
      <Row x={X0 + 32} y={TOP + 470} label="BANK SIGNATORIES" p={p("sign", 0.4)} note="two signatures above an amount you pick">
        {gov.signatories.join(" + ")}
      </Row>
      <Row x={X0 + 720} y={TOP + 80} label="TWO-SIGNATURE AMOUNT" p={p("sign", 0.4, 1.2)} blank>
        PHP ?
      </Row>
      <Row x={X0 + 720} y={TOP + 210} label="YOUR RESEARCH TITLES" p={p("titles", 0.4)} blank note="public sites say “Founder” and “Co-Founder” today">
        ?
      </Row>
      <Row x={X0 + 720} y={TOP + 340} label="SPENDING THAT NEEDS THE BOARD" p={p("limit", 0.4)} blank note="equipment and compute above a threshold">
        PHP ?
      </Row>
      <Bean who="arjhine" x={1640} y={TOP + 430} size={115} name="Arjhine · Secretary" p={p("mechanics", 0.5, 0.3)} holds="doc" holdP={p("terms", 0.4)} mood="smile" />
      <DocTag x={X0} y={TOP + 632} p={p("limit", 0.3, 0.8)}>
        {"FOUNDER REVIEW 9, 10, 11, 13 · plus two blanks (§2, §5)"}
      </DocTag>
      <Claim kind="design" note="the draft’s suggestions; blanks are yours" x={X0 + 700} y={CLAIM_Y + 8} p={p("limit", 0.3, 1.0)} />
    </Exhibit>
  );
}

function Row({ x, y, label, p, blank = false, note, children }: { x: number; y: number; label: string; p: number; blank?: boolean; note?: string; children: ReactNode }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 620, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 6}px)` }}>
      <div style={{ ...text("label"), fontSize: 18, color: blank ? color.red : color.ink3 }}>{label}</div>
      <div style={{ marginTop: 8, height: 48, border: blank ? `2.5px dashed ${color.red}` : "none", borderBottom: blank ? undefined : `2px solid ${color.ink2}`, borderRadius: blank ? 8 : 0, padding: blank ? "6px 14px" : "6px 0", boxSizing: "border-box", ...text("data"), fontSize: 30, lineHeight: 1.1, color: blank ? color.red : color.ink, whiteSpace: "nowrap" }}>{children}</div>
      {note && <div style={{ ...text("meta"), fontSize: 20, color: color.ink3, marginTop: 6 }}>{note}</div>}
    </div>
  );
}
