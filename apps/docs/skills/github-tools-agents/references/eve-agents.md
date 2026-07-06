---
name: eve-agents
description: Register GitHub tools in eve via @github-tools/sdk/eve and defineDynamic.
tags: [eve, defineDynamic, approval, filesystem, durable, human-in-the-loop]
---

# eve agents

Use `@github-tools/sdk/eve` when the user builds an [eve](https://eve.dev) agent and wants GitHub tools from one file.

## Install

```bash
pnpm add @github-tools/sdk eve ai zod
```

- **`ai` v7** required (eve v0.19+ peer)
- `GITHUB_TOKEN` or explicit `token`

## One-file registration

```ts
// agent/tools/github.ts
import { createGithubTools } from '@github-tools/sdk/eve'

export default createGithubTools({
  preset: 'code-review',
  requireApproval: {
    mergePullRequest: true,
    createIssue: 'once',
  },
})
```

Tool names in the dynamic map match the AI SDK package (`listPullRequests`, `createIssue`, …).

## Approval

- Default: write tools → `always()`
- `'once'`, predicates, `always()` / `never()` passthrough
- Unlike `createDurableGithubAgent`, eve approval **works durably**

## Cherry-pick

```ts
import { listPullRequests } from '@github-tools/sdk/eve'
export default listPullRequests()
```

## Docs

- `/guide/eve-agents`
- `examples/eve-agent/` — `pnpm dev:eve-agent` from monorepo root
