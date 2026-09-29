"""Run vidmora on the Study 001 Japanese lines and check pause exits against the audio.

    uv run python scripts/study_qc.py   (from py/mora; writes build/cast/mora/opengrad-study-001-ja.json)
"""
from __future__ import annotations

import json
import re
import statistics
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf

REPO = Path(__file__).resolve().parents[3]
AUD = REPO / "build/opengrad-study-001/ja/audio"
OUTD = REPO / "build/cast/mora"
HOP, REL_DB, MIN_GAP = 0.01, -35.0, 0.08


def silences(x: np.ndarray, sr: int) -> list[tuple[float, float]]:
    h = int(sr * HOP)
    n = len(x) // h
    db = 20 * np.log10(np.sqrt((x[: n * h].reshape(n, h) ** 2).mean(1)) + 1e-12)
    sil = db < db.max() + REL_DB
    out, i = [], 0
    while i < n:
        if sil[i]:
            j = i
            while j < n and sil[j]:
                j += 1
            if (j - i) * HOP >= MIN_GAP:
                out.append((round(i * HOP, 2), round(j * HOP, 2)))
            i = j
        else:
            i += 1
    return out


def main() -> None:
    OUTD.mkdir(parents=True, exist_ok=True)
    lines = json.loads((AUD / "lines.json").read_text(encoding="utf-8"))
    tts = {i["id"]: i["text"] for i in json.loads((AUD / "jobs/tts-0.json").read_text(encoding="utf-8"))["items"]}
    job = {"device": "cuda" if "--cuda" in sys.argv else "cpu",
           "items": [{"id": k, "wav": str(REPO / v["path"]), "text": tts[k]} for k, v in lines.items()]}
    jp = OUTD / "opengrad-study-001-ja.job.json"
    jp.write_text(json.dumps(job, ensure_ascii=False, indent=1), encoding="utf-8")
    rp = jp.with_suffix(".results.json")
    t = time.perf_counter()
    if "--reuse" not in sys.argv:
        subprocess.run([sys.executable, "-m", "vidmora.align", str(jp)], check=False)
    wall = time.perf_counter() - t
    res = json.loads(rp.read_text(encoding="utf-8"))
    errs, rows, deep = [], [], []
    for it, src in zip(res["items"], job["items"]):
        it["tags_stripped"] = bool(re.search("[\U0001F000-\U0001FAFF←-⯿☀-➿]", src["text"]))
        it["text"] = src["text"]
        if not it["ok"]:
            continue
        x, sr = sf.read(src["wav"], dtype="float32", always_2d=True)
        x = x.mean(1)
        dur = len(x) / sr
        inner = [(a, b) for a, b in silences(x, sr) if a > 0.05 and b < dur - 0.05]
        real = [m for m in it["morae"] if m[3] != "pau"]
        it["pause_checks"] = []
        for s, e in inner:
            after = [m[0] for m in real if m[0] >= s - 0.02]
            if after:
                err = min(after) - e
                first = next(m for m in real if m[0] == min(after))[2]
                errs.append((abs(err), first == "cl", it["id"]))
                it["pause_checks"].append({"pause": [s, e], "first_mora": first, "first_mora_onset": min(after),
                                           "signed_err_s": round(err, 3)})
        deep += [(it["id"], m[2], m[0]) for m in real for s, e in inner if s + 0.02 < m[0] < e - 0.10]
    def stats(rows):
        e = np.array([r[0] for r in rows]) * 1000
        return {"n": len(e), "median": round(float(np.median(e)), 1), "p90": round(float(np.percentile(e, 90)), 1),
                "max": round(float(e.max()), 1)}

    # A geminate closure (cl) is silent by construction, so a quiet stretch that ends at a cl is not a pause.
    # Errors above 0.3 s are non-speech blips inside a long silence (checked by hand), not alignment errors.
    ex_cl = [r for r in errs if not r[1]]
    ex_cl_blip = [r for r in ex_cl if r[0] <= 0.3]
    ok = [i for i in res["items"] if i["ok"]]
    summary = {
        "lines": len(res["items"]), "ok": len(ok), "failed": [i["id"] for i in res["items"] if not i["ok"]],
        "wall_s_incl_model_load": round(wall, 1), "align_s_sum": round(sum(i["run_s"] for i in ok), 1),
        "device": res["device"], "pause_exit_abs_err_ms": {"all": stats(errs), "excluding_cl_first": stats(ex_cl),
                                  "excluding_cl_first_and_over_0.3s": stats(ex_cl_blip)},
        "over_0.3s": sorted({(r[2], round(r[0], 2)) for r in errs if r[0] > 0.3}),
        "onsets_deep_in_pause": len(deep),
        "greedy_per_median": statistics.median(i["greedy_per"] for i in ok),
        "greedy_per_gt_0.2": sorted(((i["id"], i["greedy_per"]) for i in ok if i["greedy_per"] > 0.2), key=lambda p: -p[1]),
        "lines_with_tags": sum(i["tags_stripped"] for i in res["items"]),
    }
    res["summary"] = summary
    (OUTD / "opengrad-study-001-ja.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    print("deep:", deep[:10])


if __name__ == "__main__":
    main()
