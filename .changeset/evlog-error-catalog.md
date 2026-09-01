---
"@github-tools/sdk": minor
"@github-tools/eve-extension": minor
---

Structured error catalog (evlog): classifiable failures now carry a stable `code`, a `why` (technical cause), and a `fix` (actionable remedy) instead of a bare message.

- GitHub API errors are mapped by status: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `RATE_LIMITED` (403/429, with reset info), `NOT_FOUND` (404 — explicitly states GitHub masks no-access private resources as 404), `VALIDATION_FAILED` (422). Unmapped statuses pass through; the original Octokit error stays as `cause`.
- An expired `VERCEL_OIDC_TOKEN` now throws `OIDC_TOKEN_EXPIRED` with the exact expiry time before any Connect request, instead of surfacing as an opaque 403. `@vercel/connect` failures map to `CONNECT_NOT_AUTHORIZED`, `CONNECT_USER_NOT_CONNECTED`, and `CONNECT_INSTALLATION_REQUIRED`.
- In the eve extension, failing tools return `{ error: { code, message, why, fix } }` to the model; unclassified failures keep the plain message string.
- The catalog is exported as `githubToolsErrors`; use evlog's `parseError` to read the structure from thrown errors in AI SDK apps.
