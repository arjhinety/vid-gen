/**
 * Conflicts. (A) Three trustees at a table; one has a stake (the crimson idea), says so and
 * steps out of the room; two of three is still a quorum, so both must say yes; a split
 * means the deal fails, which is safe. (B) All three have a stake: the deal waits for two
 * trustees with no interest; a stuck vote keeps the status quo, and after 60 days an
 * outsider may mediate.
 * Cues: stake, disclose, leave, quorum, both, fails, all, wait, status, mediate.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Stamp, Tag } from "@vid/kit";
import { clamp, ease, mix } from "@vid/motion";
import { Bean, DocTag, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const FEET = TOP + 470;

export default function Conflicts() {
  const { p } = useProgress();
  const out = ease.travel(p("leave", 0.9));
  const split = p("fails", 0.1) > 0;
  return (
    <>
      <Exhibit from={0} until="all">
        <Room />
        <Bean who="plain" x={620} y={FEET} size={130} hat="trustee" name="trustee" p={p("stake", 0.5, -0.6)} holds="vote" holdP={p("both", 0.4)} mood={split ? "flat" : "smile"} />
        <Bean who="plain" x={900} y={FEET} size={130} hat="trustee" name="trustee" p={p("stake", 0.5, -0.45)} holds={split ? "no" : "vote"} holdP={p("both", 0.4, 0.15)} mood={split ? "worried" : "smile"} />
        <Bean who="plain" x={mix(1180, 1560, out)} y={FEET} size={130} hat="trustee" name={out > 0.5 ? "recused" : "trustee"} p={p("stake", 0.5, -0.3)} dim={out * 0.8} holds={p("disclose", 0.1) > 0 && out < 1 ? "doc" : null} holdP={p("disclose", 0.4) * (1 - out)} mood="o" mark="!" markP={p("stake", 0.4, 0.2) * (1 - out)} hop={p("leave", 0.3) * (1 - p("leave", 0.1, 0.3))} />
        <div style={{ position: "absolute", left: mix(1180, 1560, out) - 60, top: FEET - 250 }}>
          <Tag p={p("stake", 0.35, 0.4)} c={color.red} style={{ fontSize: 22, padding: "3px 12px" }}>
            a personal stake
          </Tag>
        </div>
        <div style={{ position: "absolute", left: 1300, top: FEET + 60, ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("leave", 0.4, 0.8)), whiteSpace: "nowrap" }}>
          discloses · leaves the room · no vote
        </div>

        <div style={{ position: "absolute", left: X0, top: TOP + 40, ...text("value"), fontSize: 40, color: color.ink, opacity: ease.arrive(p("quorum", 0.35)) }}>
          {`${gov.quorum} of ${gov.founders}`} <span style={{ ...text("meta"), fontSize: 22, color: color.ink2 }}>present = quorum</span>
        </div>
        <div style={{ position: "absolute", left: X0, top: TOP + 100, ...text("meta"), fontSize: 22, color: color.ink2, opacity: ease.arrive(p("both", 0.35, 0.4)) }}>so both remaining trustees must vote yes</div>
        <div style={{ position: "absolute", left: X0, top: FEET + 110, opacity: ease.arrive(p("fails", 0.35, 0.3)) }}>
          <span style={{ ...text("data"), fontSize: 32, color: color.ink }}>a split → the deal fails</span>
          <span style={{ ...text("meta"), fontSize: 22, color: color.ink2 }}> · for an insider deal, the safe outcome</span>
        </div>
        <Claim kind="author-interpretation" note="recusal as the draft reads RCC Secs. 31, 52 · counsel to check" x={X0} y={CLAIM_Y} p={p("fails", 0.3, 1.2)} />
      </Exhibit>

      <Exhibit from="all">
        <AllThree />
      </Exhibit>
    </>
  );
}

/** The meeting room: a table and a doorway on the right. */
function Room() {
  const { p } = useProgress();
  const a = ease.arrive(p("stake", 0.5, -0.8));
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: a }}>
      <rect x={1340} y={FEET - 260} width={150} height={270} rx={6} fill="none" stroke={color.ink3} strokeWidth={3} strokeDasharray="10 8" />
      <text x={1415} y={FEET - 272} textAnchor="middle" fontFamily="JetBrains Mono" fontSize={20} fill={color.ink3}>
        door
      </text>
      <ellipse cx={900} cy={FEET - 18} rx={430} ry={22} fill={color.cardShade} stroke={color.ink} strokeWidth={2.5} />
    </svg>
  );
}

