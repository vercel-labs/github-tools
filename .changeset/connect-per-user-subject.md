---
"@github-tools/sdk": minor
"@github-tools/eve-extension": minor
---

Support per-user Vercel Connect subjects. `GithubConnectParams` now accepts a `subject` (default stays `{ type: 'app' }`, the project's GitHub App installation), so multi-user apps can mint each caller's own connection token with `subject: { type: 'user', id }`. In the eve extension, `connect.subject` also accepts a per-caller resolver called with the tool execution context on every call — e.g. `(ctx) => ({ type: 'user', id: ctx.session.auth.current!.principalId })` — so each signed-in user reaches GitHub through their own connection instead of the shared app installation.
