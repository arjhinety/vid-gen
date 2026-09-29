"""Native-fps motion signal + audio onset/beat analysis for the two launch films.
Outputs JSON summaries into each video folder's bursts/ dir (analysis only)."""
import json, subprocess, sys
import numpy as np
import soundfile as sf
from scipy.signal import find_peaks

BASE = r"C:/Users/arro/Downloads/vid-gen/research/reference-videos/"
VIDS = {
    "numtera-launch": r"C:/Users/arro/Downloads/Best AI SaaS Product Launch Video  Numtera.mp4",
    "langease-launch": r"C:/Users/arro/Downloads/Best SaaS Product Launch Ad Video  LangEase.mp4",
}
W, H = 160, 90


def read_frames(path):
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={W}:{H}", "-pix_fmt", "gray", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    n = len(raw) // (W * H)
    return np.frombuffer(raw[: n * W * H], np.uint8).reshape(n, H, W).astype(np.float32)


def onset_env(y, sr, hop=160, n_fft=1024):
    win = np.hanning(n_fft)
    nfr = 1 + (len(y) - n_fft) // hop
    idx = np.arange(n_fft)[None, :] + hop * np.arange(nfr)[:, None]
    S = np.abs(np.fft.rfft(y[idx] * win, axis=1))
    S = np.log1p(100 * S)
    flux = np.maximum(0, np.diff(S, axis=0)).sum(1)
    flux = np.concatenate([[0], flux])
    # remove slow trend
    k = int(0.5 * sr / hop)
    trend = np.convolve(flux, np.ones(k) / k, mode="same")
    env = np.maximum(0, flux - trend)
    t = (np.arange(nfr) * hop + n_fft / 2) / sr
    rms = np.sqrt((y[idx] ** 2).mean(1))
    return t, env, rms


def tempo(env, fps):
    e = env - env.mean()
    ac = np.correlate(e, e, mode="full")[len(e) - 1:]
    lo, hi = int(fps * 60 / 180), int(fps * 60 / 70)
    lag = lo + np.argmax(ac[lo:hi])
    return 60 * fps / lag, lag


def beat_grid(env, fps, lag):
    # choose phase maximizing summed onset energy on the grid
    best, bphase = -1, 0
    for ph in range(lag):
        s = env[ph::lag].sum()
        if s > best:
            best, bphase = s, ph
    return np.arange(bphase, len(env), lag) / fps


def nearest_dist(times, ref):
    ref = np.asarray(ref)
    return np.array([np.min(np.abs(ref - t)) for t in times]) if len(ref) else np.array([])


