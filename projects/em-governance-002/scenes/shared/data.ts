/**
 * Every number shown on screen comes from here: data/governance.json (extracted from the
 * governance draft by data/extract.py, each value with its page and a quote). Never type a
 * count into a scene.
 */
import raw from "../../data/governance.json";

type V<T> = { v: T; src: string; derived?: string };
const d = raw as unknown as Record<string, V<unknown>>;
const n = (k: string) => d[k]!.v as number;

export const gov = {
  founders: n("founders"),
  decided: n("decided"),
  provisional: n("provisional"),
  open: n("open"),
  deferred: n("deferred"),
  forReview: n("for_review"),
  total: n("decisions_total"),
  twoThirdsOfThree: n("two_thirds_of_three"),
  missionGap: n("mission_gap_days"),
  unanimityAltMembers: n("unanimity_alt_members"),
  disinterested: n("disinterested_needed"),
  founderChoices: n("founder_choices"),
  blocking: n("blocking_choices"),
  broadenYears: n("broaden_years"),
  broadenMembers: n("broaden_members"),
  boardExpandTo: n("board_expand_to"),
  foundationMinimum: n("foundation_minimum_php"),
  termRecommended: n("term_recommended_years"),
  termCap: n("term_cap_years"),
  visualQwenAuthors: n("visual_qwen_authors"),
  proxyRule: d.proxy_rule!.v as string,
  signatories: d.signatories!.v as string[],
  residency: d.residency_rule!.v as Record<"Treasurer" | "Secretary", string>,
  contributionMonths: n("contribution_months"),
  oddRange: d.odd_board_range!.v as [number, number],
  twoThirdsOfFour: n("two_thirds_of_four"),
  quorumOfFour: n("quorum_of_four"),
  provisionalList: d.provisional_list!.v as Array<{ id: string; name: string }>,
  deferredList: d.deferred_list!.v as Array<{ id: string; name: string }>,
  removalDays: n("removal_response_days"),
  removalCauses: d.removal_causes!.v as string[],
  notCauses: d.not_causes!.v as string[],
  removalOtherTwo: n("removal_other_two"),
  removalGap: d.trustee_removal_gap!.v as string,
};

export const peso = (v: number) => `PHP ${v.toLocaleString("en-US")}`;

/**
 * The company part: data/web.json (data/extract_web.py), each value with its primary URL and the quote the
 * research note read there.
 */
import webRaw from "../../data/web.json";

const w = webRaw as unknown as { openai: Record<string, V<unknown>>; ph: Record<string, V<unknown>> };
const o = (k: string) => w.openai[k]!.v;
const ph = (k: string) => w.ph[k]!.v;

export const oa = {
  founded: o("founded") as string,
  committed: o("committed") as string,
  cash: o("cash_donations") as string,
  cappedYear: o("capped_profit_year") as number,
  cap: o("cap") as string,
  fired: o("fired") as string,
  rehired: o("rehire_decided") as string,
  rehireDays: o("rehire_days") as number,
  agStart: o("ag_review_start") as string,
  pbcPlan: o("pbc_plan") as string,
  reversal: o("reversal") as string,
  recapClosed: o("recap_closed") as string,
  foundationPct: o("foundation_stake_pct") as number,
  foundationUsd: o("foundation_stake_usd") as string,
  othersPct: o("others_pct") as number,
  microsoftPct: o("microsoft_pct") as number,
  replaceDirectors: o("replace_directors") as string,
  fairValue: o("fair_value") as string,
  review: o("review_months") as string,
  verdict: o("verdict") as string,
  verdictDate: o("verdict_date") as string,
  classN: o("class_n") as string,
  halt: o("halt") as string,
  twoApart: o("two_nfp_only") as number,
};

/** "$1 billion" / "$137M" / "$130B" as a number of dollars (for bar lengths only). */
export function usd(s: string): number {
  const m = /^\$([\d.]+)\s*(billion|B|M|million)$/.exec(s);
  if (!m) throw new Error(`not a dollar amount: ${s}`);
  return Number(m[1]) * (m[2] === "M" || m[2] === "million" ? 1e6 : 1e9);
}

export const law = {
  investMembers: ph("invest_members") as string,
  interlockPct: ph("interlock_pct") as number,
  donorsTaxPct: ph("donors_tax_pct") as number,
  royaltyTaxPct: ph("royalty_tax_pct") as number,
  substantiallyAll: ph("substantially_all_members") as string,
  inurementsListed: ph("inurements_listed") as number,
};
