"""House visual language for Manim scenes (Experimental Labs sheet).

Reads the design tokens exported from packages/design (tokens.json), registers the same
fonts, typesets math with Typst in STIX Two Math, converts design pixels (1920x1080) to
Manim units, and locks animation to narration cues from the scene timing JSON written by
the renderer (env VID_SCENE_JSON).

Manim scenes render the exhibit only, on a transparent background (VID_TRANSPARENT=1);
the web renderer draws the shared sheet underneath (grid, breadcrumb, headline) and the
two are composited, so the chrome matches the web scenes on both sides of every cut.

    from ogmanim import OGScene, px, pt, text, math, rate
    class MyScene(OGScene):
        def construct(self):
            self.wait_until("cue-name")
            ...
            self.finish()
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

import manimpango
from manim import (
    DOWN,
    LEFT,
    ORIGIN,
    RIGHT,
    UP,
    Line,
    MathTypst,
    Scene,
    Text,
    VGroup,
    config,
)

REPO = Path(__file__).resolve().parents[4]
DESIGN = REPO / "packages" / "design"
FONTS = DESIGN / "fonts"
TOKENS = json.loads((DESIGN / "tokens.json").read_text(encoding="utf-8"))
C = TOKENS["color"]
PX = 1080 / 8.0  # design pixels per Manim unit (frame height 8 units)

_fonts_ready = False


def setup_fonts() -> None:
    global _fonts_ready
    if _fonts_ready:
        return
    for f in FONTS.glob("*.ttf"):
        manimpango.register_font(str(f))
    _fonts_ready = True


def px(x: float, y: float | None = None):
    """Design pixels -> Manim coordinates (x, y from top-left of the 1920x1080 frame)."""
    import numpy as np

    if y is None:
        return x / PX
    return np.array([(x - 960) / PX, (540 - y) / PX, 0.0])


@lru_cache(maxsize=None)
def _units_per_font_size(family: str) -> float:
    """Calibrate Manim font_size -> em height in units by measuring a cap height."""
    setup_fonts()
    cap = {"Archivo": 0.72, "JetBrains Mono": 0.73}.get(family, 0.7)
    probe = Text("H", font=family, font_size=100)
    return (probe.height / cap) / 100


def pt(size_px: float, family: str = "Archivo") -> float:
    """Manim font_size that renders an em of `size_px` design pixels."""
    return (size_px / PX) / _units_per_font_size(family)


# Pango lays text out on an integer grid at `font_size`, then Manim scales it down, so
# small labels get rounded advances ("8 w orked"). Lay out large and scale back.
OVERSAMPLE = 4


def _text(s: str, family: str, size_px: float, color: str, weight: str = "NORMAL", **kw) -> Text:
    setup_fonts()
    return Text(s, font=family, font_size=pt(size_px, family) * OVERSAMPLE, color=color, weight=weight, **kw).scale(1 / OVERSAMPLE)


def text(s: str, style: str = "body", color: str | None = None, **kw) -> Text:
    """Text in a design-system type style (see packages/design/src/tokens.ts `type`)."""
    t = TOKENS["type"][style]
    weight = "BOLD" if t["weight"] >= 600 else ("MEDIUM" if t["weight"] >= 500 else "NORMAL")
    if t.get("caps"):
        s = s.upper()
    return _text(s, t["family"], t["size"], color or C["ink"], weight, **kw)


MATH_PREAMBLE = '#set text(font: "STIX Two Text", fallback: true)\n#show math.equation: set text(font: "STIX Two Math")'


def math(expr: str, size_px: float = 44, color: str | None = None, **kw) -> MathTypst:
    """Display math via Typst in STIX Two Math. `{{ ... : label }}` groups are selectable."""
    m = MathTypst(expr, typst_preamble=MATH_PREAMBLE, font_paths=[str(FONTS)], color=color or C["ink"], **kw)
    # Scale so that the math axis matches the requested design size (em ~= size_px).
    m.scale_to_fit_height(m.height * (size_px / PX) / max(1e-6, _math_em(m)))
    return m


@lru_cache(maxsize=None)
def _math_em_probe() -> float:
    probe = MathTypst("x", typst_preamble=MATH_PREAMBLE, font_paths=[str(FONTS)])
    return probe.height / 0.45  # x-height of STIX Two Math is ~0.45 em


def _math_em(_m: MathTypst) -> float:
    return _math_em_probe()


# ------------------------------------------------------------------------ easing

def _bezier(x1: float, y1: float, x2: float, y2: float):
    def sx(t):
        return ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t

    def sy(t):
        return ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t

    def f(x: float) -> float:
        if x <= 0:
            return 0.0
        if x >= 1:
            return 1.0
        lo, hi = 0.0, 1.0
        for _ in range(40):
            mid = (lo + hi) / 2
            if sx(mid) < x:
                lo = mid
            else:
                hi = mid
        return sy((lo + hi) / 2)

    return f


def rate(name: str):
    """Manim rate function from the shared easing vocabulary (arrive, settle, travel, glide, exit, slam)."""
    return _bezier(*TOKENS["bezier"][name])


def dur(name: str) -> float:
    """Default duration (seconds) for a motion role, from the measured reference frames."""
    return TOKENS["frames"][name] / 30.0


# ------------------------------------------------------------------------ timing

class Timing:
    def __init__(self, data: dict):
        self.fps: int = data["fps"]
        self.duration_frames: int = data["durationFrames"]
        self.cues: dict[str, dict] = data["cues"]
        self.lang: str = data.get("lang", "en")

    @classmethod
    def load(cls) -> "Timing":
        p = os.environ.get("VID_SCENE_JSON")
        if not p:
            raise RuntimeError("VID_SCENE_JSON is not set; render through `pnpm video scene <project> <scene>`")
        return cls(json.loads(Path(p).read_text(encoding="utf-8")))

    def t(self, ref: str | float) -> float:
        if isinstance(ref, (int, float)):
            return float(ref)
        if ref not in self.cues:
            raise KeyError(f"unknown cue '{ref}'. Known: {', '.join(self.cues)}")
        return self.cues[ref]["frame"] / self.fps

    @property
    def duration(self) -> float:
        return self.duration_frames / self.fps


class OGScene(Scene):
    """Scene on OpenGrad paper with cue-locked timing."""

    def setup(self):
        setup_fonts()
        self.camera.background_color = C["sheet"]
        if os.environ.get("VID_TRANSPARENT") == "1":
            self.camera.background_opacity = 0
        self.timing = Timing.load()

    @property
    def now(self) -> float:
        return self.renderer.time

    def wait_until(self, ref: str | float, offset: float = 0.0) -> None:
        """Hold until a narration cue (or scene time in seconds) plus `offset`."""
        target = self.timing.t(ref) + offset
        dt = target - self.now
        if dt > 0.5 / self.timing.fps:
            self.wait(dt)

    def fit(self, planned: float, margin: float = 0.4, until: str | float | None = None) -> float:
        """Factor (<= 1) to scale run times so `planned` seconds of animation end before the
        scene does (or before cue `until`, when given)."""
        end = self.timing.duration if until is None else self.timing.t(until)
        room = end - self.now - margin
        return max(0.35, min(1.0, room / planned)) if planned > 0 else 1.0

    def finish(self) -> None:
        """Hold the last frame until the scene's exact duration."""
        dt = self.timing.duration - self.now
        if dt > 0.5 / self.timing.fps:
            self.wait(dt)

    # -- labels matching the web kit (packages/kit/src/labels.tsx) ------------------
    def provenance(self, kind: str, source: str, x: float = 140, y: float = 900) -> VGroup:
        """Provenance line: claim-class glyph, CLASS, source (mono), left-aligned at design (x, y)."""
        cs = TOKENS["claimStyle"][kind]
        mono = TOKENS["type"]["meta"]
        g = VGroup(
            claim_glyph(kind, cs["color"], r_px=6),
            _text(cs["label"].upper(), mono["family"], mono["size"], cs["color"]),
            _text(f"· {source}", mono["family"], mono["size"], C["ink3"]),
        ).arrange(RIGHT, buff=px(10))
        g.move_to(px(x, y), aligned_edge=LEFT)
        return g

    def label(self, s: str, sub: str | None = None, x: float = 140, y: float = 340) -> VGroup:
        """Mono uppercase label with an optional mono sublabel, top-left at design (x, y)."""
        head = text(s, "label", color=C["ink"])
        parts = [head]
        if sub:
            parts.append(text(sub, "meta", color=C["ink3"]))
        g = VGroup(*parts).arrange(DOWN, buff=px(8), aligned_edge=LEFT)
        g.move_to(px(x, y), aligned_edge=UP + LEFT)
        return g


def claim_glyph(kind: str, color: str, r_px: float = 7):
    """● measured, ◐ interpretation, ○ hypothesis, ◌ speculation, △ limitation, ■ design."""
    from manim import Circle, DashedVMobject, Sector, Square, Triangle

    r = px(r_px)
    if kind == "measured":
        return Circle(radius=r, color=color, fill_opacity=1, stroke_width=0)
    if kind == "author-interpretation":
        return VGroup(Circle(radius=r, color=color, stroke_width=2), Sector(radius=r, angle=3.14159, start_angle=1.5708, color=color, fill_opacity=1, stroke_width=0))
    if kind == "speculation":
        return DashedVMobject(Circle(radius=r, color=color, stroke_width=2), num_dashes=10)
    if kind == "limitation":
        return Triangle(color=color, stroke_width=2).scale_to_fit_height(2 * r)
    if kind == "design":
        return Square(side_length=1.6 * r, color=color, fill_opacity=1, stroke_width=0)
    return Circle(radius=r, color=color, stroke_width=2)


__all__ = ["OGScene", "claim_glyph", "C", "TOKENS", "px", "pt", "text", "math", "rate", "dur", "Timing", "ORIGIN", "UP", "DOWN", "LEFT", "RIGHT", "config"]
