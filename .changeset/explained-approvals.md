---
'@github-tools/sdk': minor
---

`createGithubAgent` now decides approvals with the AI SDK's call-level `toolApproval`, which replaces tool-level `needsApproval` in AI SDK 7, and explains `requireApproval: 'auto'` decisions:

- An approval request carries the evaluator's verdict as its `reason`, such as "Visible but reversible (risk 0.5 of 2), 1% likely you asked for it." UIs read it from `part.approval.requestReason`.
- A call the evaluator lets through is recorded as an automatic approval (`isAutomatic: true`) with its verdict, so the conversation shows what ran without a person.
- A failed or refused evaluation asks, and says why.

Calls through `callGithubTool` follow the approval of the tool they name. A tool you add outside the GitHub catalog, for example through `prepareCall`, keeps its own `needsApproval`. Passing your own `toolApproval` replaces this policy. `createGithubTools` keeps tool-level `needsApproval` for `generateText` and `streamText`, without reasons.
