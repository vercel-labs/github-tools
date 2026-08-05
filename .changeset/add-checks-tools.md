---
"@github-tools/sdk": minor
---

Add `listCheckRuns` (Checks API) and `getCombinedStatus` (Statuses API) to read CI results from providers beyond GitHub Actions. Included in the `repo-explorer`, `code-review`, `ci-ops`, `security-audit`, and `maintainer` presets, which now request the `checks:read` and `statuses:read` Vercel Connect scopes.
