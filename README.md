# Biosecurity Signals v2.0 — Evidence Observatory

An independent, source-linked public research tool for exploring statements about biosecurity safeguards in AI-enabled biology. **The site does not verify that a tool is safe.** It distinguishes what a source reports from what independent evaluation documents, with explicit evidence limitations.

**Original v0.1 site:** https://arupm23.github.io/biosecurity-signals/  
**Original v0.1 repository:** https://github.com/arupm23/biosecurity-signals  
**Intended independent v2 repository:** `arupm23/biosecurity-signals-v2` (create before publishing)  
**v2 deployment status:** not yet deployed; database connection requires your own Supabase project

## What's new in v2.0

- **Secured PostgreSQL backend (Supabase):** normalized organizations, records, sources, safeguards, evidence links, private reviews, and change logs; public database reads are restricted to published records with row-level security (RLS).
- **Source-linked record views:** each record has a safeguard-by-layer profile, clickable evidence statuses and citations, plus a dated source timeline.
- **Dynamic safeguard layers:** four clickable lifecycle layers show counts, filtered frequencies, number of organizations, independently evaluated statements, and a source-linked drill-down for each safeguard.
- **Expanded filters:** search, record type, safeguard tag, and publication year update repository cards and safeguard patterns together.
- **Historical record archive:** all eight original v0.1 records and their full source metadata are preserved in `data/original-v0.1-records.json` (see `docs/ORIGINAL_DATA.md`).
- **Snapshot fallback:** original eight curated records remain available if database setup has not been completed or the public API cannot be reached. This is clearly labeled in the UI.
- **No external visualization libraries or client-side privileges** required; runs on existing GitHub Pages infrastructure.

## Important evidence definitions

- `reported`: a public source describes or recommends a safeguard; **not independently verified** by this repository.
- `independently-evaluated`: the cited source documents an independent evaluation of that safeguard; **not** proof of safety or effectiveness.
- `unclear`: insufficient evidence to classify the source's status.
- `not reported`: means the curated sources do not document the safeguard, **not** that it is absent or ineffective.
- Guidance and case studies are included as separate record types; their listed tags must **not** be read as measures implemented by developers.

All visuals show **descriptive reporting frequencies, not safety scores, safety maturity rankings, or demonstrated efficacy**. The original dataset is intentionally small; current source status and dates should be rechecked before policy use.

## Run locally

With Node.js or Python already installed, from the repository root:

```sh
python3 -m http.server 8000
# visit http://localhost:8000
```

Opening `index.html` directly also works for the curated snapshot. No package installation, build step, analytics, tracking, accounts, or cookies are needed for visitors.

## Connect a live Supabase database

1. Create a **new Supabase project** under your own account (do not put database passwords or service-role keys in GitHub).
2. Open the Supabase SQL Editor, and run `supabase/001_evidence_observatory.sql` as the project administrator. PostgreSQL 15+ is required for `security_invoker` views.
3. Run `supabase/002_seed.sql` to migrate the eight original source-linked records. This seed is intentionally insert-only; it does not overwrite existing edits. To regenerate it from the original data: `node scripts/generate-seed.mjs > supabase/002_seed.sql`.
4. In `config.js`, set `supabaseUrl` to `https://YOUR-PROJECT.supabase.co` and `supabasePublishableKey` to your project's **public publishable** key (or legacy public anon key). These are browser-visible identifiers; RLS provides the access boundary. **Never** place a `service_role`, `sb_secret_…` key, database password, or personal token in any static file.
5. Test the public read API and RLS before publishing. The site calls `/rest/v1/published_records` with an `apikey` header; only records with `status='published'` should be returned.
6. Deploy the revised static files to GitHub Pages as before. An API outage reverts visibly to the eight-record curated snapshot. If the database is empty, it shows zero records rather than silently mislabeling the snapshot as live.

**Important:** The SQL migration configures **read-only access** for anonymous and authenticated browser users. Research updates must be performed by authorized maintainers in the Supabase dashboard/SQL Editor, or via a separately authenticated server-side administrative workflow after security review. There is intentionally **no public write API or browser-based admin panel**. Add new sources and safeguard-to-source links before setting a record to `published`.

### Data model

| Table / view | Purpose | Public visibility |
| --- | --- | --- |
| `organizations` | Organization metadata | Published-linked organizations only |
| `research_records` | Model/tool/case study/guidance, summary, caveats, publication, status | Only published rows |
| `research_sources` | Public HTTPS citations and publication information | Published-linked sources only |
| `safeguards` | Controlled taxonomy with lifecycle layer | Read-only |
| `record_safeguards` | Evidence status and exact supporting source link per safeguard | Published-linked evidence only |
| `record_reviews` | Review notes, reviewer and outcome | Private (not granted to browser roles) |
| `record_changes` | Automatic record-level change log | Private (not granted to browser roles) |
| `published_records` | Aggregated read-only public API view | Only published rows, security-invoker RLS |

The database enforces that a linked safeguard's source belongs to the same record with a composite foreign key. Inserts, updates and deletes for records, source citations, and record-to-safeguard evidence are logged automatically. Human review decisions are tracked separately; ensure the database backup/retention policy fits your research governance process.

### Publication workflow

1. Save a new `research_records` row as `draft`.
2. Link at least one HTTPS primary source in `research_sources`, and add the sourced practice(s) in `record_safeguards`.
3. Check claims, status, dates and potential information hazards. Prefer two independent human reviewers; record reviews in `record_reviews`.
4. Publish only after review by setting `status='published'` and `last_reviewed_on`.
5. If the source changes or a claim is corrected, use the dashboard to update with a documented reason and review again.

**No biological sequences, lab protocols, agent improvement instructions, or safeguard circumvention instructions** should be stored in these tables or accepted as contributions.

## Tests

```sh
node --check app.js
node --check app-core.js
node --check database.js
node tests/smoke.mjs
# optional: Python + Playwright browser interactions
python tests/browser_smoke.py
```

Run `npm test` for the dependency-free JavaScript checks, including an exact comparison of the eight original records with the immutable archival JSON. See `docs/ORIGINAL_DATA.md` for the historical dataset manifest. Optional browser testing requires Python Playwright (`pip install -r requirements-dev.txt` and `python -m playwright install chromium`).

The tests verify the original records, source links, taxonomy/layer math, filters, URL sanitization, HTML assets, live/read fallback behavior and security-critical SQL markers. Run `supabase/tests/rls_privileges.sql` in the SQL Editor and test both draft visibility and write denial through an unauthenticated API request. A managed Postgres deployment must still be tested with your live Supabase instance before public release.

## Scope, attribution & licensing

This project expands on the Biosecurity Statements Repository idea of Max Langenkamp and Tessa Alexanian and the work of Shiying He and P.T. Nhean. The project is independent and not affiliated with those authors, the EA Forum or any listed organization. See `ATTRIBUTION.md` for credits.

Website code: MIT (`LICENSE`). Curated original summaries and metadata: CC BY 4.0 (`DATA_LICENSE.md`). Third-party source materials retain their original rights. See `CONTRIBUTING.md` and `SECURITY.md` for review and disclosure practices.

## Publishing this separate repository

The project is packaged for GitHub but cannot create a remote GitHub repository without an account-authorized repository-creation action. See `INSTALL_TO_GITHUB.md`; with the GitHub CLI installed and authenticated, run `bash scripts/publish-to-github.sh` to create the new **public** `arupm23/biosecurity-signals-v2` repository and push all files. This changes neither the v0.1 repository nor its live website.
