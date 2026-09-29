/**
 * The questions nobody has settled: a notepad "for your lawyer" filling with five
 * questions (each with the rule it turns on), stamped UNSETTLED (the crimson idea); the
 * four future trustees each get a question mark, and a lawyer bean takes the pad.
 * Cues: questions, dividends, licensing, paidq, accred, worded.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Stamp } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Bean, useProgress } from "./shared/cast.tsx";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const PAD_W = 1060;
const QS: Array<{ cue: string; q: string; ref: string }> = [
  { cue: "dividends", q: "Are dividends from a company the lab owns tax-free?", ref: "NIRC Sec. 27(D)(3)" },
  { cue: "licensing", q: "How much licensing income is safe for the exemption?", ref: "RMO 38-2019 · the operational test" },
  { cue: "paidq", q: "Can a founder be paid by the lab at all?", ref: "RMO 38-2019 IV.A.1 · inurement" },
  { cue: "accred", q: "Does donor accreditation block every deal with a founders’ company?", ref: "RR 13-98 Sec. 10(d)" },
  { cue: "worded", q: "Exactly how should the founding papers be worded?", ref: "the Articles and By-Laws" },
];
const WHO = ["arjhine", "alpha", "john", "xynil"] as const;

export default function CounselQuestions() {
  const { p } = useProgress();
  const pad = ease.arrive(p("questions", 0.5, -0.3));
  return (
    <Exhibit from={0}>
      {pad > 0 && (
        <div style={{ position: "absolute", left: X0, top: TOP + 10, width: PAD_W, height: 610, boxSizing: "border-box", borderRadius: 16, background: color.card, border: `2.5px solid ${color.ink}`, opacity: clamp(pad * 1.4), transform: `translateY(${(1 - pad) * 10}px)` }}>
          <div style={{ position: "absolute", left: 32, top: 24, ...text("label"), fontSize: 22, color: color.ink3 }}>FOR YOUR LAWYER</div>
          <div style={{ position: "absolute", left: 32, right: 32, top: 64, borderTop: `2px solid ${color.hairline}` }} />
        </div>
      )}
      <Stamp x={X0 + 700} y={TOP + 24} head="UNSETTLED" p={p("questions", 0.35, 1.2)}>
        nobody has ruled yet
      </Stamp>

      {QS.map((s, i) => {
        const q = p(s.cue, 0.4);
        if (q <= 0) return null;
        const a = ease.arrive(clamp(q));
        return (
          <div key={s.cue} style={{ position: "absolute", left: X0 + 32, top: TOP + 100 + i * 104, width: PAD_W - 64, display: "flex", gap: 18, opacity: clamp(a * 1.4), transform: `translateX(${(1 - a) * -10}px)` }}>
            <div style={{ flex: "none", width: 34, ...text("value"), fontSize: 30, color: color.ink3 }}>{i + 1}</div>
            <div>
              <div style={{ ...text("data"), fontSize: 28, lineHeight: 1.2, color: color.ink }}>{s.q}</div>
              <div style={{ ...text("meta"), fontSize: 20, color: color.ink3, marginTop: 6 }}>{s.ref}</div>
            </div>
          </div>
        );
      })}

      {/* The four future trustees, each with a question. */}
      {WHO.map((w, k) => (
        <Bean key={w} who={w} x={X0 + 1170 + k * 125} y={TOP + 300} size={74} mood="o" mark="?" markP={p(QS[k]!.cue, 0.4, 0.3)} p={p("questions", 0.4, 0.4 + k * 0.1)} />
      ))}
      <Bean who="outsider" x={X1 - 170} y={TOP + 560} size={90} holds="doc" holdP={p("worded", 0.4, 0.8)} mood="smile" name="a lawyer" p={p("worded", 0.4, 0.3)} />

      <Claim kind="limitation" note="open questions from the research · this film is not legal advice" x={X0} y={CLAIM_Y} p={p("worded", 0.3, 1.4)} />
    </Exhibit>
  );
}
