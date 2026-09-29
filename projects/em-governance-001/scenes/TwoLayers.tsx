/**
 * Two layers. (A) The corporate layer and the research layer as two panels with the same
 * three beans between them; resources go one way, evidence the other; a level beam:
 * neither outranks the other. (B) No C-suite titles; research titles; the officer's
 * arrow to the conclusions is crossed out (the crimson idea).
 * Cues: two, corp, research, resources, evidence, own, nochief, lead, noauth.
 */
import type { ReactNode } from "react";
import { color, text } from "@vid/design";
import { Card, Claim, Cross, Exhibit, Label, Tag, Term } from "@vid/kit";
import { clamp, ease, mix } from "@vid/motion";
import { Arrow, Bean, DocTag, FOUNDERS, Plaque, useProgress } from "./shared/cast.tsx";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const PW = 640;
const PH = 300;
const L = { x: X0, y: TOP + 40 };
const R = { x: X1 - PW, y: TOP + 40 };

export default function TwoLayers() {
  const { p } = useProgress();
  return (
    <>
      <Exhibit from={0} until="nochief">
        <Plaque x={L.x} y={L.y} w={PW} h={PH} kicker="CORPORATE LAYER" p={p("two", 0.5)}>
          <Quote p={p("corp", 0.8)}>“Is this lawful, funded and safe?”</Quote>
        </Plaque>
        <Plaque x={R.x} y={R.y} w={PW} h={PH} kicker="RESEARCH LAYER" p={p("two", 0.5, 0.25)}>
          <Quote p={p("research", 0.8)}>“Is this true, and how do we find out?”</Quote>
        </Plaque>
        <Meta2 x={L.x + 24} y={L.y + PH - 52} p={p("corp", 0.4, 0.8)}>members · Board · officers</Meta2>
        <Meta2 x={R.x + 24} y={R.y + PH - 52} p={p("research", 0.4, 0.8)}>researchers · engineers · fellows · project leads</Meta2>

        {/* Same people in both. */}
        {FOUNDERS.map((w, i) => (
          <Bean key={w} who={w} x={830 + i * 130} y={TOP + 600} size={88} p={p("two", 0.5, 0.4 + i * 0.1)} mood="smile" />
        ))}

        {/* Resources one way, evidence the other. */}
        <Arrow points={[[L.x + PW + 16, L.y + 100], [R.x - 16, R.y + 100]]} p={p("resources", 0.6)} />
        <Mid y={L.y + 58} p={p("resources", 0.3, 0.3)}>money · compute · limits</Mid>
        <Arrow points={[[R.x - 16, R.y + 200], [L.x + PW + 16, L.y + 200]]} p={p("evidence", 0.6)} />
        <Mid y={L.y + 212} p={p("evidence", 0.3, 0.3)}>evidence · conclusions</Mid>

        <Beam p={p("own", 0.6)} />
        <Claim kind="design" note="decided principle (GDR-006); the layer rules are recommendations" x={X0} y={CLAIM_Y} p={p("own", 0.3, 1.0)} />
      </Exhibit>

      <Exhibit from="nochief">
        <Label x={X0} y={TOP + 30} p={p("nochief", 0.3, 0.1)}>
          NO C-SUITE
        </Label>
        <Row y={TOP + 76}>
          {["CEO", "CTO", "VP", "Chief Scientist", "Director"].map((s, i) => (
            <Tag key={s} p={p("nochief", 0.35, 0.4 + i * 0.4)} strike={p("nochief", 0.4, 0.7 + i * 0.4)} c={color.ink} style={{ fontSize: 24, padding: "4px 12px" }}>
              {s}
            </Tag>
          ))}
        </Row>
        <Label x={X0} y={TOP + 160} p={p("line:b08#1", 0.3)} sub="shown in public and on papers">
          RESEARCH TITLES
        </Label>
        <Row y={TOP + 230}>
          {["Researcher", "Research Engineer", "Research Fellow"].map((s, i) => (
            <Tag key={s} p={p("line:b08#1", 0.35, 0.3 + i * 0.2)} c={color.ink} style={{ fontSize: 24, padding: "4px 12px" }}>
              {s}
            </Tag>
          ))}
        </Row>
        <Term x={X0 + 760} y={TOP + 222} def="per project · ends when the project ends" p={p("lead", 1.0)} size={34}>
          Project Lead
        </Term>

        {/* An office has no say over conclusions. */}
        <Bean who="alpha" x={X0 + 180} y={TOP + 600} size={120} hat="officer" name="President" p={p("noauth", 0.5, -0.8)} mood={p("noauth", 0.1, 0.8) > 0 ? "o" : "smile"} />
        <Arrow points={[[X0 + 300, TOP + 520], [1180, TOP + 520]]} p={p("noauth", 0.6)} c={color.red} dashed />
        <Cross x={760} y={TOP + 520} size={40} p={p("noauth", 0.25, 0.6)} />
        <Card x={1200} y={TOP + 440} w={480} kicker="THE SCIENCE" title="conclusions" p={p("noauth", 0.5, -0.3)}>
          decided by the researchers on the project
        </Card>
        <DocTag x={1200} y={TOP + 650} p={p("noauth", 0.3, 1.0)}>
          GOVERNANCE RECOMMENDATION
        </DocTag>
        <Claim kind="design" note="a corporate office confers no authority over scientific conclusions" x={X0} y={CLAIM_Y} p={p("noauth", 0.3, 1.2)} />
      </Exhibit>
    </>
  );
}

function Quote({ p, children }: { p: number; children: string }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return <div style={{ position: "absolute", left: 24, right: 24, top: 80, ...text("heading"), fontSize: 44, lineHeight: 1.15, color: color.ink, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 8}px)` }}>{children}</div>;
}

function Meta2({ x, y, p, children }: { x: number; y: number; p: number; children: string }) {
  return <div style={{ position: "absolute", left: x, top: y, ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(clamp(p)), whiteSpace: "nowrap" }}>{children}</div>;
}

function Mid({ y, p, children }: { y: number; p: number; children: string }) {
  return <div style={{ position: "absolute", left: L.x + PW, width: R.x - L.x - PW, top: y, textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(clamp(p)), whiteSpace: "nowrap" }}>{children}</div>;
}

function Row({ y, children }: { y: number; children: ReactNode }) {
  return <div style={{ position: "absolute", left: X0, top: y, display: "flex", gap: 14 }}>{children}</div>;
}

/** A level balance beam between the two panels: neither side is heavier. */
function Beam({ p }: { p: number }) {
  if (p <= 0) return null;
  const a = ease.settle(clamp(p));
  const tilt = mix(-7, 0, a);
  const cx = 960;
  const cy = TOP + 390;
  return (
    <>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <g opacity={clamp(p * 3)}>
          <path d={`M ${cx - 16} ${cy + 26} L ${cx} ${cy} L ${cx + 16} ${cy + 26} Z`} fill={color.ink} />
          <g transform={`rotate(${tilt} ${cx} ${cy})`}>
            <rect x={cx - 110} y={cy - 5} width={220} height={6} rx={3} fill={color.ink} />
            <circle cx={cx - 110} cy={cy - 12} r={9} fill={color.card} stroke={color.ink} strokeWidth={2.5} />
            <circle cx={cx + 110} cy={cy - 12} r={9} fill={color.card} stroke={color.ink} strokeWidth={2.5} />
          </g>
        </g>
      </svg>
      <div style={{ position: "absolute", left: cx - 400, width: 800, top: cy + 36, textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(clamp(p * 1.5 - 0.3)) }}>
        neither outranks the other · each in its own domain
      </div>
    </>
  );
}
