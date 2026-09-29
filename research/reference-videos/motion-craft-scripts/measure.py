"""Per-frame measurements at native 30 fps (source 1280x720) for selected moments."""
import subprocess
import numpy as np

NV = r"C:/Users/arro/Downloads/Best AI SaaS Product Launch Video  Numtera.mp4"
LV = r"C:/Users/arro/Downloads/Best SaaS Product Launch Ad Video  LangEase.mp4"
W, H = 1280, 720


def frames(path, t0, n):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(t0), "-i", path, "-frames:v", str(n), "-pix_fmt", "rgb24", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    k = len(raw) // (W * H * 3)
    return np.frombuffer(raw[: k * W * H * 3], np.uint8).reshape(k, H, W, 3).astype(np.float32)


def gray(f):
    return f @ np.array([0.299, 0.587, 0.114], np.float32)


def blur_sigma(g, mask_region):
    """Estimate Gaussian sigma of edges: sigma ~ C / (gmax * sqrt(2pi)). g = gray image region."""
    gy, gx = np.gradient(g)
    mag = np.hypot(gx, gy)
    C = np.percentile(g, 99) - np.percentile(g, 1)
    gm = np.percentile(mag, 99.8)
    if gm <= 0:
        return np.nan
    return C / (gm * np.sqrt(2 * np.pi))


def text_extent(mask, cols=None, rows=None):
    m = mask.copy()
    if cols is not None:
        m[:, : cols[0]] = False
        m[:, cols[1]:] = False
    if rows is not None:
        m[: rows[0]] = False
        m[rows[1]:] = False
    ys, xs = np.nonzero(m)
    if len(xs) < 30:
        return (np.nan,) * 4
    x0, x1 = np.percentile(xs, [0.5, 99.5])
    y0, y1 = np.percentile(ys, [0.5, 99.5])
    return x1 - x0, y1 - y0, (x0 + x1) / 2, (y0 + y1) / 2


def report(label, t0, vals, keys):
    print(f"\n== {label} (t0={t0}s, 1 row per frame @30fps; px in 720p source)")
    for i, v in enumerate(vals):
        print(f" f{i:02d} t={t0 + i / 30:.3f} " + " ".join(f"{k}={x:7.1f}" for k, x in zip(keys, v)))


# 1) LangEase "Audio" arrival: blue text on near-white. frames 1.05..1.75
t0 = 1.05
F = frames(LV, t0, 22)
vals = []
for f in F:
    g = gray(f)
    blue = (f[..., 2] - f[..., 0] > 35) & (g < 225)
    w, h, cx, cy = text_extent(blue, rows=(200, 520), cols=(200, 1080))
    reg = g[int(260):int(460), 300:980]
    vals.append((w, h, blur_sigma(reg, None)))
report("L01 'Audio' arrival: width, height, blur sigma", t0, vals, ["w", "h", "sig"])

# 2) LangEase 'Audio' exit + 'Any' arrival 2.0..2.5
t0 = 2.0
F = frames(LV, t0, 16)
vals = []
for f in F:
    g = gray(f)
    blue = (f[..., 2] - f[..., 0] > 30) & (g < 230)
    w, h, cx, cy = text_extent(blue, rows=(200, 520), cols=(200, 1080))
    reg = g[260:460, 300:980]
    vals.append((w, h, blur_sigma(reg, None), float(g[260:460, 300:980].min())))
report("L02 exit/arrive: width, height, sigma, min-gray (opacity proxy)", t0, vals, ["w", "h", "sig", "ming"])

# 3) Numtera 'Reusable knowledge' settle on dark navy 42.35..43.3 (text brighter than bg)
t0 = 42.35
F = frames(NV, t0, 30)
vals = []
for f in F:
    g = gray(f)
    bright = (f[..., 2] > 170) & (f[..., 2] - f[..., 0] > 60)
    w, h, cx, cy = text_extent(bright, cols=(360, 920), rows=(200, 520))
    # bracket positions: bright columns outside center band
    colsum = bright[250:470].sum(0)
    left = np.nonzero(colsum[:560] > 40)[0]
    right = np.nonzero(colsum[720:] > 40)[0]
    vals.append((h, left.min() if len(left) else np.nan, (right.max() + 720) if len(right) else np.nan))
report("N10a 'Reusable knowledge': text height (central cols), left-bracket x, right-bracket x", t0, vals, ["h", "Lx", "Rx"])

# 4) Numtera split wipe: dark panel edge x 22.7..23.4
t0 = 22.7
F = frames(NV, t0, 22)
vals = []
for f in F:
    g = gray(f)
    row = g[400:440].mean(0)  # band without text
    dark = row < 60
    # leftmost x such that everything to the right (mostly) dark
    xs = np.nonzero(dark)[0]
    edge = np.nan
    if len(xs):
        # first x where the run of dark continues to near right edge
        for x in xs:
            if dark[x:].mean() > 0.9:
                edge = x
                break
    vals.append((edge,))
report("N07 split-wipe dark edge x (1280 wide)", t0, vals, ["edge"])

# 5) Numtera 'The AI-powered' scale-down 13.4..14.6
t0 = 13.4
F = frames(NV, t0, 36)
vals = []
for f in F:
    g = gray(f)
    ink = g < 120
    w, h, cx, cy = text_extent(ink, rows=(150, 450))
    vals.append((w, h, cx))
report("N05 'The AI-powered' scale-down: width, height, center x", t0, vals, ["w", "h", "cx"])

# 6) Numtera 'Meet' letters rise 9.9..10.35: dark/blue text on blue gradient -> dark pixels
t0 = 9.9
F = frames(NV, t0, 16)
vals = []
for f in F:
    g = gray(f)
    ink = (g < 90)
    w, h, cx, cy = text_extent(ink)
    reg = g[150:600, 100:1180]
    vals.append((w, h, cy, blur_sigma(reg, None)))
report("N04 'Meet' slam: ink width, height, center y, sigma", t0, vals, ["w", "h", "cy", "sig"])

# 7) Numtera 'We Eliminate them' 80.65..81.3 (blue text on white/blue) tracking + scale
t0 = 80.65
F = frames(NV, t0, 20)
vals = []
for f in F:
    g = gray(f)
    blue = (f[..., 2] - f[..., 0] > 80) & (f[..., 0] < 120) & (g < 170)
    w, h, cx, cy = text_extent(blue, rows=(250, 470))
    reg = g[260:460, 200:1080]
    vals.append((w, h, blur_sigma(reg, None)))
report("N14 'We Eliminate them': width, height, sigma", t0, vals, ["w", "h", "sig"])

# 8) sharp reference sigma: settled static text
for lab, p, t in [("Numtera settled 'Agent Approves' 30.5s", NV, 30.5), ("LangEase settled 'Any language' 3.0s", LV, 3.0)]:
    f = frames(p, t, 1)[0]
    g = gray(f)
    print(f"\nref sigma {lab}: {blur_sigma(g[250:470, 200:1080], None):.2f}")
