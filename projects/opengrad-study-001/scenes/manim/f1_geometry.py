"""F1 as geometry: precision, recall, and the harmonic mean's iso-F1 contours.

Cues: f1, prec, rec, harm, b0, m0, m1. All numbers are read from data/study001.json
(extracted from OpenGrad's committed artifacts). Rendered as a transparent exhibit over
the shared sheet: design area x 140-1780, y 236-940 (below the question line).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from manim import (
    AnimationGroup,
    Circle,
    Create,
    DashedLine,
    Dot,
    FadeIn,
    Line,
    ParametricFunction,
    Rectangle,
    TracedPath,
    VGroup,
    VMobject,
    Write,
)

from ogmanim import C, DOWN, LEFT, RIGHT, UP, OGScene, dur, math, px, rate, text

DATA = json.loads((Path(__file__).resolve().parents[2] / "data" / "study001.json").read_text(encoding="utf-8"))
R = {k: DATA["routing"][k]["v"] for k in ("B0", "M0", "M1v2")}
CM = R["B0"]["confusion"]
TP = CM["CALL"]["CALL"]
PRED_CALL = sum(CM[g]["CALL"] for g in CM)
GOLD_CALL = sum(CM["CALL"].values())

# Plot square in design pixels: recall on x, precision on y.
X0, Y0, S = 1200, 890, 520  # bottom-left corner and side length


def P(recall: float, precision: float):
    return px(X0 + recall * S, Y0 - precision * S)


def iso_f1(f: float, color: str | None = None, width: float = 2):
    # F1 = 2PR/(P+R)  ->  P = f R / (2R - f), valid for R > f/2 and P <= 1.
    r0 = f / (2 - f)  # where P = 1
    return ParametricFunction(lambda t: P(t, f * t / (2 * t - f)), t_range=[r0, 1.0, 0.004], color=color or C["hairline"], stroke_width=width)


class F1Geometry(OGScene):
    def construct(self):
        # Axes and grid.
        frame = Rectangle(width=px(S), height=px(S), color=C["ink2"], stroke_width=2).move_to(P(0.5, 0.5))
        grid = VGroup(
            *[Line(P(v, 0), P(v, 1), color=C["gridMajor"], stroke_width=1.2) for v in (0.25, 0.5, 0.75)],
            *[Line(P(0, v), P(1, v), color=C["gridMajor"], stroke_width=1.2) for v in (0.25, 0.5, 0.75)],
        )
        xl = text("recall", "meta", color=C["ink2"]).next_to(P(0.5, 0), DOWN, buff=px(30))
        yl = text("precision", "meta", color=C["ink2"]).rotate(np.pi / 2).next_to(P(0, 0.72), LEFT, buff=px(30))
        ticks = VGroup(
            *[text(s, "meta", color=C["ink3"]).scale(0.85).next_to(P(v, 0), DOWN, buff=px(6)) for v, s in ((0, "0"), (0.5, "0.5"), (1, "1"))],
            *[text(s, "meta", color=C["ink3"]).scale(0.85).next_to(P(0, v), LEFT, buff=px(8)) for v, s in ((0.5, "0.5"), (1, "1"))],
        )
        head = self.label("Tool calls · the held-out set", "1,277 requests · one training run", x=140, y=300)

        self.wait_until("f1", -0.3)
        self.play(FadeIn(head, shift=RIGHT * px(8)), Create(frame, rate_func=rate("settle")), FadeIn(grid), run_time=dur("settle") * 1.4)
        self.play(FadeIn(xl, shift=UP * 0.1), FadeIn(yl), FadeIn(ticks), run_time=dur("arrive"))

        # Precision and recall, derived from the base model's counts.
        prec = math(f'{{{{ "precision" : lbl }}}} = frac({TP}, {PRED_CALL}) = {R["B0"]["call_precision"]:.2f}', size_px=40).move_to(px(160, 470), aligned_edge=LEFT)
        rec = math(f'{{{{ "recall" : lbl }}}} = frac({TP}, {GOLD_CALL}) = {R["B0"]["call_recall"]:.2f}', size_px=40).move_to(px(160, 600), aligned_edge=LEFT)
        pcap = text("of the tools it called, how many were right", "meta", color=C["ink3"]).next_to(prec, DOWN, buff=px(10), aligned_edge=LEFT)
        rcap = text("of the calls it should have made, how many it made", "meta", color=C["ink3"]).next_to(rec, DOWN, buff=px(10), aligned_edge=LEFT)
        self.wait_until("prec")
        self.play(Write(prec, rate_func=rate("arrive")), FadeIn(pcap, shift=UP * 0.05), run_time=dur("arrive") * 2)
        self.wait_until("rec")
        self.play(Write(rec, rate_func=rate("arrive")), FadeIn(rcap, shift=UP * 0.05), run_time=dur("arrive") * 2)

        # Harmonic mean and its contours.
        f1 = math("F_1 = frac(2 P R, P + R)", size_px=46).move_to(px(160, 740), aligned_edge=LEFT)
        levels = (0.5, 0.6, 0.7, 0.8, 0.9)
        curves = VGroup(*[iso_f1(f) for f in levels])
        labels = VGroup(*[text(f"{f:.1f}", "meta", color=C["ink3"]).scale(0.8).next_to(P(1.0, f / (2 - f)), RIGHT, buff=px(8)) for f in levels])
        self.wait_until("harm")
        self.play(Write(f1), run_time=dur("arrive") * 2)
        self.play(AnimationGroup(*[Create(c) for c in curves], lag_ratio=0.15), FadeIn(labels), run_time=dur("glide") * 1.8, rate_func=rate("settle"))

        # Base model: near-perfect recall, poor precision.
        b0 = R["B0"]
        b0_dot = Dot(P(b0["call_recall"], b0["call_precision"]), radius=px(9), color=C["neutral"])
        b0_curve = iso_f1(b0["call_f1"], C["neutral"], 3)
        b0_lab = text(f"base  F1 {b0['call_f1']:.3f}", "meta", color=C["neutral"]).next_to(b0_dot, DOWN + LEFT, buff=px(10))
        drop = DashedLine(P(b0["call_recall"], b0["call_precision"]), P(b0["call_recall"], 0), color=C["neutral"], stroke_width=1.5, dash_length=px(8))
        self.wait_until("b0")
        self.play(FadeIn(b0_dot, scale=1.6, rate_func=rate("arrive")), Create(b0_curve), run_time=dur("arrive") * 2)
        self.play(FadeIn(b0_lab, shift=UP * 0.05), Create(drop), run_time=dur("arrive"))

        # Fine-tuning: recall traded for precision, onto a better contour.
        m0 = R["M0"]
        mover = b0_dot.copy().set_color(C["ink"])
        trail = TracedPath(mover.get_center, stroke_color=C["ink"], stroke_width=3, stroke_opacity=0.7)
        self.add(trail)
        m0_curve = iso_f1(m0["call_f1"], C["ink"], 3)
        m0_lab = text(f"M0 · SFT  F1 {m0['call_f1']:.3f}", "meta", color=C["ink"]).next_to(P(m0["call_recall"], m0["call_precision"]), LEFT, buff=px(40)).shift(DOWN * px(26))
        self.wait_until("m0")
        self.play(mover.animate.move_to(P(m0["call_recall"], m0["call_precision"])), run_time=dur("glide") * 1.6, rate_func=rate("glide"))
        self.play(Create(m0_curve), FadeIn(m0_lab, shift=UP * 0.05), b0_curve.animate.set_stroke(opacity=0.35), run_time=dur("arrive") * 1.6)

        # DPO: magnify the tiny step (8x), with the two contours it moves between.
        m1 = R["M1v2"]
        m0c = np.array([m0["call_recall"], m0["call_precision"]])
        m1c = np.array([m1["call_recall"], m1["call_precision"]])
        mid = (m0c + m1c) / 2
        ring = Circle(radius=px(30), color=C["red"], stroke_width=2.5).move_to(mover.get_center())
        inset_c = px(900, 490)
        iw, ih = 280, 180
        inset = Rectangle(width=px(iw), height=px(ih), color=C["ink"], stroke_width=2, fill_color=C["card"], fill_opacity=1).move_to(inset_c)
        k = 8.0

        def I(r, p):
            return inset_c + (P(r, p) - P(*mid)) * k

        span = (iw / 2 - 12) / (S * k)

        def inset_curve(f, colr, width):
            ts = np.linspace(mid[0] - span, mid[0] + span, 60)
            pts = [I(t, f * t / (2 * t - f)) for t in ts]
            pts = [q for q in pts if abs(q[1] - inset_c[1]) < px(ih / 2 - 8)]
            v = VMobject(color=colr, stroke_width=width)
            v.set_points_smoothly(pts)
            return v

        ic0 = inset_curve(m0["call_f1"], C["ink"], 2)
        ic1 = inset_curve(m1["call_f1"], C["ink"], 2).set_stroke(opacity=0.45)
        im0 = Dot(I(*m0c), radius=px(7), color=C["ink"])
        im1 = Dot(I(*m1c), radius=px(7), color=C["card"], stroke_width=3, stroke_color=C["ink"])
        arrow = Line(im0.get_center(), im1.get_center(), color=C["ink"], stroke_width=2.5, buff=px(10))
        ilab = text(f"M1-v2 · DPO  F1 {m1['call_f1']:.4f}", "meta", color=C["ink"]).next_to(inset, UP, buff=px(8), aligned_edge=LEFT)
        idelta = text(f"+{m1['call_f1'] - m0['call_f1']:.4f} · 8x magnified", "meta", color=C["red"]).next_to(inset, DOWN, buff=px(8), aligned_edge=LEFT)
        link = DashedLine(ring.get_left(), inset.get_right(), color=C["ink3"], stroke_width=1.2, dash_length=px(6))
        self.wait_until("m1")
        k_t = self.fit(dur("arrive") * 3.6 + dur("travel") + 0.6)
        self.play(Create(ring), run_time=dur("arrive") * k_t)
        self.play(FadeIn(inset), Create(link), run_time=dur("travel") * k_t)
        self.play(Create(ic0), Create(ic1), FadeIn(im0), run_time=dur("arrive") * k_t)
        self.play(FadeIn(im1, scale=1.4), Create(arrow), FadeIn(ilab, shift=UP * 0.05), FadeIn(idelta), run_time=dur("arrive") * 1.6 * k_t, rate_func=rate("arrive"))
        self.play(FadeIn(self.provenance("measured", "the study's own held-out scores"), shift=UP * 0.03), run_time=dur("arrive") * k_t)
        self.finish()
