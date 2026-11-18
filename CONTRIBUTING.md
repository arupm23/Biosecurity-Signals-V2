# Contributing to Biosecurity Signals v2.0

The repository contains a curated inventory of public claims, **not** verified ratings of safety or risk.

## Evidence rules

- Link every reported practice to a public **HTTPS primary source** (official developer statement, model card, paper, or institutional guidance).
- Clearly distinguish a developer claim, a documented independent evaluation, and recommendations in guidance. Do not label a recommendation as an implemented control.
- Supply publication period, evidence type, a neutral summary, and a caveat explaining what the evidence does not establish.
- Use the shared safeguard taxonomy in `taxonomy.js` and `public.safeguards`; add new tags carefully. Avoid silently redefining existing labels.
- Prefer two independent reviewers. Keep corrections traceable through review notes and changes.
- “Not reported” must never be interpreted as “not implemented.” Do not score safety or rank tool maturity from counts.

## Safety boundary

Do not submit biological sequences, wet-lab procedures, experimental parameters, operational threat instructions, methods to defeat safety controls, unpublished sensitive data, or personal information about researchers or users. Use high-level public information only.

## Development

The frontend is dependency-free and static. Core normalization, source validation and filter logic are in `app-core.js`. Supabase setup is in `supabase/`. Run `node tests/smoke.mjs` before proposing changes.

No service-role keys, private passwords or privileged database credentials may be committed. The public frontend is intentionally **read-only**.

Contributions to website code use the MIT license. Original curated metadata and summaries are available under CC BY 4.0. Linked source contents remain with their respective owners.
