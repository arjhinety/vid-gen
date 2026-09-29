import subprocess
import numpy as np
from scipy.optimize import minimize

# ---------- cubic-bezier fits to measured progress curves ----------
def bez(x1, y1, x2, y2, t):
    # solve x(s)=t by bisection, return y(s)
    lo = np.zeros_like(t); hi = np.ones_like(t)
    for _ in range(40):
        s = (lo + hi) / 2
        x = 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s * s * x2 + s ** 3
        lo = np.where(x < t, s, lo); hi = np.where(x >= t, s, hi)
    s = (lo + hi) / 2
    return 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s * s * y2 + s ** 3


def fit(name, pos, start_frame_offset=0.0):
    pos = np.asarray(pos, float)
    p = (pos - pos[0]) / (pos[-1] - pos[0])
    n = len(p) - 1
    t = np.arange(len(p)) / n
    def loss(v):
        x1, y1, x2, y2 = v
        if not (0 <= x1 <= 1 and 0 <= x2 <= 1):
            return 1e3
        return np.mean((bez(x1, y1, x2, y2, t) - p) ** 2)
    best = None
    for init in [(0.4, 0, 0.2, 1), (0.7, 0, 0.3, 1), (0.2, 0.8, 0.2, 1), (0.5, 0, 0.1, 1), (0.16, 1, 0.3, 1)]:
        r = minimize(loss, init, method="Nelder-Mead", options={"xatol": 1e-4, "fatol": 1e-8, "maxiter": 4000})
        if best is None or r.fun < best.fun:
            best = r
    x1, y1, x2, y2 = best.x
    t50 = t[np.argmin(np.abs(p - 0.5))]
    print(f"{name}: frames={n}  cubic-bezier({x1:.2f}, {y1:.2f}, {x2:.2f}, {y2:.2f})  rmse={np.sqrt(best.fun):.3f}  t50~{t50:.2f}")
    print("   progress:", " ".join(f"{v:.2f}" for v in p))

# N07 split wipe edge (start at 1280 one frame before f00)
fit("N07 split-screen wipe (edge x)", [1280, 1260, 1245, 1224, 1195, 1149, 1067, 904, 785, 725, 689, 664, 647, 634, 626, 619, 616, 613, 612])
# N05 The AI-powered scale-down (width)
fit("N05 headline scale-down 100%->45% (width)", [839, 836, 833, 828, 824, 820, 811, 806, 796, 787, 774, 758, 738, 710, 671, 612, 553, 513, 486, 467, 451, 439, 428.4, 421, 414, 408, 402, 399, 395, 392, 389, 387, 384, 383, 381])
# N10a bracket convergence (left bracket x), from entry at edge
fit("N10a bracket converge (left bracket x)", [0, 4, 19, 42, 72, 100, 118, 132, 142, 150, 157, 162, 166, 170, 174, 176, 179, 181, 182, 184, 185, 186])
# L01 'Audio' arrival scale 2.0x -> 1.0x (width, asymptote ~245)
fit("L01 word arrival scale 2.0x->1.0x (width)", [508, 468, 402.3, 362, 336, 317, 302, 292, 282.4, 276, 269.8, 265, 261, 258, 256, 254, 252, 250, 248, 246])
# N04 'Meet' letter rise (center y)
fit("N04 letter slam rise (center y)", [720, 675.5, 549.5, 485.5, 453.5, 441, 437.5])

# ---------- hold drift ----------
W, H = 1280, 720
NV = r"C:/Users/arro/Downloads/Best AI SaaS Product Launch Video  Numtera.mp4"
LV = r"C:/Users/arro/Downloads/Best SaaS Product Launch Ad Video  LangEase.mp4"

def frames(path, t0, n, step):
    vf = f"select='not(mod(n\\,{step}))'"
    cmd = ["ffmpeg", "-v", "error", "-ss", str(t0), "-i", path, "-vf", vf, "-fps_mode", "vfr", "-frames:v", str(n), "-pix_fmt", "rgb24", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    k = len(raw) // (W * H * 3)
    return np.frombuffer(raw[: k * W * H * 3], np.uint8).reshape(k, H, W, 3).astype(np.float32)

def extent(mask):
    ys, xs = np.nonzero(mask)
    if len(xs) < 30:
        return np.nan, np.nan, np.nan
    x0, x1 = np.percentile(xs, [0.5, 99.5]); y0, y1 = np.percentile(ys, [0.5, 99.5])
    return x1 - x0, (x0 + x1) / 2, (y0 + y1) / 2

def g(f):
    return f @ np.array([0.299, 0.587, 0.114], np.float32)

print("\n-- hold drift (width & centre over the hold; step 3 frames) --")
cases = [
    ("Numtera 'Agent Approves it as {learning}' hold", NV, 29.85, 12, lambda f: (g(f) < 120)),
    ("Numtera 'Reusable knowledge' hold", NV, 43.35, 10, lambda f: (f[..., 2] > 170) & (f[..., 2] - f[..., 0] > 60) & (np.arange(W)[None, :] > 300) & (np.arange(W)[None, :] < 1000) & (np.arange(H)[:, None] > 300) & (np.arange(H)[:, None] < 420)),
    ("LangEase 'Any language [folder] Instantly' hold", LV, 3.3, 10, lambda f: (g(f) < 200) & (np.arange(H)[:, None] > 250) & (np.arange(H)[:, None] < 470)),
    ("Numtera 'We Eliminate them' settle+hold", NV, 81.0, 14, lambda f: (g(f) < 150) & (f[..., 2] - f[..., 0] > 100) & (np.arange(H)[:, None] > 290) & (np.arange(H)[:, None] < 430) & (np.arange(W)[None, :] > 60) & (np.arange(W)[None, :] < 1220)),
]
for lab, p, t0, n, mk in cases:
    F = frames(p, t0, n, 3)
    ws = [extent(mk(f)) for f in F]
    w = np.array([x[0] for x in ws])
    print(f"{lab}: t0={t0}  widths=" + " ".join(f"{x:.0f}" for x in w))
    ok = np.isfinite(w)
    if ok.sum() > 3:
        tt = np.arange(len(w))[ok] * 3 / 30
        slope = np.polyfit(tt, np.log(w[ok]), 1)[0]
        print(f"   scale drift = {100 * (np.exp(slope) - 1):+.1f} %/s ; centre x: " + " ".join(f"{x[1]:.0f}" for x in ws))
