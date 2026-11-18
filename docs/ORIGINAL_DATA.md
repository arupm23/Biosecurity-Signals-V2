# Original Biosecurity Signals v0.1 data and provenance

This v2 repository is a **new independent codebase**, not a replacement for the original website or Git history. The original project remains at:

- Repository: https://github.com/arupm23/biosecurity-signals
- Website: https://arupm23.github.io/biosecurity-signals/

## Historical research records

The original eight public-source entries are preserved in full in [`data/original-v0.1-records.json`](../data/original-v0.1-records.json), including each record's name, organization, type, domain, date, access patterns, safeguards, evidence label, summary, caveat, source title, and HTTPS source URL.

They are also represented in `data.js` (the offline display snapshot) and seeded into PostgreSQL through `supabase/002_seed.sql`. `npm test` verifies that the archived records and website snapshot remain equal. Do not modify the archival JSON when updating current classifications: add reviewable database evidence and preserve the historical baseline instead.

| Original record | Record ID | Original source |
| --- | --- | --- |
| AlphaFold 3 | `alphafold-3` | Developer biosecurity statement |
| Evo 2 | `evo-2` | Peer-reviewed paper |
| ESM3-open | `esm3-open` | Model card |
| OpenCRISPR-1 | `opencrispr-1` | Developer repository and FAQ |
| vPST | `vpst` | Research preprint |
| MegaSyn dual-use case study | `megasyn-dual-use` | Peer-reviewed commentary |
| Built-in safeguards for generative AI | `nist-built-in-safeguards` | NIST publication |
| Laboratory biosecurity guidance | `who-lab-biosecurity` | WHO guidance |

The source URLs and full summaries are in the archival JSON. The research was originally a small, curated *snapshot* and should not be misrepresented as a complete or continuously updated record of developers' current policies.

## Earlier project information retained

The v2 root contains updated versions of the original `ATTRIBUTION.md`, `CONTRIBUTING.md`, `SECURITY.md`, `DATA_LICENSE.md`, `LICENSE`, and `CITATION.cff`. The original project's intellectual lineage, licensing distinctions, research caveats, and contribution restrictions remain applicable. Consult the original GitHub repository for the exact historical versions of those files and the v0.1 interface.

**Important:** The new interactive categories and aggregated charts are descriptive. A publicly reported safeguard is not a verified efficacy claim, and an unreported safeguard is not necessarily absent. Entries for guidance and case studies do not imply those safeguards have been implemented by a tool developer.
