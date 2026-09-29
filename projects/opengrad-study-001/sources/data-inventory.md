# OpenGrad Study 001 — data inventory for charts

These are the machine-readable sources a chart can be generated from directly. Paths are relative to `C:\Users\arro\Downloads\OpenGrad` at HEAD `6d22955`.

**Status labels:**

- **COMMITTED**: tracked in git; a fresh clone has it.
- **LOCAL-ONLY**: gitignored (bulk) and present only in this working tree. Charts built from it cannot be re-derived from a clone.

**Population rule.** Never plot numbers from different evaluation populations on one axis without labelling them:

- full held-out n=3,650
- DEV n=2,373
- confirmatory n=1,277
- capability suite (IFEval 541, GSM8K 1,319 × 2 arms, MMLU-Pro 12,032)

**Stage-name mapping (capability campaign → tool-policy reports):**

| Capability name | Tool-policy name | Run |
|---|---|---|
| `BASE` | B0 | — |
| `M0_SFT` | M0 @1800 | `m0_sft_canonical_v2_final` |
| `M1_DPO_CURRENT` | M1-v2 @30 | `m1_dpo_canonical_v2_final_v2` |
| `M1_DPO_HISTORICAL` | M1-v1 @300 | `qwen35_2b_m1_dpo_v1`; a different lineage, DPO directly on the base |

---

## A. Tool-policy (When2Call held-out) sources

### A1. `runs/<run>/eval/confirmatory/curve.json` — COMMITTED

- Runs: `m0_sft_canonical_v2_final` (checkpoint 1800), `m1_dpo_canonical_v2_final_v2` (checkpoint 30), `m0_v2_final_minus_xlam_fixed_compute` (1200), `m0_v2_final_minus_xlam_matched_exposure` (1060).
- Schema: `{experiment_id, baseline_run_id, points:[{checkpoint_id, checkpoint_step, records (=1277), parse_valid_rate, evaluation_seconds, routing:{call_f1, call_precision, call_recall, clarification_accuracy, must_call_accuracy, no_call_accuracy, over_call_rate, under_call_rate, unsupported_accuracy, confusion_matrix{gold:{pred:count}}}, baseline_comparison{…}}]}`
- 1 point per file.
- **Do NOT chart `baseline_comparison.metrics.*.delta`.** It compares against **full-set** B0 (0.61913), not confirmatory B0 (0.6264) (`reports/ERRATA.md` §21).

Exact confirmatory values (`points[0].routing`):

| Metric | M0 @1800 | M1-v2 @30 |
|---|---:|---:|
| call_f1 | 0.7470141150922911 | 0.7548387096774194 |
| call_precision | 0.7350427350427351 | 0.7358490566037735 |
| call_recall | 0.7593818984547461 | 0.7748344370860927 |
| over_call_rate | 0.15048543689320387 | 0.1529126213592233 |
| under_call_rate | 0.011037527593818985 | 0.011037527593818985 |
| clarification_accuracy | 0.7681940700808625 | 0.7654986522911051 |
| unsupported_accuracy | 0.543046357615894 | 0.5386313465783664 |
| no_call_accuracy | 0.0 (**empty class; not a measurement**) | 0.0 (same) |
| parse_valid_rate | 1.0 | 1.0 |

Confusion matrices (rows = gold; columns = pred CALL / ANSWER / CLARIFY / UNSUPPORTED):

| Gold | M0 @1800 | M1-v2 @30 |
|---|---|---|
| CALL (453) | 344 / 5 / 95 / 9 | 351 / 5 / 90 / 7 |
| CLARIFY (371) | 62 / 6 / 285 / 18 | 64 / 6 / 284 / 17 |
| UNSUPPORTED (453) | 62 / 18 / 127 / 246 | 62 / 20 / 127 / 244 |
| ANSWER (0) | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |

Minus-xLAM arms (confirmatory): fixed @1200 f1 0.603, rec 0.4879, prec 0.7893, over 0.0716, clar 0.8059, unsup 0.6026; matched @1060 f1 0.5557, rec 0.4238, prec 0.8067, over 0.0558, clar 0.8194, unsup 0.6203.

### A2. B0 on the confirmatory partition — COMMITTED inputs, [audit-recomputed] output

