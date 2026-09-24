---
"@github-tools/sdk": minor
"@github-tools/eve-extension": minor
---

Mint Vercel Connect tokens per tool call.

- `connect` on `githubExtension` accepts a `(ctx, call) => params` resolver, where `call` is `{ toolName, input, owner?, repo? }`. `owner` / `repo` are the tool's inputs after `context` defaults, and are undefined for tools without a repository target (search, gists, notifications). The static shape and the `connect.subject` resolver keep working unchanged.
- `connectGithubTools` / `connectGithubToken` accept a `(call) => params` resolver as `connect` / `params`. Scopes still derive from `preset` / `include` / `exclude` unless the resolved params set `scopes`. Connect caches tokens per connector and params, so calls on the same repository reuse one token.
- Token providers (`GithubTokenInput`) now receive an optional `GithubTokenCall` argument on every tool call, from both `createGithubTools` and the eve runtime. Existing `() => Promise<string>` providers are unaffected.
- `CONNECT_INSTALLATION_REQUIRED` names the target account ("The connector's GitHub App is not installed on <owner>") when the token targets an org or repository owner.
