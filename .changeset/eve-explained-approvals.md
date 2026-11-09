---
'@github-tools/eve-extension': minor
'@github-tools/sdk': minor
---

The eve extension now explains `requireApproval: 'auto'` decisions, as `createGithubAgent` does:

- An approval prompt ends with the evaluation model's verdict, such as "Add labels on owner/repo#12? Hard to undo (risk 2 of 2), 100% likely you asked for it."
- A call the evaluation model lets through returns `'approved'` from the approval policy, so eve records `clearedBy: { policy: 'approval' }` on its `call.started` event. Before, it looked like a call that needed no approval.

`@github-tools/sdk/eve-runtime` exports `autoApprovalDecision`, which returns `{ ask, reason }` for a GitHub write.
