/**
 * Could the lab do the same here? Three versions as three columns. 1: the lab becomes a
 * company: the arrow is crossed out and stamped NO (the crimson idea), then "dissolve first",
 * with the assets going to similar non-profits. 2: the lab owns a company: allowed, behind
 * gates (votes, purpose, tax, the exemption). 3: a separate company beside the lab: the
 * draft's own picture.
 * Cues: same, convert, no, dissolve, owns, twothirds, incidental, taxed, revoked, sister.
 */
import type { ReactNode } from "react";
import { color, text } from "@vid/design";
import { Claim, Exhibit, Stamp } from "@vid/kit";
import { clamp, ease } from "@vid/motion";
import { Arrow, Bean, DocTag, FOUNDERS, useProgress } from "./shared/cast.tsx";
import { law } from "./shared/data.ts";
import { CLAIM_Y, TOP, X0 } from "./shared/layout.ts";

const W = 520;
const GAP = 40;
const cx = (i: number) => X0 + i * (W + GAP);

export default function HereThree() {
  const { p } = useProgress();
  const no = p("no", 0.35);
  return (
    <Exhibit from={0}>
      {/* 1 · The lab becomes a company. */}
      <Column i={0} p={p("convert", 0.4, -0.2)} title="the lab becomes a company">
        <MiniBox x={cx(0) + 24} y={TOP + 150} kicker="THE LAB" title="non-stock" p={p("convert", 0.4, 0.2)} />
        <MiniBox x={cx(0) + 296} y={TOP + 150} kicker="BECOMES" title="stock company" dashed p={p("convert", 0.4, 0.5)} />
        <Arrow points={[[cx(0) + 228, TOP + 195], [cx(0) + 290, TOP + 195]]} p={p("convert", 0.4, 0.4)} c={color.ink} />
        {no > 0 && (
          <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <path d={`M ${cx(0) + 238} ${TOP + 175} L ${cx(0) + 280} ${TOP + 215} M ${cx(0) + 280} ${TOP + 175} L ${cx(0) + 238} ${TOP + 215}`} stroke={color.red} strokeWidth={6} strokeLinecap="round" opacity={ease.arrive(no)} />
          </svg>
        )}
        <Stamp x={cx(0) + 60} y={TOP + 262} head="NO" p={no}>
          not by amending the papers
        </Stamp>
        <Note x={cx(0) + 28} y={TOP + 340} p={p("no", 0.4, 0.8)}>
          the SEC’s view: a non-stock corporation can’t turn into a stock one by amendment
        </Note>
        <Note x={cx(0) + 28} y={TOP + 450} p={p("dissolve", 0.4)} c={color.ink} size={26}>
          it would have to dissolve first
        </Note>
        <Note x={cx(0) + 28} y={TOP + 494} p={p("dissolve", 0.4, 0.9)}>
          and its assets go to similar non-profits, not to the founders
        </Note>
      </Column>

      {/* 2 · The lab owns a company. */}
      <Column i={1} p={p("owns", 0.4, -0.2)} title="the lab owns a company">
        <MiniBox x={cx(1) + 160} y={TOP + 130} kicker="THE LAB" title="non-stock" p={p("owns", 0.4, 0.2)} />
        <Arrow points={[[cx(1) + 260, TOP + 224], [cx(1) + 260, TOP + 270]]} p={p("owns", 0.4, 0.5)} c={color.ink} />
        <div style={{ position: "absolute", left: cx(1) + 278, top: TOP + 234, ...text("meta"), fontSize: 20, color: color.ink2, opacity: ease.arrive(p("owns", 0.4, 0.6)) }}>owns shares</div>
        <MiniBox x={cx(1) + 160} y={TOP + 276} kicker="A COMPANY" title="for-profit" dashed p={p("owns", 0.4, 0.7)} />
        <Gate y={TOP + 390} p={p("twothirds", 0.4)}>{`needs the Board + ${law.investMembers} of members`}</Gate>
        <Gate y={TOP + 430} p={p("incidental", 0.4)}>business tied to the lab’s purpose</Gate>
        <Gate y={TOP + 470} p={p("taxed", 0.4)}>its business income is taxed</Gate>
        <Gate y={TOP + 510} p={p("revoked", 0.4)}>
          if for-profit work becomes a substantial part: exemption revoked, back to the date of the change
        </Gate>
      </Column>

      {/* 3 · A separate company beside the lab. */}
      <Column i={2} p={p("sister", 0.4, -0.2)} title="a separate company beside the lab">
        <MiniBox x={cx(2) + 24} y={TOP + 150} kicker="THE LAB" title="non-stock" p={p("sister", 0.4, 0.2)} />
        <MiniBox x={cx(2) + 296} y={TOP + 150} kicker="FOUNDER-OWNED" title="a company" dashed p={p("sister", 0.4, 0.4)} />
        {FOUNDERS.map((w, k) => (
          <Bean key={w} who={w} x={cx(2) + 140 + k * 120} y={TOP + 420} size={78} p={p("sister", 0.4, 0.7 + k * 0.1)} />
        ))}
        <DocTag x={cx(2) + 28} y={TOP + 500} p={p("sister", 0.3, 1.4)}>
          {"THE DRAFT’S PICTURE · §9"}
        </DocTag>
        <Note x={cx(2) + 28} y={TOP + 548} p={p("sister", 0.4, 1.0)}>
          separate, with no right to the lab’s things
        </Note>
      </Column>

      <Claim kind="author-interpretation" note="research on SEC opinions, the Corporation Code, tax rules · not legal advice" x={X0} y={CLAIM_Y} p={p("sister", 0.3, 1.8)} />
    </Exhibit>
  );
}

