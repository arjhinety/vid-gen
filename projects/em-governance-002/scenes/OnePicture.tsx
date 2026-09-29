/**
 * The whole picture before the agenda. Left: the lab (grants flowing in, its purpose and
 * promises in the papers, three founders as trustees, Xynil joining as a member). Right: a
 * company the founders might own someday, where they earn. Between them: the gate (fair
 * value, on paper, no-stake trustees). Below: the conversion arrow struck out (the crimson
 * idea), and the lab's value held in trust.
 * Cues: one, lab, papers, xynil, company, gate, trust.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { Box, Note } from "./shared/boxes.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const LW = 640;
const CW = 460;
const GX = (X0 + LW + (X1 - CW)) / 2; // gate centre

export default function OnePicture() {
  const { p } = useProgress();
  const struck = ease.arrive(p("company", 0.4, 1.6));
  return (
    <Exhibit from={0}>
      {/* The lab. */}
      <Note x={X0} y={TOP} w={LW} p={p("lab", 0.4, 0.8)} size={22} c={color.ink3}>
        grants fund the research ↓
      </Note>
      <Box x={X0} y={TOP + 40} w={LW} h={420} kicker="THE LAB" title="a non-profit" p={p("lab", 0.4)}>
        <div style={{ position: "absolute", left: 24, right: 24, top: 104, ...text("body"), fontSize: 24, color: color.ink2, opacity: ease.arrive(p("papers", 0.4)) }}>purpose and promises written into its founding papers</div>
      </Box>
      {FOUNDERS.map((w, k) => (
        <Bean key={w} who={w} x={X0 + 100 + k * 140} y={TOP + 400} size={80} hat="trustee" p={p("xynil", 0.4, -0.6 + k * 0.1)} />
      ))}
      <Bean who="xynil" x={X0 + 100 + 3 * 140} y={TOP + 400} size={80} hat="member" p={p("xynil", 0.4, 0.2)} mood="open" hop={p("xynil", 0.4, 0.5)} />

      {/* The company, maybe someday. */}
      <Box x={X1 - CW} y={TOP + 40} w={CW} h={250} kicker="A COMPANY YOU OWN" title="maybe, someday" dashed p={p("company", 0.4)}>
        <div style={{ position: "absolute", left: 24, right: 20, top: 150, ...text("body"), fontSize: 24, color: color.ink2, opacity: ease.arrive(p("company", 0.4, 0.6)) }}>where you earn from your work</div>
      </Box>

      {/* Never the lab turned into one. */}
      {struck > 0 && (
        <>
          <Arrow points={[[X0 + LW + 16, TOP + 380], [X1 - CW - 16, TOP + 380]]} p={1} c={color.red} width={3} dashed />
          <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: struck }}>
            <path d={`M ${GX - 22} ${TOP + 358} L ${GX + 22} ${TOP + 402} M ${GX + 22} ${TOP + 358} L ${GX - 22} ${TOP + 402}`} stroke={color.red} strokeWidth={6} strokeLinecap="round" />
          </svg>
          <Note x={X0 + LW + 20} y={TOP + 410} w={X1 - CW - X0 - LW - 40} p={struck} c={color.red} size={22} align="center" weight={600}>
            never the lab turned into one
          </Note>
        </>
      )}

      {/* The gate between them. */}
      <Gate x={GX} y={TOP + 165} p={p("gate", 0.4)} />
      <Note x={GX - 190} y={TOP + 240} w={380} p={p("gate", 0.4, 0.5)} size={22} align="center">
        {`fair value · on paper · approved by ${gov.disinterested} trustees with no stake`}
      </Note>

      {/* Held in trust. */}
      <Note x={X0} y={TOP + 490} w={LW + 200} p={p("trust", 0.4)} c={color.ink} size={28} weight={600}>
        the lab’s value: held in trust, for the mission
      </Note>

      <Claim kind="author-interpretation" note="the film’s summary of the draft and the research" x={X0} y={CLAIM_Y} p={p("trust", 0.3, 1.0)} />
    </Exhibit>
  );
}

function Gate({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: clamp(a * 1.4) }}>
      <g transform={`translate(${x} ${y})`}>
        <line x1={-(x - X0 - LW - 14)} y1={0} x2={X1 - CW - 14 - x} y2={0} stroke={color.ink3} strokeWidth={3} strokeDasharray="10 7" />
        <rect x={-50} y={-50} width={100} height={100} rx={8} fill={color.card} stroke={color.ink} strokeWidth={3} />
        {[-25, 0, 25].map((dx) => (
          <line key={dx} x1={dx} y1={-50} x2={dx} y2={50} stroke={color.ink} strokeWidth={3} />
        ))}
      </g>
    </svg>
  );
}
