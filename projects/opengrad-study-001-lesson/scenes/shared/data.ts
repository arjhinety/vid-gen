/**
 * Every number shown on screen comes from here (data/study001.json, extracted from
 * OpenGrad's committed artifacts by data/extract.py). Never type a result into a scene.
 */
import raw from "../../data/study001.json";

type Modes = "CALL" | "CLARIFY" | "UNSUPPORTED" | "ANSWER";
type Confusion = Record<Modes, Record<Modes, number>>;
interface Routing {
  call_f1: number;
  call_precision: number;
  call_recall: number;
  over_call_rate: number;
  confusion: Confusion;
}
interface Bench {
  n: number;
  correct: number;
  refusals: number;
  attempted: number;
  accuracy: number;
  refusal_rate: number;
}
interface Cap {
  gsm8k_0shot: Bench;
  gsm8k_8shot: Bench;
  ifeval?: { prompt_level_strict_accuracy: number; refusal_rate: number; accuracy_given_answer: number };
  mmlu_pro?: { accuracy: number; refusal_rate: number };
}

const d = raw as unknown as {
  confirmatory_counts: { v: Record<Modes, number>; src: string };
  routing: Record<"B0" | "M0" | "M1v2", { v: Routing; src: string }>;
  capability: Record<"B0" | "M0" | "M1v2" | "M1v1", { v: Cap; src: string }>;
  sentinel: { prompts: { v: Record<string, { user: string[]; grader: string }> }; B0: { v: { pass: number; total: number; cases: Array<{ id: string; status: string; raw: string; refusal: boolean }> } }; M1v2: { v: { pass: number; total: number; cases: Array<{ id: string; status: string; raw: string; refusal: boolean }> } } };
  supervision_audit: { v: { totals: { records_audited: number; refusal_targets: number; refusal_target_rate: number }; per_source: Record<string, { records: number; refusal_targets: number; refusal_rate: number }> } };
  sft_loss: { v: Array<[number, number]> };
  sft_run: { v: { steps: number; elapsed_s: number; examples_seen: number } };
  pconf_counts: { v: Record<Modes, number> };
  punans_agreement: { v: { items: number; same_label: number; raw_agreement: number; floor: number } };
  ledger: Array<{ v: LedgerRow; src: string }>;
  corpus_refusal_templates: { v: Array<{ count: number; example: string }>; src: string; distinct_openings?: number };
  ledger_base_full_f1: { v: number; src: string };
};

export interface LedgerRow {
  n: number;
  kind: "SFT" | "DPO";
  name: string;
  verdict: string;
  verdict_class: string;
  call_f1: number;
  checkpoint: number;
  records: number;
  set: "full" | "confirmatory";
}

export const MODES: Modes[] = ["CALL", "CLARIFY", "UNSUPPORTED", "ANSWER"];
export const heldout = d.confirmatory_counts.v;
export const routing = { B0: d.routing.B0.v, M0: d.routing.M0.v, M1v2: d.routing.M1v2.v };
export const cap = { B0: d.capability.B0.v, M0: d.capability.M0.v, M1v2: d.capability.M1v2.v, M1v1: d.capability.M1v1.v };
export const sentinel = { B0: d.sentinel.B0.v, M1v2: d.sentinel.M1v2.v, prompts: d.sentinel.prompts.v };
export const sentinelCase = (sys: "B0" | "M1v2", id: string) => sentinel[sys].cases.find((c) => c.id === id)!;
export const audit = d.supervision_audit.v;
export const sftLoss = d.sft_loss.v;
export const sftRun = d.sft_run.v;
export const pconf = d.pconf_counts.v;
export const agreement = d.punans_agreement.v;
export const corpusSources = Object.entries(audit.per_source).map(([k, v]) => ({ id: k, ...v }));
/** The seven post-training runs, each with the F1 of the set it was scored on. */
export const ledger = d.ledger.map((r) => ({ ...r.v, src: r.src }));
/** Most frequent refusal openings among ANSWER-labelled training targets (audit JSON). */
export const corpusTemplates = d.corpus_refusal_templates.v;
export const baseF1 = { full: d.ledger_base_full_f1.v, confirmatory: d.routing.B0.v.call_f1 };

/** Over-calls: non-CALL gold items the model sent to CALL. */
export function overCalls(sys: keyof typeof routing): { num: number; den: number } {
  const cm = routing[sys].confusion;
  const non = MODES.filter((m) => m !== "CALL");
  return { num: non.reduce((s, g) => s + cm[g].CALL, 0), den: non.reduce((s, g) => s + MODES.reduce((t, p) => t + cm[g][p], 0), 0) };
}

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