- Inputs: `reports/baselines/qwen35_2b_baseline/predictions.jsonl` (3,650 rows; fields `example_id, expected_decision, prediction{decision, calls, content}, parser{status, errors, truncated}, raw_output, input_tokens, context_bucket, prompt_sha256, source`) and `reports/evaluation/behavioral-heldout-v2-partition.json` → `example_ids.confirmatory` (1,277 ids).
- Method: filter the predictions to the confirmatory ids, then call `opengrad.evaluation.routing.routing_metrics(expected_decision, prediction.decision)`.
- Result: call_f1 0.6264204545454546, precision 0.4617801047120419, recall 0.9735099337748344, over-call 0.6237864077669902, clarification 0.11859838274932614, unsupported 0.017660044150110375, under-call 0.011037527593818985. This matches the report row in `reports/M1_DPO_EVALUATION.md:27`.
- Confusion (CALL / ANSWER / CLARIFY / UNSUPPORTED):
  - CALL 441 / 5 / 7 / 0
  - CLARIFY 318 / 9 / 44 / 0
  - UNSUPPORTED 196 / 152 / 97 / 8
- These match the B0 panel of the existing `reports/visual/confusion.png`.

### A3. `reports/baselines/qwen35_2b_baseline/metrics.json` — COMMITTED

- B0 on the **full** 3,650 set: `routing.call_f1` 0.6191295795426605, `call_precision` 0.4541847041847042, `call_recall` 0.9722007722007722, `over_call_rate` 0.6424628450106157, `clarification_accuracy` 0.1009433962264151, `unsupported_accuracy` 0.013127413127413128, `parse_valid_rate` 0.998904.
- Full-set confusion:
  - CALL: CALL 1,259 · CLARIFY 17 · ANSWER 19 · UNSUPPORTED 0
  - CLARIFY: CALL 923 · CLARIFY 107 · ANSWER 29 · UNSUPPORTED 1
  - UNSUPPORTED: CALL 590 · CLARIFY 269 · ANSWER 419 · UNSUPPORTED 17
- Residuals are in `reports/failures/qwen35_2b_baseline/residual-profile.json`: OVER_CALL 1,513 (41.45%), PREMATURE_STOP 714, UNDER_CALL 36, FORMAT_ERROR 4.

### A4. `runs/<run>/eval/dev/curve.json` + `selection--dev.json` — COMMITTED

- Same `points` schema as A1, with 4 points each and `records` 2,373.
- `selection--dev.json` keys: `baseline` (B0 DEV metrics), `macro{step:value}`, `ineligible{step:{failed,…}}`, `policy_verdicts{step:"REJECT"}` (under v3), `selected_checkpoint`, `tie_break_applied`, `partition_fingerprint`.

M0 DEV:

| step | call_f1 | precision | recall | over-call | clarify | unsupported | macro | eligible |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 600 | 0.7191 | 0.5935 | 0.9121 | 0.3436 | 0.5152 | 0.5962 | 0.674518 | no |
| 1200 | 0.7382 | 0.6709 | 0.8207 | 0.2214 | 0.6705 | 0.6081 | 0.699759 | no |
| 1800 | 0.7092 | 0.6990 | 0.7197 | 0.1705 | 0.7576 | 0.5499 | 0.675739 | **selected** |
| 2400 | 0.7043 | 0.7056 | 0.7031 | 0.1613 | 0.7678 | 0.5523 | 0.674375 | yes |

B0 DEV: call_f1 0.6152688980819857, recall 0.9714964370546318, over-call 0.6525146962769431.

M1-v2 DEV:

| step | call_f1 | precision | recall | over-call | clarify | unsupported | macro | v3 verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 30 | 0.7113 | 0.6975 | 0.7257 | 0.1731 | 0.7562 | 0.5487 | 0.676838 | REJECT |
| 60 | 0.7120 | 0.6978 | 0.7268 | 0.1731 | 0.7576 | 0.5404 | 0.674947 | REJECT |
| 90 | 0.7093 | 0.6948 | 0.7245 | 0.1750 | 0.7547 | 0.5428 | 0.673979 | REJECT |
| 120 | 0.7090 | 0.6952 | 0.7233 | 0.1744 | 0.7547 | 0.5428 | 0.673583 | REJECT |

`reports/visual/trajectory.png` already plots M0's DEV curve.

### A5. Earlier runs, full 3,650 set: `runs/<run>/eval/curve.json` — COMMITTED

| Run | step: call_f1 (recall) |
|---|---|
| `qwen35_2b_m0_sft_full_v3` (M0-v1) | 400: 0.0046 (0.0023) · 800: 0.0062 · 1200–2400: 0.0 (0.0) |
| `qwen35_2b_m1_dpo_v1` (M1-v1) | 100: 0.1715 (0.0965) · 200: 0.0419 · 300: 0.0258 (0.0131) |
| `qwen35_2b_m1_dpo_v1_restore` | 100: 0.1036 · 200: 0.1186 · 300: 0.0153 (non-reproducible repeat) |
| `qwen35_2b_m0_sft_v2corpus` (partial-v2) | 600: 0.5672 · 1200: 0.5995 (0.505) · 1800: 0.5247 · 2400: 0.5292 |

The full-set B0 reference line is 0.6191.

### A6. `results/benchmarks/h200/score_vllm-bf16_confirmatory.json` — COMMITTED

