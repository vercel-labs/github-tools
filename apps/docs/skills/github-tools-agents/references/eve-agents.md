---
name: eve-agents
description: Deprecated — register GitHub tools in eve via @github-tools/sdk/eve and defineDynamic. Prefer the eve-extension reference.
tags: [eve, defineDynamic, approval, filesystem, durable, human-in-the-loop, deprecated]
---

# eve agents (deprecated direct import)

**Deprecated.** Prefer `./eve-extension.md` — `@github-tools/eve-extension` mounted under `agent/extensions/` is now the recommended way to add GitHub tools to an eve agent. This direct `@github-tools/sdk/eve` import still works and is documented below for existing agents.

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

Or pass an exact set from one file via `include` (also available on `./eve-extension.md`); `include` adds to `preset` (union), and `exclude` removes tool names from the result:

```ts
export default createGithubTools({
  include: ['listPullRequests', 'mergePullRequest'],
})
```

## Docs

- `/frameworks/eve`
- `examples/eve-agent/` — `pnpm dev:eve-agent` from monorepo root
