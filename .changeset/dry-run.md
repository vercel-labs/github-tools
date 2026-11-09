---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Add `dryRun` to try an agent on real repositories without changing them. Reads go to GitHub as usual; each write goes through approval and `guardrails`, then returns a result instead of calling GitHub:

```ts
createGithubAgent({ model, preset: 'issue-triage', dryRun: true })
// addLabels → { dryRun: true, tool: 'addLabels', input, message: 'Dry run: `addLabels` was not sent to GitHub, …' }
```

Available on `createGithubTools`, `createGithubAgent`, `createDurableGithubAgent`, the eve extension config, and TanStack AI's `createGithubTools`, `createGithubAgent` and tool factories. On eve, the channel label reads "Would create issue on owner/repo". The base branch of a merge isn't checked in a dry run, since that takes a request. The `GithubDryRunResult` type is exported from `@github-tools/sdk` and `@github-tools/sdk/eve-runtime`.