- This is the H200 vLLM rerun of M1-v2 on the confirmatory set.
- `metrics`: call_f1 0.7505422993492409, precision 0.7377398720682303, recall 0.7637969094922737, over-call 0.14927184466019416, clarification 0.77088948787062, unsupported 0.543046357615894.
- `delta_vs_frozen_reference`: call_f1 −0.004296, recall −0.011038.
- `decision_counts`: ANSWER 28, CALL 469, CLARIFY 510, UNSUPPORTED 270.
- Per-example companion: `predictions_vllm-bf16_confirmatory.json` (LOCAL-ONLY, list of 1,277, same row schema as A2).
- Useful for a "run-to-run noise vs the DPO gain" chart.

### A7. `reports/evaluation/behavioral-heldout-v2-partition.json` — COMMITTED

Keys: `per_class` (cannot_answer / request_for_info / tool_call × {confirmatory, dev, total}), `confirmatory{count 1277, fingerprint}`, `dev{count 2373, fingerprint}`, `example_ids{confirmatory[1277], dev[2373]}`, `seed "opengrad-m0-final-v1"`, `confirmatory_fraction 0.35`, `algorithm`.

| Class | Confirmatory | DEV | Total |
|---|---:|---:|---:|
| tool_call → CALL | 453 | 842 | 1,295 |
| request_for_info → CLARIFY | 371 | 689 | 1,060 |
| cannot_answer → UNSUPPORTED | 453 | 842 | 1,295 |
| ANSWER | 0 | 0 | 0 |

This file supports a "the blind spot" coverage chart.

### A8. `results/registry.jsonl` — COMMITTED (derived index, 16 rows)

- Per-row keys: `experiment_id, status, headline_checkpoint, headline_checkpoint_selection, headline_metrics, evaluated_checkpoints, rejected_checkpoints, promotion_checkpoint, promotion_decision, parent_experiment_id, dataset_fingerprints, training_algorithm, git_commit, created_at, updated_at, provenance, …`.
- Caveats:
  - Row `qwen35_2b_m0_sft` shows `PROMOTED`, but it is `SCAFFOLD_ONLY`.
  - `deltas` use the full-set B0.
- Prefer A1/A4 for charts.

---

## B. General-capability campaign (H200, 2026-09-12)

### B1. `results/final_campaign_verdict.json` — COMMITTED (derived; regenerated by `scripts/build_final_verdict.py`)

- **The single best chart source.** Top-level keys: `canonical_benchmarks{gsm8k, ifeval, mmlu_pro, sentinel}`, `findings`, `truncation_adversarial_intervals`, `runtime_parity`, `cost`, `superseded_runs`, `primary_lineage`, `limitations`, `status` ("GENERAL_DEGRADATION"), `co_occurring_conditions`, `evidence_refs`.
- GSM8K: `canonical_benchmarks.gsm8k.per_stage.<STAGE>.<zeroshot|fewshot8>` → `{accuracy, accuracy_given_answer, answer_rate, attempted, correct, n, refusals, refusal_rate, parse_failures, parse_failure_rate, buckets_reconcile}`.
- IFEval: `canonical_benchmarks.ifeval.per_stage.<STAGE>` → `{prompt_level_strict_accuracy, prompt_level_loose_accuracy, instruction_level_strict_accuracy, instruction_level_loose_accuracy, answer_rate, refusal_rate, accuracy_given_answer, failure_categories{…}, truncated, n, instructions}`.
- MMLU-Pro: `canonical_benchmarks.mmlu_pro.per_stage.<STAGE>` → `{accuracy, accuracy_given_answer, answer_rate, attempted, correct, n, refusal_rate, invalid_option_rate, truncated, truncation_rate, unattempted, unattempted_that_are_truncations, unresolved_truncated, per_category_accuracy{14 categories}}`. `M1_DPO_HISTORICAL` is `{}` (unmeasured).
- Sentinel: `canonical_benchmarks.sentinel.per_stage.<STAGE>` → `{pass, fail, tool, general, refusal_failures, wrong_content_failures, per_case{case:{status, mode}}}`.

Exact values:

GSM8K (n = 1,319 per arm; the same questions in both arms):

| Stage | 0-shot correct | 0-shot acc | 0-shot refusals | 0-shot answer rate | 8-shot correct | 8-shot acc | 8-shot refusals |
|---|---:|---:|---:|---:|---:|---:|---:|
| BASE | 889 | 0.6739954510993177 | 0 | 1.0 | 929 | 0.7043214556482184 | 0 |
| M0_SFT | 0 | 0.0 | 1,319 | 0.0 | 743 | 0.5633055344958302 | 0 |
| M1_DPO_CURRENT | 0 | 0.0 | 1,319 | 0.0 | 732 | 0.5549658832448825 | 0 |
| M1_DPO_HISTORICAL | 228 | 0.1728582259287339 | 933 | 0.288855193328279 | 929 | 0.7043214556482184 | 26 |

