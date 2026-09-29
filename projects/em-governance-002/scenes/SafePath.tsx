/**
 * A careful version of the sister company. Top: the lab's open releases on a public shelf,
 * reaching the company on the same terms as anyone. Middle: every deal on paper at fair
 * value, approved by trustees with no stake (Xynil, and one more still to find). Left: the
 * lab stays mostly research (a sketch, not a threshold). Bottom: nobody gets shares of the
 * lab's value (the crimson idea); it stays held in trust for the mission.
 * Cues: careful, open, fairvalue, xyn, mostly, shares (and line:b25#4, "you earn in the company").
 */
import { color, text } from "@vid/design";
import { Claim, Exhibit } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { gov } from "./shared/data.ts";
import { CLAIM_Y, CX, TOP, X0, X1 } from "./shared/layout.ts";

const BOX_W = 400;

export default function SafePath() {
  const { p } = useProgress();
  return (
    <Exhibit from={0}>
      <Box x={X0} kicker="THE LAB" title="non-profit" p={p("careful", 0.4, -0.2)} />
      <Box x={X1 - BOX_W} kicker="FOUNDER-OWNED" title="company" dashed p={p("careful", 0.4, 0.1)} />
      {FOUNDERS.map((w, k) => (
        <Bean key={w} who={w} x={X1 - 330 + k * 130} y={TOP + 330} size={72} p={p("careful", 0.4, 0.4 + k * 0.1)} mood={p("shares", 0.1) > 0 ? "flat" : "smile"} />
      ))}

      {/* Open releases, same terms for anyone. */}
      <Card x={CX - 200} y={TOP + 50} w={400} h={110} kicker="OPEN RELEASES" title="same terms for anyone" p={p("open", 0.4)} />
      <Arrow points={[[X0 + BOX_W + 8, TOP + 100], [CX - 212, TOP + 100]]} p={p("open", 0.4, 0.3)} c={color.ink} />
      <Arrow points={[[CX + 208, TOP + 100], [X1 - BOX_W - 12, TOP + 100]]} p={p("open", 0.4, 0.8)} c={color.ink} />

      {/* Every deal on paper, at fair value, approved by trustees with no stake. */}
      <Card x={CX - 190} y={TOP + 200} w={380} h={110} kicker="EVERY DEAL, WRITTEN DOWN" title="at fair value" p={p("fairvalue", 0.4)} />
      <Arrow points={[[X0 + BOX_W - 20, TOP + 168], [CX - 200, TOP + 250]]} p={p("fairvalue", 0.4, 0.3)} c={color.ink2} dashed head={false} />
      <Arrow points={[[CX + 200, TOP + 250], [X1 - BOX_W + 20, TOP + 168]]} p={p("fairvalue", 0.4, 0.3)} c={color.ink2} dashed head={false} />
      <Bean who="xynil" x={CX - 90} y={TOP + 480} size={80} hat="trustee" holds="vote" holdP={p("xyn", 0.4, 0.3)} p={p("xyn", 0.4)} />
      {(() => {
        const q = p("xyn", 0.4, 0.5);
        if (q <= 0) return null;
        return (
          <div style={{ position: "absolute", left: CX + 90 - 40, top: TOP + 480 - 105, width: 80, height: 100, boxSizing: "border-box", border: `2.5px dashed ${color.ink3}`, borderRadius: 40, display: "flex", alignItems: "center", justifyContent: "center", ...text("data"), fontSize: 30, color: color.ink3, opacity: ease.arrive(q) }}>
            ?
          </div>
        );
      })()}
      <div style={{ position: "absolute", left: CX + 30, top: TOP + 488, width: 120, textAlign: "center", whiteSpace: "nowrap", ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("xyn", 0.4, 0.7)) }}>one more</div>
      <div style={{ position: "absolute", left: CX - 380, width: 760, top: TOP + 530, textAlign: "center", ...text("body"), fontSize: 24, color: color.ink2, opacity: ease.arrive(p("xyn", 0.4, 1.0)) }}>
        {`approved by ${gov.disinterested} trustees with no stake in the company`}
      </div>

      {/* Mostly research (a sketch). */}
      <div style={{ position: "absolute", left: X0, top: TOP + 200, ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("mostly", 0.4)) }}>THE LAB’S WORK</div>
      <WorkBar x={X0} y={TOP + 232} p={p("mostly", 0.6, 0.2)} />
      <div style={{ position: "absolute", left: X0, top: TOP + 290, width: BOX_W, ...text("body"), fontSize: 24, lineHeight: 1.3, color: color.ink, opacity: ease.arrive(p("mostly", 0.4, 0.8)) }}>mostly research, so the tax exemption holds</div>
      <div style={{ position: "absolute", left: X0, top: TOP + 360, ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("mostly", 0.4, 1.2)) }}>a sketch, not a legal threshold</div>

      {/* You earn in the company; no shares of the lab; held in trust. */}
      <div style={{ position: "absolute", left: X1 - BOX_W + 24, top: TOP + 30 + 102, ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("line:b25#4", 0.4)) }}>you earn here</div>
      <div style={{ position: "absolute", left: X1 - BOX_W, top: TOP + 392, width: BOX_W, ...text("data"), fontSize: 26, lineHeight: 1.25, color: color.red, opacity: ease.arrive(p("shares", 0.4)) }}>nobody gets shares of the lab’s value</div>
      <div style={{ position: "absolute", left: X0, top: TOP + 450, width: BOX_W, display: "flex", gap: 14, alignItems: "flex-start", opacity: ease.arrive(p("shares", 0.4, 0.9)) }}>
        <Lock />
        <div style={{ ...text("data"), fontSize: 26, lineHeight: 1.25, color: color.ink }}>held in trust for the mission</div>
      </div>

      <Claim kind="author-interpretation" note="the draft’s §9 rules plus the research · a shape to check with a lawyer" x={X0} y={CLAIM_Y} p={p("shares", 0.3, 1.6)} />
    </Exhibit>
  );
}

