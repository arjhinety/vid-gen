/**
 * Three lessons that carry over, as three cards: control written into the papers (a
 * document with a seal pointing at the company), conflicts decided by people with no stake
 * (two beans with a stake step out, one votes), and the charity's value protected (a
 * balance with a fair price and an adviser). Each card ends with what it means for the
 * lab. The crimson idea: "before anyone needs it".
 * Cues: l1, l2, l3.
 */
import type { ReactNode } from "react";
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease, mix } from "@vid/motion";
import { Arrow, Bean, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const W = 520;
const GAP = 40;
const cx = (i: number) => X0 + i * (W + GAP);
const ART_Y = TOP + 190; // top of the illustration band

export default function OpenAILessons() {
  const { p } = useProgress();
  return (
    <Exhibit from={0}>
      <Lesson i={0} p={p("l1", 0.4)} head="Control lives in the paperwork" us="for us: the Articles and By-Laws" usP={p("l1", 0.4, 2.2)}>
        <Doc x={cx(0) + 90} y={ART_Y + 20} p={p("l1", 0.5, 0.4)} />
        <Arrow points={[[cx(0) + 240, ART_Y + 110], [cx(0) + 330, ART_Y + 110]]} p={p("l1", 0.4, 1.0)} c={color.ink} />
        <div style={{ position: "absolute", left: cx(0) + 345, top: ART_Y + 60, width: 140, height: 100, border: `2.5px dashed ${color.ink2}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("l1", 0.4, 1.2)) }}>
          the company
        </div>
        <div style={{ position: "absolute", left: cx(0) + 30, top: ART_Y + 250, width: W - 60, ...text("data"), fontSize: 26, color: color.red, opacity: ease.arrive(p("l1", 0.4, 1.6)) }}>written down before anyone needs it</div>
      </Lesson>

      <Lesson i={1} p={p("l2", 0.4)} head="Conflicts are decided by people with no stake" us={`for us: ${gov.disinterested} no-stake trustees, Xynil first`} usP={p("l2", 0.4, 2.0)}>
        {[0, 1, 2].map((k) => {
          const stake = k < 2;
          return <Bean key={k} who="plain" x={cx(1) + 120 + k * 140} y={ART_Y + 200} size={90} hat="trustee" name={false} p={p("l2", 0.4, 0.4 + k * 0.1)} holds={stake ? "bag" : "vote"} holdP={p("l2", 0.4, stake ? 0.8 : 1.3)} dim={stake ? 0.7 * ease.arrive(p("l2", 0.4, 1.0)) : 0} />;
        })}
        <div style={{ position: "absolute", left: cx(1) + 30, top: ART_Y + 250, width: W - 60, ...text("body"), fontSize: 24, color: color.ink2, opacity: ease.arrive(p("l2", 0.4, 1.3)) }}>those with a stake step out</div>
      </Lesson>

      <Lesson i={2} p={p("l3", 0.4)} head="Regulators protect the charity’s value" us="for us: every deal at fair value, on paper" usP={p("l3", 0.4, 3.0)}>
        <Balance x={cx(2) + W / 2} y={ART_Y + 40} p={p("l3", 0.5, 0.4)} />
        <div style={{ position: "absolute", left: cx(2) + 30, top: ART_Y + 250, width: W - 60, ...text("body"), fontSize: 24, color: color.ink2, opacity: ease.arrive(p("l3", 0.4, 1.8)) }}>a fair price for the nonprofit, checked by independent advisers</div>
      </Lesson>

      <Claim kind="author-interpretation" note="the film’s reading of the OpenAI record · the documents are in the receipts" x={X0} y={CLAIM_Y} p={p("l3", 0.3, 3.4)} />
    </Exhibit>
  );
}

function Lesson({ i, p, head, us, usP, children }: { i: number; p: number; head: string; us: string; usP: number; children: ReactNode }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const u = ease.arrive(clamp(usP));
  return (
    <>
      <div style={{ position: "absolute", left: cx(i), top: TOP + 10, width: W, height: 580, border: `2px solid ${color.hairline}`, borderRadius: 18, background: color.card, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 10}px)` }}>
        <div style={{ position: "absolute", left: 28, top: 22, ...text("bigNumber"), fontSize: 48, color: color.ink }}>{i + 1}</div>
        <div style={{ position: "absolute", left: 90, right: 24, top: 24, ...text("heading"), fontSize: 32, lineHeight: 1.15, color: color.ink }}>{head}</div>
        <div style={{ position: "absolute", left: 28, right: 24, bottom: 22, borderTop: `1.5px solid ${color.hairline}`, paddingTop: 14, ...text("data"), fontSize: 24, color: color.ink, opacity: u }}>{us}</div>
      </div>
      {children}
    </>
  );
}

/** A founding document with a seal. */
function Doc({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: clamp(a * 1.4) }}>
      <g transform={`translate(${x} ${y + (1 - a) * 8})`}>
        <path d="M 0 0 H 110 L 140 30 V 180 H 0 Z" fill={color.card} stroke={color.ink} strokeWidth={3} strokeLinejoin="round" />
        <path d="M 110 0 V 30 H 140" fill="none" stroke={color.ink} strokeWidth={3} strokeLinejoin="round" />
        {[40, 62, 84, 106].map((ly) => (
          <line key={ly} x1={20} y1={ly} x2={ly === 106 ? 80 : 118} y2={ly} stroke={color.ink2} strokeWidth={3} strokeLinecap="round" />
        ))}
        <circle cx={100} cy={148} r={18} fill="none" stroke={color.ink} strokeWidth={3} />
        <path d="M 92 164 L 88 182 L 100 176 L 112 182 L 108 164" fill="none" stroke={color.ink} strokeWidth={3} strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** A balance: "what the nonprofit gives" against "a fair price", settling level. */
function Balance({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const tilt = mix(-12, 0, ease.settle(clamp(p * 1.3 - 0.3)));
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: clamp(a * 1.4) }}>
        <g transform={`translate(${x} ${y})`} stroke={color.ink} strokeWidth={3} strokeLinecap="round" fill="none">
          <path d="M 0 20 V 170 M -50 170 H 50" />
          <circle cx={0} cy={14} r={7} fill={color.ink} />
          <g transform={`rotate(${tilt} 0 20)`}>
            <path d="M -150 20 H 150" />
            <path d="M -150 20 L -185 90 H -115 Z" fill={color.card} />
            <path d="M 150 20 L 115 90 H 185 Z" fill={color.card} />
          </g>
        </g>
      </svg>
      <div style={{ position: "absolute", left: x - 245, width: 190, top: y + 140, textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink2, opacity: clamp(a * 1.4) }}>what the charity gives</div>
      <div style={{ position: "absolute", left: x + 55, width: 190, top: y + 140, textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink2, opacity: clamp(a * 1.4) }}>a fair price</div>
    </>
  );
}
