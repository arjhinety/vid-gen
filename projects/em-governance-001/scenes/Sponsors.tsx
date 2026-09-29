/**
 * Sponsors. (A) A sponsor in a top hat hands over grants, compute and hardware; its arc to
 * the findings is crossed out (the crimson idea); four of the ten safeguards. (B) Research
 * versus consulting, side by side; the consulting column sits behind a bright line and
 * belongs in a separate company.
 * Cues: sponsors, anyone, never, review, patent, disclosed, consulting, openq, client, exempt.
 */
import { color, text } from "@vid/design";
import { Arc, Claim, Cross, Exhibit, Label, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, DocTag, Plaque, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const LAB = { x: 780, y: TOP + 120, w: 360, h: 170 };
const FIND = { x: 1400, y: TOP + 120, w: 380, h: 170 };

export default function Sponsors() {
  const { p } = useProgress();
  return (
    <>
      <Exhibit from={0} until="consulting">
        <Bean who="sponsor" x={320} y={TOP + 330} size={140} hat="tophat" name="sponsor" holds="bag" holdP={p("anyone", 0.5)} p={p("sponsors", 0.5)} mood="smile" />
        <Plaque x={LAB.x} y={LAB.y} w={LAB.w} h={LAB.h} kicker="THE LAB" title="research" p={p("sponsors", 0.5, 0.3)} />
        <Plaque x={FIND.x} y={FIND.y} w={FIND.w} h={FIND.h} kicker="THE FINDINGS" title="what the research finds" p={p("never", 0.5, -0.4)} />
        {["grants", "compute", "hardware"].map((s, i) => (
          <div key={s} style={{ position: "absolute", left: 470, top: LAB.y + 30 + i * 46 }}>
            <Tag p={p("anyone", 0.35, 0.3 + i * 0.25)} c={color.ink} style={{ fontSize: 22 }}>
              {s}
            </Tag>
          </div>
        ))}
        <Arrow points={[[610, LAB.y + 90], [LAB.x - 14, LAB.y + 90]]} p={p("anyone", 0.5, 0.9)} />
        <Arc x1={360} x2={FIND.x + 120} y={LAB.y - 8} height={60} p={p("never", 0.8, 0.2)} />
        <Cross x={(360 + FIND.x + 120) / 2} y={LAB.y - 68} size={44} p={p("never", 0.25, 1.0)} />
        <div style={{ position: "absolute", left: (360 + FIND.x + 120) / 2 + 40, top: LAB.y - 100, ...text("meta"), fontSize: 20, color: color.red, opacity: ease.arrive(p("never", 0.3, 1.2)), whiteSpace: "nowrap" }}>
          no say over the findings
        </div>

        {/* Four of the ten safeguards. */}
        <Label x={X0} y={TOP + 420} p={p("review", 0.3, -0.3)} sub="four of them">
          {`${gov.safeguards} SAFEGUARDS`}
        </Label>
        <div style={{ position: "absolute", left: X0, top: TOP + 510, display: "flex", gap: 14 }}>
          {[
            [`secrets check · ≤ ${gov.sponsorReview} days`, p("review", 0.35, 0.3)],
            [`patent delay · ≤ ${gov.patentDelay} days`, p("patent", 0.35, 0.2)],
            ["funding disclosed", p("disclosed", 0.35)],
            ["publishable by default", p("disclosed", 0.35, 1.0)],
          ].map(([s, q]) => (
            <Tag key={s as string} p={q as number} c={color.ink} style={{ fontSize: 24, padding: "8px 14px" }}>
              {s as string}
            </Tag>
          ))}
        </div>
        <DocTag x={X0} y={TOP + 590} p={p("disclosed", 0.3, 1.4)}>
          PROVISIONAL · GDR-026 · future Sponsored Research Policy
        </DocTag>
        <Claim kind="design" note="recommended limits · a future policy" x={X0} y={CLAIM_Y} p={p("disclosed", 0.3, 1.8)} />
      </Exhibit>

      <Exhibit from="consulting">
        <Versus />
      </Exhibit>
    </>
  );
}

const ROWS: Array<[string, string]> = [
  ["an open research question", "one client’s business problem"],
  ["results published", "results delivered privately"],
  ["researchers set the method", "the client sets the scope"],
  ["many benefit", "one client benefits"],
];

function Versus() {
  const { p } = useProgress();
  const colL = X0;
  const colR = 1000;
  const q = (i: number) => (i === 0 ? p("openq", 0.35) : i === 1 ? p("openq", 0.35, 1.2) : p("client", 0.35, 0.6 + (i - 2) * 0.5));
  const r = (i: number) => (i === 0 ? p("client", 0.35) : i === 1 ? p("client", 0.35, 0.4) : p("client", 0.35, 0.8 + (i - 2) * 0.5));
  return (
    <>
      <Label x={colL} y={TOP + 30} p={p("consulting", 0.3, 0.2)} sub="fits the mission">
        RESEARCH SPONSORSHIP
      </Label>
      <Label x={colR} y={TOP + 30} p={p("consulting", 0.3, 0.2)} c={color.red} sub="not an activity of the lab">
        CONSULTING
      </Label>
      {ROWS.map(([a, b], i) => (
        <div key={a}>
          <Row x={colL} y={TOP + 120 + i * 78} p={q(i)}>
            {a}
          </Row>
          <Row x={colR} y={TOP + 120 + i * 78} p={r(i)} dim>
            {b}
          </Row>
        </div>
      ))}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={colR - 40} y1={TOP + 20} x2={colR - 40} y2={TOP + 110 + ROWS.length * 78} stroke={color.red} strokeWidth={4} opacity={ease.arrive(p("consulting", 0.4))} />
      </svg>
      <div style={{ position: "absolute", left: colR, top: TOP + 460, width: X1 - colR, ...text("body"), fontSize: 26, lineHeight: 1.3, color: color.ink2, opacity: ease.arrive(p("exempt", 0.4)) }}>
        done regularly, it puts the tax exemption in doubt
      </div>
      <Arrow points={[[colR + 20, TOP + 540], [colR + 20, TOP + 580], [colR + 70, TOP + 580]]} p={p("exempt", 0.5, 1.0)} width={2.5} />
      <Tag p={p("exempt", 0.35, 1.4)} c={color.ink} style={{ position: "absolute", left: colR + 86, top: TOP + 562, fontSize: 24, padding: "4px 14px" }}>
        a separate company
      </Tag>
      <DocTag x={X0} y={TOP + 460} p={p("consulting", 0.3, 0.8)}>
        PROVISIONAL · GDR-027
      </DocTag>
      <Claim kind="author-interpretation" note="the draft’s reading of NIRC Sec. 30 and the St. Luke’s case" x={X0} y={CLAIM_Y} p={p("exempt", 0.3, 1.8)} />
    </>
  );
}

function Row({ x, y, p, dim = false, children }: { x: number; y: number; p: number; dim?: boolean; children: string }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, ...text("data"), fontWeight: 500, fontSize: 32, color: dim ? color.ink2 : color.ink, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 6}px)`, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}