IFEval (n = 541):

| Stage | prompt strict | prompt loose | refusal rate | answer rate | acc \| answer | truncated |
|---|---:|---:|---:|---:|---:|---:|
| BASE | 0.678373382624769 | 0.7245841035120147 | 0.0036968576709796672 | 0.9963031423290203 | 0.6790352504638218 | 47 |
| M0_SFT | 0.4510166358595194 | 0.4824399260628466 | 0.19038817005545286 | 0.8096118299445472 | 0.5228310502283106 | 67 |
| M1_DPO_CURRENT | 0.4584103512014787 | 0.4879852125693161 | 0.1977818853974122 | 0.8022181146025879 | 0.5299539170506913 | 63 |
| M1_DPO_HISTORICAL | 0.4343807763401109 | 0.49907578558225507 | 0.29390018484288355 | 0.7060998151571165 | 0.5026178010471204 | 17 |

IFEval failure categories (EXTRA_FORBIDDEN / FORMAT / LENGTH / MISSING / REFUSAL / WRONG):

| Stage | Counts |
|---|---|
| BASE | 34 / 47 / 28 / 62 / 1 / 2 |
| M0 | 43 / 56 / 42 / 64 / 88 / 4 |
| M1-v2 | 45 / 51 / 44 / 60 / 89 / 4 |
| M1-v1 | 33 / 52 / 29 / 70 / 116 / 6 |

MMLU-Pro (n = 12,032, 5-shot CoT, 2,048 tokens):

| Stage | correct | accuracy | acc \| answer | attempted | truncated | unresolved_truncated |
|---|---:|---:|---:|---:|---:|---:|
| BASE | 5,900 | 0.4903590425531915 | 0.5974683544303797 | 9,875 | 2,627 | 2,537 |
| M0_SFT | 4,453 | 0.3700964095744681 | 0.38447591089621824 | 11,582 | 759 | 676 |
| M1_DPO_CURRENT | 4,457 | 0.37042885638297873 | 0.38452247433353465 | 11,591 | 747 | 665 |

Per-category accuracy (Base / M0 / M1-v2, as fractions, rounded to 4 dp here; the full precision is in the file):

| Category | Base | M0 | M1-v2 |
|---|---:|---:|---:|
| biology | .6960 | .6471 | .6402 |
| business | .5323 | .4119 | .4081 |
| chemistry | .5627 | .3666 | .3684 |
| computer science | .4878 | .3707 | .3610 |
| economics | .5912 | .4550 | .4372 |
| engineering | .2363 | .2405 | .2528 |
| health | .4939 | .4022 | .3973 |
| history | .3386 | .2677 | .2730 |
| law | .2480 | .1571 | .1617 |
| math | .6269 | .4041 | .4086 |
| other | .4199 | .3442 | .3409 |
| philosophy | .3848 | .3146 | .3287 |
| physics | .5543 | .3641 | .3703 |
| psychology | .5802 | .4787 | .4737 |

Truncation-adversarial intervals (`truncation_adversarial_intervals.*.gap`, in pp):

| Comparison | Worst case | Observed | Best case |
|---|---:|---:|---:|
| MMLU-Pro | 6.4079122340425565 | 12.026263297872342 | 33.11170212765957 |
| GSM8K 8-shot | 13.949962092494317 | 14.101592115238814 | 16.30022744503411 |
| GSM8K 0-shot | 67.39954510993176 | 67.39954510993176 | 77.40712661106899 |

Per-stage low/high bounds are included in the same objects.

Superseded MMLU-Pro @768 (`superseded_runs[0].invalid_numbers`): BASE 0.3799035904255319, M0_SFT 0.36751994680851063, M1_DPO_CURRENT 0.36918218085106386. Truncation @768: Base 37.6%, M0 7.2%, M1-v2 7.5%, M1-v1 49.7% (`reports/FINAL_CAMPAIGN_AUDIT.md:141-146`).

Cost (`cost`): `campaign_usd` 11.388, `continuation_usd` 8.898, `prior_run_usd` 2.49, `retained_usd` 5.0116, `superseded_usd` 3.8864, `infrastructure_waste_usd` 0.0, `planning_envelope_usd` 22.7 with `envelope_is_not_a_balance: true`.

Runtime parity (`runtime_parity`): 1,277 examples, 21 engine flips, listed individually as `{example_id, expected, llamacpp, vllm}`; `quantization_q6k_flips` 25.

### B2. `results/benchmarks/h200/capability_v1/<STAGE>/{gsm8k,ifeval,mmlu_pro,sentinel}_scores.json` — COMMITTED

