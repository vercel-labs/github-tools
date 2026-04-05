---
"@github-tools/sdk": minor
---

Add native `"use step"` to every tool for Vercel Workflow SDK durability. Tool factories now take `token: string` instead of `Octokit` and create their own client internally, making closures serializable for durable step execution. Add `@github-tools/sdk/workflow` subpath with `createDurableGithubAgent` powered by `DurableAgent`.
