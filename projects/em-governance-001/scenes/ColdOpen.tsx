/**
 * Cold open. Three friends pop in by name; the lab is named; the draft lands beside them
 * (53 pages, 38 decisions); the question types itself; the draft fans out into the pieces
 * the film will take apart; the PROPOSAL stamp is the one crimson idea.
 * Cues: arjhine, alpha, john, lab, draft, honest, apart, notlegal.
 */
import { color, shadow, text } from "@vid/design";
import { Claim, Exhibit, Meta, Stamp, Tag, Term } from "@vid/kit";
import { clamp, ease, mix } from "@vid/motion";
import { Bean, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const FEET = TOP + 520;
const DOC = { x: 1130, y: TOP + 150, w: 470, h: 330 };
const PIECES = ["three hats", "two layers", "votes", "the Board", "money", "who owns what", "sponsors", "weak spots"];

export default function ColdOpen() {
  const { p } = useProgress();
  const hop = (name: string) => clamp(p(name, 0.45, 0.05)) * (1 - clamp(p(name, 0.1, 0.5)));
  const doc = ease.arrive(p("draft", 0.5));
  const q = p("honest", 0.4, 0.6);
  const fan = ease.travel(p("apart", 0.9));

  return (
    <Exhibit from={0}>
      <Term x={X0} y={TOP + 16} def="a research lab for machine learning · Philippines" p={p("lab", 1.1)}>
        Experimental Machines
      </Term>

      <Bean who="arjhine" x={330} y={FEET} size={170} p={p("arjhine", 0.5)} hop={hop("arjhine")} mood={q > 0 ? "o" : "smile"} mark={q > 0 ? "?" : undefined} markP={q} />
      <Bean who="alpha" x={600} y={FEET} size={170} p={p("alpha", 0.5)} hop={hop("alpha")} mood={q > 0 ? "o" : "open"} mark={q > 0 ? "?" : undefined} markP={p("honest", 0.4, 0.75)} />
      <Bean who="john" x={870} y={FEET} size={170} p={p("john", 0.5)} hop={hop("john")} mood={q > 0 ? "o" : "smile"} mark={q > 0 ? "?" : undefined} markP={p("honest", 0.4, 0.9)} />

      {/* The draft: a document on the sheet. */}
      {doc > 0 && (
        <div style={{ position: "absolute", left: DOC.x, top: DOC.y, width: DOC.w, height: DOC.h, opacity: clamp(doc * 1.5), transform: `translateY(${(1 - doc) * 30}px) rotate(${mix(4, 1.2, doc)}deg)` }}>
          {[2, 1].map((k) => (
            <div key={k} style={{ position: "absolute", inset: 0, transform: `translate(${k * 9}px, ${k * 9}px)`, background: color.cardShade, boxShadow: shadow.card }} />
          ))}
          <div style={{ position: "absolute", inset: 0, background: color.card, boxShadow: shadow.card, padding: "28px 32px" }}>
            <div style={{ ...text("label"), fontSize: 20, color: color.ink3 }}>DRAFT v0.1 · SEP 26, 2026</div>
            <div style={{ ...text("heading"), fontSize: 38, lineHeight: 1.15, color: color.ink, marginTop: 14 }}>Founding Governance Design</div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 8, width: `${[92, 80, 88, 70, 84][i]}%`, background: color.sheetShade, marginTop: i === 0 ? 30 : 16, borderRadius: 4 }} />
            ))}
          </div>
        </div>
      )}
      <Meta x={DOC.x} y={DOC.y + DOC.h + 30} size={22} c={color.ink2} p={p("draft", 0.4, 0.5)}>
        {gov.pages} pages · {gov.total} decisions
      </Meta>

      {/* The pieces the film will take apart. */}
      {fan > 0 && (
        <div style={{ position: "absolute", left: DOC.x - 20, top: DOC.y - 96, width: 560, display: "flex", flexWrap: "wrap", gap: "10px 10px" }}>
          {PIECES.map((s, i) => (
            <span key={s} style={{ transform: `translateY(${(1 - ease.arrive(clamp(fan * 1.6 - i * 0.08))) * 24}px)` }}>
              <Tag p={clamp(fan * 1.6 - i * 0.08)} c={color.ink2} style={{ fontSize: 20 }}>
                {s}
              </Tag>
            </span>
          ))}
        </div>
      )}

      <Stamp x={DOC.x + 60} y={DOC.y + 220} head="PROPOSAL" p={p("notlegal", 0.25)} stack style={{ fontSize: 22 }}>
        to argue with · not a legal document
      </Stamp>
      <Claim kind="design" note="the founders’ draft v0.1 · nothing in it is adopted yet" x={X0} y={CLAIM_Y} p={p("notlegal", 0.3, 0.8)} />
    </Exhibit>
  );
}