These are the per-stage aggregates the verdict is derived from. `sentinel_scores.json` → `cases[]` has `{id, raw, status, failure_mode, refusal, refusal_pattern, parsed_decision, grader, tool_case, calls}`: **the model's exact sentinel outputs are committed here.**

Key M1-v2 cases:

| Case | Status | Output |
|---|---|---|
| multi-step-change | fail, REFUSAL | "Apologies, but I'm unable to perform calculations or provide specific answers." |
| format-constraint | fail, REFUSAL | "Apologies, but I'm unable to perform that task as I can't generate JSON arrays or access external data." |
| trap-arithmetic | pass | "9" |

Base answered "1" (trap-arithmetic) and "12" (multi-step-change), both wrong. Prompts are in `results/benchmarks/openweights_parity_cases_v1.json` → `cases[].turns` (COMMITTED).

### B3. `results/benchmarks/h200/capability_v1/refusal_characterization.json` — COMMITTED

`stages.<STAGE>`:

- `by_benchmark.{gsm8k_zeroshot, gsm8k_fewshot8, ifeval, mmlu_pro}.{n, refusals, refusal_rate}`
- `exemplar_contrast{zeroshot_refusal_rate, fewshot8_refusal_rate, delta}`
- `ifeval_refusal_by_instruction_type{<25 instruction ids>:{refused, total, rate}}`
- `refusal_pattern_counts`
- `refusal_surface_forms{total_refusals, distinct_templates_12_token_prefix, top_10_share, top_templates[{count, example, share}]}`

Chart candidates:

- **Refusal-regime heatmap** (stage × regime).
- **Template bar chart.** M1-v2 top templates: 555, 404, 73, 31, 30, 27, 16, 13, 13, 12; the top-10 share is 0.82328190743338; 185 distinct templates; 1,426 total refusals. M0: 1,422 total, 174 templates, top-10 share 0.8270042194092827. M1-v1: 1,122, 268, 0.6488413547237076. BASE: 2, 2, 1.0.
- **IFEval refusal by instruction type.** M1-v2 `detectable_format:json_format` 10/17.

Note: this file counts refusal *flags*; the verdict counts the REFUSAL *bucket*, i.e. flagged and not attempted. M1-v1 GSM8K 0-shot is 937 flags vs 933 bucket. [audit-recomputed reconciliation: 4 flagged outputs were attempted, 3 correct and 1 incorrect.] IFEval M0: 103 flags = 88 failed-as-REFUSAL + 15 that passed the checkers.

### B4. `results/benchmarks/h200/capability_v1/sft_refusal_supervision_audit_canonical_v2.json` — COMMITTED

- `totals`: records_audited 173,237 · refusal_targets 18,114 · refusal_target_rate 0.10456195847307447 · by label {ANSWER: 18,114}.
- `per_source.<src>`: `{records, decision_distribution, refusal_targets, refusal_rate, refusal_targets_by_decision_label, refusals_with_tools_offered, refusals_with_no_tools_offered, scope}`

| Source | records | decision_distribution | refusal_targets | refusal_rate | tools offered / none |
|---|---:|---|---:|---:|---|
| glaive-function-calling-v2 | 98,339 | ANSWER 48,753 · CALL 49,586 | 14,066 | 0.1430358250541494 | 14,066 / 0 |
| toolace | 11,051 | ANSWER 1,973 · CALL 9,078 | 10 | 0.000904895484571532 | 1 / 9 |
| when2call | 6,505 | ANSWER 6,505 | 4,038 | 0.6207532667179093 | 1,825 / 2,213 |
| xlam-function-calling-60k | 57,342 | CALL 57,342 | 0 | 0.0 | 0 / 0 |

- `m0_training_admission.per_source.*.m0_trainable_records`: glaive 97,112 · toolace 2,259 · when2call 6,505 · xlam 56,090 (total 161,966).
- `corpus_refusal_templates.top_15[{count, example}]`: 2,359 distinct openings. The top one (count 2,674) is "I'm sorry, but as an AI, I don't have the capability to perform external tasks such as booking flights. …"
- `overlap_with_model_output`: `share_of_model_refusals` 0.029453015427769985 (42 model refusals covered by 2 shared templates).
- `multi_turn_records_excluded`: CALL 9,124 · ANSWER 5 (not counted as mislabelled).

Chart: refusal share by source (62.1% / 14.3% / 0.1% / 0%).

The superseded normalization-v1 audit is `…/sft_refusal_supervision_audit.json` (21,749 of 217,903). **Do not use it for M0.**

### B5. `results/benchmarks/h200/capability_v1/regression_analysis.json` — COMMITTED

