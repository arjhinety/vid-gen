# Sources

- `governance-draft-v0.1.pdf`: the founders' "Experimental Machines — Founding Governance Design Draft v0.1" (Sep 26, 2026, 53 pages). It is the only source for this film. Its sha256 is recorded in `../data/governance.json`.
- `governance-draft-v0.1.txt`: a per-page text dump of the PDF, made once with pypdf 6.15.0. `../data/extract.py` reads it and checks that every quoted phrase appears on its page. Table cells can come out interleaved, so the quotes are taken from prose lines.
- `claims.yaml`: every claim the film makes, with its class and page. `design` means the draft's own decisions and proposals, none adopted yet. `author-interpretation` means the draft's reading of Philippine law, which the draft itself says counsel must check. `limitation` means a weakness the draft flags in itself.

The film explains the draft. It does not check the draft's legal reading.