function AllThree() {
  const { p } = useProgress();
  return (
    <>
      {/* A company all three own. */}
      <div style={{ position: "absolute", left: X0, top: TOP + 30, width: 620, height: 90, border: `2.5px solid ${color.ink}`, borderRadius: 14, background: color.card, opacity: ease.arrive(p("all", 0.4)) }}>
        <div style={{ position: "absolute", left: 22, top: 14, ...text("label"), fontSize: 18, color: color.ink3 }}>A COMPANY ALL THREE OWN</div>
        <div style={{ position: "absolute", left: 22, top: 42, ...text("data"), fontSize: 28, color: color.ink }}>a founder-linked deal</div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <Bean who="plain" x={X0 + 110 + i * 200} y={TOP + 380} size={110} hat="trustee" name="trustee" p={p("all", 0.5, 0.2 + i * 0.1)} mood="o" />
          <div style={{ position: "absolute", left: X0 + 60 + i * 200, top: TOP + 170 }}>
            <Tag p={p("all", 0.35, 0.6 + i * 0.15)} c={color.red} style={{ fontSize: 20 }}>
              stake
            </Tag>
          </div>
        </div>
      ))}
      <Stamp x={X0 + 60} y={TOP + 470} head="WAITS" p={p("wait", 0.25, 0.4)} stack style={{ fontSize: 22 }}>
        {`until ${gov.disinterested} trustees have no interest in it`}
      </Stamp>

      {/* A stuck vote. */}
      <div style={{ position: "absolute", left: 1000, top: TOP + 30, ...text("label"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("status", 0.3, -0.5)) }}>A STUCK VOTE</div>
      <Bean who="plain" x={1080} y={TOP + 380} size={110} hat="trustee" name={false} holds="vote" holdP={p("status", 0.4, -0.3)} p={p("status", 0.4, -0.5)} mood="flat" />
      <Bean who="plain" x={1560} y={TOP + 380} size={110} hat="trustee" name={false} facing={-1} holds="no" holdP={p("status", 0.4, -0.2)} p={p("status", 0.4, -0.4)} mood="flat" />
      <div style={{ position: "absolute", left: 1000, top: TOP + 440, width: 640, textAlign: "center", ...text("data"), fontSize: 30, color: color.ink, opacity: ease.arrive(p("status", 0.35, 0.3)) }}>
        nothing changes
      </div>
      <Calendar x={1260} y={TOP + 90} days={gov.deadlockDays} p={p("line:b17#2", 0.4, 2.6)} />
      <Bean who="outsider" x={1320} y={TOP + 620} size={95} name="outsider · mediates, non-binding" p={p("mediate", 0.5)} mood="smile" hop={p("mediate", 0.3) * (1 - p("mediate", 0.1, 0.3))} />
      <DocTag x={X0} y={TOP + 590} p={p("mediate", 0.3, 0.6)}>
        PROVISIONAL · GDR-020, GDR-031
      </DocTag>
      <Claim kind="design" note="presumptively not done until then (§8)" x={X0} y={CLAIM_Y} p={p("mediate", 0.3, 1.0)} />
    </>
  );
}

function Calendar({ x, y, days, p }: { x: number; y: number; days: number; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 120, height: 130, background: color.card, border: `2.5px solid ${color.ink}`, borderRadius: 10, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 10}px)` }}>
      <div style={{ height: 30, background: color.ink, borderRadius: "6px 6px 0 0" }} />
      <div style={{ textAlign: "center", ...text("value"), fontSize: 44, color: color.ink, marginTop: 10 }}>{days}</div>
      <div style={{ textAlign: "center", ...text("meta"), fontSize: 20, color: color.ink3 }}>days</div>
    </div>
  );
}
