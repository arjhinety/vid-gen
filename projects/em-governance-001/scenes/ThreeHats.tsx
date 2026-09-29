/**
 * Three hats. (A) A hat rack: member, trustee, officer; the same three beans put each hat
 * on as it is named, then get their officer titles. (B) The chain: members elect the
 * Board, the Board appoints the officers; the one forbidden pairing (President +
 * Treasurer) is the crimson idea; the President also sits on the Board; all unpaid.
 * Cues: hats, members, trustees, officers, president, elect, appoints, combo, mustbe, unpaid.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Label, Tag, Term } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, DocTag, FOUNDERS, HatIcon, type HatKind, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const TITLE: Record<(typeof FOUNDERS)[number], string> = {
  arjhine: "Corporate Secretary",
  alpha: "President",
  john: "Treasurer",
};
// The titles come from the data; the map above only orders them per bean.
const titleOf = (w: (typeof FOUNDERS)[number]) => {
  const name = w[0]!.toUpperCase() + w.slice(1);
  const hit = Object.entries(gov.officers).find(([, who]) => who === name);
  return hit ? hit[0] : TITLE[w];
};

const RACK: Array<{ kind: HatKind; cue: string; term: string; def: string }> = [
  { kind: "member", cue: "members", term: "members", def: "vote on the big changes" },
  { kind: "trustee", cue: "trustees", term: "trustees", def: "the Board · runs the lab" },
  { kind: "officer", cue: "officers", term: "officers", def: "do the legal paperwork" },
];

export default function ThreeHats() {
  const { p } = useProgress();
  const hatA = p("officers", 0.1) > 0 ? "officer" : p("trustees", 0.1) > 0 ? "trustee" : p("members", 0.1) > 0 ? "member" : null;
  const hatAP = hatA === "officer" ? p("officers", 0.35) : hatA === "trustee" ? p("trustees", 0.35) : p("members", 0.35);

  return (
    <>
      <Exhibit from={0} until="elect">
        {RACK.map((r, i) => (
          <div key={r.kind}>
            <HatIcon kind={r.kind} x={X0 + 60} y={TOP + 70 + i * 170} size={96} p={p("hats", 0.5, 0.3 + i * 0.2)} />
            <Term x={X0 + 150} y={TOP + 30 + i * 170} def={r.def} p={p(r.cue, 1.0)}>
              {r.term}
            </Term>
          </div>
        ))}
        {FOUNDERS.map((w, i) => (
          <div key={w}>
            <Bean who={w} x={1010 + i * 290} y={TOP + 470} size={165} p={p("hats", 0.5, i * 0.12)} hat={hatA} hatP={hatAP} mood={hatA ? "open" : "smile"} hop={p(hatA ? (hatA === "officer" ? "officers" : hatA === "trustee" ? "trustees" : "members") : "hats", 0.4, 0.15) * (1 - p(hatA === "officer" ? "officers" : hatA === "trustee" ? "trustees" : "members", 0.1, 0.55))} />
            <Label x={1010 + i * 290 - 150} w={300} align="left" y={TOP + 560} p={p("president", 0.4, i * 0.55)} style={{ textAlign: "center" }}>
              {titleOf(w)}
            </Label>
          </div>
        ))}
        <DocTag x={X0} y={TOP + 560} p={p("president", 0.3, 1.5)}>
          DECIDED · GDR-001 to 003
        </DocTag>
        <Claim kind="design" note="decided by the founders" x={X0} y={CLAIM_Y} p={p("president", 0.3, 1.8)} />
      </Exhibit>

      <Exhibit from="elect">
        <Chain />
      </Exhibit>
    </>
  );
}

const ROWS: Array<{ label: string; sub: string; hat: HatKind; y: number }> = [
  { label: "MEMBERS", sub: "the three founders", hat: "member", y: TOP + 150 },
  { label: "BOARD OF TRUSTEES", sub: `quorum ${gov.quorum} of ${gov.founders}`, hat: "trustee", y: TOP + 360 },
  { label: "OFFICERS", sub: "legal jobs, not rank", hat: "officer", y: TOP + 570 },
];
const BX = [760, 1040, 1320];

function Chain() {
  const { p } = useProgress();
  const rowP = [p("elect", 0.5), p("elect", 0.5, 0.9), p("appoints", 0.5, 0.2)];
  return (
    <>
      {ROWS.map((r, ri) => (
        <div key={r.label}>
          <Label x={X0} y={r.y - 90} p={rowP[ri]} sub={r.sub}>
            {r.label}
          </Label>
          {FOUNDERS.map((w, i) => (
            <Bean
              key={w}
              who={w}
              x={BX[i]!}
              y={r.y}
              size={78}
              p={clamp(rowP[ri]! * 1.3 - i * 0.12)}
              hat={r.hat}
              name={ri === 2 ? titleOf(w) : ri === 0 ? undefined : false}
              mood={ri === 2 && w === "alpha" && p("combo", 0.1) > 0 && p("mustbe", 0.1) === 0 ? "o" : "smile"}
            />
          ))}
        </div>
      ))}
      <Arrow points={[[610, ROWS[0]!.y - 40], [610, ROWS[1]!.y - 110]]} p={p("elect", 0.5, 0.4)} />
      <div style={{ position: "absolute", left: 480, top: ROWS[0]!.y + 4, ...text("meta"), fontSize: 22, color: color.ink2, opacity: ease.arrive(p("elect", 0.3, 0.6)) }}>elect</div>
      <Arrow points={[[610, ROWS[1]!.y - 40], [610, ROWS[2]!.y - 110]]} p={p("appoints", 0.5)} />
      <div style={{ position: "absolute", left: 450, top: ROWS[1]!.y + 4, ...text("meta"), fontSize: 22, color: color.ink2, opacity: ease.arrive(p("appoints", 0.3, 0.3)) }}>appoint</div>

      {/* The one pairing the law forbids. */}
      <div style={{ position: "absolute", left: 1480, top: ROWS[2]!.y - 160, width: 300, opacity: ease.arrive(p("combo", 0.35)) }}>
        <div style={{ ...text("label"), fontSize: 20, color: color.red }}>NEVER ONE PERSON AS</div>
        <div style={{ ...text("data"), fontSize: 30, lineHeight: 1.2, color: color.ink, marginTop: 10 }}>President + Treasurer</div>
        <div style={{ ...text("data"), fontSize: 30, lineHeight: 1.2, color: color.ink, marginTop: 4 }}>President + Secretary</div>
      </div>

      {/* The President also sits on the Board. */}
      <Arrow points={[[BX[1]! + 50, ROWS[2]!.y - 60], [BX[1]! + 95, ROWS[2]!.y - 95], [BX[1]! + 95, ROWS[1]!.y - 20], [BX[1]! + 52, ROWS[1]!.y - 50]]} p={p("mustbe", 0.6)} width={2.5} />
      <div style={{ position: "absolute", left: BX[1]! + 112, top: ROWS[1]!.y + 40, width: 200, ...text("meta"), fontSize: 20, lineHeight: 1.3, color: color.ink2, opacity: ease.arrive(p("mustbe", 0.3, 0.5)) }}>
        also a trustee, to be safe
      </div>

      <div style={{ position: "absolute", left: X0, top: ROWS[2]!.y + 14 }}>
        <Tag p={p("unpaid", 0.35)} c={color.ink} style={{ fontSize: 22, padding: "4px 12px" }}>
          all unpaid · about the first year
        </Tag>
      </div>
      <Claim kind="author-interpretation" note="the draft’s reading of RCC Sec. 24 · counsel to check" x={X0} y={CLAIM_Y} p={p("combo", 0.3, 1.0)} />
    </>
  );
}
