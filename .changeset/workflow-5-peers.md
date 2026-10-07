---
"@github-tools/sdk": minor
---

Support Workflow 5 for `createDurableGithubAgent`. The optional peer ranges now accept `workflow` `^4.5.0 || ^5.0.0` and `@ai-sdk/workflow` `^1.0.16 || ^2.0.0`, so installing `workflow@5` with `@ai-sdk/workflow@2` no longer reports peer conflicts. The unused `@workflow/ai` optional peer is removed; the durable agent requires `workflow` and `@ai-sdk/workflow`.

`createDurableGithubAgent` no longer pulls Octokit into the workflow flow bundle, which Workflow 5 rejects with `WorkflowBuildError: Workflow bundle cannot run in the workflow sandbox`. Tool implementations moved from `GITHUB_TOOL_CATALOG` to a separate internal map; the public API is unchanged.
