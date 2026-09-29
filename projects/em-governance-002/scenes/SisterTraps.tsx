/**
 * Version three's traps. Top: the lab and the founders' company, the three founders
 * between them (each owning more than 20% of the company), tied into interlocking
 * directors; at "ownvote" they raise their own vote cards. Below: seven trap cards, one
 * per line of narration. The crimson idea: with all three conflicted, the Board can't
 * approve the deal.
 * Cues: traps, twenty, interlocked, selfdeal, ratify, ownvote, cheap, allassets, pcnc, exclusive, opportunity.
 */
import type { ReactNode } from "react";
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease, mix } from "@vid/motion";
import { Bean, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { law } from "./shared/data.ts";
import { CLAIM_Y, CX, TOP, X0, X1 } from "./shared/layout.ts";

const CW = 395;
const CH = 168;
const card = (k: number) => ({ x: X0 + (k % 4) * (CW + 20), y: TOP + 280 + Math.floor(k / 4) * (CH + 18) });

export default function SisterTraps() {
  const { p } = useProgress();
  const link = ease.travel(p("interlocked", 0.6));
  const worried = p("selfdeal", 0.1) > 0;
  const own = p("ownvote", 0.1) > 0;
  return (
    <Exhibit from={0}>
      <Box x={X0} kicker="THE LAB" title="non-profit" p={p("traps", 0.4, -0.2)} />
      <Box x={X1 - 380} kicker="FOUNDER-OWNED" title="company" dashed p={p("traps", 0.4, 0)} />

      {/* Interlocking directors: the same people on both sides. */}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {link > 0 && (
          <>
            <line x1={X0 + 380} y1={TOP + 92} x2={mix(X0 + 380, X1 - 380, link)} y2={TOP + 92} stroke={color.ink2} strokeWidth={3} />
            <line x1={X0 + 380} y1={TOP + 108} x2={mix(X0 + 380, X1 - 380, link)} y2={TOP + 108} stroke={color.ink2} strokeWidth={3} />
          </>
        )}
      </svg>
      {FOUNDERS.map((w, k) => (
        <Bean key={w} who={w} x={CX - 150 + k * 150} y={TOP + 190} size={80} hat="trustee" hatP={1} holds={own ? "vote" : "bag"} holdP={own ? p("ownvote", 0.4, k * 0.1) : p("twenty", 0.4, 0.3 + k * 0.1)} mood={worried ? "worried" : "smile"} mark={worried ? "sweat" : undefined} markP={p("selfdeal", 0.3, 0.3 + k * 0.1)} p={p("traps", 0.4, 0.3 + k * 0.1)} />
      ))}
      <div style={{ position: "absolute", left: CX - 300, width: 600, top: TOP + 8, textAlign: "center", ...text("data"), fontSize: 26, color: color.ink, opacity: ease.arrive(p("twenty", 0.4, 0.4)) * (1 - ease.arrive(p("ownvote", 0.3))) }}>
        {`each owns more than ${law.interlockPct}% of the company`}
      </div>
      <div style={{ position: "absolute", left: CX - 300, width: 600, top: TOP + 8, textAlign: "center", ...text("data"), fontSize: 26, color: color.ink, opacity: ease.arrive(p("ownvote", 0.4, 0.2)) }}>
        the only members, approving your own deal
      </div>
      <div style={{ position: "absolute", left: CX - 300, width: 600, top: TOP + 232, textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("interlocked", 0.4, 0.5)) }}>
        the law: interlocking directors
      </div>

      {/* The traps. */}
      <Trap k={0} p={p("selfdeal", 0.4)} head="self-dealing">
        <span style={{ color: color.red, fontWeight: 600 }}>all three of you conflicted: the Board can’t approve it</span>
      </Trap>
      <Trap k={1} p={p("ratify", 0.4)} head="open to challenge">
        {`unless ${law.investMembers} of members ratify it, with full disclosure, at a fair price`}
      </Trap>
      <Trap k={2} p={p("cheap", 0.4)} head="below value">
        {`a gift: ${law.donorsTaxPct}% donor’s tax, and private benefit to the founders`}
      </Trap>
      <Trap k={3} p={p("allassets", 0.4)} head="moving the core over">
        {`could count as selling substantially all assets: ${law.substantiallyAll} of members`}
      </Trap>
      <Trap k={4} p={p("pcnc", 0.4)} head="donor accreditation">
        even a fair-price sale or lease to your company is barred
      </Trap>
      <Trap k={5} p={p("exclusive", 0.4)} head="exclusive licence">
        clashes with keeping the lab’s research open to the public
      </Trap>
      <Trap k={6} p={p("opportunity", 0.4)} head="opportunities">
        that belong to the lab can’t quietly move to the company
      </Trap>

      <Claim kind="author-interpretation" note="research on the Corporation Code, tax rules, RR 13-98 · counsel to confirm" x={X0} y={CLAIM_Y} p={p("opportunity", 0.3, 1.2)} />
    </Exhibit>
  );
}

function Box({ x, kicker, title, p, dashed = false }: { x: number; kicker: string; title: string; p: number; dashed?: boolean }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: TOP + 30, width: 380, height: 140, boxSizing: "border-box", borderRadius: 18, background: color.card, border: dashed ? `2.5px dashed ${color.ink2}` : `2.5px solid ${color.ink}`, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 8}px)` }}>
      <div style={{ position: "absolute", left: 24, top: 18, ...text("label"), fontSize: 20, color: color.ink3 }}>{kicker}</div>
      <div style={{ position: "absolute", left: 24, top: 54, ...text("heading"), fontSize: 36, color: color.ink }}>{title}</div>
    </div>
  );
}

function Trap({ k, p, head, children }: { k: number; p: number; head: string; children: ReactNode }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const { x, y } = card(k);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: CW, height: CH, boxSizing: "border-box", borderRadius: 14, background: color.card, border: `2px solid ${color.ink}`, padding: "14px 18px 14px 60px", opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 10}px)` }}>
      <div style={{ position: "absolute", left: 18, top: 12, ...text("value"), fontSize: 30, color: color.ink3 }}>{k + 1}</div>
      <div style={{ ...text("data"), fontSize: 27, color: color.ink, marginBottom: 6 }}>{head}</div>
      <div style={{ ...text("body"), fontSize: 23, lineHeight: 1.3, color: color.ink2 }}>{children}</div>
    </div>
  );
}
