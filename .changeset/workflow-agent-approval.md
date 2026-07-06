---
"@github-tools/sdk": minor
---

Migrate `createDurableGithubAgent` from `DurableAgent` to `WorkflowAgent` (`@ai-sdk/workflow`). Write tools now honor `requireApproval` via `needsApproval` — the workflow pauses until the user approves or denies.