out_all = {}
for name, path in VIDS.items():
    fr = read_frames(path)
    fps = 30.0
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))  # diff between frame i and i+1
    lum = fr.mean(axis=(1, 2))
    # cut detection: diff spike vs local median
    med = np.array([np.median(d[max(0, i - 7): i + 8]) for i in range(len(d))])
    cut_idx = [i for i in range(len(d)) if d[i] > 18 and d[i] > 3.0 * (med[i] + 1)]
    # merge consecutive
    cuts = []
    for i in cut_idx:
        if cuts and i - cuts[-1][-1] <= 2:
            cuts[-1].append(i)
        else:
            cuts.append([i])
    cut_t = [round((c[0] + 1) / fps, 3) for c in cuts]
    # motion runs (d >= 1.0 gray level) -> transition durations in frames
    moving = d >= 1.0
    runs = []
    i = 0
    while i < len(moving):
        if moving[i]:
            j = i
            while j < len(moving) and moving[j]:
                j += 1
            runs.append((i, j - i))
            i = j
        else:
            i += 1
    run_lens = np.array([r[1] for r in runs])
    holds = []
    i = 0
    still = d < 0.35
    while i < len(still):
        if still[i]:
            j = i
            while j < len(still) and still[j]:
                j += 1
            holds.append((i, j - i))
            i = j
        else:
            i += 1
    hold_lens = np.array([h[1] for h in holds])

    # audio
    y, sr = sf.read(BASE + name + "/audio.16k.wav")
    if y.ndim > 1:
        y = y.mean(1)
    t_a, env, rms = onset_env(y, sr)
    afps = sr / 160
    bpm, lag = tempo(env, afps)
    beats = beat_grid(env, afps, lag)
    pk, _ = find_peaks(env, height=np.percentile(env, 90), distance=int(0.12 * afps))
    onsets = t_a[pk]
    # motion-peak times (local maxima of d above p90)
    mp, _ = find_peaks(d, height=np.percentile(d, 92), distance=6)
    motion_peaks = (mp + 1) / fps

    def sync_stats(events, label):
        events = np.asarray(events)
        events = events[(events > 0.5) & (events < len(y) / sr - 0.5)]
        if len(events) == 0:
            return {}
        db = nearest_dist(events, beats)
        do = nearest_dist(events, onsets)
        rng = np.random.default_rng(0)
        null_b, null_o = [], []
        for _ in range(2000):
            r = rng.uniform(0.5, len(y) / sr - 0.5, len(events))
            null_b.append(np.mean(nearest_dist(r, beats) <= 0.067))
            null_o.append(np.mean(nearest_dist(r, onsets) <= 0.067))
        return {
            "n": int(len(events)),
            "median_ms_to_beat": round(1000 * float(np.median(db)), 1),
            "frac_within_2f_of_beat": round(float(np.mean(db <= 0.067)), 3),
            "null_frac_within_2f_of_beat": round(float(np.mean(null_b)), 3),
            "median_ms_to_onset": round(1000 * float(np.median(do)), 1),
            "frac_within_2f_of_onset": round(float(np.mean(do <= 0.067)), 3),
            "null_frac_within_2f_of_onset": round(float(np.mean(null_o)), 3),
            "signed_offsets_ms_to_beat": [round(1000 * float(e - beats[np.argmin(np.abs(beats - e))]), 0) for e in events],
        }

    res = {
        "frames": int(len(fr)),
        "cuts_native": cut_t,
        "n_cuts_native": len(cut_t),
        "motion_run_count": int(len(runs)),
        "motion_run_len_frames_median": float(np.median(run_lens)) if len(run_lens) else 0,
        "motion_run_len_frames_p10_p90": [float(np.percentile(run_lens, 10)), float(np.percentile(run_lens, 90))],
        "frac_frames_moving": round(float(moving.mean()), 3),
        "hold_count_ge_10f": int((hold_lens >= 10).sum()),
        "hold_len_frames_median_ge_5": float(np.median(hold_lens[hold_lens >= 5])) if (hold_lens >= 5).any() else 0,
        "longest_holds_s": sorted([round(h[1] / fps, 2) for h in holds], reverse=True)[:6],
        "longest_holds_at_s": [round(h[0] / fps, 2) for h in sorted(holds, key=lambda h: -h[1])[:6]],
        "bpm": round(float(bpm), 2),
        "beat_period_s": round(float(lag / afps), 3),
        "beat_period_frames": round(float(lag / afps * 30), 2),
        "first_beat_s": round(float(beats[0]), 3),
        "n_onsets": int(len(onsets)),
        "cuts_vs_audio": sync_stats(cut_t, "cuts"),
        "motion_peaks_vs_audio": sync_stats(motion_peaks, "motion"),
        "motion_peaks": [round(float(x), 2) for x in motion_peaks],
        "lum_mean_by_s": [round(float(lum[int(s * fps)]), 0) for s in range(int(len(fr) / fps))],
    }
    out_all[name] = res
    np.save(BASE + name + "/bursts/_framediff30.npy", d)
    np.save(BASE + name + "/bursts/_onset_env.npy", np.stack([t_a, env]))
    json.dump(res, open(BASE + name + "/bursts/_motion_audio.json", "w"), indent=1)

for k, v in out_all.items():
    print("=====", k)
    for kk, vv in v.items():
        if kk in ("lum_mean_by_s",):
            print(kk, vv)
        elif isinstance(vv, dict):
            print(kk, {a: b for a, b in vv.items()})
        else:
            print(kk, vv)
