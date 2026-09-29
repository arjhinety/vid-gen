/**
 * What's next. (A) The 38 decisions as 38 tiles: decided (filled), up for review (outlined,
 * the open ones marked ?), deferred (faint). (B) The five choices that block the founding
 * papers. (C) The founders' meeting (accept / change / reject) and the lawyer; the
 * BEFORE FILING stamp is the crimson idea.
 * Cues: decided, forreview, deferred, purposew, office, capital, residency, expenses, meet, counsel.
 */
import { color, text } from "@vid/design";
import { ColorKey, Claim, Exhibit, Label, Stamp, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const TILE = 52;
const GAP = 10;
const PER_ROW = 19;

export default function Next() {
  const { p } = useProgress();
  const kinds: Array<"decided" | "provisional" | "open" | "deferred"> = [
    ...Array<"decided">(gov.decided).fill("decided"),
    ...Array<"provisional">(gov.provisional).fill("provisional"),
    ...Array<"open">(gov.open).fill("open"),
    ...Array<"deferred">(gov.deferred).fill("deferred"),
  ];
  return (
    <Exhibit from={0}>
      <Label x={X0} y={TOP + 16} p={p("decided", 0.3, -1.2)} sub="one tile = one decision in the draft’s record">
        {`${gov.total} DECISIONS`}
      </Label>
      {kinds.map((k, i) => {
        const x = X0 + (i % PER_ROW) * (TILE + GAP);
        const y = TOP + 96 + Math.floor(i / PER_ROW) * (TILE + GAP);
        const q = k === "decided" ? p("decided", 0.3, i * 0.05) : k === "deferred" ? p("deferred", 0.3, (i - gov.decided - gov.provisional - gov.open) * 0.1) : p("forreview", 0.3, (i - gov.decided) * 0.03);
        return <Tile key={i} x={x} y={y} kind={k} p={q} />;
      })}
      <div style={{ position: "absolute", left: X0 + PER_ROW * (TILE + GAP) + 16, top: TOP + 100, ...text("meta"), fontSize: 22, color: color.ink2, lineHeight: 1.6, opacity: ease.arrive(p("deferred", 0.3, 0.6)) }}>
        {`${gov.decided} decided`}
        <br />
        {`${gov.forReview} for review`}
        <br />
        {`${gov.deferred} can wait`}
      </div>
      <ColorKey
        x={X0}
        y={TOP + 232}
        p={p("deferred", 0.3, 0.8)}
        items={[
          { color: color.ink, label: "decided" },
          { color: color.ink2, label: "for review (? = open)" },
          { color: color.hairline, label: "deferred" },
        ]}
      />

      {/* The five blockers. */}
      <Label x={X0} y={TOP + 300} p={p("line:b27#2", 0.3)} sub={`of ${gov.founderChoices} founder choices`}>
        {`${gov.blocking} BLOCK THE FOUNDING PAPERS`}
      </Label>
      <div style={{ position: "absolute", left: X0, top: TOP + 390, display: "flex", gap: 14 }}>
        {[
          ["purposew", "purpose wording"],
          ["office", "office address"],
          ["capital", "starting money"],
          ["residency", "who lives where"],
          ["expenses", "expense claims"],
        ].map(([cue, s]) => (
          <Tag key={cue} p={p(cue!, 0.35)} c={color.ink} style={{ fontSize: 26, padding: "8px 16px" }}>
            {s}
          </Tag>
        ))}
      </div>

      {/* The meeting, then the lawyer. */}
      {FOUNDERS.map((w, i) => (
        <Bean key={w} who={w} x={X0 + 90 + i * 150} y={TOP + 640} size={95} p={p("meet", 0.5, i * 0.1)} mood="open" holds={(["vote", "doc", "no"] as const)[i]} holdP={p("meet", 0.4, 1.2 + i * 0.4)} />
      ))}
      <div style={{ position: "absolute", left: X0 + 520, top: TOP + 520, display: "flex", gap: 12 }}>
        {["accept", "change", "reject"].map((s, i) => (
          <Tag key={s} p={p("meet", 0.35, 1.2 + i * 0.4)} c={color.ink2} style={{ fontSize: 22 }}>
            {s}
          </Tag>
        ))}
      </div>
      <div style={{ position: "absolute", left: X0 + 520, top: TOP + 570, ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("meet", 0.3, 2.6)) }}>each proposal, one by one</div>
      <Bean who="plain" x={1300} y={TOP + 615} size={100} name="a lawyer" holds="doc" holdP={p("counsel", 0.4, 0.3)} p={p("counsel", 0.5)} mood="smile" />
      <Stamp x={1420} y={TOP + 500} head="BEFORE FILING" p={p("counsel", 0.25, 0.8)} stack style={{ fontSize: 22 }}>
        counsel checks the law
      </Stamp>
      <Claim kind="limitation" note="the draft is not legal advice" x={X0 + 700} y={CLAIM_Y + 10} p={p("counsel", 0.3, 1.2)} />
    </Exhibit>
  );
}

function Tile({ x, y, kind, p }: { x: number; y: number; kind: "decided" | "provisional" | "open" | "deferred"; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const fill = kind === "decided" ? color.ink : color.card;
  const border = kind === "deferred" ? color.hairline : kind === "decided" ? color.ink : color.ink2;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: TILE, height: TILE, borderRadius: 8, background: fill, border: `2.5px ${kind === "open" ? "dashed" : "solid"} ${border}`, opacity: clamp(a * 1.4), transform: `scale(${0.7 + 0.3 * a})`, display: "flex", alignItems: "center", justifyContent: "center", ...text("data"), fontSize: 26, color: color.ink2 }}>
      {kind === "open" ? "?" : ""}
    </div>
  );
}