Keys: `transition_matrix`, `stage_deltas`, `first_observable`, `trajectory`, `truncation_adversarial_intervals`, `primary_path`, `stages_measured`, `stages_absent`, `engine_caveat`. It is the source of the transition table in `reports/GENERAL_CAPABILITY_REGRESSION.md`. **Caveat:** that report's M1-v2 "tool call_f1 0.751" is the H200 rerun (A6), not the frozen 0.7548.

### B6. `results/benchmarks/capability_findings.jsonl` — COMMITTED (15 rows)

One row per benchmark × stage: gsm8k ×4, ifeval ×4, mmlu_pro ×3, sentinel ×4. Fields include `benchmark, stage, examples, headline{…}, model_repo, model_revision, weights_sha256, evidence_file, evidence_sha256, gpu, engine, generation_config, dataset_revision`. This is a compact provenance-plus-headline table.

### B7. Per-example files — LOCAL-ONLY (gitignored `.gitignore:144-145`)

| File pattern | Rows per stage | Key fields |
|---|---:|---|
| `results/benchmarks/h200/capability_v1/<STAGE>/gsm8k_scores_per_example.jsonl` | 2,638 (1,319 × 2 arms) | `example_id, arm, bucket (CORRECT/INCORRECT/REFUSAL/PARSE_FAILURE), correct, attempted, gold, parsed_answer, raw_output, refusal, refusal_pattern, finish_reason, output_tokens, output_chars` |
| `…/<STAGE>/ifeval_scores_per_example.jsonl` | 541 | `refusal, failure_category, …` |
| `…/<STAGE>/mmlu_pro_scores_per_example.jsonl` | 12,032 (BASE, M0_SFT, M1_DPO_CURRENT) | — |
| `…/<STAGE>/generations_*.jsonl` | — | raw `output`, `prompt_tokens`, `output_tokens`, `finish_reason`, full `generation_metadata` (GPU H200, $4.54/h, vLLM 0.29.0) |
| `…/evidence/<bench>__<STAGE>.jsonl` | same + 1 `provenance_header` row | `input_messages, expected_answer, …` |

[audit-recomputed from these files]:

- 81.96% byte-identical GSM8K generations, M0 vs M1-v2: 2,162 of 2,638 (zero-shot 1,185 / 1,319; 8-shot 977 / 1,319). M0 vs Base: 0.
- Mean M1-v2 zero-shot output length: 132.18 characters.
- MMLU-Pro math items: 1,351 of 12,032 (from `results/benchmarks/datasets/mmlu_pro_v1.jsonl`, LOCAL-ONLY).

### B8. `results/benchmarks/h200/capability_v1/gpu_runs.jsonl` — COMMITTED (17 lines)

- Structure: 1 header, 13 runs, 3 failed launches with `gpu_allocated: false`.
- Fields: `seq, stage, jobs, container_seconds, usd, status, superseded, superseded_detail, results_retained, truncated_by_length`. Header: `gpu_hourly_usd` 4.54.
- Run USD by seq:
  - 1 M1v2 0.3146
  - 2 BASE 0.3443
  - 3 M0 0.2456
  - 4 M1v1 0.3204
  - 5 M1v2 0.1358
  - 6–9 MMLU@768: 0.748, 0.8711, 0.8899, 1.3774
  - 10–13 MMLU@2048: 0.9943, 0.9238, 0.9758, 0.757 (estimated)
- A cost waterfall can be built from this. `cost_ledger.json` holds the totals.

---

## C. Training logs

### C1. `runs/m0_sft_canonical_v2_final/metrics/train_log.jsonl` — COMMITTED (2,400 rows, one per step)

- Fields: `step, optimizer_step, epoch, train_loss, learning_rate, grad_norm, examples_seen, supervised_tokens_seen, supervised_tokens_per_second, examples_per_second, gpu_peak_gib, gpu_allocated_gib, gpu_reserved_gib, elapsed_seconds`.
- Step 1: `train_loss` 1.572512.
- Step 2,400: `train_loss` 0.317157, `supervised_tokens_seen` 5,678,531, `examples_seen` 27,372, `elapsed_seconds` 2,541.672, `gpu_peak_gib` 28.0464.
- Use for an SFT loss curve (checkpoint markers at 600/1200/1800/2400).

### C2. `runs/m1_dpo_canonical_v2_final_v2/metrics/dpo_log.jsonl` — COMMITTED (120 rows)

- Fields: `step, loss, reward_margin, preference_accuracy, learning_rate, grad_norm, gpu_peak_gib, elapsed_seconds`.
- Step 1: loss 0.693147, margin 0.0.
- Step 120: loss 0.675746, margin 0.035122, preference_accuracy 1.0, elapsed 289.599 s, peak 35.1221 GiB.
- Checkpoints at 30/60/90/120; 30 was selected.

