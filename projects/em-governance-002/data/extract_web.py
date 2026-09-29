"""Extract the numbers the company part of the film shows, from the two web-research notes.

Usage:  python projects/em-governance-002/data/extract_web.py
Input:  sources/research-openai.md, sources/research-ph-law.md (research passes that read each primary page in
        the browser and quoted it; every row there is tagged VERIFIED / UNVERIFIED with its URL).
Output: data/web.json. Each value: {"v": value, "src": "<primary URL>", "quote": "<exact text>", "note": "..."}.
        The quote must appear in the research note (whitespace collapsed), or the script stops. Only rows the
        notes mark VERIFIED are used. Standard library only.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "sources"


def main() -> None:
    notes = {k: re.sub(r"\s+", " ", (SRC / f"research-{k}.md").read_text(encoding="utf-8")) for k in ("openai", "ph-law")}

    def val(v, note: str, quote: str, url: str, **extra):
        q = re.sub(r"\s+", " ", quote)
        if q not in notes[note]:
            raise SystemExit(f"quote not found in research-{note}.md: {quote!r}")
        return {"v": v, "src": url, "quote": quote, **extra}

    oa = {
        "founded": val("December 2015", "openai", "first incorporated in Delaware on December 8, 2015",
                       "https://www.courtlistener.com/docket/69013420/77/1/musk-v-altman/"),
        "committed": val("$1 billion", "openai", "have committed $1 billion", "https://openai.com/index/introducing-openai/"),
        "cash_donations": val("$137M", "openai", "Cash donations of **$137M**",
                              "https://openai.com/index/why-our-structure-must-evolve-to-advance-our-mission/"),
        "capped_profit_year": val(2019, "openai", "**OpenAI LP** is created as a \"capped-profit\" hybrid", "https://openai.com/index/openai-lp/"),
        "cap": val("100x", "openai", "capped at 100x their investment", "https://openai.com/index/openai-lp/"),
        "conflict_rule": val("only directors without stakes vote on conflicts", "openai",
                             "Only a minority of board members may hold financial stakes, and only members without stakes vote on conflicts.",
                             "https://openai.com/index/openai-lp/"),
        "fired": val("Nov 17, 2023", "openai", "The **board of OpenAI, Inc.** removes Sam Altman as CEO and from the board.",
                     "https://openai.com/index/openai-announces-leadership-transition/"),
        "rehire_decided": val("Nov 21, 2023", "openai", "the November 21 decision to rehire",
                              "https://openai.com/index/review-completed-altman-brockman-to-continue-to-lead-openai/"),
        "rehire_days": {"v": 4, "src": "https://openai.com/index/review-completed-altman-brockman-to-continue-to-lead-openai/",
                        "derived": "Nov 17 removal to Nov 21 decision to rehire"},
        "ag_review_start": val("Oct 2024", "openai", "On October 9, 2024, Attorney General Jennings initiated her review",
                               "https://news.delaware.gov/2025/10/28/ag-jennings-completes-review-of-openai-recapitalization/"),
        "pbc_plan": val("Dec 2024", "openai", "run and control OpenAI's operations and business",
                        "https://openai.com/index/why-our-structure-must-evolve-to-advance-our-mission/"),
        "reversal": val("May 2025", "openai", "constructive dialogue", "https://openai.com/index/evolving-our-structure/"),
        "recap_closed": val("Oct 2025", "openai", "**Recapitalization completed.** The nonprofit is renamed the **OpenAI Foundation**.",
                            "https://openai.com/our-structure/"),
        "foundation_stake_pct": val(26, "openai", "Foundation: **26%**, worth about **$130B**", "https://openai.com/our-structure/"),
        "foundation_stake_usd": val("$130B", "openai", "Foundation: **26%**, worth about **$130B**", "https://openai.com/our-structure/"),
        "others_pct": val(47, "openai", "Employees and investors: **47%**", "https://openai.com/our-structure/"),
        "microsoft_pct": val(27, "openai", "roughly 27 percent on an as-converted diluted basis",
                             "https://openai.com/index/next-chapter-of-microsoft-openai-partnership/"),
        "replace_directors": val("can replace directors at any time", "openai", "can replace directors at any time", "https://openai.com/our-structure/"),
        "fair_value": val("fair or reasonable from a financial point of view to the NFP", "openai",
                          "fair or reasonable from a financial point of view to the NFP",
                          "https://oag.ca.gov/news/press-releases/attorney-general-bonta-issues-statement-openai%E2%80%99s-recapitalization-plan"),
        "two_nfp_only": val(2, "openai", "Within one year, at least two nonprofit directors (including the SSC chair) are not on the PBC board.",
                            "https://news.delaware.gov/2025/10/28/ag-jennings-completes-review-of-openai-recapitalization/"),
        "review_months": {"v": "over a year", "src": "https://news.delaware.gov/2025/10/28/ag-jennings-completes-review-of-openai-recapitalization/",
                          "quote": "Review lasted \"over a year\"", "derived": "Delaware: Oct 9, 2024 to Oct 28, 2025"},
        "class_n": val("Class N", "openai", "so long as the NFP holds Class N Common Stock",
                       "https://oag.ca.gov/system/files/attachments/press-docs/Final%20Executed%20MOU%20Between%20OpenAI%20and%20California%20AG%20re%20Notice%20of%20Conditions%20of%20Non-Objection%20%2810.27.2025%29%20%28Signed%20by%20OpenAI%29%20%28Signed%20by%20CA%20DOJ%29.pdf"),
        "halt": val("up to and including halting the release of models", "openai", "up to and including halting the release of models",
                    "https://news.delaware.gov/2025/10/28/ag-jennings-completes-review-of-openai-recapitalization/"),
        "verdict_date": val("May 2026", "openai", "| 2026-05-18 | **Advisory jury verdict (unanimous).**",
                            "https://www.courtlistener.com/docket/69013420/572/musk-v-altman/"),
        "verdict": val("time-barred", "openai", "barred by the statute of limitations",
                       "https://www.courtlistener.com/docket/69013420/572/musk-v-altman/"),
    }
    ph = {
        "no_conversion": val(True, "ph-law",
                             "a non-stock corporation cannot be converted into a stock corporation by mere amendment of the articles of incorporation.",
                             "https://www.sec.gov.ph/wp-content/uploads/2022/10/2022OpinionNo22-14_Legalityofconvertinganon-stock_non-profittoastockcorporation.pdf"),
        "held_in_trust": val(True, "ph-law", "a non-stock, non-profit corporation only holds its funds in trust",
                             "https://www.sec.gov.ph/wp-content/uploads/2022/10/2022OpinionNo22-14_Legalityofconvertinganon-stock_non-profittoastockcorporation.pdf"),
        "invest_members": val("2/3", "ph-law", "or by at least two-thirds (2/3) of the members in the case of nonstock corporations",
                              "https://elibrary.judiciary.gov.ph (RA 11232 Sec. 41)"),
        "incidental": val(True, "ph-law", "If the business activity is not incidental, necessary or essential to carry out the express objectives of the corporation",
                          "https://www.sec.gov.ph/wp-content/uploads/2024/10/2024Opinion-No-24-21-re-Non-Stock-Non-Profit-Org-to-Establish-Income-Generating-Activity-Contact-Call-Center.pdf"),
        "substantial_part": val(True, "ph-law", "if a substantial part of its operations constitutes",
                                "BIR RMO 38-2019 Part III (PCNC-hosted copy; see research-ph-law.md)"),
        "revoked_from_change": val(True, "ph-law", "The revocation takes effect as of the date of the material change.",
                                   "BIR RMO 38-2019 Part VII (PCNC-hosted copy; see research-ph-law.md)"),
        "interlock_pct": val(20, "ph-law", "Stockholdings exceeding twenty percent (20%) of the outstanding capital stock shall be considered substantial for purposes of interlocking directors.",
                             "https://elibrary.judiciary.gov.ph (RA 11232 Sec. 32)"),
        "donors_tax_pct": val(6, "ph-law", "six percent (6%) computed on the basis of the total gifts", "https://lawphil.net (NIRC Sec. 99(A) as amended by TRAIN)"),
        "royalty_tax_pct": val(20, "ph-law", "A final tax of twenty percent (20%) is hereby imposed on royalties earned as passive income.",
                               "NIRC Sec. 27(D)(6) after CMEPA (see research-ph-law.md)"),
        "substantially_all_members": val("2/3", "ph-law", "need \"at least two-thirds (2/3) of the members\"", "https://lawphil.net (RA 11232 Sec. 39)"),
        "inurements_listed": val(6, "ph-law", "The six listed \"inurements\" (IV.A)", "BIR RMO 38-2019 Part IV.A (PCNC-hosted copy; see research-ph-law.md)"),
        "pcnc_bar": val(True, "ph-law", "any corporation controlled directly or indirectly by", "BIR RR 13-98 Sec. 10(d) (PCNC-hosted copy; see research-ph-law.md)"),
    }
    out = {"sources": ["sources/research-openai.md", "sources/research-ph-law.md"], "openai": oa, "ph": ph}
    dest = HERE / "web.json"
    dest.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {dest} ({len(oa)} openai, {len(ph)} ph values)")


if __name__ == "__main__":
    main()
