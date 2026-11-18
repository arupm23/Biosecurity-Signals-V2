# Security policy — Biosecurity Signals v2

Report suspected vulnerabilities privately using GitHub Security Advisories (“Report a vulnerability”). Avoid public disclosure of sensitive information or unsafe exploit content.

The browser site is static and **read-only**. `config.js` may contain the public Supabase URL and publishable/anon key; it must never contain privileged service-role/secret tokens or database passwords. Anonymous access is constrained by PostgreSQL RLS; maintainers edit records privately in Supabase's administrative console.

## Predeployment checks

1. Verify all research tables have RLS enabled and anonymous permissions are `SELECT` only.
2. Test that unauthenticated clients cannot see draft or archived records or reviewer/change history.
3. Test that unauthenticated and authenticated browser roles cannot `INSERT`, `UPDATE`, or `DELETE`.
4. Validate source HTTPS URLs and avoid publishing personal information, biological sequences, protocols, or safeguard circumvention details.
5. Audit HTTP security headers, Content Security Policy and dependencies in the hosting configuration. GitHub Pages cannot set arbitrary HTTP headers by repository file alone.
6. Revisit database query pagination, upstream rate limiting and source verification practices before scaling substantially.

Maintainers aim to acknowledge vulnerability reports within seven days as a best effort, not a guarantee.
