---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Add `guardrails` to limit where GitHub tools can act, whoever approves a call:

```ts
createGithubAgent({
  model,
  guardrails: { repositories: ['vercel-labs/*'], branches: ['agent/*'] },
})
```

- `repositories` takes `owner/repo` or `owner/*`, matched regardless of case. A call to any other repository fails, reads included. Tools without a repository target (search, gists, notifications) aren't restricted. `createRepository` and `forkRepository` run only when the new repository's full name matches.
- `branches` takes names or patterns where `*` matches any characters. `createBranch`, `deleteBranch`, `createOrUpdateFile` and `editFiles` must name a matching branch, and `mergePullRequest` and `enablePullRequestAutoMerge` check the pull request's base branch.
- The checks run before any request reaches GitHub, on the input after `context` defaults. A blocked call fails with `github_tools.GUARDRAIL_BLOCKED` and a reason the model can act on.
- `createGithubAgent` and the eve extension deny a blocked write with the reason instead of asking anyone. `createGithubTools` and `createDurableGithubAgent` skip the approval request and fail. TanStack AI asks first, then fails.
- Available on `createGithubTools`, `createGithubAgent`, `createDurableGithubAgent`, TanStack AI's `createGithubTools`, `createGithubAgent` and tool factories, and the eve extension config.
- `withGithubGuardrails(token, guardrails)` wraps a token for tools built from individual factories, and the merge factories take `branches`. `@github-tools/sdk/eve-runtime` exports `githubGuardrailViolation`.
