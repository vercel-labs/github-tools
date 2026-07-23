<img src="https://github.com/vercel-labs/github-tools/blob/main/assets/banner.jpg" width="100%" alt="GitHub tools banner" />

# @github-tools/eve-extension

[![npm version](https://img.shields.io/npm/v/@github-tools/eve-extension?color=black)](https://npmjs.com/package/@github-tools/eve-extension)
[![npm downloads](https://img.shields.io/npm/dm/@github-tools/eve-extension?color=black)](https://npm.chart.dev/@github-tools/eve-extension)
[![TypeScript](https://img.shields.io/badge/TypeScript-black?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/github/license/vercel-labs/github-tools?color=black)](https://github.com/vercel-labs/github-tools/blob/main/LICENSE)

GitHub tools for [eve](https://eve.dev), packaged as a mountable [eve extension](https://eve.dev/docs/extensions) — a single `pnpm add` and a one-line mount, with no CLI setup. Built on top of [`@github-tools/sdk/eve`](../github-tools#eve).

Docs: **[github-tools.com/frameworks/eve](https://github-tools.com/frameworks/eve#eve-extension)**

This is the recommended direction for adding GitHub tools to an eve agent going forward. The direct [`@github-tools/sdk/eve`](../github-tools#eve) import remains supported for agents that prefer importing tools directly into `agent/tools/`.

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
  requireApproval: {
    addPullRequestComment: ({ toolInput }) => toolInput?.owner !== 'vercel-labs',
  },
})
```

> `code-review` pairs cleanly with a Connect `connector` — `maintainer` and `repo-explorer` include gist tools, and GitHub only grants gist access to user access tokens, never the installation tokens Connect mints, so gist calls 403 over Connect. Write tools already require approval via `always()` by default, so a plain `{ someTool: true }` is a no-op — use a predicate (as above) when you actually want to narrow or loosen the default.

Tools are exposed to the model as `<namespace>__<toolName>`, where `<namespace>` comes from the mount file's name — `agent/extensions/github.ts` yields `github__listPullRequests`, `github__createIssue`, and so on.

See the runnable consumer at [`examples/eve-extension-agent`](../../examples/eve-extension-agent).

## Structure

```
extension/
  extension.ts        # defineExtension() config schema (token, connector, preset, requireApproval, ...)
  tools/
    github.ts          # defineDynamic() returning buildEveToolMap(...) filtered by preset
```

## Config schema (`extension/extension.ts`)

| Field | Type | Notes |
|---|---|---|
| `token` | `string?` | Falls back to `GITHUB_TOKEN` when omitted and `connector` is not set |
| `connector` | `string?` | Vercel Connect connector name; takes priority over `token` |
| `connect` | `record?` | Passed through to `getToken` when `connector` is set |
| `preset` | preset name or array | `code-review`, `issue-triage`, `ci-ops`, `repo-explorer`, `maintainer` |
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
