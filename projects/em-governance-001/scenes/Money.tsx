/**
 * Money. (A) A coin jar that belongs to the corporation; the arrows to the founders'
 * pockets are crossed out (the crimson idea); the pay and payment rules tick in. (B) If a
 * founder is ever paid: four steps in order (the hat comes off before the job starts);
 * a future company stays behind a wall.
 * Cues: coin, div, unpaidT, ownpay, someone, twopeople, paid, merit, tax, leaveboard,
 * sameterms, company.
 */
import { color, text } from "@vid/design";
import { Checkbox, Claim, Cross, Exhibit, Label, Term } from "@vid/kit";
import { clamp, ease, useScene, useSceneFrame } from "@vid/motion";
import { Arrow, Bean, DocTag, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { CLAIM_Y, TOP, X0, X1 } from "./shared/layout.ts";

const JAR = { x: X0 + 20, y: TOP + 110, w: 300, h: 330 };

export default function Money() {
  const { p } = useProgress();
  return (
    <>
      <Exhibit from={0} until="line:b21#0">
        <Jar p={p("coin", 0.5)} />
        <Term x={JAR.x - 20} y={JAR.y + JAR.h + 24} def="not any person’s" p={p("coin", 1.0, 0.6)} size={30}>
          the corporation’s
        </Term>
        {FOUNDERS.map((w, i) => (
          <Bean key={w} who={w} x={1330 + i * 170} y={TOP + 250} size={100} p={p("coin", 0.5, 0.3 + i * 0.1)} mood={p("div", 0.1) > 0 ? "flat" : "smile"} />
        ))}
        <Arrow points={[[JAR.x + JAR.w + 20, JAR.y + 60], [1240, TOP + 180]]} p={p("div", 0.6)} c={color.red} dashed />
        <Cross x={(JAR.x + JAR.w + 1260) / 2} y={(JAR.y + 60 + TOP + 180) / 2} size={40} p={p("div", 0.25, 0.5)} />

        {[
          ["no dividends, no sharing the surplus", "div"],
          ["trustees: no pay while serving", "trusteepay"],
          ["nobody sets their own pay", "ownpay"],
          ["expenses: receipts, approved by someone else", "someone"],
          ["bigger payments: two people", "twopeople"],
        ].map(([label, cue], i) => (
          <Checkbox key={label} x={560} y={TOP + 330 + i * 64} label={label} size={28} p={p(cue!, 0.35, -0.2)} tick={p(cue!, 0.4, 0.2)} />
        ))}
        <DocTag x={1280} y={TOP + 560} p={p("twopeople", 0.3, 0.6)}>
          GDR-028 · GDR-030 (threshold OPEN)
        </DocTag>
        <Claim kind="author-interpretation" note="no-dividend and no-inurement rules as the draft reads the law" x={X0} y={CLAIM_Y} p={p("twopeople", 0.3, 0.9)} />
      </Exhibit>

      <Exhibit from="line:b21#0">
        <FounderPay />
      </Exhibit>
    </>
  );
}

function FounderPay() {
  const { p } = useProgress();
  const off = ease.travel(p("leaveboard", 0.6, 0.3));
  const steps: Array<[string, string]> = [
    ["merit", "the job exists on its own merits"],
    ["tax", "tax advice first"],
    ["leaveboard", "leave the Board before the job starts"],
    ["sameterms", "same pay band as anyone else"],
  ];
  return (
    <>
      <Label x={X0} y={TOP + 20} p={p("paid", 0.3)} sub="neither promised nor forbidden">
        IF A FOUNDER IS EVER PAID · IN THIS ORDER
      </Label>
      {steps.map(([cue, s], i) => (
        <div key={cue} style={{ position: "absolute", left: X0, top: TOP + 110 + i * 70, whiteSpace: "nowrap", opacity: ease.arrive(p(cue, 0.35)), transform: `translateY(${(1 - ease.arrive(p(cue, 0.35))) * 6}px)` }}>
          <span style={{ ...text("value"), fontSize: 28, color: color.ink3, marginRight: 18 }}>{i + 1}</span>
          <span style={{ ...text("data"), fontWeight: 500, fontSize: 32, color: color.ink }}>{s}</span>
        </div>
      ))}
      <div style={{ position: "absolute", left: X0 + 44, top: TOP + 395, ...text("meta"), fontSize: 20, color: color.ink3, opacity: ease.arrive(p("sameterms", 0.3, 0.8)) }}>
        then: disclose and recuse · tell the BIR if the lab holds a tax exemption
      </div>
      <Bean who="plain" x={1080} y={TOP + 330} size={130} name="a founder" p={p("paid", 0.5, 0.3)} hat={off < 1 ? "trustee" : null} hatP={1 - off} mood={p("sameterms", 0.1) > 0 ? "open" : "smile"} mark="?" markP={p("paid", 0.4, 0.6) * (1 - p("merit", 0.3))} />
      <DocTag x={1260} y={TOP + 120} p={p("paid", 0.3, 0.8)}>
        DEFERRED · GDR-022
      </DocTag>

      {/* A future company stays separate. */}
      <Wall p={p("company", 0.5)} />
      <Claim kind="design" note="separate-company principle, PROVISIONAL (GDR-023)" x={X0} y={CLAIM_Y} p={p("company", 0.3, 1.2)} />
    </>
  );
}

function Wall({ p }: { p: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const y = TOP + 470;
  const box = (x: number, kicker: string, title: string, dashed = false) => (
    <div style={{ position: "absolute", left: x, top: y, width: 460, height: 150, background: color.card, border: `2.5px ${dashed ? "dashed" : "solid"} ${color.ink}`, borderRadius: 14 }}>
      <div style={{ position: "absolute", left: 20, top: 16, ...text("label"), fontSize: 18, color: color.ink3 }}>{kicker}</div>
      <div style={{ position: "absolute", left: 20, top: 48, ...text("data"), fontSize: 30, color: color.ink }}>{title}</div>
    </div>
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 10}px)` }}>
      {box(X0 + 500, "NON-PROFIT", "Experimental Machines")}
      {box(X1 - 460, "SEPARATE, IF EVER", "a founders’ company", true)}
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <line x1={1270} y1={y - 20} x2={1270} y2={y + 170} stroke={color.red} strokeWidth={5} strokeDasharray="12 8" />
      </svg>
      <div style={{ position: "absolute", left: X0, top: y + 10, width: 470, ...text("body"), fontSize: 24, lineHeight: 1.3, color: color.ink2 }}>
        no claim on the lab’s money, compute, data, models or code; every deal between them gets a conflict review
      </div>
    </div>
  );
}

/** A glass jar of coins, labelled for the corporation. */
function Jar({ p }: { p: number }) {
  const f = useSceneFrame();
  const { fps } = useScene();
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  const t = f / fps;
  const coins = [
    [70, 280], [130, 285], [190, 282], [245, 278], [100, 250], [160, 252], [220, 248], [130, 220], [190, 222], [160, 192],
  ];
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", opacity: clamp(a * 1.4) }}>
      <g transform={`translate(${JAR.x} ${JAR.y + (1 - a) * 12})`}>
        <rect x={60} y={0} width={180} height={30} rx={8} fill={color.ink} />
        <path d={`M 40 36 Q 20 60 20 110 L 20 290 Q 20 320 50 320 L 250 320 Q 280 320 280 290 L 280 110 Q 280 60 260 36 Z`} fill={color.card} stroke={color.ink} strokeWidth={3} />
        {coins.map(([cx, cy], i) => (
          <g key={i} transform={`translate(${cx} ${cy! + Math.sin(t * 2 + i) * 0.8})`}>
            <ellipse rx={26} ry={12} fill={color.cardShade} stroke={color.ink} strokeWidth={2.4} />
            <ellipse rx={15} ry={6} fill="none" stroke={color.ink2} strokeWidth={1.6} />
          </g>
        ))}
        <rect x={70} y={96} width={160} height={52} rx={6} fill={color.sheet} stroke={color.ink} strokeWidth={2} />
        <text x={150} y={129} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight={500} fontSize={20} fill={color.ink}>
          THE LAB
        </text>
      </g>
    </svg>
  );
}
