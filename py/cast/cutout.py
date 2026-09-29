"""Cut a character out of a flat white background, and check edit alignment.

Generated character art arrives as RGB on a flat white background (the generator paints a
checkerboard if asked for transparency). The background is found by flood-filling near-white
pixels connected to the image border: the dark line art closes every outline, so white
clothing inside the character is not reached. Only the band between background and figure
gets fractional alpha, from how far each pixel is from white; colours there are
un-premultiplied against white so no halo remains.

    python py/cast/cutout.py cut <in.png> <out.png>
    python py/cast/cutout.py diff <base.png> <variant.png> [--out heat.png]

`diff` reports how much of a variant differs from its base outside the edited region (an
image edit is meant to change one feature; drift elsewhere breaks layer alignment).
Runs in any venv with numpy, Pillow and OpenCV (third_party/see-through/.venv has them).
"""

from __future__ import annotations

import argparse
import sys

import cv2
import numpy as np
from PIL import Image

WHITE_TOL = 14  # a background pixel is within this of pure white on every channel
EDGE_RANGE = 60  # a pixel this far below white on its darkest channel is fully opaque


def background_mask(rgb: np.ndarray, tol: int = WHITE_TOL) -> np.ndarray:
    """True where the pixel is near-white AND connected to the image border."""
    h, w = rgb.shape[:2]
    near_white = (rgb.min(axis=2) >= 255 - tol).astype(np.uint8)
    n, labels = cv2.connectedComponents(near_white, connectivity=4)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    border = border[border != 0]
    bg = np.isin(labels, border) & (near_white > 0)
    # Enclosed pockets of paper: pure white seen through a loop of hair (a loose strand arching
    # over the head). On white they are invisible; on any other background they show as white
    # bands. A pocket counts as paper when it is pure white, small, and ringed by dark pixels;
    # white clothing is shaded and ringed by light pixels, so it stays.
    lum = rgb.mean(axis=2)
    for i in range(1, n):
        if i in border:
            continue
        m = labels == i
        area = int(m.sum())
        # eye catchlights are also pure white ringed by dark (the iris) but small: keep pockets under 600 px
        if not 600 <= area <= 6000 or float(np.median(rgb[m].min(axis=1))) < 250:  # median: anti-aliased rims are greyer
            continue
        ring = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & ~m
        if ring.any() and float(lum[ring].mean()) < 120:
            bg |= m
    return bg


def cut(rgb: np.ndarray) -> np.ndarray:
    bg = background_mask(rgb)
    alpha = np.where(bg, 0.0, 1.0)
    # The band just outside the figure: anti-aliased edge pixels that are close to white but
    # were counted as foreground by the threshold, or background pixels touching the figure.
    band = cv2.dilate((~bg).astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    band &= cv2.dilate(bg.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    darkness = (255.0 - rgb.min(axis=2).astype(np.float64)) / EDGE_RANGE
    alpha[band] = np.clip(darkness[band], 0.0, 1.0)
    a = alpha[..., None]
    fg = np.where(a > 0.02, (rgb.astype(np.float64) - (1.0 - a) * 255.0) / np.maximum(a, 1e-3), 0.0)
    out = np.dstack([np.clip(fg, 0, 255), alpha * 255.0]).round().astype(np.uint8)
    return out


def diff_report(base: np.ndarray, var: np.ndarray, thresh: int = 24) -> tuple[dict, np.ndarray | None]:
    if base.shape != var.shape:
        return {"same_size": False, "base": base.shape, "variant": var.shape}, None
    d = np.abs(base.astype(np.int16) - var.astype(np.int16)).max(axis=2)
    changed = d > thresh
    ys, xs = np.nonzero(changed)
    # Largest connected changed region = the intended edit; everything else is drift.
    n, labels, stats, _ = cv2.connectedComponentsWithStats(cv2.dilate(changed.astype(np.uint8), np.ones((9, 9), np.uint8)))
    main = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA])) if n > 1 else 0
    x, y, w, h = (int(v) for v in stats[main, :4]) if main else (0, 0, 0, 0)
    drift = changed & (labels != main)
    return {
        "same_size": True,
        "changed_frac": round(float(changed.mean()), 5),
        "edit_box": [x, y, w, h],
        "drift_frac": round(float(drift.mean()), 5),
        "mean_abs_diff_outside_edit": round(float(d[labels != main].mean()), 3),
        "changed_px": int(len(xs)),
    }, d


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("cut")
    c.add_argument("src")
    c.add_argument("dst")
    d = sub.add_parser("diff")
    d.add_argument("base")
    d.add_argument("variant")
    d.add_argument("--out")
    a = p.parse_args(argv)
    if a.cmd == "cut":
        rgb = np.asarray(Image.open(a.src).convert("RGB"))
        rgba = cut(rgb)
        Image.fromarray(rgba, "RGBA").save(a.dst)
        print(f"{a.dst}: {rgba.shape[1]}x{rgba.shape[0]}, opaque {float((rgba[..., 3] > 250).mean()):.3f}, clear {float((rgba[..., 3] < 5).mean()):.3f}")
    else:
        base = np.asarray(Image.open(a.base).convert("RGB"))
        var = np.asarray(Image.open(a.variant).convert("RGB"))
        rep, dmap = diff_report(base, var)
        if a.out and dmap is not None:
            Image.fromarray(np.clip(dmap * 4, 0, 255).astype(np.uint8)).save(a.out)
        print(rep)
    return 0


if __name__ == "__main__":
    sys.exit(main())
