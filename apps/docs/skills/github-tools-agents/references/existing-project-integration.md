# Adding GitHub Tools to an existing project

## 1. Dependencies

```bash
pnpm add @github-tools/sdk ai zod
```

Optional for durable mode:

```bash
pnpm add workflow @workflow/ai
```

## 2. Environment

- Add `GITHUB_TOKEN` to `.env` (local) and to the host’s secret store (Vercel, GitHub Actions, …).
- Never commit the token.

## 3. Choose an entry point

| Need | Entry |
|------|--------|
| One-off or script | `createGithubTools()` + `generateText` / `streamText` |
| Shared agent config | `createGithubAgent()` |
| Longevity / Workflow | `createDurableGithubAgent()` + `"use workflow"` |

## 4. Scope tools

- Start with a **preset** to limit reachable GitHub APIs (`code-review`, `issue-triage`, …).
- Expand to `maintainer` or omit preset only when the app must perform every operation.

## 5. Token permissions

Align the PAT with the preset:

- Read-only exploration → Contents/Issues/PRs read as needed; avoid `repo` write unless required.
- Writes → match [fine-grained permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens) to each tool family.

## 6. Verify

- Instantiate tools: `Object.keys(createGithubTools({ preset: 'repo-explorer' }))`.
- Run a read-only prompt (e.g. list open PRs on a public repo) before enabling writes.

## Doc paths (site)

- `/getting-started/installation`
- `/guide/quick-start`
- `/guide/presets`
- `/guide/token-permissions`
