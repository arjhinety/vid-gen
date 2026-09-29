"""The refusal basin: this film's metaphor, flagged as such for the whole scene.

Storyboard §9. Cues: basin, roll, tilt, out (plus line:b14#0 / line:b14#2).
The landscape is not data. The only number on screen (8-shot refusals) is read from
data/study001.json and tagged as measured.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from manim import (
    AnimationGroup,
    Circle,
    Create,
    DashedVMobject,
    FadeIn,
    FadeOut,
    Line,
    Polygon,
    RoundedRectangle,
    ValueTracker,
    VGroup,
    VMobject,
    always_redraw,
)

from ogmanim import C, DOWN, LEFT, RIGHT, UP, OGScene, claim_glyph, dur, px, rate, text

DATA = json.loads((Path(__file__).resolve().parents[2] / "data" / "study001.json").read_text(encoding="utf-8"))
FEW = DATA["capability"]["M1v2"]["v"]["gsm8k_8shot"]

# Landscape in design pixels: u in [0, 1] spans X0..X1; height V in [0, 1] rises from BASE.
X0, X1, BASE, H, FLOOR = 200, 1720, 880, 470, 920
U_BASIN, U_ANSWER, U_STACK = 0.34, 0.74, 0.1
SLAB_W, SLAB_H, SLAB_GAP = 92, 9, 2.5
N_EXAMPLES = 8


def height(u, b: float, s: float):
    """Ground height. b: how far the refusal basin has sunk in (0..1). s: the tilt toward answer (0..1)."""
    basin = 0.60 * b * (1 - 0.92 * s) * np.exp(-(((u - U_BASIN) / 0.095) ** 2))
    answer = (0.35 + 0.10 * s) * np.exp(-(((u - U_ANSWER) / 0.11) ** 2))
    return 0.70 - basin - answer + 0.5 * s * (0.5 - u)


def ground(u, b, s):
    return px(X0 + u * (X1 - X0), BASE - H * height(u, b, s))


def frame_at(u, b, s):
    """Unit tangent and upward normal of the ground at u."""
    e = 1e-3
    d = ground(u + e, b, s) - ground(u - e, b, s)
    t = d / np.linalg.norm(d)
    return t, np.array([-t[1], t[0], 0.0])


def valley(b: float, s: float, lo: float, hi: float) -> float:
    us = np.linspace(lo, hi, 400)
    return float(us[np.argmin(height(us, b, s))])


class RefusalBasin(OGScene):
    def construct(self):
        b, s = ValueTracker(0.0), ValueTracker(0.0)
        st = lambda: (b.get_value(), s.get_value())  # noqa: E731

        # The flag stays up for the whole scene.
        flag_txt = text("not measured · a metaphor, not a mechanism", "meta", color=C["ink2"])
        flag = VGroup(claim_glyph("speculation", C["ink2"]), flag_txt).arrange(RIGHT, buff=px(10))
        box = DashedVMobject(
            RoundedRectangle(width=flag.width + px(32), height=flag.height + px(20), corner_radius=px(2), color=C["ink2"], stroke_width=1.5),
            num_dashes=60,
        ).move_to(flag)
        flag_g = VGroup(box, flag).move_to(px(1780, 350), aligned_edge=RIGHT)

        # Ground: a cross-section on paper, redrawn from the trackers once it exists.
        def curve_pts():
            return [ground(u, *st()) for u in np.linspace(0, 1, 260)]

        def make_line():
            v = VMobject(stroke_color=C["ink"], stroke_width=3.5)
            v.set_points_as_corners(curve_pts())
            return v

        def make_fill():
            pts = curve_pts()
            v = VMobject(stroke_width=0, fill_color=C["sheetShade"], fill_opacity=0.85)
            v.set_points_as_corners([*pts, px(X1, FLOOR), px(X0, FLOOR), pts[0]])
            return v

        floor = Line(px(X0 - 40, FLOOR), px(X1 + 40, FLOOR), color=C["ink2"], stroke_width=1.5)
        line0, fill0 = make_line(), make_fill()
        colors = {"refuse": C["red"], "answer": C["ink3"]}
        answer_lab = always_redraw(lambda: text("answer", "label", color=colors["answer"]).scale(0.9).move_to(ground(valley(*st(), 0.6, 0.9), *st()) + DOWN * px(44)))
        # The refuse label fades with its basin, so it never floats over flat ground.
        refuse_lab = always_redraw(
            lambda: text("refuse", "label", color=colors["refuse"]).scale(0.9).set_opacity(1 - 0.8 * s.get_value()).move_to(ground(U_BASIN, *st()) + DOWN * px(44))
        )

        self.wait_until("line:b14#0", 0.1)
        self.play(FadeIn(flag_g, shift=RIGHT * px(12)), run_time=dur("arrive"), rate_func=rate("arrive"))
        self.play(FadeIn(floor), FadeIn(fill0), Create(line0), run_time=dur("glide") * 1.3, rate_func=rate("settle"))
        self.remove(line0, fill0)
        self.add(always_redraw(make_fill), always_redraw(make_line))
        self.play(FadeIn(answer_lab, shift=UP * px(8)), run_time=dur("arrive"))

        # "Refusal became a basin": the ground gives way.
        self.wait_until("basin", -0.15)
        k = self.fit(dur("glide") * 1.2 + dur("arrive") * 2, margin=0.1, until="roll")
        self.play(b.animate.set_value(1.0), run_time=dur("glide") * 1.2 * k, rate_func=rate("settle"))
        self.play(FadeIn(refuse_lab, shift=UP * px(8)), run_time=dur("arrive") * k)

        # The bare question, on the rim.
        u = ValueTracker(0.04)
        R_BALL = 20

        def make_ball():
            _, n = frame_at(u.get_value(), *st())
            return Circle(radius=px(R_BALL), color=C["ink"], fill_opacity=1, stroke_width=0).move_to(ground(u.get_value(), *st()) + n * px(R_BALL))

        ball = always_redraw(make_ball)
        qlab = text("a bare question", "caption", color=C["ink2"]).scale(0.9)
        qlab.add_updater(lambda m: m.next_to(ball, UP, buff=px(14)))
        self.play(FadeIn(ball, scale=0.6), FadeIn(qlab), run_time=dur("arrive") * k, rate_func=rate("arrive"))

        self.wait_until("roll")
        self.play(u.animate.set_value(valley(1.0, 0.0, 0.2, 0.5)), FadeOut(qlab, run_time=dur("exit")), run_time=dur("glide") * 1.5, rate_func=rate("travel"))
        qlab.clear_updaters()
        self.remove(qlab)

        # Worked examples: a stack of eight slabs on the left rim; they ride the ground as it tilts.
        rng = np.random.default_rng(8)
        jitter = rng.uniform(-7, 7, N_EXAMPLES)
        drops = [ValueTracker(0.0) for _ in range(N_EXAMPLES)]

        def make_slab(i):
            def f():
                d = drops[i].get_value()
                t, n = frame_at(U_STACK, *st())
                c = ground(U_STACK, *st()) + n * px(SLAB_H / 2 + 1 + i * (SLAB_H + SLAB_GAP)) + t * px(jitter[i])
                hw, hh = t * px(SLAB_W / 2), n * px(SLAB_H / 2)
                slab = Polygon(c - hw - hh, c + hw - hh, c + hw + hh, c - hw + hh, color=C["ink"] if i == N_EXAMPLES - 1 else C["ink2"], stroke_width=1.2, fill_color=C["card"], fill_opacity=1)
                slab.shift(UP * px(70) * (1 - d))
                slab.set_opacity(min(1.0, d * 1.6))
                return slab

            return always_redraw(f)

        slabs = [make_slab(i) for i in range(N_EXAMPLES)]
        self.add(*slabs)

        # Label and the one measured fact the metaphor stands in for, beside the stack.
        # Same grammar as the web Label + Claim: mono caps head, then glyph · CLASS · fact.
        ex_lab = VGroup(
            text(f"{N_EXAMPLES} worked examples · in the prompt", "label", color=C["ink"]),
            VGroup(
                claim_glyph("measured", C["ink"], r_px=6),
                text("MEASURED", "meta", color=C["ink"]),
                text(f"· with them, M1-v2 refused {FEW['refusals']} of {FEW['n']:,}", "meta", color=C["ink2"]),
            ).arrange(RIGHT, buff=px(10)),
        ).arrange(DOWN, buff=px(12), aligned_edge=LEFT)

        def ex_pos(m):
            t, n = frame_at(U_STACK, *st())
            mid = ground(U_STACK, *st()) + n * px(N_EXAMPLES * (SLAB_H + SLAB_GAP) / 2)
            m.move_to(mid + RIGHT * px(SLAB_W / 2 + 36) + UP * px(40), aligned_edge=LEFT)

        ex_pos(ex_lab)
        self.wait_until("line:b14#2", -0.2)
        k = self.fit(dur("arrive") * 2.2, margin=0.05, until="tilt")
        self.play(
            AnimationGroup(*[d.animate(rate_func=rate("arrive")).set_value(1.0) for d in drops], lag_ratio=0.14),
            FadeIn(ex_lab, shift=DOWN * px(6)),
            run_time=dur("arrive") * 2.2 * k,
        )
        ex_lab.add_updater(ex_pos)

        # Tilt: the basin rises, the ground leans toward answer.
        self.wait_until("tilt")
        k = self.fit(dur("glide") * 1.6, margin=0.05, until="out")
        self.play(s.animate.set_value(1.0), run_time=dur("glide") * 1.6 * k, rate_func=rate("glide"))

        # The same question rolls out.
        self.wait_until("out")
        colors["refuse"] = C["ink3"]
        k = self.fit(dur("glide") * 1.6)
        self.play(u.animate.set_value(valley(1.0, 1.0, 0.6, 0.9)), run_time=dur("glide") * 1.6 * k, rate_func=rate("travel"))
        colors["answer"] = C["ink"]

        self.finish()
