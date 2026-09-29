"""Prepare a See-through PSD for PSD2Live.

See-through splits one illustration into semantic layers with their hidden areas painted in.
Two things need fixing before the rig can use it, and one thing is missing:

1. Order. A single layer per part cannot always be both in front of and behind another
   part (an open coat is in front of the skirt at the sides and behind it in the middle),
   and accessories can land under the hair that should carry them.
2. Reconcile to the source. Wherever the recomposed layers clearly differ from the
   original picture, the topmost layer whose pixel matches the original is made visible
   there by clearing the layers above it (only at those pixels). The painted-in hidden
   areas stay intact underneath, so the rig can still reveal them when parts move.
   Where no layer matches, the original is painted into the closest layer, but only where
   that layer is already on top with nothing else nearby; next to a moving part the
   decomposition is left alone. Stray paint outside the original silhouette is removed.
3. Drawn states. The mouth is a set of drawn chibi shapes swapped whole (anime lip flap), not
   one realistic mouth warped open: the closed line is lifted from the base design and each
   other shape from a whole-image edit (`<stem>-mouth-<shape>.png`, shapes in MOUTH_SHAPES),
   replacing See-through's `mouth` layer as `mouthshape-<shape>`. Drawn closed eyes come from
   `<stem>-eyes-closed.png` as `eye close-l`, `eye close-r`, above the face features and below
   the front hair. Only the changed feature is lifted from an edit.

    python py/cast/psd_prep.py <seethrough.psd> <base.png> <variants-dir> <out.psd> [--report r.json] [--preview p.png]

The source-to-canvas mapping is measured (matching the figure's bounding boxes), not assumed.
Runs in third_party/see-through/.venv (psd-tools, OpenCV, Pillow, numpy).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from psd_tools import PSDImage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cutout import background_mask  # noqa: E402

# 3x3-mean colour difference within which a layer "shows the original" (median drift is ~5).
# Two tiers: a layer within the strict one wins over any layer within only the loose one (at 40
# alone, a pale coat lining above the skirt passed for grey pleats); the original is painted in
# only where no layer is within the loose one (painting at 16 put eye-rim lines into the face
# layer, which showed as dashed ghosts once the eyes closed).
MATCH_TOLS = (16, 40)
MATCH_TOL = MATCH_TOLS[-1]
NEAR_PX = 3  # how close another layer may come before the original is not painted in
DIFF_T = 28  # variant-vs-base difference that counts as a real edit
MOUTH_T = 10  # difference from the face layer's skin that belongs to a drawn mouth (28 and 16 broke the closed line where it fades)
ACCESSORIES = ("headwear", "earwear", "eyewear")
# Drawn mouth shapes in switch order (rig_graddy.py makes ParamMouthShape = index show that
# shape). The names avoid PSD2Live's mouth aliases, whose lip-outline split and open/close
# warp are made for realistic mouths, not a chibi line.
MOUTH_SHAPES = (("closed", "the line at rest"), ("small", "slightly open"), ("ah", "open"), ("oh", "round"), ("laugh", "open grin"))
REST_HIDDEN = {f"mouthshape-{s}" for s, _ in MOUTH_SHAPES[1:]} | {"eye close-l", "eye close-r"}


def bbox(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.nonzero(mask)
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def load_stack(psd: PSDImage) -> list[tuple[str, np.ndarray]]:
    """Top-level pixel layers bottom→top as full-canvas float RGBA (straight alpha, 0..255)."""
    W, H = psd.size
    out = []
    for layer in psd:
        im = layer.topil()
        if im is None or layer.kind != "pixel":
            continue
        a = np.asarray(im.convert("RGBA")).astype(np.float32)
        full = np.zeros((H, W, 4), np.float32)
        x0, y0 = layer.left, layer.top
        x1, y1 = min(W, x0 + a.shape[1]), min(H, y0 + a.shape[0])
        full[max(0, y0):y1, max(0, x0):x1] = a[max(0, -y0):y1 - y0, max(0, -x0):x1 - x0]
        out.append((layer.name, full))
    return out


def composite(stack: list[tuple[str, np.ndarray]]) -> tuple[np.ndarray, np.ndarray]:
    H, W = stack[0][1].shape[:2]
    C = np.zeros((H, W, 3), np.float32)
    A = np.zeros((H, W), np.float32)
    for _, l in stack:
        a = l[..., 3] / 255
        C = l[..., :3] * a[..., None] + C * (1 - a[..., None])
        A = a + A * (1 - a)
    return C / np.maximum(A, 1e-6)[..., None], A


def reorder(stack: list[tuple[str, np.ndarray]]) -> list[tuple[str, np.ndarray]]:
    """Accessories ride on the hair: move them just above the front hair."""
    names = [n for n, _ in stack]
    if "front hair" not in names:
        return stack
    acc = [s for s in stack if s[0].split("-")[0] in ACCESSORIES]
    rest = [s for s in stack if s[0].split("-")[0] not in ACCESSORIES]
    i = [n for n, _ in rest].index("front hair")
    return rest[: i + 1] + acc + rest[i + 1 :]


def reconcile(stack, O: np.ndarray, Oa: np.ndarray, tols: tuple[float, ...] = MATCH_TOLS) -> dict:
    """Clear upper layers where a lower layer shows the original; remove paint outside the silhouette."""
    C, A = composite(stack)
    blur = lambda x: cv2.blur(x, (3, 3))
    Ob = blur(O)
    err = np.abs(blur(C) - Ob).max(axis=2)
    tol = tols[-1]
    bad = (Oa > 0.9) & (A > 0.5) & (err > tols[0])
    n = len(stack)
    errs = [np.abs(blur(l[..., :3]) - Ob).max(axis=2) for _, l in stack]
    # 1) the topmost layer that shows the original within the strict tolerance, else the loose one
    chosen = np.full(bad.shape, -1, np.int32)
    for t in tols:
        for i in range(n - 1, -1, -1):
            ok = bad & (chosen < 0) & (stack[i][1][..., 3] > 128) & (errs[i] <= t)
            chosen[ok] = i
    # 2) where no layer does, the closest opaque layer, with the original painted into it
    best = np.full(bad.shape, np.inf, np.float32)
    besti = np.full(bad.shape, -1, np.int32)
    for i in range(n):
        cand = bad & (chosen < 0) & (stack[i][1][..., 3] > 128) & (errs[i] < best)
        best[cand] = errs[i][cand]
        besti[cand] = i
    # Painted only where that layer is already on top with no other layer within NEAR_PX: painting
    # under or beside a moving part (an eyelash rim, a hair edge) leaves that part's line on the
    # layer below, a ghost outline once the part moves. There the decomposition is left as it is.
    near = np.zeros(bad.shape, bool)
    blocked = np.zeros(bad.shape, bool)
    kn = np.ones((2 * NEAR_PX + 1, 2 * NEAR_PX + 1), np.uint8)
    for i in range(n - 1, -1, -1):
        blocked |= (besti == i) & near
        near |= cv2.dilate((stack[i][1][..., 3] > 13).astype(np.uint8), kn) > 0
    painted = bad & (chosen < 0) & (besti >= 0) & ~blocked
    chosen[painted] = besti[painted]
    for i in range(n):
        m = painted & (chosen == i)
        if m.any():
            l = stack[i][1]
            l[..., :3][m] = O[m]
            l[..., 3][m] = 255
    # 3) clear everything above the chosen layer: whole regions (no speckle), hard edges (a soft
    # rim lets the upper layer's paint through as pale fringes)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fixed = np.zeros_like(bad)
    for i in range(n):
        l = stack[i][1]
        clear = (bad & (chosen >= 0) & (chosen < i)).astype(np.uint8)
        clear = cv2.morphologyEx(cv2.morphologyEx(clear, cv2.MORPH_OPEN, k), cv2.MORPH_CLOSE, k)
        l[..., 3][clear > 0] = 0
        fixed |= clear > 0
    # Accessory fragments that mostly do not show the original are stray paint (e.g. a white
    # oval generated above the head): remove them.
    for name, l in stack:
        if name.split("-")[0] not in ACCESSORIES:
            continue
        vis = (l[..., 3] > 128).astype(np.uint8)
        cnt, lab = cv2.connectedComponents(vis)
        for c in range(1, cnt):
            m = lab == c
            # only the figure counts: the original's white paper must never "match" stray white paint
            ok = (np.abs(blur(l[..., :3]) - Ob).max(axis=2) <= tol) & m & (Oa > 0.5)
            if ok.sum() < 0.5 * m.sum():
                grown = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
                l[..., 3][grown] = 0
    # paint outside the original silhouette (dilated a little for anti-aliased edges)
    _, A = composite(stack)
    sil = cv2.dilate((Oa > 0.05).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    spill = (~sil) & (A > 0.02)
    for _, l in stack:
        l[..., 3][spill] = 0
    C2, A2 = composite(stack)
    err2 = np.abs(blur(C2) - Ob).max(axis=2)
    inside = (Oa > 0.9) & (A2 > 0.5)
    return {
        "mismatch_px_before": int(bad.sum()),
        "fixed_px": int(fixed.sum()),
        "painted_px": int(painted.sum()),
        "unmatched_px": int((bad & (chosen < 0)).sum()),
        "paint_blocked_px": int((bad & blocked).sum()),
        "spill_px_removed": int(spill.sum()),
        **{f"frac_over_{int(t)}_{when}": round(float((m & (e > t)).sum() / max(1, m.sum())), 4)
           for t in tols for when, m, e in (("before", (Oa > 0.9) & (A > 0.5), err), ("after", inside, err2))},
    }


def feature_patch(base: np.ndarray, var: np.ndarray, region, cover: np.ndarray | None, grow: int, feather: float, exclude: np.ndarray | None = None) -> np.ndarray:
    """RGBA (source size): the variant's pixels where it differs from the base inside `region`,
    plus `cover` (what the patch must hide, e.g. the open eye), holes filled, rim softened."""
    h, w = base.shape[:2]
    x0, y0, x1, y1 = region
    d = np.abs(base.astype(np.int16) - var.astype(np.int16)).max(axis=2) > DIFF_T
    m = np.zeros((h, w), np.uint8)
    m[y0:y1, x0:x1] = d[y0:y1, x0:x1]
    if cover is not None:
        m |= (cover > 0.1).astype(np.uint8)
    keep = np.zeros_like(m)
    keep[y0:y1, x0:x1] = 1
    m &= keep
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1))
    m = cv2.dilate(cv2.morphologyEx(m, cv2.MORPH_CLOSE, k), k)
    ff = m.copy()
    cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 1)
    m = (m | (1 - ff)) & keep
    if exclude is not None:
        # never carry pixels that belong to a layer drawn in front (the fringe): when that layer
        # sways, anything of it baked into the patch would show as a ghost band
        m &= (exclude < 0.3).astype(np.uint8)
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), feather) if feather else m.astype(np.float32)
    a = np.clip(a * 1.6 - 0.3, 0, 1) * (m > 0)
    return np.dstack([var.astype(np.float32), a * 255])


def mouth_patch(img: np.ndarray, face: np.ndarray, region, grow: int = 2, feather: float = 1.0) -> np.ndarray:
    """RGBA (source size): one drawn mouth, lifted from `img` where it differs from the face
    layer's skin inside `region`. Colours fade into that skin at the rim, so an image edit's own
    skin lighting never shows as a pale patch when the shape is switched on."""
    h, w = img.shape[:2]
    x0, y0, x1, y1 = region
    skin = face[..., :3]
    dist = np.abs(img.astype(np.float32) - skin).max(axis=2)
    m = np.zeros((h, w), np.uint8)
    m[y0:y1, x0:x1] = (dist[y0:y1, x0:x1] > MOUTH_T) & (face[y0:y1, x0:x1, 3] > 128)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1, 2 * grow + 1))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, k)
    # the mouth is the big component; specks elsewhere in the box are the edit's drift
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    if n > 1:
        big = stats[1:, cv2.CC_STAT_AREA].max()
        m = np.isin(lab, [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] >= 0.15 * big]).astype(np.uint8)
    m = cv2.dilate(m, k)
    ff = m.copy()
    cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 1)
    m = m | (1 - ff)
    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), feather) if feather else m.astype(np.float32)
    a = np.clip(a * 1.6 - 0.3, 0, 1) * (m > 0)
    wgt = np.clip((dist - 4.0) / 30.0, 0, 1)[..., None]
    rgb = img.astype(np.float32) * wgt + skin * (1 - wgt)
    return np.dstack([rgb, a * 255])


def skin_match(patch: np.ndarray, face: np.ndarray | None) -> np.ndarray:
    """Keep only the variant's dark strokes (lashes) and take the skin from the face layer.

    An image edit redraws the skin around a closed eye with its own lighting (lighter than the
    fringe-shaded skin of the base), which shows as a pale band when the patch is switched on.
    The face layer already has the right skin under the eye, so the patch uses it and adds only
    pixels clearly darker than that skin."""
    if face is None:
        return patch
    rgb = patch[..., :3]
    skin = face[..., :3]
    lum = lambda x: x @ np.array([0.299, 0.587, 0.114], np.float32)
    stroke = np.clip((lum(skin) - lum(rgb) - 22.0) / 55.0, 0, 1)[..., None]
    has_face = (face[..., 3] > 128)[..., None]
    out = patch.copy()
    out[..., :3] = np.where(has_face, rgb * stroke + skin * (1 - stroke), rgb)
    return out


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("psd")
    p.add_argument("base")
    p.add_argument("variants")
    p.add_argument("out")
    p.add_argument("--report")
    p.add_argument("--preview")
    a = p.parse_args(argv)

    src = PSDImage.open(a.psd)
    W, H = src.size
    stack = reorder(load_stack(src))
    names_in = [n for n, _ in stack]

    base = np.asarray(Image.open(a.base).convert("RGB"))
    fg = ~background_mask(base)
    _, A0 = composite(stack)
    sx0, sy0, sx1, sy1 = bbox(fg)
    px0, py0, px1, py1 = bbox(A0 > 0.5)
    scale = (py1 - py0) / (sy1 - sy0)
    ox, oy = px0 - sx0 * scale, py0 - sy0 * scale
    to_canvas = np.array([[scale, 0, ox], [0, scale, oy]], np.float32)
    to_source = cv2.invertAffineTransform(to_canvas)
    O = cv2.warpAffine(base.astype(np.float32), to_canvas, (W, H), flags=cv2.INTER_AREA)
    Oa = cv2.warpAffine(fg.astype(np.float32), to_canvas, (W, H), flags=cv2.INTER_AREA)

    rec = reconcile(stack, O, Oa)

    by_name = {n: l for n, l in stack}

    def src_region(tags: list[str], pad: float):
        al = [by_name[t][..., 3] for t in tags if t in by_name]
        if not al or not (np.maximum.reduce(al) > 25).any():
            return None
        x0, y0, x1, y1 = bbox(np.maximum.reduce(al) > 25)
        pw, ph = (x1 - x0) * pad, (y1 - y0) * pad
        pts = cv2.transform(np.array([[[x0 - pw, y0 - ph], [x1 + pw, y1 + ph]]], np.float32), to_source)[0]
        return max(0, int(pts[0, 0])), max(0, int(pts[0, 1])), min(base.shape[1], int(pts[1, 0])), min(base.shape[0], int(pts[1, 1]))

    def src_cover(tags: list[str]):
        al = [by_name[t][..., 3] / 255 for t in tags if t in by_name]
        return cv2.warpAffine(np.maximum.reduce(al), to_source, (base.shape[1], base.shape[0])) if al else None

    # The face layer (skin painted in under the eyes, with the fringe's shading) in source coordinates.
    face_src = cv2.warpAffine(by_name["face"], to_source, (base.shape[1], base.shape[0])) if "face" in by_name else None

    stem = Path(a.base).stem
    vdir = Path(a.variants)
    added = []
    # Drawn mouth shapes replace See-through's mouth layer (a faint, mostly translucent copy of
    # the line), each lifted whole from its own picture: the closed line from the base design,
    # the others from `<stem>-mouth-<shape>.png` edits.
    mouth_at = next((i for i, (n, _) in enumerate(stack) if n == "mouth"), None)
    if mouth_at is not None and face_src is not None:
        ys, xs = np.nonzero(stack[mouth_at][1][..., 3] > 25)
        cx, cy = cv2.transform(np.array([[[(xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2]]], np.float32), to_source)[0, 0]
        mw = (xs.max() - xs.min()) / scale
        hw, hh = 0.9 * mw, 0.55 * mw
        region = max(0, int(cx - hw)), max(0, int(cy - hh)), min(base.shape[1], int(cx + hw)), min(base.shape[0], int(cy + hh))
        shapes = []
        for shape, _ in MOUTH_SHAPES:
            f = vdir / f"{stem}-mouth-{shape}.png"
            img = base if shape == "closed" else (np.asarray(Image.open(f).convert("RGB")) if f.exists() else None)
            if img is not None:
                patch = cv2.warpAffine(mouth_patch(img, face_src, region), to_canvas, (W, H), flags=cv2.INTER_AREA if scale < 1 else cv2.INTER_LINEAR)
                shapes.append((f"mouthshape-{shape}", patch))
        stack[mouth_at:mouth_at + 1] = shapes
        added += [{"name": n, "box": list(bbox(l[..., 3] > 0))} for n, l in shapes]
    new: list[tuple[str, np.ndarray]] = []
    ev = vdir / f"{stem}-eyes-closed.png"
    if ev.exists():
        var = np.asarray(Image.open(ev).convert("RGB"))
        for side in ("l", "r"):
            tags = [f"{t}-{side}" for t in ("eyewhite", "irides", "eyelash")]
            if r := src_region(tags, 0.3):
                patch = feature_patch(base, var, r, src_cover(tags), 4, 1.5, exclude=src_cover(["front hair"]))
                new.append((f"eye close-{side}", skin_match(patch, face_src)))
    anchor = next((i for i, (n, _) in enumerate(stack) if n == "front hair"), len(stack))
    for name, patch in new:
        canvas = cv2.warpAffine(patch, to_canvas, (W, H), flags=cv2.INTER_AREA if scale < 1 else cv2.INTER_LINEAR)
        if canvas[..., 3].max() < 1:
            continue
        stack.insert(anchor, (name, canvas))
        anchor += 1
        added.append({"name": name, "box": list(bbox(canvas[..., 3] > 0))})

    # Written the way See-through writes its PSDs (an RGBA document, create_pixel_layer): PSD2Live
    # reads layer transparency correctly from these; an RGB document from PixelLayer.frompil
    # came out as opaque rectangles in its atlas.
    out = PSDImage.new(mode="RGBA", size=(W, H), depth=8)
    for name, l in stack:
        if l[..., 3].max() < 1:
            continue
        x0, y0, x1, y1 = bbox(l[..., 3] > 0)
        crop = Image.fromarray(np.clip(l[y0:y1, x0:x1], 0, 255).round().astype(np.uint8), "RGBA")
        out.create_pixel_layer(crop, name=name, top=y0, left=x0, opacity=255)
    out.save(a.out)

    if a.preview:
        # the rig at rest: switched-off states hidden
        C, A = composite([(n, l) for n, l in stack if n not in REST_HIDDEN])
        bg = np.full_like(C, 184.0)
        Image.fromarray(np.clip(C * A[..., None] + bg * (1 - A[..., None]), 0, 255).astype(np.uint8)).save(a.preview)
    rep = {"canvas": [W, H], "scale": round(scale, 5), "offset": [round(ox, 2), round(oy, 2)], "layers_in": names_in, "reconcile": rec, "added": added, "layers_out": [n for n, _ in stack]}
    if a.report:
        Path(a.report).write_text(json.dumps(rep, indent=1))
    print(json.dumps({k: rep[k] for k in ("canvas", "scale", "reconcile", "added")}, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
