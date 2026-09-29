/**
 * Who owns the work: the draft's five IP categories as five cards. The researcher's cards
 * (brought, independent, credit) and the lab's program card (open by default); the
 * "everything you invent belongs to us" clause is crossed out (the crimson idea).
 * Cues: whose, brought, independent, theirs, inside, open, everything, credit.
 */
import { color, text } from "@vid/design";
import { Claim, Cross, Exhibit, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const W = 308;
const GAP = (1640 - 5 * W) / 4;
const CY = TOP + 40;

export default function Ownership() {
  const { p } = useProgress();
  const cards: Array<{ k: string; name: string; what: string; owner: string; lab: boolean; q: number; glow: number }> = [
    { k: "A", name: "background", what: "what you brought with you", owner: "the researcher", lab: false, q: p("brought", 0.4), glow: p("theirs", 0.3) },
    { k: "B", name: "program", what: "made in a lab program, with its money or compute", owner: "the lab", lab: true, q: p("inside", 0.4), glow: p("inside", 0.3, 0.4) },
    { k: "C", name: "independent", what: "made on your own", owner: "the researcher", lab: false, q: p("independent", 0.4), glow: p("theirs", 0.3) },
    { k: "D", name: "credit", what: "authorship and attribution", owner: "researcher, always", lab: false, q: p("credit", 0.4), glow: p("credit", 0.3, 0.3) },
    { k: "E", name: "existing", what: "assets from before the lab, listed in a register", owner: "one by one", lab: false, q: p("credit", 0.4, 1.6), glow: 0 },
  ];
  return (
    <Exhibit from={0}>
      {cards.map((c, i) => (
        <IpCard key={c.k} x={X0 + i * (W + GAP)} {...c} />
      ))}
      <div style={{ position: "absolute", left: X0 + (W + GAP), top: CY + 330, width: W }}>
        <Tag p={p("open", 0.35)} c={color.ink} style={{ fontSize: 22, padding: "4px 12px" }}>
          open by default
        </Tag>
        <div style={{ ...text("meta"), fontSize: 20, color: color.ink3, marginTop: 10, opacity: ease.arrive(p("open", 0.3, 0.6)) }}>{`only ${gov.ipTriggers} listed triggers`}</div>
      </div>

      {/* The clause that is not there. */}
      <div style={{ position: "absolute", left: X0, top: TOP + 480, width: 760, height: 110, background: color.card, border: `2.5px solid ${color.ink}`, borderRadius: 12, opacity: ease.arrive(p("everything", 0.4)), transform: `rotate(-1deg)` }}>
        <div style={{ position: "absolute", left: 22, top: 14, ...text("label"), fontSize: 18, color: color.ink3 }}>NOT IN THE DRAFT</div>
        <div style={{ position: "absolute", left: 22, top: 46, ...text("data"), fontSize: 30, color: color.ink }}>“everything you invent belongs to us”</div>
      </div>
      <Cross x={X0 + 700} y={TOP + 535} size={60} p={p("everything", 0.25, 0.8)} />

      <Bean who="arjhine" x={1180} y={TOP + 640} size={120} name="researcher" p={p("credit", 0.5, -0.2)} holds="doc" holdP={p("credit", 0.4, 0.3)} mood="open" mark="heart" markP={p("credit", 0.4, 0.8)} />
      <div style={{ position: "absolute", left: 1300, top: TOP + 470, width: 480, ...text("body"), fontSize: 26, lineHeight: 1.3, color: color.ink2, opacity: ease.arrive(p("credit", 0.4, 1.0)) }}>
        owning the weights never makes the lab an author
      </div>
      <DocTag x={1300} y={TOP + 580} p={p("credit", 0.3, 1.4)}>
        PROVISIONAL · GDR-024
      </DocTag>
      <Claim kind="design" note="hybrid IP framework; ownership moves only by signed agreements" x={X0} y={CLAIM_Y} p={p("credit", 0.3, 1.8)} />
    </Exhibit>
  );
}

function IpCard({ x, k, name, what, owner, lab, q, glow }: { x: number; k: string; name: string; what: string; owner: string; lab: boolean; q: number; glow: number }) {
  if (q <= 0) return null;
  const a = ease.arrive(clamp(q));
  const g = ease.arrive(clamp(glow));
  return (
    <div style={{ position: "absolute", left: x, top: CY, width: W, height: 300, background: color.card, border: `2.5px solid ${color.ink}`, borderRadius: 16, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 14}px)`, boxShadow: g > 0 ? `0 ${10 * g}px ${26 * g}px rgba(20,21,22,${0.14 * g})` : undefined }}>
      <div style={{ position: "absolute", left: 20, top: 14, ...text("bigNumber"), fontSize: 56, color: color.ink }}>{k}</div>
      <div style={{ position: "absolute", left: 20, top: 84, ...text("heading"), fontSize: 32, color: color.ink }}>{name}</div>
      <div style={{ position: "absolute", left: 20, right: 18, top: 130, ...text("body"), fontSize: 22, lineHeight: 1.3, color: color.ink2 }}>{what}</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 56, borderTop: `1.5px solid ${color.hairline}`, background: lab ? color.instrument : color.cardShade, borderRadius: "0 0 14px 14px" }}>
        <div style={{ position: "absolute", left: 20, top: 16, ...text("meta"), fontSize: 20, color: lab ? color.instrumentInk : color.ink }}>{`→ ${owner}`}</div>
      </div>
    </div>
  );
}
