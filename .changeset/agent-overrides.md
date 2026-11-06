---
'@github-tools/sdk': patch
---

`createGithubAgent` now applies `overrides` to its tools. Before, the option was accepted but passed to `ToolLoopAgent` instead of `createGithubTools`, so a custom description or `needsApproval` had no effect. `createDurableGithubAgent` also accepts `overrides` now.
