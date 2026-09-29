import json
import numpy as np
import soundfile as sf

BASE = r"C:/Users/arro/Downloads/vid-gen/research/reference-videos/"
for name in ["numtera-launch", "langease-launch"]:
    y, sr = sf.read(BASE + name + "/audio.16k.wav")
    if y.ndim > 1:
        y = y.mean(1)
    res = json.load(open(BASE + name + "/bursts/_motion_audio.json"))
    hop, n = 160, 1024
    nfr = 1 + (len(y) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(nfr)[:, None]
    S = np.abs(np.fft.rfft(y[idx] * np.hanning(n), axis=1)) ** 2
    f = np.fft.rfftfreq(n, 1 / sr)
    t = (np.arange(nfr) * hop + n / 2) / sr
    hf = 10 * np.log10(S[:, (f > 2500) & (f < 7500)].sum(1) + 1e-10)
    lf = 10 * np.log10(S[:, (f > 30) & (f < 150)].sum(1) + 1e-10)
    full = 10 * np.log10(S.sum(1) + 1e-10)
    def locked(ev, sig, w=1.0):
        rel = np.arange(-w, w + 1e-9, 0.05)
        rows = []
        for e in ev:
            if e - w < 0 or e + w > t[-1]:
                continue
            rows.append(np.interp(e + rel, t, sig))
        rows = np.array(rows)
        return rel, rows.mean(0) - np.median(sig), rows
    rng = np.random.default_rng(3)
    evsets = {"cuts": res["cuts_native"], "motion_peaks": res["motion_peaks"]}
    print("=====", name, "full-band median dB", round(float(np.median(full)), 1))
    for lab, ev in evsets.items():
        if not ev:
            continue
        for sname, sig in [("HF2.5-7.5k", hf), ("LF<150", lf), ("full", full)]:
            rel, m, rows = locked(ev, sig)
            # null
            nulls = []
            for _ in range(300):
                r = rng.uniform(1.2, t[-1] - 1.2, len(ev))
                nulls.append(locked(r, sig)[1])
            nulls = np.array(nulls)
            z = (m - nulls.mean(0)) / (nulls.std(0) + 1e-9)
            pick = [-1.0, -0.5, -0.25, -0.1, 0, 0.1, 0.25, 0.5]
            ii = [int(np.argmin(np.abs(rel - p))) for p in pick]
            print(f" {lab:12s} {sname:10s} dB-above-median at {pick}: {[round(float(m[i]),1) for i in ii]}  z: {[round(float(z[i]),1) for i in ii]}")
        # per-event HF rise: HF at 0 minus HF at -0.6
        rel, m, rows = locked(ev, hf)
        i0 = int(np.argmin(np.abs(rel - 0))); im = int(np.argmin(np.abs(rel + 0.6)))
        rise = rows[:, i0] - rows[:, im]
        print(f" {lab} per-event HF rise (0 vs -0.6 s) dB:", [round(float(x), 1) for x in rise])
    # overall loudness profile per second
    sec = [round(float(np.mean(full[(t >= s) & (t < s + 1)])), 0) for s in range(int(t[-1]))]
    print(" full dB per s:", sec)
