/**
 * What it is. (A) The lab as a little house: money flows in (grants, donations, compute),
 * the dividend arrow to the founders is crossed out (the crimson idea), surplus loops back
 * into research. (B) The proposed purpose clause, the word the tax test looks for, and
 * what the lab is not.
 * Cues: em, nonstock, dividend, in, back, purpose, scientific, not.
 */
import { color, text } from "@vid/design";
import { Card, Claim, Cross, Exhibit, PenMark, Tag, Term } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, DocTag, FOUNDERS, Plaque, useProgress } from "./shared/cast.tsx";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const H = { x: 760, y: TOP + 150, w: 400, h: 260 };
const NOT = ["consultancy", "automation agency", "policy group", "incubator", "professional association", "awareness campaign"];

export default function WhatItIs() {
  const { p } = useProgress();
  return (
    <>
      <Exhibit from={0} until="purpose">
        <House p={p("em", 0.5)} />
        <Term x={H.x} y={H.y + H.h + 34} def="nobody owns shares" p={p("nonstock", 0.9)}>
          non-stock
        </Term>
        <Term x={H.x + 300} y={H.y + H.h + 34} def="nobody gets dividends" p={p("dividend", 0.9, -0.3)}>
          non-profit
        </Term>

        {/* In: support flows into the lab. */}
        {["grants", "donations", "compute"].map((s, i) => (
          <div key={s}>
            <div style={{ position: "absolute", left: X0 + 20, top: H.y + 50 + i * 70 }}>
              <Tag p={p("in", 0.4, i * 0.25)} c={color.ink} style={{ fontSize: 22 }}>
                {s}
              </Tag>
            </div>
            <Arrow points={[[X0 + 200, H.y + 66 + i * 70], [H.x - 20, H.y + 130 + (i - 1) * 30]]} p={p("in", 0.6, 0.2 + i * 0.25)} width={2.5} />
          </div>
        ))}

        {/* Out: no dividend to the founders. */}
        {FOUNDERS.map((w, i) => (
          <Bean key={w} who={w} x={1330 + i * 150} y={H.y + 175} size={105} p={p("em", 0.5, 0.3 + i * 0.12)} mood={p("dividend", 0.3) > 0 ? "flat" : "smile"} />
        ))}
        <Arrow points={[[H.x + H.w + 10, H.y + 120], [1250, H.y + 120]]} p={p("dividend", 0.5)} c={color.red} dashed width={3} />
        <Cross x={(H.x + H.w + 1250) / 2 + 5} y={H.y + 120} size={34} p={p("dividend", 0.25, 0.5)} />
        <div style={{ position: "absolute", left: H.x + H.w + 40, top: H.y + 60, ...text("meta"), fontSize: 20, color: color.red, opacity: ease.arrive(p("dividend", 0.3, 0.6)) }}>no dividends</div>

        {/* Surplus goes back into research. */}
        <Arrow points={[[H.x + H.w / 2 + 60, H.y + H.h + 4], [H.x + H.w / 2 + 60, H.y + H.h + 10], [H.x + H.w + 120, H.y + H.h + 10], [H.x + H.w + 120, H.y + 200], [H.x + H.w + 8, H.y + 200]]} p={p("back", 0.9)} width={2.5} />
        <div style={{ position: "absolute", left: H.x + H.w + 136, top: H.y + H.h - 30, ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("back", 0.3, 0.7)), whiteSpace: "nowrap" }}>
          surplus → back into research
        </div>
        <Claim kind="author-interpretation" note="the draft’s reading of the Corporation Code · counsel to check" x={X0} y={CLAIM_Y} p={p("back", 0.3, 1.2)} />
      </Exhibit>

      <Exhibit from="purpose">
        <Card x={X0} y={TOP + 30} w={980} kicker="PROPOSED PURPOSE · plain-English sketch" p={p("purpose", 0.5)}>
          <span style={{ fontSize: 34, lineHeight: 1.35, color: color.ink }}>
            <b style={{ fontWeight: 650 }}>Scientific research</b> in machine learning, for the public interest, with its methods, data, code and results made openly available.
          </span>
        </Card>
        <PenMark shape="underline" x={X0 + 18} y={TOP + 95} w={300} h={16} p={p("scientific", 0.5)} stroke={color.ink} seed={3} />
        <Term x={X0 + 20} y={TOP + 262} def="the word the tax-exemption test looks for" p={p("scientific", 1.1, 0.2)}>
          “scientific”
        </Term>
        <DocTag x={X0 + 1000} y={TOP + 40} p={p("purpose", 0.3, 0.5)}>
          PROVISIONAL · GDR-009
        </DocTag>
        <Bean who="alpha" x={1500} y={TOP + 330} size={120} p={p("purpose", 0.5, 0.6)} mood="open" holds="doc" holdP={p("purpose", 0.5, 0.9)} />

        {/* What the lab is not. */}
        <div style={{ position: "absolute", left: X0, top: TOP + 430, ...text("label"), color: color.ink3, opacity: ease.arrive(p("not", 0.3)) }}>NOT</div>
        <div style={{ position: "absolute", left: X0, top: TOP + 474, width: 1500, display: "flex", flexWrap: "wrap", gap: "14px 16px" }}>
          {NOT.map((s, i) => (
            <Tag key={s} p={p("not", 0.4, 0.2 + i * 0.15)} strike={p("line:b04#3", 0.4, i * 0.5)} c={color.ink} style={{ fontSize: 26, padding: "5px 14px" }}>
              {s}
            </Tag>
          ))}
        </div>
        <Claim kind="design" note="proposed wording, not final · Articles drafting" x={X0} y={CLAIM_Y} p={p("not", 0.3, 1.0)} />
      </Exhibit>
    </>
  );
}

/** The lab as a little house with its name over the door. */
function House({ p }: { p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: H.x, top: H.y - 90, width: H.w, height: H.h + 90, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 14}px)` }}>
      <svg width={H.w} height={H.h + 90} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <path d={`M -14 100 L ${H.w / 2} 6 L ${H.w + 14} 100 Z`} fill={color.cardShade} stroke={color.ink} strokeWidth={3} strokeLinejoin="round" />
        <rect x={0} y={96} width={H.w} height={H.h - 6} fill={color.card} stroke={color.ink} strokeWidth={3} />
        <rect x={H.w / 2 - 40} y={H.h - 40} width={80} height={130} rx={40} fill={color.sheetShade} stroke={color.ink} strokeWidth={3} />
        <rect x={40} y={200} width={70} height={60} fill={color.sheet} stroke={color.ink} strokeWidth={2.5} />
        <rect x={H.w - 110} y={200} width={70} height={60} fill={color.sheet} stroke={color.ink} strokeWidth={2.5} />
      </svg>
      <Plaque x={30} y={118} w={H.w - 60} h={64} p={1}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", ...text("label"), fontSize: 22, color: color.ink }}>EXPERIMENTAL MACHINES</div>
      </Plaque>
    </div>
  );
}
