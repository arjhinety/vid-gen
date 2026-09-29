/**
 * If the company pays the lab: four money streams run right to left from the company to the
 * lab, each tagged with what the tax office takes. Dividends are dashed: unsettled. Below:
 * the tax office can reallocate income between the two if prices look off (the crimson
 * idea).
 * Cues: does, rent, royalty, access, divs, realloc.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, useProgress } from "./shared/cast.tsx";
import { Box, Note } from "./shared/boxes.tsx";
import { law } from "./shared/data.ts";
import { CLAIM_Y, CX, TOP, X0, X1 } from "./shared/layout.ts";

const BW = 330;
const AX0 = X1 - BW - 16; // arrows start at the company
const AX1 = X0 + BW + 16; // and end at the lab

export default function MoneyBack() {
  const { p } = useProgress();
  const streams: Array<{ cue: string; name: string; sub: string; tag: string; dashed?: boolean }> = [
    { cue: "rent", name: "rent", sub: "space, computers", tag: "taxed, whatever it’s spent on" },
    { cue: "royalty", name: "royalties", sub: "licensing the lab’s work (if passive)", tag: `${law.royaltyTaxPct}% final tax` },
    { cue: "access", name: "service income", sub: "selling model access", tag: "taxed · stays tied to purpose" },
    { cue: "divs", name: "dividends", sub: "if the lab owns shares", tag: "unsettled: no ruling yet", dashed: true },
  ];
  return (
    <Exhibit from={0}>
      <Box x={X0} y={TOP + 10} w={BW} h={440} kicker="THE LAB" title="non-profit" p={p("does", 0.4, -0.2)} />
      <Box x={X1 - BW} y={TOP + 10} w={BW} h={440} kicker="THE COMPANY" title="doing well" dashed p={p("does", 0.4, 0.2)} />

      {streams.map((s, i) => {
        const y = TOP + 90 + i * 100;
        const q = p(s.cue, 0.5);
        if (q <= 0) return null;
        const a = ease.arrive(clamp(q));
        return (
          <div key={s.cue}>
            <Arrow points={[[AX0, y + 50], [AX1, y + 50]]} p={q} c={s.dashed ? color.ink2 : color.ink} width={3} dashed={s.dashed} />
            <div style={{ position: "absolute", left: AX1 + 20, top: y, display: "flex", alignItems: "baseline", gap: 12, opacity: clamp(a * 1.4) }}>
              <span style={{ ...text("data"), fontSize: 28, color: color.ink }}>{s.name}</span>
              <span style={{ ...text("meta"), fontSize: 20, color: color.ink3 }}>{s.sub}</span>
            </div>
            <div style={{ position: "absolute", right: 1920 - AX0 + 10, top: y + 4 }}>
              <Tag p={p(s.cue, 0.4, 0.6)} c={s.dashed ? color.ink2 : color.ink} style={{ fontSize: 20, padding: "3px 10px" }}>
                {s.tag}
              </Tag>
            </div>
          </div>
        );
      })}

      {/* The tax office can reallocate. */}
      <Bean who="outsider" x={CX - 330} y={TOP + 610} size={78} mood="flat" mark="?" markP={p("realloc", 0.3, 0.4)} holds="doc" holdP={p("realloc", 0.4, 0.2)} name="the tax office" p={p("realloc", 0.4)} />
      <Note x={CX - 230} y={TOP + 500} w={760} p={p("realloc", 0.4, 0.5)} c={color.red} size={26} weight={600}>
        prices between the two look off? it can reallocate income between them
      </Note>
      <Note x={CX - 230} y={TOP + 572} w={760} p={p("realloc", 0.4, 1.0)} size={20} c={color.ink3}>
        the tax code, Sec. 50: same owners, two organisations
      </Note>

      <Claim kind="author-interpretation" note="research on the tax code, court cases and RMO 38-2019 · not legal advice" x={X0} y={CLAIM_Y} p={p("realloc", 0.3, 1.4)} />
    </Exhibit>
  );
}
