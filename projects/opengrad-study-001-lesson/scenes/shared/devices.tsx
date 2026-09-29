/**
 * The lesson's interaction devices, drawn on the stage like any exhibit (pure functions of the
 * frame; lesson-local so the pilot's shared packages, and its cache keys, stay untouched).
 *
 * - ThinkRing: the viewer's turn. An ink ring fills over the authored silence after a question,
 *   counting 3 · 2 · 1. It is ink, not red: red on this sheet means failure or refusal.
 * - ChoiceCard: a checkpoint with three answers. At the reveal the right one is ticked and the
 *   others are struck through; the answer is always a claimed result (see the script).
 * - RecapBoard: the closing takeaways, one numbered row per cue.
 */
import type { ReactNode } from "react";
import { color, text } from "@vid/design";
import { Checkbox } from "@vid/kit";
import { clamp, ease, useScene, useSceneFrame } from "@vid/motion";

/** A ring from frame `start` to `end` (the silence the viewer thinks in). */
export function ThinkRing({ x, y, start, end, size = 88, label = "your turn" }: { x: number; y: number; start: number; end: number; size?: number; label?: string }) {
  const f = useSceneFrame();
  const { fps } = useScene();
  const inP = ease.arrive(clamp((f - start + 0.3 * fps) / (0.3 * fps)));
  const outP = ease.arrive(clamp((f - end) / (0.3 * fps)));
  const a = inP * (1 - outP);
  if (a <= 0) return null;
  const fill = clamp((f - start) / Math.max(1, end - start));
  const left = Math.min(3, Math.max(1, Math.ceil(((end - f) / fps) * (3 / Math.max(0.1, (end - start) / fps)))));
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size + 260, height: size, opacity: a, transform: `translateY(${(1 - inP) * 8}px)` }}>
      <svg width={size} height={size} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill={color.card} stroke={color.hairline} strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color.ink} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={`${c * fill} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: "absolute", left: 0, top: 0, width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", ...text("value"), fontSize: 34, color: color.ink }}>
        {f < end ? left : "✓"}
      </div>
      <div style={{ position: "absolute", left: size + 18, top: size / 2 - 14, ...text("label"), color: color.ink3, whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
}

/** Three answers; `reveal` ticks `answer` and strikes the rest. `p` brings the card in. */
export function ChoiceCard({ x, y, w, options, answer, p, reveal }: { x: number; y: number; w: number; options: ReactNode[]; answer: number; p: number; reveal: number }) {
  const a = ease.arrive(clamp(p));
  if (a <= 0) return null;
  const letters = ["A", "B", "C", "D"];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: clamp(a * 1.5), transform: `translateY(${(1 - a) * 12}px)`, background: color.card, boxShadow: "0 1px 0 rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)", padding: "18px 26px 10px" }}>
      <div style={{ ...text("label"), color: color.ink3, marginBottom: 10 }}>CHECKPOINT</div>
      {options.map((o, i) => {
        const right = i === answer;
        const row = clamp(p * 3 - i * 0.6);
        const s = right ? 0 : ease.settle(clamp(reveal));
        // wrong answers are struck in grey, not the kit's red strike: red here means failure
        return (
          <div key={i} style={{ position: "relative", height: 64, opacity: ease.arrive(row) * (1 - 0.4 * s) }}>
            <Checkbox x={0} y={14} size={30} tick={right ? reveal : 0} label={
              <span style={{ ...text("body"), fontSize: 28, color: right && reveal > 0.5 ? color.ink : color.ink2, fontWeight: right && reveal > 0.5 ? 600 : 450,
                backgroundImage: s > 0 ? `linear-gradient(${color.ink3}, ${color.ink3})` : undefined, backgroundRepeat: "no-repeat", backgroundSize: `${s * 100}% 2px`, backgroundPosition: "0 58%" }}>
                <span style={{ ...text("label"), color: color.ink3, marginRight: 12 }}>{letters[i]}</span>{o}
              </span>
            } />
          </div>
        );
      })}
    </div>
  );
}

/** One numbered takeaway row of the recap board. */
export function RecapRow({ x, y, w, n, children, p }: { x: number; y: number; w: number; n: number; children: ReactNode; p: number }) {
  const a = ease.arrive(clamp(p));
  if (a <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, display: "flex", gap: 26, alignItems: "baseline", opacity: clamp(a * 1.5), transform: `translateX(${(1 - a) * -14}px)` }}>
      <div style={{ ...text("display"), fontSize: 64, color: color.ink3, width: 56, flex: "none" }}>{n}</div>
      <div style={{ ...text("title"), fontSize: 40, lineHeight: 1.25, color: color.ink }}>{children}</div>
    </div>
  );
}
