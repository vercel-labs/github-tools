---
name: eve-extension
description: Add GitHub tools to an eve agent as a mountable extension via @github-tools/eve-extension — the recommended integration.
tags: [eve, extension, defineExtension, approval, filesystem, durable, human-in-the-loop]
---

# eve extension

Use `@github-tools/eve-extension` when the user builds an [eve](https://eve.dev) agent and wants GitHub tools — this is the **recommended** way to wire GitHub into eve, superseding the direct `@github-tools/sdk/eve` import (see `./eve-agents.md` for that deprecated path).

## Install

```bash
pnpm add @github-tools/eve-extension eve
```

- **`ai` v7** required (transitive `eve` peer)
- `GITHUB_TOKEN`, explicit `token`, or a Vercel Connect `connector`

## Mount under `agent/extensions/`

```ts
// agent/extensions/github.ts
import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  preset: 'code-review',
  requireApproval: {
    mergePullRequest: true,
    createIssue: 'once',
  },
})
```

Tools are exposed to the model as `<namespace>__<toolName>` — `agent/extensions/github.ts` yields `github__listPullRequests`, `github__createIssue`, and so on (unlike the direct import, which has no namespace prefix).

## Config schema

`token`, `connector`, `connect`, `preset`, `include`, `exclude`, `requireApproval`, `overrides`, `author`/`committer`/`coAuthors` — see `/frameworks/eve-extension#config-schema`.

`include` **adds** to `preset` (union) — use it standalone for an exact set, or on top of a preset to add a missing tool. `exclude` **removes** tool names from the resolved set — use it to drop a couple of tools from a larger preset:

```ts
export default githubExtension({
  include: ['getRepository', 'listPullRequests', 'mergePullRequest'],
})
```

```ts
export default githubExtension({
  preset: 'maintainer',
  exclude: ['createRepository', 'deleteGist'],
})
```

## Approval

- Default: write tools → `always()`
- `'once'`, predicates, `always()` / `never()` passthrough
- Approval **pauses the session durably** until a human responds

## Vercel Connect

```ts
export default githubExtension({
  connector: 'github/my-connector',
  preset: 'code-review',
})
```

No separate `connectGithubTools` import needed — `connector` is a mount-config field.

## Docs

- `/frameworks/eve-extension`
- `examples/eve-extension-agent/` — `pnpm dev:eve-extension-agent` from monorepo root
