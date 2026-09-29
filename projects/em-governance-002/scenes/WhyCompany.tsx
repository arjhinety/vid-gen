/**
 * Why a company at all (the founders' own reasoning). Left: the lab, with grants
 * growing (coin stacks, an illustration). Middle: the three founders at work, then
 * needing to earn from it. Right: where the lab stops (a founder's pay is delicate, no
 * profit to anyone, grants only for their purpose, no consulting business; "never hand out
 * profit" is the crimson idea). Bottom right: the separate company that could.
 * Cues: want, grants, earn, delicate, profit, research, consulting, sister, before.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { Box, Kicker, Note } from "./shared/boxes.tsx";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const RX = X0 + 1040; // right column
const RW = X1 - RX;

export default function WhyCompany() {
  const { p } = useProgress();
  const busy = p("grants", 0.1, 1.2) > 0;
  const earn = p("earn", 0.1) > 0;
  return (
    <Exhibit from={0}>
      <Box x={X0} y={TOP + 20} w={400} h={130} kicker="THE LAB" title="non-profit" p={p("want", 0.4, -0.2)} />

      {/* Grants growing (illustration). */}
      {[2, 4, 7].map((h, i) => (
        <Coins key={i} x={X0 + 70 + i * 130} base={TOP + 350} n={h} p={p("grants", 0.6, i * 0.35)} />
      ))}
      <Note x={X0} y={TOP + 370} w={400} p={p("grants", 0.4, 1.0)} c={color.ink}>
        as grants grow
      </Note>
      <Note x={X0} y={TOP + 404} w={400} p={p("grants", 0.4, 1.2)} size={20} c={color.ink3}>
        (a sketch, not our numbers)
      </Note>

      {/* The founders: the research becomes the job, and they need to earn from it. */}
      {FOUNDERS.map((w, k) => (
        <Bean key={w} who={w} x={X0 + 560 + k * 140} y={TOP + 300} size={90} p={p("want", 0.4, 0.3 + k * 0.1)} holds={earn ? "bag" : busy ? "doc" : null} holdP={earn ? p("earn", 0.4, k * 0.1) : p("grants", 0.4, 1.3 + k * 0.1)} mood={earn ? "o" : "smile"} mark={earn ? "?" : undefined} markP={p("earn", 0.3, 0.4 + k * 0.1)} />
      ))}
      <Note x={X0 + 460} y={TOP + 350} w={480} p={p("grants", 0.4, 1.6)} c={color.ink} align="center">
        the research becomes the job
      </Note>
      <Note x={X0 + 460} y={TOP + 390} w={480} p={p("earn", 0.4, 0.3)} align="center">
        and you need to earn from it
      </Note>

      {/* Where the lab stops. */}
      <Kicker x={RX} y={TOP + 20} p={p("delicate", 0.4, -0.6)}>WHERE THE LAB STOPS</Kicker>
      <Row y={TOP + 60} p={p("delicate", 0.4)} mark="!">
        paying a founder: a delicate step · tax advice first, off the Board first
      </Row>
      <Row y={TOP + 150} p={p("profit", 0.4)} mark="✕" red>
        handing out profit, to anyone
      </Row>
      <Row y={TOP + 210} p={p("research", 0.4)} mark="·">
        grants: spent only on what they’re for
      </Row>
      <div style={{ position: "absolute", left: RX + 44, top: TOP + 272 }}>
        <Tag p={p("consulting", 0.4)} strike={p("consulting", 0.4, 0.4)} c={color.ink} style={{ fontSize: 24, padding: "4px 12px" }}>
          consulting as a business
        </Tag>
      </div>

      {/* The separate company. */}
      <Box x={RX} y={TOP + 380} w={RW} h={200} kicker="A SEPARATE COMPANY" title="could do what the lab can’t" dashed p={p("sister", 0.4)}>
        <div style={{ position: "absolute", left: 24, right: 20, top: 140, ...text("body"), fontSize: 24, color: color.ink2 }}>products · services · pay you · profit you own</div>
      </Box>
      <Arrow points={[[RX - 12, TOP + 452], [X0 + 870, TOP + 452], [X0 + 870, TOP + 432]]} p={p("sister", 0.5, 0.6)} c={color.ink} />
      <Note x={X0 + 900} y={TOP + 462} w={130} p={p("sister", 0.4, 0.9)}>
        pays you
      </Note>
      <Note x={X0} y={TOP + 560} w={900} p={p("sister", 0.4, 1.6)} size={22} c={color.ink3}>
        the draft already imagines it: “a stock corporation for commercial work” (§9)
      </Note>

      <Claim kind="design" note="your reasoning (Sep 30) and the draft’s rules" x={X0} y={CLAIM_Y} p={p("before", 0.3, 0.6)} />
    </Exhibit>
  );
}

function Row({ y, p, mark, red = false, children }: { y: number; p: number; mark: string; red?: boolean; children: string }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const c = red ? color.red : color.ink;
  return (
    <div style={{ position: "absolute", left: RX, top: y, width: RW, display: "flex", gap: 16, opacity: clamp(a * 1.4), transform: `translateX(${(1 - a) * -8}px)` }}>
      <div style={{ flex: "none", width: 28, ...text("data"), fontSize: 28, color: c, textAlign: "center" }}>{mark}</div>
      <div style={{ ...text("body"), fontSize: 25, lineHeight: 1.3, color: c, fontWeight: red ? 600 : undefined }}>{children}</div>
    </div>
  );
}

/** A stack of n coins drawn from the bottom up. */
function Coins({ x, base, n, p }: { x: number; base: number; n: number; p: number }) {
  if (p <= 0) return null;
  const shown = Math.ceil(clamp(p) * n);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      {Array.from({ length: shown }, (_, i) => (
        <g key={i}>
          <rect x={x - 40} y={base - 22 - i * 22} width={80} height={18} fill={color.card} stroke={color.ink} strokeWidth={2.5} />
          <ellipse cx={x} cy={base - 22 - i * 22} rx={40} ry={7} fill={color.card} stroke={color.ink} strokeWidth={2.5} />
        </g>
      ))}
    </svg>
  );
}
