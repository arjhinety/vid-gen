/**
 * The ground rules the tax office uses. Left: the founding papers, with the four promises
 * they must make for the exemption. Right: two items from the tax office's list of private
 * benefit, then the founders as "organizers", where even a research salary could count
 * (the crimson idea).
 * Cues: ground, promise, nonstock, inure, nopay, similar, private, trustpay, overpay, organizers.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, DocTag, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { Kicker, Note } from "./shared/boxes.tsx";
import { law } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const DW = 740;
const RX = X0 + 820;
const RW = X1 - RX;

export default function GroundRules() {
  const { p } = useProgress();
  const doc = ease.arrive(p("promise", 0.5, -0.3));
  const promises = [
    { cue: "nonstock", o: 0, text: "non-stock and non-profit" },
    { cue: "inure", o: 0, text: "no income goes to any private person" },
    { cue: "nopay", o: 0, text: "trustees get no pay" },
    { cue: "similar", o: 0, text: "if it closes: what’s left goes to similar groups, or the government" },
  ];
  return (
    <Exhibit from={0}>
      {/* The papers. */}
      {doc > 0 && (
        <div style={{ position: "absolute", left: X0, top: TOP + 10, width: DW, height: 600, boxSizing: "border-box", background: color.card, border: `2.5px solid ${color.ink}`, borderRadius: 6, opacity: clamp(doc * 1.4), transform: `translateY(${(1 - doc) * 10}px)` }}>
          <div style={{ position: "absolute", left: 32, top: 24, ...text("label"), fontSize: 20, color: color.ink3 }}>THE FOUNDING PAPERS MUST SAY</div>
          <div style={{ position: "absolute", left: 32, right: 32, top: 60, borderTop: `2px solid ${color.hairline}` }} />
        </div>
      )}
      {promises.map((s, i) => {
        const q = p(s.cue, 0.4, s.o);
        if (q <= 0) return null;
        const a = ease.arrive(clamp(q));
        return (
          <div key={s.cue} style={{ position: "absolute", left: X0 + 32, top: TOP + 100 + i * 120, width: DW - 64, display: "flex", gap: 18, opacity: clamp(a * 1.4), transform: `translateX(${(1 - a) * -8}px)` }}>
            <span style={{ ...text("bigNumber"), fontSize: 44, color: color.ink, width: 40, flex: "none" }}>{i + 1}</span>
            <span style={{ ...text("data"), fontSize: 30, lineHeight: 1.2, color: color.ink, paddingTop: 6 }}>{s.text}</span>
          </div>
        );
      })}

      {/* The tax office's list of private benefit. */}
      <Kicker x={RX} y={TOP + 10} p={p("private", 0.4)}>PRIVATE BENEFIT, ON THE TAX OFFICE’S LIST</Kicker>
      <Item y={TOP + 50} p={p("trustpay", 0.4)}>paying trustees or organizers</Item>
      <Item y={TOP + 140} p={p("overpay", 0.4)}>overpaying a company that a trustee has a stake in</Item>
      <Note x={RX} y={TOP + 262} w={RW} p={p("overpay", 0.4, 1.0)} size={20} c={color.ink3}>
        {`…${law.inurementsListed - 2} more on the list`}
      </Note>

      {/* You are the organizers. */}
      {FOUNDERS.map((w, k) => (
        <Bean key={w} who={w} x={RX + 90 + k * 140} y={TOP + 440} size={80} hat="trustee" mood={p("organizers", 0.1, 1.2) > 0 ? "o" : "smile"} p={p("organizers", 0.4, k * 0.1)} />
      ))}
      <Note x={RX + 440} y={TOP + 340} w={RW - 440} p={p("organizers", 0.4, 0.4)} c={color.ink} size={26}>
        as founders, you’re the organizers
      </Note>
      <Note x={RX} y={TOP + 490} w={RW} p={p("organizers", 0.4, 1.2)} c={color.red} size={26} weight={600}>
        so even a research salary could count
      </Note>
      <DocTag x={RX} y={TOP + 550} p={p("organizers", 0.3, 2.0)}>
        {"BIR RMO 38-2019 · ask a lawyer"}
      </DocTag>

      <Claim kind="author-interpretation" note="research on the tax office’s rules (RMO 38-2019) · not legal advice" x={X0} y={CLAIM_Y} p={p("organizers", 0.3, 2.4)} />
    </Exhibit>
  );
}

function Item({ y, p, children }: { y: number; p: number; children: string }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: RX, top: y, width: RW, minHeight: 76, boxSizing: "border-box", background: color.card, border: `2px solid ${color.ink}`, borderRadius: 12, padding: "14px 20px", ...text("data"), fontSize: 26, lineHeight: 1.25, color: color.ink, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 8}px)` }}>
      {children}
    </div>
  );
}
