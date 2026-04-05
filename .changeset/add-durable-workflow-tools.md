---
"@github-tools/sdk": minor
---

Add Vercel Workflow SDK support. Tool factories now take `token: string` instead of `Octokit`. Each tool uses a named module-level step function with `"use step"` for proper step registration and full Node.js access in the workflow sandbox. Add `@github-tools/sdk/workflow` subpath with `createDurableGithubAgent` powered by `DurableAgent`. Note: `requireApproval` is accepted for forward-compatibility but currently ignored by `DurableAgent`.
