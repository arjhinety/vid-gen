import json
import numpy as np

BASE = r"C:/Users/arro/Downloads/vid-gen/research/reference-videos/"
for name in ["numtera-launch", "langease-launch"]:
    t, env = np.load(BASE + name + "/bursts/_onset_env.npy")
    res = json.load(open(BASE + name + "/bursts/_motion_audio.json"))
    dt = t[1] - t[0]
    # smooth env slightly
    k = np.hanning(5); k /= k.sum()
    e = np.convolve(env, k, mode="same")
    # autocorr candidates
    x = e - e.mean()
    ac = np.correlate(x, x, "full")[len(x) - 1:]
    ac /= ac[0]
    lags = np.arange(len(ac)) * dt
    sel = (lags > 0.25) & (lags < 1.3)
    order = np.argsort(-ac[sel])
    cand = []
    for i in order:
        L = lags[sel][i]
        if all(abs(L - c) > 0.03 for c, _ in cand):
            cand.append((round(float(L), 3), round(float(ac[sel][i]), 3)))
        if len(cand) >= 6:
            break
    # fine period + phase search around best candidates in 0.45-0.70 s
    best = (-1, None, None)
    for P in np.arange(0.40, 0.75, 0.0005):
        for ph in np.arange(0, P, 0.005):
            g = np.arange(ph, t[-1], P)
            idx = np.clip(np.round((g - t[0]) / dt).astype(int), 0, len(e) - 1)
            s = e[idx].mean()
            if s > best[0]:
                best = (s, P, ph)
    score, P, ph = best
    rand = e.mean()
    # phases of events
    def phase_stats(ev):
        ev = np.asarray(ev)
        if len(ev) == 0:
            return {}
        phs = ((ev - ph) / P) % 1.0
        ang = 2 * np.pi * phs
        R = np.abs(np.mean(np.exp(1j * ang)))
        n = len(ev)
        p = np.exp(-n * R * R) * (1 + (2 * n * R * R - (n * R * R) ** 2) / (4 * n))
        # half-beat grid (eighths)
        ang2 = 4 * np.pi * phs
        R2 = np.abs(np.mean(np.exp(1j * ang2)))
        p2 = np.exp(-n * R2 * R2)
        off = (((ev - ph) + P / 2) % P) - P / 2
        return {"n": n, "R_beat": round(float(R), 3), "p_beat": round(float(p), 4),
                "R_halfbeat": round(float(R2), 3), "p_halfbeat": round(float(p2), 4),
                "median_abs_offset_ms": round(1000 * float(np.median(np.abs(off))), 0),
                "frac_within_67ms": round(float(np.mean(np.abs(off) <= 0.067)), 3),
                "frac_within_67ms_null": round(float(2 * 0.067 / P), 3),
                "offsets_ms": [int(round(1000 * o)) for o in off]}
    # accent strength at events: max env within +-2 frames (67ms) as percentile of env
    def accent(ev):
        out = []
        for v in ev:
            i0 = int((v - 0.067 - t[0]) / dt); i1 = int((v + 0.067 - t[0]) / dt) + 1
            m = e[max(0, i0):i1].max()
            out.append(round(float((e < m).mean() * 100), 1))
        return out
    # null for accent: random times
    rng = np.random.default_rng(1)
    rt = rng.uniform(1, t[-1] - 1, 500)
    null_acc = np.median(accent(rt))
    cuts = res["cuts_native"]
    mp = res["motion_peaks"]
    print("=====", name)
    print("autocorr lag candidates (s, r):", cand)
    print(f"best grid: period {P:.4f}s = {60/P:.2f} bpm = {P*30:.2f} frames; phase {ph:.3f}; comb score/mean {score/rand:.2f}")
    print("cuts phase:", phase_stats(cuts))
    print("motion peaks phase:", {k: v for k, v in phase_stats(mp).items() if k != 'offsets_ms'})
    print("cut accent pct:", accent(cuts), "median", np.median(accent(cuts)) if cuts else None, "null median", null_acc)
    print("motion-peak accent pct median:", np.median(accent(mp)), "null", null_acc)