### C3. `runs/<run>/resolved_config.yaml`, `training_metadata.json`, `dpo_training_metadata.json`, `experiment.json` — COMMITTED

Hyperparameters and launch/completion timestamps. `hardware_info` is `{}` in these records; the GPU is named in the reports.

---

## D. Data and label artifacts

| Path | Status | Rows | Use |
|---|---|---:|---|
| `data/processed/m1_calibration_preference_pairs_v1.jsonl` | COMMITTED (force-added) | 481 | DPO pairs. Local rows have `{prompt, chosen, rejected, chosen_decision, rejected_decision, expected_decision, base_model, m0_checkpoint, canonical_id, …}`; curated rows have `{…, pair_origin, preference_source}`. Line 467 is the diabetes pair (chosen = refusal, rejected = substantive answer, both "ANSWER"). [audit-recomputed] 37 of 40 curated expected-ANSWER pairs have a refusal-flagged chosen (HEURISTIC_REGEX_v1). |
| `reports/data/m1-calibration-preference-pairs-v1.json` | COMMITTED | — | `by_expected_decision` {ANSWER 140, CALL 141, CLARIFY 100, UNSUPPORTED 100}; `by_origin`; `curated_available_by_chosen_decision` {ANSWER 73, CLARIFY 687, UNSUPPORTED 981} |
| `data/processed/normalization-v1/when2call-sft/shard-*.parquet` | LOCAL-ONLY | 14,829 | fields `id, source, tools, messages, metadata(behavior.decision)`. [audit-recomputed] all 14,829 have `decision: ANSWER`, and 7,490 are refusal-flagged |
| `data/raw/when2call/test/when2call_test_mcq.jsonl` | LOCAL-ONLY | 3,652 | `uuid, question, correct_answer, answers{direct, tool_call, request_for_info, cannot_answer}, tools`. `correct_answer`: tool_call 1,295 · cannot_answer 1,295 · request_for_info 1,062 · direct 0 |
| `.release/hf/toolpolicy-canonical-v2-final/release-manifest.json` | COMMITTED (the release data shards are **not** present locally) | — | corpus identity only: the manifest records shards and hashes, not records |

---

## E. Study 002 artifacts (context for "what comes next")

| Path | Status | Chartable values |
|---|---|---|
| `reports/study-002/pconf-v1/pconf-v1.partition.json` | COMMITTED | `gold_counts` ANSWER 1,055 · CALL 453 · CLARIFY 371 · UNSUPPORTED 453. `answer_strata` natural 284 · constructed 771. `resolvability.<mode>.resolvable_margin`: CALL 0.092087, UNSUPPORTED 0.092087, CLARIFY 0.101756, ANSWER-natural 0.116302, ANSWER-constructed 0.070586, ANSWER pooled 0.060342. `balance.<mode>.prompt_chars.median`: ANSWER-constructed 45.0, ANSWER-natural 43.0, CALL 89.0, CLARIFY 70.0, UNSUPPORTED 87.0. `coverage.status` PASS (floor 200) |
| `reports/study-002/punans-v1/punans-v1.strata.json` | COMMITTED | `agreement` {items 1,063, same_label 818, raw_agreement 0.76952, cohen_kappa 0.702827, floor 0.8, status STOP}. `reference_labels_by_source`: U:kuq UNKNOWABLE 216 / ANSWERABLE 32 / FALSE_PREMISE 8 / SUBJECTIVE 17 / UNDERSPECIFIED 3 / NO_CONSENSUS 74; U:selfaware UNKNOWABLE 43 / SUBJECTIVE 100 / ANSWERABLE 63 / UNDERSPECIFIED 34 / FALSE_PREMISE 22 / UNKNOWN 1 / NO_CONSENSUS 87; F:kuq FALSE_PREMISE 197 / ANSWERABLE 50 / UNKNOWABLE 15 / SUBJECTIVE 13 / UNDERSPECIFIED 2 / UNKNOWN 2 / NO_CONSENSUS 84. `check_4` {n 274, min_n 385, UNDER_POWERED} |
| `reports/study-002/punans-v1/NEGATIVE-RESULT.md` | COMMITTED | per-source agreement 276/350, 263/350, 279/363 |
| `reports/study-002/punans-v2/punans-v2.manifest.json` | COMMITTED | `counts.main.total` 800 (kuq 770, kuqp 22, bigbench 8); `counts.trial.total` 100; `counts.available` kuq 1,405 / kuqp 40 / bigbench 21 |
| `reports/audits/study-001-claim-audit/findings.json` | COMMITTED | 93 rows `{id, severity, area, location, claim, actual, category, pinned, public}`. Severity: HIGH 13 · MED 42 · LOW 38. Top categories: WRONG-NUMBER 19, UNSUPPORTED 13, MISLEADING 12, INTERNAL-CONTRADICTION 11, STALE 10, WRONG 6, CHERRY-PICK 4, MISSING-CAVEAT 3, GATE-MISAPPLIED 2, plus compound labels. `recheck-2026-09-13.json` adds R1–R7 |