function Box({ x, kicker, title, p, dashed = false }: { x: number; kicker: string; title: string; p: number; dashed?: boolean }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: TOP + 30, width: BOX_W, height: 140, boxSizing: "border-box", borderRadius: 18, background: color.card, border: dashed ? `2.5px dashed ${color.ink2}` : `2.5px solid ${color.ink}`, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 8}px)` }}>
      <div style={{ position: "absolute", left: 24, top: 18, ...text("label"), fontSize: 20, color: color.ink3 }}>{kicker}</div>
      <div style={{ position: "absolute", left: 24, top: 54, ...text("heading"), fontSize: 36, color: color.ink }}>{title}</div>
    </div>
  );
}

function Card({ x, y, w, h, kicker, title, p }: { x: number; y: number; w: number; h: number; kicker: string; title: string; p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, boxSizing: "border-box", borderRadius: 14, background: color.card, border: `2px solid ${color.ink}`, textAlign: "center", opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 8}px)` }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 16, ...text("label"), fontSize: 20, color: color.ink3 }}>{kicker}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 50, ...text("data"), fontSize: 30, color: color.ink }}>{title}</div>
    </div>
  );
}

/** The lab's work as one bar: mostly research, a thin sliver of dealings with the company. */
function WorkBar({ x, y, p }: { x: number; y: number; p: number }) {
  if (p <= 0) return null;
  const t = ease.travel(clamp(p));
  const main = BOX_W * 0.88;
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <defs>
        <pattern id="hatch" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={8} stroke={color.ink2} strokeWidth={3} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={main * t} height={36} rx={4} fill={color.ink} />
      {t > 0.9 && <rect x={x + main + 4} y={y} width={(BOX_W - main - 4) * clamp((t - 0.9) * 10)} height={36} rx={4} fill="url(#hatch)" stroke={color.ink2} strokeWidth={2} />}
      {t > 0.3 && (
        <text x={x + 14} y={y + 26} fontFamily="JetBrains Mono" fontSize={20} fill={color.card} opacity={clamp((t - 0.3) * 3)}>
          research
        </text>
      )}
    </svg>
  );
}

function Lock() {
  return (
    <svg width={30} height={36} viewBox="0 0 30 36" style={{ flex: "none", marginTop: 2 }}>
      <path d="M 8 16 V 10 Q 8 3 15 3 Q 22 3 22 10 V 16" fill="none" stroke={color.ink} strokeWidth={3.5} />
      <rect x={3} y={15} width={24} height={19} rx={4} fill={color.ink} />
    </svg>
  );
}
