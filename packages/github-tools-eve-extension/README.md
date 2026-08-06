<img src="https://github.com/vercel-labs/github-tools/blob/main/assets/banner.jpg" width="100%" alt="GitHub tools banner" />

# @github-tools/eve-extension

[![npm version](https://img.shields.io/npm/v/@github-tools/eve-extension?color=black)](https://npmjs.com/package/@github-tools/eve-extension)
[![npm downloads](https://img.shields.io/npm/dm/@github-tools/eve-extension?color=black)](https://npm.chart.dev/@github-tools/eve-extension)
[![TypeScript](https://img.shields.io/badge/TypeScript-black?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/github/license/vercel-labs/github-tools?color=black)](https://github.com/vercel-labs/github-tools/blob/main/LICENSE)

GitHub tools for [eve](https://eve.dev), packaged as a mountable [eve extension](https://eve.dev/docs/extensions): a single `pnpm add` and a one-line mount, with no CLI setup. Built on [`@github-tools/sdk/eve-runtime`](../github-tools) (shared descriptors, execution, and approval helpers).

Docs: **[github-tools.com/frameworks/eve-extension](https://github-tools.com/frameworks/eve-extension)**

This is **the recommended way** to add GitHub tools to an eve agent. The legacy [`createGithubTools`](../github-tools) / per-tool factories from `@github-tools/sdk/eve` (direct `agent/tools/` registration) are **deprecated** in its favor. They keep working for existing agents, but new agents should mount this extension instead.

## Installation

```sh
pnpm add @github-tools/eve-extension
```

`eve` is a required peer dependency; `@vercel/connect` is optional (install it only when using `connector`):

```sh
pnpm add eve
```

## Mount it

```ts
// agent/extensions/github.ts
import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/my-connector', // or token: process.env.GITHUB_TOKEN
  preset: 'code-review',
  context: { owner: 'vercel-labs', repo: 'github-tools' },
  requireApproval: {
    addPullRequestComment: ({ toolInput }) => toolInput?.owner !== 'vercel-labs',
  },
})
```

> `code-review` pairs cleanly with a Connect `connector`. `maintainer` and `repo-explorer` include gist tools, and GitHub only grants gist access to user access tokens, never the installation tokens Connect mints, so gist calls 403 over Connect. Write tools already require approval via `always()` by default, so a plain `{ someTool: true }` is a no-op, use a predicate (as above) when you actually want to narrow or loosen the default.

Tools are registered with **inline** `execute` handlers in the extension package so they survive multi-turn durable eve Workflow replay (see [#51](https://github.com/vercel-labs/github-tools/issues/51)). Do not use the deprecated `@github-tools/sdk/connect/eve` one-liner for durable Slack/multi-turn agents.

`connector` also accepts a `() => string | Promise<string>` resolver, so the same config can pick a connector dynamically (e.g. by environment):

```ts
export default githubExtension({
  connector: () => (process.env.VERCEL_ENV === 'production' ? 'github/prod-connector' : 'github/preview-connector'),
  preset: 'code-review',
})
```

Tools are exposed to the model as `<namespace>__<toolName>`, where `<namespace>` comes from the mount file's name: `agent/extensions/github.ts` yields `github__listPullRequests`, `github__createIssue`, and so on.

To hand-pick an exact set of tools instead of a preset, pass `include`:

```ts
export default githubExtension({
  include: ['getRepository', 'listPullRequests', 'mergePullRequest'],
})
```

`include` **adds** to `preset` (union), use it to pull in a tool a preset is missing. `exclude` **removes** tool names from the resolved `preset` + `include` set, use it to drop a couple of tools from a larger preset:

```ts
export default githubExtension({
  preset: 'maintainer',
  exclude: ['createRepository', 'deleteGist'],
})
```

See the runnable consumer at [`examples/eve-extension-agent`](../../examples/eve-extension-agent).

## Structure

```
extension/
  extension.ts        # defineExtension() config schema (token, connector, preset, include, exclude, requireApproval, ...)
  tools/
    github.ts          # defineDynamic() returning buildEveToolMap(...) scoped by preset/include/exclude
```

## Config schema (`extension/extension.ts`)

| Field | Type | Notes |
|---|---|---|
| `token` | `string?` | Falls back to `GITHUB_TOKEN` when omitted and `connector` is not set |
| `connector` | `string \| (() => string \| Promise<string>)` (optional) | Vercel Connect connector name, or a resolver to pick one dynamically (e.g. per environment/tenant); takes priority over `token` |
| `connect` | `record?` | Passed through to `getToken` when `connector` is set |
| `preset` | preset name or array | `code-review`, `issue-triage`, `ci-ops`, `repo-explorer`, `security-audit`, `release-manager`, `discussion-moderator`, `notification-inbox`, `pr-author`, `maintainer` |
| `include` | `string[]?` | Tool names to add on top of `preset` (union), or the full set standalone |
| `exclude` | `string[]?` | Tool names to remove from the resolved `preset` + `include` set |
| `context` | `{ owner?, repo?, pullNumber?, issueNumber?, ref? }?` | Default working context for tool inputs and schemas |
| `requireApproval` | `boolean \| record` | Global or per-tool; per-tool values may be predicate functions |
| `overrides` | `record` | Per-tool `description` / `approval` / `toModelOutput` / `outputSchema` |
| `author` / `committer` / `coAuthors` | commit identity | Attribution for commit-creating tools |

## Build (contributors)

```sh
pnpm --filter @github-tools/eve-extension build   # runs `eve extension build`
```

## License

[MIT](../../LICENSE)

Made by [@HugoRCD](https://github.com/HugoRCD)
