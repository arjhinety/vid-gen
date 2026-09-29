/**
 * Names and existing assets. "Experimental Intelligence" becomes a program name tag; the
 * asset register as rows, each with its route (move / license / check first). Visual-Qwen's
 * row is the crimson one: other people's rights come first.
 * Cues: ei, program, assets, move, lic, vq.
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit, Label, Tag } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { DocTag, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

// The draft's Existing Research Asset Register (pp.29-30), as observed in Phase 1; every row is OPEN.
const ROWS: Array<{ asset: string; route: string; when: "move" | "lic" | "vq"; red?: boolean }> = [
  { asset: "experimentalmachines.org + email", route: "move to the lab", when: "move" },
  { asset: "GitHub and Hugging Face orgs", route: "lab-controlled admin accounts", when: "move" },
  { asset: "OpenWeights app listing", route: "move to a lab developer account", when: "move" },
  { asset: "OpenGrad · OpenPapers", route: "already covered by Apache-2.0", when: "lic" },
  { asset: "hardware benchmark repos", route: "license first where there’s no licence file", when: "lic" },
  { asset: "Visual-Qwen", route: "", when: "vq", red: true },
];

export default function NamesAssets() {
  const { p } = useProgress();
  return (
    <Exhibit from={0}>
      {/* The name. */}
      <Label x={X0} y={TOP + 20} p={p("ei", 0.3)} sub="a second name, already in use">
        EXPERIMENTAL INTELLIGENCE
      </Label>
      <div style={{ position: "absolute", left: X0, top: TOP + 100, display: "flex", gap: 12, alignItems: "center" }}>
        <Tag p={p("program", 0.35)} c={color.ink} style={{ fontSize: 24, padding: "5px 14px" }}>
          a program name
        </Tag>
        <span style={{ ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("program", 0.3, 0.4)) }}>needs no filing · the draft suggests this</span>
      </div>

      {/* The register. */}
      <Label x={X0} y={TOP + 190} p={p("assets", 0.3)} sub="each row is its own decision">
        THINGS YOU ALREADY MADE
      </Label>
      {ROWS.map((r, i) => {
        const q = r.when === "move" ? p("assets", 0.35, 0.3 + i * 0.3) : r.when === "lic" ? p("assets", 0.35, 1.4 + i * 0.2) : p("vq", 0.35);
        const routeP = r.when === "move" ? p("move", 0.35, i * 0.2) : r.when === "lic" ? p("lic", 0.35, (i - 3) * 0.3) : p("vq", 0.35, 0.6);
        return <Row key={r.asset} y={TOP + 280 + i * 58} asset={r.asset} route={r.red ? `check the ${gov.visualQwenAuthors} thesis authors’ rights, and FEU’s, first` : r.route} p={q} routeP={routeP} red={!!r.red} />;
      })}
      <DocTag x={X0} y={TOP + 640} p={p("vq", 0.3, 1.2)}>
        {"FOUNDER REVIEW 6 and 16 · GDR-008, GDR-025 · every asset OPEN"}
      </DocTag>
      <Claim kind="design" note="each row needs founder confirmation" x={X0 + 700} y={CLAIM_Y + 8} p={p("vq", 0.3, 1.6)} />
    </Exhibit>
  );
}

function Row({ y, asset, route, p, routeP, red }: { y: number; asset: string; route: string; p: number; routeP: number; red: boolean }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const r = ease.arrive(clamp(routeP));
  return (
    <div style={{ position: "absolute", left: X0, top: y, width: 1640, height: 50, borderBottom: `1.5px solid ${color.hairline}`, opacity: clamp(a * 1.4) }}>
      <div style={{ position: "absolute", left: 0, top: 8, ...text("data"), fontWeight: 550, fontSize: 28, color: color.ink }}>{asset}</div>
      <div style={{ position: "absolute", left: 720, top: 12, ...text("meta"), fontSize: 22, color: red ? color.red : color.ink2, opacity: r, whiteSpace: "nowrap" }}>{`→ ${route}`}</div>
    </div>
  );
}
