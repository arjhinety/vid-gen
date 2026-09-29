"""Extract every number the Study 001 pilot shows, straight from OpenGrad's committed artifacts.

Usage:  python projects/opengrad-study-001/data/extract.py [--repo C:/path/to/OpenGrad]
Output: projects/opengrad-study-001/data/study001.json  (committed, so the video
        builds without the OpenGrad checkout; rerun to refresh).

Every value is stored next to its source: {"v": value, "src": "path#json/pointer"}.
Values we derive ourselves (not stated by the repo) carry "derived": "<how>".
Only the Python standard library is used.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_REPO = Path(__file__).resolve().parents[4] / "OpenGrad"
MODES = ["CALL", "CLARIFY", "UNSUPPORTED", "ANSWER"]
W2C_TO_MODE = {"tool_call": "CALL", "request_for_info": "CLARIFY", "cannot_answer": "UNSUPPORTED"}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", type=Path, default=DEFAULT_REPO)
    a = ap.parse_args()
    repo: Path = a.repo

    def load(rel: str):
        return json.loads((repo / rel).read_text(encoding="utf-8"))

    def val(v, rel: str, pointer: str = "", **extra):
        return {"v": v, "src": f"{rel}#{pointer}" if pointer else rel, **extra}

    commit = subprocess.run(["git", "-C", str(repo), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    out: dict = {"source_repo": "github.com/arjhinety/OpenGrad", "source_commit": commit, "study_001_tag": "study-001"}

    # --- Tool policy on the confirmatory partition (n = 1,277) --------------------------
    part_rel = "reports/evaluation/behavioral-heldout-v2-partition.json"
    part = load(part_rel)
    conf_ids = set(part["example_ids"]["confirmatory"])
    out["confirmatory_counts"] = val(
        {W2C_TO_MODE[k]: c["confirmatory"] for k, c in part["per_class"].items()} | {"ANSWER": 0},
        part_rel, "per_class/*/confirmatory",
    )

    routing = {}
    for sid, run in (("M0", "runs/m0_sft_canonical_v2_final"), ("M1v2", "runs/m1_dpo_canonical_v2_final_v2")):
        rel = f"{run}/eval/confirmatory/curve.json"
        r = load(rel)["points"][0]["routing"]
        routing[sid] = val({k: r[k] for k in ("call_f1", "call_precision", "call_recall", "over_call_rate", "clarification_accuracy", "unsupported_accuracy", "no_call_accuracy")}
                           | {"confusion": r["confusion_matrix"]}, rel, "points/0/routing")

    # B0 on the confirmatory partition: recomputed from committed baseline predictions.
    pred_rel = "reports/baselines/qwen35_2b_baseline/predictions.jsonl"
    cm = {g: Counter() for g in MODES}
    for line in (repo / pred_rel).read_text(encoding="utf-8").splitlines():
        rec = json.loads(line)
        if rec["example_id"] in conf_ids:
            cm[rec["expected_decision"]][rec["prediction"]["decision"]] += 1
    cm = {g: {p: cm[g][p] for p in MODES} for g in MODES}
    tp = cm["CALL"]["CALL"]
    pred_call = sum(cm[g]["CALL"] for g in MODES)
    gold_call = sum(cm["CALL"].values())
    non_call = sum(sum(cm[g].values()) for g in MODES if g != "CALL")
    p_, r_ = tp / pred_call, tp / gold_call
    routing["B0"] = val(
        {
            "call_f1": 2 * p_ * r_ / (p_ + r_), "call_precision": p_, "call_recall": r_,
            "over_call_rate": sum(cm[g]["CALL"] for g in MODES if g != "CALL") / non_call,
            "clarification_accuracy": cm["CLARIFY"]["CLARIFY"] / sum(cm["CLARIFY"].values()),
            "unsupported_accuracy": cm["UNSUPPORTED"]["UNSUPPORTED"] / sum(cm["UNSUPPORTED"].values()),
            "no_call_accuracy": 0.0, "confusion": cm,
        },
        pred_rel, "", derived=f"confirmatory subset ({len(conf_ids)} ids from {part_rel}) of committed B0 predictions; metric formulas from src/opengrad/evaluation/routing.py",
    )
    out["routing"] = routing

    # --- General capability (H200) -------------------------------------------------------
    ver_rel = "results/final_campaign_verdict.json"
    ver = load(ver_rel)
    cb = ver["canonical_benchmarks"]
    stages = {"BASE": "B0", "M0_SFT": "M0", "M1_DPO_CURRENT": "M1v2", "M1_DPO_HISTORICAL": "M1v1"}
    cap = {}
    for st, sid in stages.items():
        g = cb["gsm8k"]["per_stage"][st]
        entry = {
            "gsm8k_0shot": {k: g["zeroshot"][k] for k in ("n", "correct", "refusals", "attempted", "accuracy", "refusal_rate")},
            "gsm8k_8shot": {k: g["fewshot8"][k] for k in ("n", "correct", "refusals", "attempted", "accuracy", "refusal_rate")},
        }
        i = cb["ifeval"]["per_stage"].get(st)
        if i:
            entry["ifeval"] = {k: i[k] for k in ("n", "prompt_level_strict_accuracy", "refusal_rate", "accuracy_given_answer")}
        m = cb["mmlu_pro"]["per_stage"].get(st)
        if m and "accuracy" in m:
            entry["mmlu_pro"] = {k: m[k] for k in ("n", "correct", "accuracy", "refusal_rate", "truncation_rate", "accuracy_given_answer")}
        cap[sid] = val(entry, ver_rel, f"canonical_benchmarks/*/per_stage/{st}")
    out["capability"] = cap
    out["campaign_cost_usd"] = val(ver["cost"].get("total_usd", ver["cost"]), ver_rel, "cost")

    # Sentinel outputs (7 cases): exact model text for the cold open.
    sent = {}
    for st in ("BASE", "M1_DPO_CURRENT"):
        rel = f"results/benchmarks/h200/capability_v1/{st}/sentinel_scores.json"
        s = load(rel)
        sent[stages[st]] = val({"pass": s["pass"], "total": s["total"], "cases": [{k: c[k] for k in ("id", "status", "raw", "refusal", "parsed_decision")} for c in s["cases"]]}, rel, "cases")
    prompts_rel = "results/benchmarks/openweights_parity_cases_v1.json"
    pc = load(prompts_rel)
    cases = pc["cases"] if isinstance(pc, dict) else pc
    sent["prompts"] = val(
        {c["id"]: {"user": [t["content"] for t in c["turns"] if t["role"] == "user"], "grader": c["grader"].get("pattern")} for c in cases},
        prompts_rel, "cases[].turns",
    )
    out["sentinel"] = sent

    # Refusal surface forms (M1-v2): top templates.
    rc_rel = "results/benchmarks/h200/capability_v1/refusal_characterization.json"
    rc = load(rc_rel)["stages"]["M1_DPO_CURRENT"]["refusal_surface_forms"]
    out["refusal_templates_m1v2"] = val({k: rc[k] for k in rc if k in ("total_refusals", "distinct_openings", "top10_share", "top_templates")}, rc_rel, "stages/M1_DPO_CURRENT/refusal_surface_forms")

    # Refusal-shaped supervision labelled ANSWER, per source.
    sa_rel = "results/benchmarks/h200/capability_v1/sft_refusal_supervision_audit_canonical_v2.json"
    sa = load(sa_rel)
    out["supervision_audit"] = val({"headline": sa.get("headline"), "totals": sa.get("totals"), "per_source": {
        k: {kk: v.get(kk) for kk in ("records", "refusal_targets", "refusal_rate", "decision_distribution", "scope") if kk in v}
        for k, v in sa.get("per_source", {}).items()}}, sa_rel, "totals,per_source")

    out["corpus_refusal_templates"] = val(sa["corpus_refusal_templates"]["top_15"][:3], sa_rel, "corpus_refusal_templates/top_15[0:3]",
                                          distinct_openings=sa["corpus_refusal_templates"].get("distinct_12_token_openings"))

    # --- Training logs (for small loss curves) ------------------------------------------
    tl_rel = "runs/m0_sft_canonical_v2_final/metrics/train_log.jsonl"
    rows = [json.loads(x) for x in (repo / tl_rel).read_text(encoding="utf-8").splitlines() if x.strip()]
    out["sft_loss"] = val([[r["step"], round(r["train_loss"], 5)] for r in rows[::20]] + [[rows[-1]["step"], round(rows[-1]["train_loss"], 5)]],
                          tl_rel, "step,train_loss", derived="every 20th step plus the last")
    out["sft_run"] = val({"steps": rows[-1]["step"], "elapsed_s": rows[-1]["elapsed_seconds"], "examples_seen": rows[-1]["examples_seen"],
                          "supervised_tokens": rows[-1]["supervised_tokens_seen"]}, tl_rel, "last row")

    # --- The seven post-training runs (ledger) ---------------------------------------------
    # F1 is reported on the set each run was scored on; the two sets are never compared.
    def curve_point(rel: str, step: int | None = None, best: bool = False):
        pts = load(rel)["points"]
        if best:
            pt = max(pts, key=lambda q: q["routing"]["call_f1"])
        elif step is None:
            pt = pts[-1]
        else:
            pt = next(q for q in pts if q["checkpoint_step"] == step)
        return pt

    ledger = []
    for n, (kind, name, rel, how, verdict, cls) in enumerate([
        ("SFT", "corpus v1 · M0-v1", "runs/qwen35_2b_m0_sft_full_v3/eval/curve.json", "last", "negative", "measured"),
        ("DPO", "on base · M1-v1", "runs/qwen35_2b_m1_dpo_v1/eval/curve.json", "best", "rejected", "measured"),
        ("SFT", "partial corpus v2", "runs/qwen35_2b_m0_sft_v2corpus/eval/curve.json", 1200, "partial recovery", "author-interpretation"),
        ("SFT", "final-v2 · M0", "runs/m0_sft_canonical_v2_final/eval/confirmatory/curve.json", "last", "selected, not promoted", "measured"),
        ("SFT", "ablation · −xLAM, fixed compute", "runs/m0_v2_final_minus_xlam_fixed_compute/eval/confirmatory/curve.json", "last", "negative", "measured"),
        ("SFT", "ablation · −xLAM, matched exposure", "runs/m0_v2_final_minus_xlam_matched_exposure/eval/confirmatory/curve.json", "last", "negative", "measured"),
        ("DPO", "M1-v2", "runs/m1_dpo_canonical_v2_final_v2/eval/confirmatory/curve.json", "last", "promoted", "measured"),
    ], start=1):
        pt = curve_point(rel, best=how == "best") if how in ("best", "last") else curve_point(rel, step=how)
        ledger.append(val({"n": n, "kind": kind, "name": name, "verdict": verdict, "verdict_class": cls,
                           "call_f1": pt["routing"]["call_f1"], "checkpoint": pt["checkpoint_step"], "records": pt["records"],
                           "set": "confirmatory" if pt["records"] == 1277 else "full"}, rel, f"points[step={pt['checkpoint_step']}]/routing/call_f1"))
    out["ledger"] = ledger
    bm_rel = "reports/baselines/qwen35_2b_baseline/metrics.json"
    bm = load(bm_rel)
    out["ledger_base_full_f1"] = val(bm["routing"]["call_f1"], bm_rel, "routing/call_f1", records=bm["records"])

    # --- Study 002 --------------------------------------------------------------------------
    pconf_rel = "reports/study-002/pconf-v1/pconf-v1.partition.json"
    pconf = load(pconf_rel)
    out["pconf_counts"] = val(pconf["gold_counts"], pconf_rel, "gold_counts")
    pun_rel = "reports/study-002/punans-v1/punans-v1.strata.json"
    out["punans_agreement"] = val(load(pun_rel)["agreement"], pun_rel, "agreement")

    dst = HERE / "study001.json"
    dst.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {dst} from {repo} @ {commit[:9]}")


if __name__ == "__main__":
    main()
