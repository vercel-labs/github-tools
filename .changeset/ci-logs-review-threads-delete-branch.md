---
"@github-tools/sdk": minor
"@github-tools/eve-extension": minor
---

Add five tools (84 total): `getWorkflowJobLogs` reads a workflow job's log output, returning the last `maxLines` lines (default 200, max 2000) with per-line timestamps stripped to keep token usage low. `listPullRequestReviewThreads` lists PR review threads via GraphQL with resolution state and the IDs needed to reply or resolve — unresolved threads only and truncated comment bodies by default (`status: 'all'`, `detail: 'full'` to override). `replyToReviewComment` and `resolveReviewThread` answer and close review threads, and `deleteBranch` deletes a branch — all three are write tools requiring approval by default. Presets updated: `ci-ops`, `security-audit`, and `repo-explorer` gain job logs; `code-review` and `pr-author` gain the review-thread tools; `pr-author` also gains `deleteBranch`.
