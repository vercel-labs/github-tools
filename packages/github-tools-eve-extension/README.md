# @github-tools/eve-extension

GitHub tools for [eve](https://eve.dev), packaged as a mountable
[eve extension](https://eve.dev/docs/extensions).

This is the direction the eve integration is moving toward and will become the recommended way
to add GitHub tools to an eve agent. The direct `@github-tools/sdk/eve` import remains supported
in the meantime.

See the runnable consumer at [`examples/eve-extension-agent`](../../examples/eve-extension-agent).

## Structure

```
extension/
  extension.ts        # defineExtension() config schema (token, connector, preset, requireApproval, ...)
  tools/
    github.ts          # defineDynamic() returning buildEveToolMap(...) filtered by preset
```

## Build

```sh
pnpm --filter @github-tools/eve-extension build   # runs `eve extension build`
```

## Mount it

```ts
// agent/extensions/github.ts
import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/my-connector',   // or token: process.env.GITHUB_TOKEN
  preset: 'maintainer',
  requireApproval: {
    mergePullRequest: true,
    addPullRequestComment: ({ toolInput }) => toolInput?.owner !== 'vercel-labs',
  },
})
```

Tools are exposed to the model as `<namespace>__<toolName>`, where `<namespace>` comes from the
mount file's name (`extensions/github.ts` → `github__listPullRequests`, `github__createIssue`, ...).

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
