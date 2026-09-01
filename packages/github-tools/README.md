<img src="https://github.com/vercel-labs/github-tools/blob/main/assets/banner.jpg" width="100%" alt="GitHub tools banner" />

# @github-tools/sdk

[![npm version](https://img.shields.io/npm/v/@github-tools/sdk?color=black)](https://npmjs.com/package/@github-tools/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@github-tools/sdk?color=black)](https://npm.chart.dev/@github-tools/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-black?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/github/license/vercel-labs/github-tools?color=black)](https://github.com/vercel-labs/github-tools/blob/main/LICENSE)

**Give any agent GitHub access.** A typed tool layer for GitHub AI agents, with presets, human approval, and durable execution. Works with [eve](https://eve.dev), the [AI SDK](https://ai-sdk.dev), Vercel Workflow, and [Chat SDK](https://chat-sdk.dev).

Docs: **[github-tools.com](https://github-tools.com)**

## Why not the GitHub MCP server, `gh` CLI, or raw Octokit?

They all reach the GitHub API, but none of them were built as an agent's tool layer. An agent still needs a schema it can fill reliably, a safety gate before it merges a PR, output shaped to fit a context window, and a way to survive a crash mid-task.

| | `@github-tools/sdk` | GitHub MCP server | `gh` CLI | Raw Octokit |
|---|---|---|---|---|
| Integration | Native AI SDK `tool()` objects | MCP wire protocol via a separate process | Shell-out from the agent | Hand-written per call |
| Human approval | Built in, on by default | Host-dependent, inconsistent | None | You build it |
| Durable / retryable | Every call is a `"use step"` | No | No | No |
| Scoped by task | Presets (7 built-in) | Full server surface, or manual filtering | Full CLI surface | You build it |
| Token-efficient output | Shaped and truncated by design | Raw API responses | Raw text, needs parsing | Raw API responses |
| Native eve / Workflow / Chat SDK | Yes | No | No | No |

## Pick your path

| What are you building | Start here |
|---|---|
| A standalone GitHub agent, fast: 3 files, durable approval | [eve extension](#eve-extension-recommended) |
| Scripts, chat backends, or an existing AI SDK app | Quick Start below |
| Production agents that must survive restarts and timeouts | [Durable Agents](#durable-agents-vercel-workflow-sdk) |
| A GitHub, Slack, or Discord bot | [Chat SDK docs](https://github-tools.com/frameworks/chat-sdk) |

84 tools cover repositories, branches, pull requests, issues, reactions, discussions, notifications, commits, releases, checks and statuses, search, gists, and workflows. See the full [Tools Catalog](https://github-tools.com/api/tools-catalog). Write operations support granular approval control out of the box.

## Installation

```sh
pnpm add @github-tools/sdk
```

`ai` and `zod` are peer dependencies (`ai` v6 or v7; the eve subpath requires v7):

```sh
pnpm add ai zod
```

## Quick Start

```ts
// list-prs.ts
import { createGithubTools } from '@github-tools/sdk'
import { generateText } from 'ai'

const result = await generateText({
  model: yourModel,
  tools: createGithubTools({ token: process.env.GITHUB_TOKEN! }),
  prompt: 'List the open pull requests on vercel/ai and summarize them.',
})
```

### Presets

Use `preset` to get only the tools relevant to a specific use case:

```ts
// Code-review agent: PRs, commits, file content, and comments
createGithubTools({ token, preset: 'code-review' })

// Issue triage: read/create/close issues, search
createGithubTools({ token, preset: 'issue-triage' })

// Read-only exploration: browse repos without write access
createGithubTools({ token, preset: 'repo-explorer' })

// Security audit: read-only exploration, PR/CI visibility, plus issue creation to report findings
createGithubTools({ token, preset: 'security-audit' })

// Release manager: releases, compare diff, commits, workflow runs, pull requests
createGithubTools({ token, preset: 'release-manager' })

// Discussion moderator: Discussions plus light issue context
createGithubTools({ token, preset: 'discussion-moderator' })

// Notification inbox: triage user notifications (needs a Notifications PAT)
createGithubTools({ token, preset: 'notification-inbox' })

// PR author: branches, file edits, and opening PRs
createGithubTools({ token, preset: 'pr-author' })

// Full catalog: all tools (same as omitting preset)
createGithubTools({ token, preset: 'maintainer' })
```

Presets are composable, pass an array to combine them:

```ts
createGithubTools({ token, preset: ['code-review', 'issue-triage'] })
```

| Preset | Tools included |
|---|---|
| `code-review` | `getPullRequest`, `listPullRequests`, `listPullRequestFiles`, `listPullRequestReviews`, `listPullRequestReviewThreads`, `getPullRequestContext`, `getFileContent`, `listCommits`, `getCommit`, `getBlame`, `compareCommits`, `getRepository`, `listBranches`, `searchCode`, `listCheckRuns`, `getCombinedStatus`, `updatePullRequest`, `addPullRequestComment`, `updatePullRequestComment`, `deletePullRequestComment`, `createPullRequestReview`, `replyToReviewComment`, `resolveReviewThread`, `requestReviewers` |
| `issue-triage` | `listIssues`, `getIssueContext`, `listIssueComments`, `createIssue`, `addIssueComment`, `updateIssueComment`, `deleteIssueComment`, `closeIssue`, `updateIssue`, `addLabels`, `removeLabel`, `createLabel`, `updateLabel`, `deleteLabel`, `addAssignees`, `removeAssignees`, `listIssueReactions`, `addIssueReaction`, `listCommentReactions`, `addCommentReaction`, `getRepository`, `searchRepositories`, `searchCode`, `searchIssues` |
| `repo-explorer` | All read-only tools including discussions, gists, workflows, checks/statuses, and releases (no write operations) |
| `ci-ops` | `listWorkflows`, `listWorkflowRuns`, `getWorkflowRun`, `listWorkflowJobs`, `getWorkflowJobLogs`, `listCheckRuns`, `getCombinedStatus`, `getCiFailureContext`, `triggerWorkflow`, `cancelWorkflowRun`, `rerunWorkflowRun`, `getRepository`, `listBranches`, `listCommits`, `getCommit` |
| `security-audit` | Read-only exploration (`getFileContent`, `getRepositoryTree`, `searchCode`, `listCommits`, `getCommit`, `getBlame`, `compareCommits`), PR and CI visibility (including `getWorkflowJobLogs`), plus `createIssue`, `addIssueComment`, `addLabels` to report findings (no destructive writes) |
| `release-manager` | `listReleases`, `getLatestRelease`, `getRelease`, `getReleaseContext`, `createRelease`, `updateRelease`, `deleteRelease`, `compareCommits`, `listCommits`, `getCommit`, `listWorkflowRuns`, `getWorkflowRun`, `listPullRequests`, `getPullRequest`, `getRepository`, `listBranches` |
| `discussion-moderator` | `listDiscussions`, `getDiscussion`, `addDiscussionComment`, `getRepository`, `searchIssues`, `getIssueContext`, `addIssueComment` |
| `notification-inbox` | `listNotifications`, `markNotificationRead`, `getIssue`, `getPullRequest`, `getRepository` (requires a Notifications PAT) |
| `pr-author` | `getRepository`, `listBranches`, `getFileContent`, `createBranch`, `deleteBranch`, `createOrUpdateFile`, `createPullRequest`, `updatePullRequest`, `getPullRequest`, `listPullRequestFiles`, `listPullRequestReviewThreads`, `replyToReviewComment`, `resolveReviewThread`, `compareCommits`, `getCommit` |
| `maintainer` | All 84 tools |

Start with the smallest preset that fits. Use `maintainer` or omit `preset` when you need the full catalog. Full breakdown: [Tools Catalog](https://github-tools.com/api/tools-catalog).

### Cherry-Picking Tools

You can also import individual tool factories for full control:

```ts
import { listPullRequests, createIssue } from '@github-tools/sdk'

const token = process.env.GITHUB_TOKEN!

const tools = {
  listPullRequests: listPullRequests(token),
  createIssue: createIssue(token),
}
```

Each tool factory accepts a `token` string. Tools use named module-level step functions with `"use step"` internally, ensuring proper step registration and full Node.js access when running inside a Vercel Workflow sandbox. See [Durable Agents](#durable-agents-vercel-workflow-sdk).

## Approval Control

Write operations (creating issues, merging PRs, pushing files, …) require user approval by default. This is designed for human-in-the-loop agent workflows.

```ts
// All writes need approval (default)
createGithubTools({ token })

// No approval needed
createGithubTools({ token, requireApproval: false })

// Granular: only destructive actions need approval
createGithubTools({
  token,
  requireApproval: {
    mergePullRequest: true,
    createOrUpdateFile: true,
    closeIssue: true,
    createPullRequest: false,
    addPullRequestComment: false,
    createIssue: false,
    addIssueComment: false,
  },
})
```

Write tools: `createBranch`, `deleteBranch`, `forkRepository`, `createRepository`, `createOrUpdateFile`, `createPullRequest`, `mergePullRequest`, `updatePullRequest`, `addPullRequestComment`, `updatePullRequestComment`, `deletePullRequestComment`, `createPullRequestReview`, `replyToReviewComment`, `resolveReviewThread`, `requestReviewers`, `createIssue`, `addIssueComment`, `updateIssueComment`, `deleteIssueComment`, `closeIssue`, `updateIssue`, `addLabels`, `removeLabel`, `createLabel`, `updateLabel`, `deleteLabel`, `addAssignees`, `removeAssignees`, `addIssueReaction`, `addCommentReaction`, `addDiscussionComment`, `markNotificationRead`, `createGist`, `updateGist`, `deleteGist`, `createGistComment`, `triggerWorkflow`, `cancelWorkflowRun`, `rerunWorkflowRun`, `createRelease`, `updateRelease`, `deleteRelease`.

All other tools are read-only and never require approval.

### Tool overrides

The `overrides` option lets you customize any AI SDK [`tool()`](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) property on a per-tool basis, keyed by tool name.

```ts
import type { ToolOverrides } from "@github-tools/sdk";
```

Supported override properties:

| Property | Type | Description |
|----------|------|-------------|
| `description` | `string` | Custom tool description for the model |
| `title` | `string` | Human-readable title |
| `strict` | `boolean` | Strict mode for input generation |
| `needsApproval` | `boolean \| function` | Gate execution behind approval |
| `providerOptions` | `ProviderOptions` | Provider-specific metadata |
| `onInputStart` | `function` | Callback when argument streaming starts |
| `onInputDelta` | `function` | Callback on each streaming delta |
| `onInputAvailable` | `function` | Callback when full input is available |
| `toModelOutput` | `function` | Custom mapping of tool result to model output |

Core properties (`execute`, `inputSchema`, `outputSchema`) cannot be overridden.

## Rate-limit metadata

Object-shaped tool results include a `rateLimit` field from the last GitHub response. REST list tools now return objects, so they carry it too. The field is stripped before the model sees the output; hooks, channels, and UIs still receive it.

```ts
import type { GithubRateLimit } from '@github-tools/sdk'

result.rateLimit?.remaining
```

`resource` is `core`, `search`, or `graphql`. On HTTP 403/429 the thrown error message also includes remaining/reset.

## Errors

Classifiable failures become structured [evlog](https://evlog.dev) catalog errors with a stable `code`, a `why` (technical cause), and a `fix` (actionable remedy) — written so a model recovers instead of hallucinating. The two causes models get wrong most often are spelled out: GitHub answers 404 for private resources the token cannot see (`NOT_FOUND`), and an expired `VERCEL_OIDC_TOKEN` is caught before any request with the exact expiry time (`OIDC_TOKEN_EXPIRED`) instead of surfacing as an opaque Connect 403.

Codes: `TOKEN_REQUIRED`, `OIDC_TOKEN_EXPIRED`, `CONNECT_NOT_AUTHORIZED`, `CONNECT_USER_NOT_CONNECTED`, `CONNECT_INSTALLATION_REQUIRED`, `SUBJECT_CONTEXT_REQUIRED`, `UNAUTHORIZED` (401), `FORBIDDEN` (403), `RATE_LIMITED` (403/429), `NOT_FOUND` (404), `VALIDATION_FAILED` (422). Unmapped statuses pass through unchanged; the original Octokit error stays reachable as `cause`.

In the eve extension, a failing tool returns `{ error: { code, message, why, fix } }` to the model. With `generateText`/`streamText`, the framework forwards `error.message` (self-sufficient by design); use evlog's `parseError(error)` when you need the full structure. The catalog is exported as `githubToolsErrors`. See the [errors guide](https://github-tools.com/guide/errors).

## Commit Attribution

Control how commits are attributed when using `createOrUpdateFile` or `mergePullRequest`:

```ts
import { createGithubTools } from '@github-tools/sdk'

const tools = createGithubTools({
  token,
  coAuthors: [
    { name: 'my-bot[bot]', email: '12345+my-bot[bot]@users.noreply.github.com' }
  ]
})
```

This appends `Co-authored-by` trailers to commit messages, crediting additional contributors.

| Option | Type | Description |
|--------|------|-------------|
| `author` | `{ name: string, email: string }` | The person who wrote the code. Falls back to the authenticated user. |
| `committer` | `{ name: string, email: string }` | The person who applied the commit. Falls back to the authenticated user. |
| `coAuthors` | `{ name: string, email: string }[]` | Additional contributors added as `Co-authored-by` trailers. |

Commits made via the GitHub API are **automatically signed** by GitHub's web-flow key, passing branch protection rules that require signed commits.

## Tool Selection with toolpick

With dozens of tools, context window usage adds up. [toolpick](https://github.com/pontusab/toolpick) selects only the most relevant tools per step so the model sees what it needs:

```ts
import { createGithubTools } from '@github-tools/sdk'
import { createToolIndex } from 'toolpick'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const tools = createGithubTools()
const index = createToolIndex(tools, {
  embeddingModel: openai.embeddingModel('text-embedding-3-small'),
})

const result = await generateText({
  model: openai('gpt-4o'),
  tools,
  prepareStep: index.prepareStep(),
  prompt: 'List open PRs on vercel/ai and summarize them.',
})
```

Each step, toolpick picks the best ~5 tools using keyword + semantic search. All tools remain callable, only the visible set changes. See [toolpick docs](https://github.com/pontusab/toolpick) for LLM re-ranking, caching, and model-driven discovery options.

## Durable Agents (Vercel Workflow SDK)

All tools include `"use step"` directives with named, module-level step functions, making them natively compatible with the Vercel Workflow SDK. Each tool execution runs as a properly registered durable step with full Node.js access in the workflow sandbox.

Use `WorkflowAgent` via the `@github-tools/sdk/workflow` subpath to make every LLM call and tool execution a retryable, crash-safe step:

```ts
import { createDurableGithubAgent } from '@github-tools/sdk/workflow'

const agent = createDurableGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  preset: 'maintainer',
})
```

All presets work with `createDurableGithubAgent`. Write tools honor `requireApproval` via `needsApproval`: the workflow pauses until the user approves or denies.

> `workflow` and `@ai-sdk/workflow` are optional peer dependencies, install them only when using the workflow subpath.

## Vercel Connect

[Vercel Connect](https://vercel.com/docs/connect) mints short-lived GitHub tokens from a connector, with no PAT to store. The `@github-tools/sdk/connect` subpath derives scopes from your preset automatically.

```sh
pnpm add @vercel/connect
```

```ts
import { connectGithubTools } from '@github-tools/sdk/connect'

const tools = connectGithubTools('github/my-connector', {
  preset: 'code-review',
})
```

For eve agents, pass `connector` directly to the [eve extension](#eve-extension-recommended) (recommended): no separate Connect import, and no `build.externalDependencies` workaround needed:

```ts
// agent/extensions/github.ts
import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/my-connector',
  preset: 'maintainer',
})
```

For the deprecated direct import, use `connectGithubTools` from `@github-tools/sdk/connect/eve` the same way inside `agent/tools/github.ts`. That path does need `build: { externalDependencies: ['@vercel/connect'] }` in `agent.ts` (see [eve, direct import](#eve-direct-import-deprecated) below).

`connectGithubTools` mints tokens lazily at tool execution. Do not `await getToken(...)` at module top level in `agent/tools/` (that runs at import/build time).

Token provider only (custom factories):

```ts
import { connectGithubToken } from '@github-tools/sdk/connect'

createGithubTools({
  preset: 'ci-ops',
  token: connectGithubToken('github/my-connector', { preset: 'ci-ops' }),
})
```

Pass the same `preset` to `connectGithubToken`: it derives Connect scopes independently of the `preset` given to `createGithubTools`.

Override installation, repositories, or scopes via `connect`:

```ts
connectGithubTools('github/my-connector', {
  preset: 'issue-triage',
  connect: {
    installationId: 'inst_abc',
    repositories: ['my-org/my-repo'],
    scopes: ['issues:write'],
  },
})
```

> `@vercel/connect` is an optional peer dependency, install it only when using the `/connect` subpath.

`connector` accepts a `() => string | Promise<string>` resolver instead of a static name, re-resolved on every call. Useful to pick a connector per environment or tenant:

```ts
connectGithubTools(
  () => (process.env.VERCEL_ENV === 'production' ? 'github/prod-connector' : 'github/preview-connector'),
  { preset: 'code-review' },
)
```

## eve

[eve](https://eve.dev) is Vercel's filesystem-first agent framework. `@github-tools/eve-extension` is the **recommended** way to add GitHub tools to an eve agent: a mountable [eve extension](https://eve.dev/docs/extensions), no CLI setup, no direct SDK import in `agent/tools/`. The legacy `createGithubTools` / per-tool factories on `@github-tools/sdk/eve` are **deprecated** for that registration pattern; they keep working and are documented below for existing agents. Shared runtime helpers for the extension live on `@github-tools/sdk/eve-runtime` (not deprecated).

### eve extension (recommended)

```sh
pnpm add @github-tools/eve-extension eve
```

`eve` is a required peer dependency (itself requiring **`ai` v7**).

```ts
// agent/extensions/github.ts
import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  preset: ['code-review', 'issue-triage'],
  requireApproval: {
    mergePullRequest: true,
    createIssue: 'once',
    addPullRequestComment: false,
    createOrUpdateFile: ({ toolInput }) => toolInput?.owner !== 'vercel-labs',
  },
})
```

Tools are exposed to the model as `<namespace>__<toolName>`, where `<namespace>` comes from the mount file's name: `agent/extensions/github.ts` yields `github__listPullRequests`, `github__createIssue`, and so on.

For Vercel Connect, pass `connector` directly, no separate import needed:

```ts
// agent/extensions/github.ts
import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/my-connector',
  preset: 'maintainer',
})
```

No `build.externalDependencies` workaround is needed here. Unlike the deprecated direct import below, the extension is pre-built via `eve extension build` and loaded through eve's extension mechanism rather than inlined from a workspace-linked source import.

See [`packages/github-tools-eve-extension`](../github-tools-eve-extension) and [`examples/eve`](../../examples/eve) for the full package README and a runnable agent.

### eve, direct import (deprecated)

The `@github-tools/sdk/eve` subpath registers all GitHub tools via `defineDynamic`: one file, zero CLI. This keeps working but new agents should use the extension above.

```sh
pnpm add @github-tools/sdk eve ai zod
```

`eve` v0.19+ requires **`ai` v7** as a peer dependency.

```ts
// agent/tools/github.ts
import { createGithubTools } from '@github-tools/sdk/eve'

export default createGithubTools({
  preset: ['code-review', 'issue-triage'],
  requireApproval: {
    mergePullRequest: true,
    createIssue: 'once',
    addPullRequestComment: false,
    createOrUpdateFile: ({ toolInput }) => toolInput?.owner !== 'vercel-labs',
  },
})
```

Dynamic tools are named by their **bare map key**: the model sees `listPullRequests`, `createIssue`, and so on (same names as the AI SDK package). There is no automatic file-slug prefix when returning a tool map from `defineDynamic`.

#### Approval (eve)

| Value | Maps to | Behavior |
|---|---|---|
| `true` / `'always'` | `always()` | Require approval on every call |
| `false` / `'never'` | omit `approval` | Skip approval (eve default) |
| `'once'` | `once()` | Approve once per session, then auto-allow |
| predicate | custom `Approval` | Input-dependent gate; booleans map to `user-approval` / `not-applicable` |
| `always()` / `once()` / `never()` | passthrough | Use eve helpers directly |

Default (no `requireApproval`): all write tools → `always()`. Unlisted write tools keep the `always()` fail-safe default.

Unlike the Workflow SDK subpath, eve approval **works durably**: gated tools pause the session until a human approves.

#### Cherry-picking (one tool per file)

```ts
// agent/tools/list_pull_requests.ts
import { listPullRequests } from '@github-tools/sdk/eve'

export default listPullRequests()
```

#### Idempotency

eve replays completed steps but re-runs steps interrupted mid-execution. Write tools vary:

| Tool | Idempotency |
|---|---|
| `createOrUpdateFile` | Natural when content + `sha` unchanged (skips no-op updates) |
| `closeIssue` | Natural when already closed |
| `createBranch` | Natural when branch exists at same SHA |
| `removeAssignees` | Natural: removing an assignee that isn't assigned is a no-op on GitHub |
| `addIssueReaction`, `addCommentReaction` | Natural: GitHub returns the existing reaction when the user already reacted with the same content |
| `markNotificationRead` | Natural when the thread is already read |
| `updateIssue`, `updatePullRequest`, `updateRelease`, `updateIssueComment`, `updatePullRequestComment` | **Not** idempotent: each call applies a new revision |
| `deleteIssueComment`, `deletePullRequestComment`, `deleteRelease`, `deleteBranch` | **Not** idempotent: deleting an already-deleted resource fails on GitHub |
| `addIssueComment`, `addDiscussionComment`, `createIssue`, `mergePullRequest`, `createRelease`, … | **Not** idempotent: each call creates new side effects |

Gate non-idempotent writes behind `always()` or `once()` where replay safety matters.

#### Vercel Connect

Mint the token from a Connect connector instead of `GITHUB_TOKEN`. `connectGithubTools` derives scopes from `preset` and fetches the token lazily inside each tool call:

```ts
// agent/tools/github.ts
import { connectGithubTools } from '@github-tools/sdk/connect/eve'

export default connectGithubTools('github/my-connector', {
  preset: 'maintainer',
})
```

Add `build: { externalDependencies: ['@vercel/connect'] }` to `agent.ts`. See [Vercel Connect](#vercel-connect) above for the full setup checklist.

> `eve` is an optional peer dependency, install it only when using the `/eve` subpath.

New agents should use the [eve extension](#eve-extension) above; see [`examples/eve`](../../examples/eve).

## Available Tools

List tools return `{ items, hasMore, page, perPage, nextPage? }` (or add those fields next to `checkRuns` / `runs` / …). When `hasMore`, call with `nextPage` or set `maxPages` to combine sequential pages in one call — do not repeat the same page. Filter `listCommits` with `path` / `author` / `since` / `until`. `getRepositoryTree` accepts a `path` prefix.

### Repository

| Tool | Description |
|---|---|
| `getRepository` | Get repository metadata (stars, language, default branch, …) |
| `listBranches` | List branches (`hasMore` / `nextPage` when there are more) |
| `getFileContent` | Read a file or directory listing (prefer `startLine`/`endLine` or `maxLines` for large files) |
| `getRepositoryTree` | List the file and directory structure at a given ref (prefer a `path` prefix over `recursive: true`) |
| `createBranch` | Create a new branch from an existing branch or commit SHA |
| `deleteBranch` | Permanently delete a branch |
| `forkRepository` | Fork a repository to a user or organization |
| `createRepository` | Create a new repository for a user or organization |
| `createOrUpdateFile` | Create or update a file and commit it |

### Pull Requests

| Tool | Description |
|---|---|
| `listPullRequests` | List PRs filtered by state |
| `getPullRequest` | Get a PR's full details (diff stats, body, merge status; body truncated by default) |
| `listPullRequestFiles` | List files changed in a PR (patches omitted by default; set `includePatch` / `filenames` for diffs) |
| `listPullRequestReviews` | List reviews on a PR (approvals, change requests, comments) |
| `listPullRequestReviewThreads` | List review threads with comments, resolution state, and reply/resolve IDs (unresolved only by default) |
| `getPullRequestContext` | Fetch PR details plus files, reviews, and optional CI checks in one call |
| `createPullRequest` | Open a new PR |
| `mergePullRequest` | Merge a PR (merge, squash, or rebase) |
| `updatePullRequest` | Update a PR's title, body, state, base branch, or draft status |
| `addPullRequestComment` | Post a comment on a PR |
| `updatePullRequestComment` | Edit the body of a PR comment |
| `deletePullRequestComment` | Permanently delete a PR comment |
| `createPullRequestReview` | Submit a formal review (approve, request changes, or comment) with inline comments |
| `replyToReviewComment` | Reply to a review comment in its thread |
| `resolveReviewThread` | Mark a review thread as resolved |
| `requestReviewers` | Request reviews from users or teams on a PR |

### Issues

| Tool | Description |
|---|---|
| `listIssues` | List issues filtered by state and labels |
| `getIssue` | Get an issue's details (body truncated by default; set `detail: full` for complete text) |
| `getIssueContext` | Fetch an issue plus label names and recent comments in one call |
| `listIssueComments` | List comments on an issue (paginated; prefer `getIssueContext` for the first page) |
| `createIssue` | Open a new issue |
| `addIssueComment` | Post a comment on an issue |
| `updateIssueComment` | Edit the body of an issue comment |
| `deleteIssueComment` | Permanently delete an issue comment |
| `closeIssue` | Close an issue (completed or not planned) |
| `updateIssue` | Update an issue's title, body, labels, milestone, or assignees — set `state: 'open'` to reopen |
| `listLabels` | List labels available in a repository |
| `addLabels` | Add labels to an issue or pull request |
| `removeLabel` | Remove a label from an issue or pull request |
| `createLabel` | Create a label in a repository |
| `updateLabel` | Update a label's name, color, or description |
| `deleteLabel` | Delete a label from a repository permanently |
| `addAssignees` | Assign users to an issue or pull request |
| `removeAssignees` | Remove assignees from an issue or pull request |

### Reactions

Pull request conversations share the issue numbering, so the issue-level tools work on PRs too.

| Tool | Description |
|---|---|
| `listIssueReactions` | List reactions on an issue or pull request, with per-emoji counts |
| `addIssueReaction` | React to an issue or pull request (`+1`, `-1`, `laugh`, `confused`, `heart`, `hooray`, `rocket`, `eyes`) |
| `listCommentReactions` | List reactions on an issue or pull request comment |
| `addCommentReaction` | React to an issue or pull request comment |

### Discussions

| Tool | Description |
|---|---|
| `listDiscussions` | List discussions, most recently updated first, optionally filtered by category name (cursor-paginated) |
| `getDiscussion` | Get a discussion by number (body truncated by default; set `detail: full` for complete text) |
| `addDiscussionComment` | Post a comment on a discussion |

### Notifications

| Tool | Description |
|---|---|
| `listNotifications` | List notification threads for the authenticated user (unread only unless `all: true`) |
| `markNotificationRead` | Mark a single notification thread as read |

### Gists

| Tool | Description |
|---|---|
| `listGists` | List gists for the authenticated user or a specific user |
| `getGist` | Get a gist including file contents |
| `listGistComments` | List comments on a gist |
| `createGist` | Create a new gist with one or more files |
| `updateGist` | Update a gist's description or files |
| `deleteGist` | Delete a gist permanently |
| `createGistComment` | Post a comment on a gist |

### Workflows

| Tool | Description |
|---|---|
| `listWorkflows` | List GitHub Actions workflows in a repository |
| `listWorkflowRuns` | List workflow runs filtered by workflow, branch, status, or event |
| `getWorkflowRun` | Get a workflow run's status, timing, and trigger info |
| `listWorkflowJobs` | List jobs in a workflow run with step-level status |
| `getWorkflowJobLogs` | Read a job's log output (last 200 lines by default, timestamps stripped) |
| `triggerWorkflow` | Trigger a workflow via workflow_dispatch event |
| `cancelWorkflowRun` | Cancel an in-progress workflow run |
| `rerunWorkflowRun` | Re-run a workflow run, optionally only failed jobs |

### Checks and Statuses

| Tool | Description |
|---|---|
| `listCheckRuns` | List check runs (Checks API: GitHub Actions and other CI providers) for a commit, branch, or tag |
| `getCombinedStatus` | Get the combined commit status (Statuses API: legacy CI integrations) for a commit, branch, or tag |
| `getCiFailureContext` | Diagnose CI failures for a ref — combined status, failing checks, and failed workflow jobs in one call |

### Releases

| Tool | Description |
|---|---|
| `listReleases` | List releases, newest first (includes drafts and prereleases) |
| `getLatestRelease` | Get the latest published release (body truncated by default; set `detail: full` for complete notes) |
| `getRelease` | Get a specific release by ID, including its assets |
| `getReleaseContext` | Fetch a release plus the previous release and tag comparison in one call |
| `createRelease` | Create a new release (and its tag if needed) |
| `updateRelease` | Update a release's tag, target, title, notes, draft, or prerelease status |
| `deleteRelease` | Permanently delete a release (does not delete the underlying git tag) |

### Commits

| Tool | Description |
|---|---|
| `listCommits` | List commits, optionally filtered by file path, author, or date range. When `hasMore`, pass `nextPage` |
| `getCommit` | Get a commit's full details including changed files and diffs |
| `getBlame` | Line-level git blame for a file (GitHub GraphQL) |
| `compareCommits` | Compare two branches, tags, or commits: ahead/behind counts, commits in between, and files that differ |

### Search

| Tool | Description |
|---|---|
| `searchCode` | Search code across GitHub with qualifier support (includes matching text snippets when available) |
| `searchRepositories` | Search repositories by keyword, topic, language, stars, … |
| `searchIssues` | Search issues and pull requests using qualifiers like `is:open`, `type:pr`, or `label:bug` |

## GitHub Token

All tools authenticate with a GitHub personal access token (PAT).

### Fine-grained token (recommended)

Create one at **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.

| Permission | Level | Required for |
|---|---|---|
| **Metadata** | Read-only | Always required (auto-included) |
| **Contents** | Read-only | `getRepository`, `listBranches`, `getFileContent`, `getRepositoryTree`, `listCommits`, `getCommit`, `getBlame`, `compareCommits`, `listReleases`, `getLatestRelease`, `getRelease`, `getReleaseContext` |
| **Contents** | Read and write | `createBranch`, `deleteBranch`, `createOrUpdateFile`, `createRelease`, `updateRelease`, `deleteRelease` |
| **Administration** | Read and write | `forkRepository`, `createRepository` |
| **Pull requests** | Read-only | `listPullRequests`, `getPullRequest`, `listPullRequestFiles`, `listPullRequestReviews`, `listPullRequestReviewThreads`, `getPullRequestContext` |
| **Pull requests** | Read and write | `createPullRequest`, `mergePullRequest`, `updatePullRequest`, `addPullRequestComment`, `updatePullRequestComment`, `deletePullRequestComment`, `createPullRequestReview`, `replyToReviewComment`, `resolveReviewThread`, `requestReviewers` |
| **Issues** | Read-only | `listIssues`, `getIssue`, `getIssueContext`, `listIssueComments`, `listLabels`, `listIssueReactions`, `listCommentReactions` |
| **Issues** | Read and write | `createIssue`, `addIssueComment`, `updateIssueComment`, `deleteIssueComment`, `closeIssue`, `updateIssue`, `addLabels`, `removeLabel`, `createLabel`, `updateLabel`, `deleteLabel`, `addAssignees`, `removeAssignees`, `addIssueReaction`, `addCommentReaction` |
| **Discussions** | Read-only | `listDiscussions`, `getDiscussion` |
| **Discussions** | Read and write | `addDiscussionComment` |
| **Gists** | Read-only | `listGists`, `getGist`, `listGistComments` |
| **Gists** | Read and write | `createGist`, `updateGist`, `deleteGist`, `createGistComment` |
| **Notifications** (account) | Read and write | `listNotifications`, `markNotificationRead` |
| **Actions** | Read-only | `listWorkflows`, `listWorkflowRuns`, `getWorkflowRun`, `listWorkflowJobs`, `getWorkflowJobLogs`, `getCiFailureContext` |
| **Actions** | Read and write | `triggerWorkflow`, `cancelWorkflowRun`, `rerunWorkflowRun` |
| **Checks** | Read-only | `listCheckRuns`, `getCiFailureContext` |
| **Commit statuses** | Read-only | `getCombinedStatus`, `getCiFailureContext` |

Search tools (`searchCode`, `searchRepositories`, `searchIssues`) work with any token.

### Classic token

| Scope | Required for |
|---|---|
| `public_repo` | All tools on public repositories |
| `repo` | All tools on public and private repositories |

## API

### `createGithubTools(options)`

Returns an object of tools, ready to spread into `tools` of any AI SDK call.

```ts
type GithubToolsOptions = {
  token?: GithubTokenInput // defaults to process.env.GITHUB_TOKEN
  requireApproval?: boolean | Partial<Record<GithubWriteToolName, boolean>>
  preset?: GithubToolPreset | GithubToolPreset[]
  context?: GithubToolsContext // default owner / repo / PR / issue / ref
}

type GithubTokenInput = string | (() => Promise<string>)

type GithubToolPreset = 'code-review' | 'issue-triage' | 'repo-explorer' | 'ci-ops' | 'security-audit' | 'release-manager' | 'discussion-moderator' | 'notification-inbox' | 'pr-author' | 'maintainer'
```

### `createGithubAgent(options)`

Returns a `ToolLoopAgent` instance with `.generate()` and `.stream()` methods, pre-configured with GitHub tools and tailored instructions.

```ts
import { createGithubAgent } from '@github-tools/sdk'

// Prefer a preset: scoped tools + tailored prompt
const reviewer = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  preset: 'code-review',
  context: { owner: 'vercel', repo: 'ai', pullNumber: 42 },
})

// Add context to the built-in prompt
const triager = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  preset: 'issue-triage',
  additionalInstructions: 'Focus on the nuxt/ui repository. Always respond in French.',
})

// Full catalog (omit preset or use maintainer)
const agent = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  preset: 'maintainer',
})

// Full override: replace the built-in prompt entirely
const custom = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  instructions: 'You are a security auditor. Only flag security-related issues.',
})

// Use the agent
const result = await reviewer.generate({ prompt: 'Review this PR' })
const stream = reviewer.stream({ prompt: 'Review this PR' })
```

| Option | Description |
|---|---|
| `model` | Language model: string (`'anthropic/claude-sonnet-4.6'`) or provider instance |
| `token` | GitHub token string or async provider |
| `preset` | Optional preset or array of presets to scope tools |
| `context` | Default owner / repo / pullNumber / issueNumber / ref for tools and the system prompt |
| `requireApproval` | Approval config (same as `createGithubTools`) |
| `instructions` | Replaces the built-in system prompt entirely (`context` is still appended) |
| `additionalInstructions` | Appended to the built-in system prompt |

All other `ToolLoopAgent` options (`stopWhen`, `toolChoice`, `onStepFinish`, etc.) are passed through.

### `createDurableGithubAgent(options)`

Returns a `DurableGithubAgent` instance for use inside Vercel Workflow SDK functions. Every LLM call and tool execution runs as a durable step with automatic retries and crash recovery.

Supports both `.stream()` (real-time output to a writable) and `.generate()` (non-streaming, returns the full text response).

Requires the optional peer dependencies `workflow` and `@workflow/ai`:

```sh
pnpm add workflow @workflow/ai
```

#### Streaming (chat UI)

```ts
// durable-chat.workflow.ts
import { createDurableGithubAgent } from '@github-tools/sdk/workflow'
import { getWritable } from 'workflow'
import type { ModelMessage, UIMessageChunk } from 'ai'

async function chatWorkflow(messages: ModelMessage[], token: string) {
  "use workflow"
  const agent = createDurableGithubAgent({
    model: 'anthropic/claude-sonnet-4.6',
    token,
    preset: 'code-review',
  })
  const writable = getWritable<UIMessageChunk>()
  await agent.stream({ messages, writable })
}
```

#### Non-streaming (bot / background job, needs `"use step"`)

```ts
// agent-turn.step.ts
import { createGithubAgent } from '@github-tools/sdk'

async function agentTurn(prompt: string) {
  "use step"
  const agent = createGithubAgent({
    model: 'anthropic/claude-sonnet-4.6',
    preset: 'code-review',
    requireApproval: false,
  })
  const { text } = await agent.generate({ prompt })
  return text
}
```

> See [`examples/pr-review-agent`](../../examples/pr-review-agent) for a complete PR review agent built with Chat SDK and Vercel Workflow.

All presets (`code-review`, `issue-triage`, `ci-ops`, `repo-explorer`, `security-audit`, `release-manager`, `discussion-moderator`, `notification-inbox`, `pr-author`, `maintainer`) work with `createDurableGithubAgent`. Options mirror `createGithubAgent` with additional pass-through for `WorkflowAgentOptions` fields like `experimental_telemetry`, `onStepEnd`, `onEnd`, and `prepareStep`. Write tools honor `requireApproval` via `needsApproval`.

### `resolveGithubToken(token?)`

Resolves a `GithubTokenInput` (token string, async provider, or `process.env.GITHUB_TOKEN`) to a token string. Throws when no token is available.

### `createOctokit(token)`

Returns a configured [`octokit`](https://github.com/octokit/octokit.js) instance. Useful for building custom tools.

## License

[MIT](./LICENSE)

Made by [@HugoRCD](https://github.com/HugoRCD)