function Column({ i, p, title, children }: { i: number; p: number; title: string; children: ReactNode }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <>
      <div style={{ position: "absolute", left: cx(i), top: TOP + 10, width: W, height: 610, border: `2px solid ${color.hairline}`, borderRadius: 18, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 10}px)` }}>
        <div style={{ position: "absolute", left: 28, top: 20, ...text("label"), fontSize: 20, color: color.ink3 }}>{`VERSION ${i + 1}`}</div>
        <div style={{ position: "absolute", left: 28, right: 24, top: 54, ...text("heading"), fontSize: 32, lineHeight: 1.15, color: color.ink }}>{title}</div>
      </div>
      {children}
    </>
  );
}

function MiniBox({ x, y, kicker, title, p, dashed = false }: { x: number; y: number; kicker: string; title: string; p: number; dashed?: boolean }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 200, height: 90, boxSizing: "border-box", borderRadius: 14, background: color.card, border: dashed ? `2.5px dashed ${color.ink2}` : `2.5px solid ${color.ink}`, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 8}px)` }}>
      <div style={{ position: "absolute", left: 14, top: 12, ...text("label"), fontSize: 20, color: color.ink3 }}>{kicker}</div>
      <div style={{ position: "absolute", left: 14, top: 44, ...text("data"), fontSize: 24, color: color.ink, whiteSpace: "nowrap" }}>{title}</div>
    </div>
  );
}

function Note({ x, y, p, children, c = color.ink2, size = 24 }: { x: number; y: number; p: number; children: string; c?: string; size?: number }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return <div style={{ position: "absolute", left: x, top: y, width: W - 56, ...text(size > 24 ? "data" : "body"), fontSize: size, lineHeight: 1.3, color: c, opacity: clamp(a * 1.4), transform: `translateY(${(1 - a) * 6}px)` }}>{children}</div>;
}

/** One gate on version two: a small square and the condition. */
function Gate({ y, p, children }: { y: number; p: number; children: string }) {
  if (p <= 0) return null;
  const a = ease.arrive(clamp(p));
  return (
    <div style={{ position: "absolute", left: cx(1) + 28, top: y, width: W - 56, display: "flex", gap: 12, opacity: clamp(a * 1.4), transform: `translateX(${(1 - a) * -8}px)` }}>
      <div style={{ flex: "none", width: 14, height: 14, marginTop: 7, border: `2.5px solid ${color.ink}`, borderRadius: 3 }} />
      <div style={{ ...text("body"), fontSize: 23, lineHeight: 1.3, color: color.ink }}>{children}</div>
    </div>
  );
}
