/**
 * Every number and list shown on screen comes from here: data/governance.json, extracted
 * from the governance draft by data/extract.py (each value with its page and a quote).
 * Never type a count into a scene.
 */
import raw from "../../data/governance.json";

type V<T> = { v: T; src: string; derived?: string };
const d = raw as unknown as {
  pages: V<number>;
  founders: V<number>;
  officers: V<Record<"President" | "Treasurer" | "Corporate Secretary", string>>;
  unpaid_period: V<string>;
  decided: V<number>;
  provisional: V<number>;
  open: V<number>;
  deferred: V<number>;
  for_review: V<number>;
  decisions_total: V<number>;
  two_thirds_of_three: V<number>;
  quorum: V<number>;
  mission_notice_days: V<number>;
  mission_gap_days: V<number>;
  unanimity_alt_members: V<number>;
  intervention_grounds: V<string[]>;
  intervention_rules: V<string[]>;
  deadlock_days: V<number>;
  disinterested_needed: V<number>;
  removal_response_days: V<number>;
  not_causes: V<string[]>;
  safeguards: V<number>;
  sponsor_review_days: V<number>;
  patent_delay_days: V<number>;
  ip_categories: V<number>;
  ip_program_triggers: V<number>;
  flags: V<number>;
  founder_choices: V<number>;
  blocking_choices: V<number>;
  broaden_years: V<number>;
  broaden_members: V<number>;
  board_expand_to: V<number>;
};

export const gov = {
  pages: d.pages.v,
  founders: d.founders.v,
  officers: d.officers.v,
  decided: d.decided.v,
  provisional: d.provisional.v,
  open: d.open.v,
  deferred: d.deferred.v,
  forReview: d.for_review.v,
  total: d.decisions_total.v,
  twoThirdsOfThree: d.two_thirds_of_three.v,
  quorum: d.quorum.v,
  missionNotice: d.mission_notice_days.v,
  missionGap: d.mission_gap_days.v,
  unanimityAltMembers: d.unanimity_alt_members.v,
  grounds: d.intervention_grounds.v,
  interventionRules: d.intervention_rules.v,
  deadlockDays: d.deadlock_days.v,
  disinterested: d.disinterested_needed.v,
  respondDays: d.removal_response_days.v,
  notCauses: d.not_causes.v,
  safeguards: d.safeguards.v,
  sponsorReview: d.sponsor_review_days.v,
  patentDelay: d.patent_delay_days.v,
  ipCategories: d.ip_categories.v,
  ipTriggers: d.ip_program_triggers.v,
  flags: d.flags.v,
  founderChoices: d.founder_choices.v,
  blocking: d.blocking_choices.v,
  broadenYears: d.broaden_years.v,
  broadenMembers: d.broaden_members.v,
  boardExpandTo: d.board_expand_to.v,
};
