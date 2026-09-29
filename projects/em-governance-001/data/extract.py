"""Extract every number and list this film shows from the governance draft itself.

Usage:  python projects/em-governance-001/data/extract.py
Input:  sources/governance-draft-v0.1.txt, a per-page text dump of
        sources/governance-draft-v0.1.pdf (made once with pypdf 6.15.0; pages are
        separated by form feeds and headed "=== PAGE n ===").
Output: data/governance.json. Every value is stored with its source:
        {"v": value, "src": "p.N: “quote”"}. The quote must appear on that page (after
        whitespace is collapsed), or the script stops. Values we compute ourselves carry
        "derived": "<how>".
Only the Python standard library is used.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCES = HERE.parent / "sources"
PDF = SOURCES / "governance-draft-v0.1.pdf"
TXT = SOURCES / "governance-draft-v0.1.txt"


def main() -> None:
    raw = TXT.read_text(encoding="utf-8")
    pages: dict[int, str] = {}
    for chunk in raw.split("\f"):
        m = re.match(r"=== PAGE (\d+) ===\n", chunk)
        if m:
            pages[int(m.group(1))] = re.sub(r"\s+", " ", chunk[m.end():])

    def val(v, page: int, quote: str, **extra):
        q = re.sub(r"\s+", " ", quote)
        if q not in pages[page]:
            raise SystemExit(f"quote not found on p.{page}: {quote!r}")
        return {"v": v, "src": f"p.{page}: “{quote}”", **extra}

    out: dict = {
        "source": "sources/governance-draft-v0.1.pdf",
        "source_title": "Experimental Machines — Founding Governance Design Draft v0.1 (Sep 26, 2026)",
        "source_sha256": hashlib.sha256(PDF.read_bytes()).hexdigest(),
    }

    # --- The document ------------------------------------------------------------------
    out["pages"] = val(53, 1, "Page 1 of 53")
    out["status"] = val("proposal", 1, "This is a design proposal for three founders to argue with, not a legal document.")

    # --- Founding facts -----------------------------------------------------------------
    out["founders"] = val(3, 2, "three founding members, three unpaid trustees, and three officers")
    out["officers"] = val(
        {"President": "Alpha", "Treasurer": "John", "Corporate Secretary": "Arjhine"},
        51, "GDR-003 Initial Officers: President Alpha, Treasurer John, Corporate Secretary Arjhine",
    )
    out["unpaid_period"] = val("about a year", 25, "Founders serve unpaid for about a year.")

    # --- The decision record -------------------------------------------------------------
    out["decided"] = val(8, 6, "Eight decisions are DECIDED")
    out["provisional"] = val(24, 6, "Twenty-four are PROVISIONAL")
    out["open"] = val(3, 6, "Three are OPEN and three DEFERRED")
    out["deferred"] = val(3, 6, "Three are OPEN and three DEFERRED")
    out["for_review"] = val(27, 51, "Eight decided, twenty-seven for review (including three open), three deferred.")
    out["decisions_total"] = {
        "v": out["decided"]["v"] + out["provisional"]["v"] + out["open"]["v"] + out["deferred"]["v"],
        "src": "p.6 (the four counts above); the record's ids run GDR-001 to GDR-038 (p.11)",
        "derived": "8 decided + 24 provisional + 3 open + 3 deferred",
    }
    val("GDR-038", 11, "038 Corporate term")  # the last id exists

    # --- Voting ---------------------------------------------------------------------------
    out["two_thirds_of_three"] = val(2, 11, "With three members, \"2/3 of all members\" means two of three")
    out["quorum"] = val(2, 25, "With one trustee recused, two remain: exactly a quorum. Both must vote yes.")

    # --- Mission protection ---------------------------------------------------------------
    out["mission_notice_days"] = val(30, 15, "circulated to all members at least 30 days before the first vote")
    out["unanimity_alt_members"] = val(5, 15, "require unanimity for purpose changes only while there are fewer than five members")
    out["mission_gap_days"] = val(60, 15, "Approval by 2/3 of all members at two meetings held at least 60 days apart.")

    # --- Research independence: the grounds for a Board intervention (p.18 table, first column)
    grounds = ["Law", "Privacy", "Security", "Safety", "Research misconduct", "Contract", "Budget", "IP constraints", "Material institutional risk"]
    out["intervention_grounds"] = {
        **val(grounds, 18, "When the Board may intervene Only on these grounds, and only as far as the ground requires"),
        "derived": "the nine row heads of the table that follows the quote",
    }
    out["intervention_rules"] = val(
        ["written", "gives reasons", "names the ground", "time-limited"], 19,
        "Every intervention is written, gives reasons, names the ground, and is time-limited.",
    )

    # --- Conflicts and deadlock ----------------------------------------------------------
    out["disinterested_needed"] = val(2, 25, "until the Board has at least two trustees with no interest in them")
    out["deadlock_days"] = val(60, 24, "operationally necessary matter for 60 days")

    # --- Membership ------------------------------------------------------------------------
    out["removal_response_days"] = val(30, 22, "At least 30 days to respond in writing and at a hearing.")
    out["not_causes"] = val(
        ["scientific disagreement", "voting against the majority", "publishing a result others dislike", "good-faith criticism"], 22,
        "Not a cause: scientific disagreement, disagreement about research direction, voting against the majority, publishing a result others dislike, or criticizing the organization in good faith.",
    )

    # --- Sponsors ----------------------------------------------------------------------------
    out["safeguards"] = val(10, 30, "The ten safeguards (GOVERNANCE RECOMMENDATION)")
    out["sponsor_review_days"] = val(30, 30, "limited to removing its own confidential information: recommend up to 30 days")
    out["patent_delay_days"] = val(90, 31, "A reasonable delay for patent filing is allowed: recommend up to 90 days.")

    # --- IP ------------------------------------------------------------------------------------
    out["ip_categories"] = val(5, 27, "The five categories")
    out["ip_program_triggers"] = val(6, 28, "Category B is triggered only by the six listed connections.")

    # --- Self-review and founder decisions ---------------------------------------------------
    out["flags"] = val(5, 44, "Five items are flagged.")
    out["founder_choices"] = val(16, 48, "Sixteen choices are yours.")
    out["blocking_choices"] = val(5, 48, "Five block Articles drafting")
    out["broaden_members"] = val(2, 45, "admit at least two non-founder members")
    out["board_expand_to"] = val(5, 25, "Trigger to expand to five")
    out["broaden_years"] = val(3, 45, "within a set period (e.g. 3 years)")

    dest = HERE / "governance.json"
    dest.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {dest} ({len(out) - 3} values)")


if __name__ == "__main__":
    main()