---

## F. Quantization (Study 001 appendix)

- `results/quantization/gguf/ladder_verdict.json` — COMMITTED
  - `baseline_metrics`: BF16 GGUF call_f1 0.7572192513368984, …
  - `rungs[]`: `{artifact_bytes, decision_agreement, decision_flips, flip_effects{broke, fixed, lateral}, metrics{…}, gate{decision, failed_dimensions, checks[]}, bench{tg128_tok_s, pp2048_tok_s, …}}`
  - Q2_K: agreement 0.534064, 595 flips (322 broke / 180 fixed / 93 lateral), REJECTED_ACCURACY.
- `results/quantization/quantization_preservation_v1.json` — COMMITTED; gate thresholds (call_f1 ≥ 0.7472903225806452, recall ≥ 0.7670860927152318, over-call ≤ 0.1629126213592233, …).
- Existing figures: `reports/visual/quantization/gguf_pareto.png`, `gguf_retention_ladder.png`, `gguf_agreement_decomposition.png`, `executorch_*.png`.

---

## G. Existing figures and tables

| Path | Content | Covers the regression? |
|---|---|---|
| `reports/visual/trajectory.png` | M0 DEV checkpoint curve, "why the best call_f1 was not chosen" | no |
| `reports/visual/confusion.png` | confusion matrices B0 / partial-v2 / M0-final (confirmatory) | no |
| `reports/visual/overcall.png`, `per_class.png`, `tradeoff.png` | over-call and per-class comparisons through M0 | no |
| `reports/visual/index.html` | findings page through M0-final (embedded charts) | no |
| `release/huggingface/qwen35-2b-m1-dpo-canonicalv2-final-v2/qwengrad-dpo-results.png` | M0 vs M1-v2 grouped bars, confirmatory | no |
| `reports/visual/quantization/*.png` | GGUF / ExecuTorch figures | no |
| `assets/opengrad-icon.png` | logo, 1254×1254 | — |

The capability-regression visuals exist only on the site (`opengrad.arjhinety.com/studies/001`, sections 04–10). Every number there is reproducible from B1–B4.

---

## H. Suggested chart specs (all values above; no new numbers)

1. **"The target metric rose"**: call_f1 B0 0.6264 → M0 0.7470 → M1-v2 0.7548 (confirmatory; A1/A2). Annotate the DPO step "+0.0078 = 7 of 453; within noise". Optional: the H200 rerun 0.7505 as a noise tick (A6).
2. **"What changed underneath"**: over-call 0.6238 → 0.1505 → 0.1529; clarification 0.1186 → 0.7682 → 0.7655; unsupported 0.0177 → 0.5430 → 0.5386 (A1/A2).
3. **Confusion-matrix triptych** B0 / M0 / M1-v2, with an empty ANSWER row highlighted as "0 items" (A1/A2).
4. **"Same questions, two prompts"**: GSM8K refusal 0-shot vs 8-shot per stage — Base 0/0; M0 100/0; M1-v2 100/0; M1-v1 70.7/2.0 (B1).
5. **"Refusal is a request shape"**: heatmap of stage × {GSM8K 0-shot, GSM8K 8-shot, MMLU-Pro 5-shot, IFEval} refusal (B1/B3).
6. **"Not only refusal"**: Base vs M0 on GSM8K 8-shot 70.4 vs 56.3; MMLU-Pro 49.0 vs 37.0; MMLU-Pro acc|answer 59.7 vs 38.4; IFEval acc|answer 67.9 vs 52.3, with the worst/observed/best interval bars (B1).
7. **"Self-correction"**: MMLU-Pro @768 (38.0 / 36.8 / 36.9, flat) vs @2048 (49.0 / 37.0 / 37.0), with Base truncation 37.6% vs 21.8% (B1).
8. **"The blind spot"**: four mode tiles — CALL 453, CLARIFY 371, UNSUPPORTED 453, ANSWER 0 (A7) — then Study 002's P-CONF with ANSWER 1,055 (E).
9. **"Where refusals were taught"**: refusal-target share by source, When2Call 62.1% / Glaive 14.3% / ToolACE 0.1% / xLAM 0% (B4).
10. **Refusal template bars**: M1-v2 top templates 555 / 404 / 73 / … with top-10 share 82.3% (B3).
11. **SFT loss curve** (C1) and **DPO loss/margin** (C2), both small.
12. **Study 002 stop**: agreement 0.770 vs floor 0.80, per source 276/350, 263/350, 279/363 (E).
13. **Cost ledger**: $11.39 total, $3.89 superseded (B1/B8).
