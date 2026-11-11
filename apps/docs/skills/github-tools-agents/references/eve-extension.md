---
name: eve-extension
description: Add GitHub tools to an eve agent as a mountable extension via @github-tools/eve-extension, the recommended integration.
tags: [eve, extension, defineExtension, approval, filesystem, durable, human-in-the-loop]
---

# eve extension

Use `@github-tools/eve-extension` when the user builds an [eve](https://eve.dev) agent and wants GitHub tools. This is the **recommended** way to wire GitHub into eve, superseding the direct `@github-tools/sdk/eve` import (see `./eve-agents.md` for that deprecated path).

## Install

```bash
pnpm add @github-tools/eve-extension eve
```

- **`ai` v7** required (transitive `eve` peer); the extension declares `eve` as `*` and eve checks its generated capability metadata, not an npm range. Built against eve 1.0.0-rc.6; mounts on eve 1.0.0-rc.6 or later
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

Tools are exposed to the model as `<namespace>__<toolName>`: `agent/extensions/github.ts` yields `github__listPullRequests`, `github__createIssue`, and so on (unlike the direct import, which has no namespace prefix).

## Config schema

`token`, `connector`, `actAs`, `approvers`, `connect`, `preset`, `include`, `exclude`, `context`, `requireApproval`, `evaluation`, `guardrails`, `dryRun`, `overrides`, `author`/`committer`/`coAuthors`, see `/integrations/eve#config`. `guardrails: { repositories, branches }` deny any call outside the allowed repositories or branch patterns, whoever approves it, with the reason and without asking anyone. They cover the extension's tools only: eve's git extension runs `gh` through `git__gh` without approval, so limit it with its own `github.authorize` check. `dryRun: true` sends no write to GitHub and labels each one "Would create issue on owner/repo".

`token` is `string | (() => Promise<string>)` (`GithubTokenInput`). Pass an async provider for rotating GitHub App installation tokens. Falls back to `GITHUB_TOKEN` when omitted; `connector` takes priority.

`include` **adds** to `preset` (union). Use it standalone for an exact set, or on top of a preset to add a missing tool. `exclude` **removes** tool names from the resolved set, use it to drop a couple of tools from a larger preset:

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

The tool file is a `defineDynamic` function that eve runs before every model call; it rebuilds `execute`, `toModelOutput`, `approval`, and schemas from the extension config, so they survive Workflow replay and redeploys. The extension adds a system instruction with the preset's tool rules, the shared rules and the working `context` (`resolveToolGuidance`), and write tools set `label.complete` ("Created issue on owner/repo#123"). `preset: 'auto'` routing is kept for the session with `ctx.memo` (for the turn with `evaluation.scope: 'turn'`). `toModelOutput` also strips `rateLimit` from the model-facing payload. A failed call throws, so eve settles it as `failed` in `call.settled` and `noFailedCalls()` fails in an eval. The model receives an eve `error-text` result: `{ code, message, why, fix, link }` as JSON for catalog errors (e.g. `github_tools.NOT_FOUND` explains GitHub masks no-access private repos as 404), the error's message otherwise. An `approval` policy in `agent.ts` can add gates to GitHub tools but never remove one; match them with `toolName.startsWith('github__')`. A same-named tool in the agent, such as `agent/tools/github__createIssue.ts`, replaces the extension's.

## Approval

- Default: write tools → `always()`
- `'once'`, predicates, `always()` / `never()` passthrough
- `requireApproval: 'auto'` (global or per tool): low-risk writes the user asked for run without a prompt; other writes keep `always()`. Needs `ai` >= 7.0.105. A prompt it asks for ends with the evaluation model's verdict ("Add labels on owner/repo#12? Hard to undo (risk 2 of 2), 100% likely you asked for it."); a call it lets through gets `clearedBy: { policy: 'approval' }` on `call.started` (eve doesn't keep the verdict)
- `preset: 'auto'`: the evaluation model picks the tools the session's first request needs; those and the core read tools stay listed for the session so the provider's prompt cache holds (`evaluation.scope: 'turn'` picks again for each request); every other tool is deferred, reachable through `eve__search` / `eve__tool` with its approval policy intact. Tools already called in the session stay listed. `evaluation: { selection: 'presets' }` routes to at most two presets instead. Tune both with `evaluation`
- Approval **pauses the session durably** until a human responds
- On eve's GitHub channel, `context` fills from the thread (repository, issue or PR number); configured `context` fields win. Gate who starts a turn in `onComment` with `GET /repos/{owner}/{repo}/collaborators/{login}/permission` through `ctx.github.request`. Markdown schedules can't wait for approval, so give scheduled writes a predicate such as `({ session }) => session.schedule === undefined`

