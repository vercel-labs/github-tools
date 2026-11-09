---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Add `dryRun`, a shadow mode to see what an agent would do on real repositories before it writes. Reads go to GitHub as usual. Writes don't reach GitHub and nobody is asked to approve them: each write goes through `guardrails`, then returns what it would have done and what approval would have decided.

```ts
createGithubAgent({ model, preset: 'issue-triage', requireApproval: 'auto', dryRun: true })
// addLabels → { dryRun: true, tool: 'addLabels', input, approval: { required: false, reason: 'Approved automatically: …' }, message: 'Dry run: …' }
```

Use it to roll out a bot that runs on its own, to test against real data, or to compare models and prompts. It fits writes that stand on their own (labels, comments, reviews, closing issues), not chains where a later step needs an earlier write's result. The base branch of a merge isn't checked in a dry run, since that takes a request.

Available on `createGithubTools`, `createGithubAgent`, `createDurableGithubAgent`, the eve extension config, and TanStack AI's `createGithubTools`, `createGithubAgent` and tool factories. On eve, the channel label reads "Would create issue on owner/repo". On TanStack AI, `'auto'` approval is decided by middleware a dry run never reaches, so those results have no `approval`. The `GithubDryRunResult` and `GithubDryRunApproval` types are exported from `@github-tools/sdk` and `@github-tools/sdk/eve-runtime`.