## Vercel Connect

```ts
export default githubExtension({
  connector: 'github/my-connector',
  preset: 'code-review',
})
```

No separate `connectGithubTools` import needed. `connector` is a mount-config field. The token requests the scopes of every selected tool; `code-review`, `ci-ops` and `maintainer` include `createCommitStatus` (`statuses:write`), so add Commit statuses (read and write) to the GitHub App or set `exclude: ['createCommitStatus']`, which drops the tool and its scope.

By default every caller shares the GitHub App installation's permissions. `actAs` picks whose GitHub access each call uses:

```ts
export default githubExtension({
  connector: 'github/my-connector',
  actAs: 'caller',
  preset: 'maintainer',
})
```

- `'app'` (default): the App installation for everyone.
- `'user'`: the signed-in user's own GitHub token. Sessions without a `principalType: 'user'` caller (schedules, `localDev()`) fail with `principal_required`.
- `'caller'`: the user when one drives the turn, the App otherwise (schedules, `localDev()`, bots). Recommended when the agent works both on its own and for people. The default may become `'caller'` in a future major.
- On eve's GitHub channel a commenter can't sign in. With `'caller'` their call runs as the App after the extension reads their role on the repository the call targets: Read for a read, Write for a write. A search runs only when the App's token reaches the thread's repository alone, and gists, notifications and repository creation are refused. A refused call returns `github_tools.CALLER_FORBIDDEN`; tell the person which access is missing and don't retry. With `'user'` the call waits for a sign-in GitHub can't show.
- `{ read, write }` picks per tool kind (each defaults to `'app'`); `overrides.<tool>.actAs` picks per tool.
- GitHub allows a user-token call only when both the user and the App have access, so a maintainer can merge and a reader gets `403`.
- A user who has not authorized the App gets an eve `sign-in` interaction, and the call resumes after it; a `401` asks them to sign in again. A signed-in user never falls back to the App.
- `approvers: 'requester'` (default): only the requester can approve or deny, so a colleague in a shared thread cannot approve someone else's request. `'anyone'` (opt-in, for simple shared agents): any signed-in user can approve and anyone can deny; for `'user'`/`'caller'` tools the approved call runs with the approver's token, so GitHub checks and records the approver, and an approver who has not authorized the App signs in before the approval counts. For `'app'` tools the approval is a gate only.
- `'user'`/`'caller'` need `connector`; `connect` configures App tokens and cannot be combined with `actAs: 'user'`.

One GitHub App installed on several accounts needs no configuration: each app token targets the installation owning the call's `owner/repo`, after `context` defaults. Tools without a repository target (search, gists, notifications) use the connector's default installation. Set `installationId`, `authorizationDetails` or `repositories` in `connect` to pin one installation; user subjects are left untouched. `connect` also accepts a custom `(ctx, call) => params` resolver, where `call` is `{ toolName, input, owner?, repo? }`. A missing installation surfaces as `CONNECT_INSTALLATION_REQUIRED` naming the account.

To choose who can reach the agent with a GitHub comment, use the extension's `githubChannel` instead of eve's. It takes eve's options plus `respondTo`:

```ts
// agent/channels/github.ts
import { connectGitHubCredentials } from '@vercel/connect/eve'
import { githubChannel } from '@github-tools/eve-extension/channels'

export default githubChannel({
  credentials: connectGitHubCredentials('github/my-connector'),
  respondTo: 'writers',
})
```

- `respondTo`: `'anyone'` (default), `'triagers'`, `'writers'`, `'maintainers'` or `'admins'`. Each value is a GitHub repository role and everyone above it.
- A comment from someone below it starts no turn: no reaction, no session, no model call.
- Pair it with `actAs: 'caller'` on an agent that people mention on GitHub.

## Docs

- `/integrations/eve`
- `examples/eve/`: `pnpm dev:eve` from monorepo root
