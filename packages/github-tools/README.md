<img src="https://github.com/vercel-labs/github-tools/blob/main/assets/banner.jpg" width="100%" alt="GitHub Tools banner" />

# @github-tools/sdk

[![npm version](https://img.shields.io/npm/v/@github-tools/sdk?color=black)](https://npmjs.com/package/@github-tools/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@github-tools/sdk?color=black)](https://npm.chart.dev/@github-tools/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-black?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/github/license/vercel-labs/github-tools?color=black)](https://github.com/vercel-labs/github-tools/blob/main/LICENSE)

**Connect GitHub to any agent.** 42 typed GitHub tools with presets, human approval, and durable execution — for the [AI SDK](https://ai-sdk.dev), [eve](https://eve.dev), Vercel Workflow, and [Chat SDK](https://chat-sdk.dev).

Docs: **[github-tools.com](https://github-tools.com)**

42 tools covering repositories, branches, pull requests, issues, commits, search, gists, and workflows. Write operations support granular approval control out of the box.

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
// Code-review agent — PRs, commits, file content, and comments
createGithubTools({ token, preset: 'code-review' })

// Issue triage — read/create/close issues, search
createGithubTools({ token, preset: 'issue-triage' })

// Read-only exploration — browse repos without write access
createGithubTools({ token, preset: 'repo-explorer' })

// Full maintenance — all tools
createGithubTools({ token, preset: 'maintainer' })
```

Presets are composable — pass an array to combine them:

```ts
createGithubTools({ token, preset: ['code-review', 'issue-triage'] })
```

| Preset | Tools included |
|---|---|
| `code-review` | `getPullRequest`, `listPullRequests`, `listPullRequestFiles`, `listPullRequestReviews`, `getFileContent`, `listCommits`, `getCommit`, `getBlame`, `getRepository`, `listBranches`, `searchCode`, `addPullRequestComment`, `createPullRequestReview` |
| `issue-triage` | `listIssues`, `getIssue`, `createIssue`, `addIssueComment`, `closeIssue`, `listLabels`, `addLabels`, `removeLabel`, `getRepository`, `searchRepositories`, `searchCode` |
| `repo-explorer` | All read-only tools including gists and workflows (no write operations) |
| `ci-ops` | `listWorkflows`, `listWorkflowRuns`, `getWorkflowRun`, `listWorkflowJobs`, `triggerWorkflow`, `cancelWorkflowRun`, `rerunWorkflowRun`, `getRepository`, `listBranches`, `listCommits`, `getCommit` |
| `maintainer` | All 42 tools |

Omit `preset` to get all tools (same as `maintainer`).

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

Write tools: `createOrUpdateFile`, `createPullRequest`, `mergePullRequest`, `addPullRequestComment`, `createPullRequestReview`, `createIssue`, `addIssueComment`, `closeIssue`, `addLabels`, `removeLabel`, `createGist`, `updateGist`, `deleteGist`, `createGistComment`, `triggerWorkflow`, `cancelWorkflowRun`, `rerunWorkflowRun`.

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

Each step, toolpick picks the best ~5 tools using keyword + semantic search. All tools remain callable — only the visible set changes. See [toolpick docs](https://github.com/pontusab/toolpick) for LLM re-ranking, caching, and model-driven discovery options.

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

All presets work with `createDurableGithubAgent`. Write tools honor `requireApproval` via `needsApproval` — the workflow pauses until the user approves or denies.

> `workflow` and `@ai-sdk/workflow` are optional peer dependencies — install them only when using the workflow subpath.

## Vercel Connect

[Vercel Connect](https://vercel.com/docs/connect) mints short-lived GitHub tokens from a connector — no PAT to store. The `@github-tools/sdk/connect` subpath derives scopes from your preset automatically.

```sh
pnpm add @vercel/connect
```

```ts
import { connectGithubTools } from '@github-tools/sdk/connect'

const tools = connectGithubTools('github/my-connector', {
  preset: 'code-review',
})
```

For eve agents, import from `@github-tools/sdk/connect/eve`:

```ts
// agent/agent.ts — TODO(eve-connect-bundle): drop externalDependencies when eve fixes upstream
import { defineAgent } from 'eve'

export default defineAgent({
  model: 'anthropic/claude-sonnet-5',
  build: { externalDependencies: ['@vercel/connect'] },
})
```

```ts
// agent/tools/github.ts
import { connectGithubTools } from '@github-tools/sdk/connect/eve'

export default connectGithubTools('github/my-connector', {
  preset: 'maintainer',
})
```

`connectGithubTools` mints tokens lazily at tool execution — do not `await getToken(...)` at module top level in `agent/tools/` (that runs at import/build time).

Token provider only (custom factories):

```ts
import { connectGithubToken } from '@github-tools/sdk/connect'

createGithubTools({
  preset: 'ci-ops',
  token: connectGithubToken('github/my-connector', { preset: 'ci-ops' }),
})
```

Pass the same `preset` to `connectGithubToken` — it derives Connect scopes independently of the `preset` given to `createGithubTools`.

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

> `@vercel/connect` is an optional peer dependency — install it only when using the `/connect` subpath.

## eve

[eve](https://eve.dev) is Vercel's filesystem-first agent framework. The `@github-tools/sdk/eve` subpath registers all GitHub tools via `defineDynamic` — one file, zero CLI.

> A mountable [eve extension](https://eve.dev/docs/extensions), `@github-tools/eve-extension`, is also available and is the direction this integration is moving toward — it will become the recommended way to add GitHub tools to an eve agent. The direct import below remains supported. See [`packages/github-tools-eve-extension`](../github-tools-eve-extension) and [`examples/eve-extension-agent`](../../examples/eve-extension-agent).

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

Dynamic tools are named by their **bare map key** — the model sees `listPullRequests`, `createIssue`, and so on (same names as the AI SDK package). There is no automatic file-slug prefix when returning a tool map from `defineDynamic`.

### Approval (eve)

| Value | Maps to | Behavior |
|---|---|---|
| `true` / `'always'` | `always()` | Require approval on every call |
| `false` / `'never'` | `never()` | Skip approval |
| `'once'` | `once()` | Approve once per session, then auto-allow |
| predicate | custom `Approval` | Input-dependent gate; booleans map to `user-approval` / `not-applicable` |
| `always()` / `once()` / `never()` | passthrough | Use eve helpers directly |

Default (no `requireApproval`): all write tools → `always()`. Unlisted write tools keep the `always()` fail-safe default.

Unlike the Workflow SDK subpath, eve approval **works durably** — gated tools pause the session until a human approves.

### Cherry-picking (one tool per file)

```ts
// agent/tools/list_pull_requests.ts
import { listPullRequests } from '@github-tools/sdk/eve'

export default listPullRequests()
```

### Idempotency

eve replays completed steps but re-runs steps interrupted mid-execution. Write tools vary:

| Tool | Idempotency |
|---|---|
| `createOrUpdateFile` | Natural when content + `sha` unchanged (skips no-op updates) |
| `closeIssue` | Natural when already closed |
| `createBranch` | Natural when branch exists at same SHA |
| `addIssueComment`, `createIssue`, `mergePullRequest`, … | **Not** idempotent — each call creates new side effects |

Gate non-idempotent writes behind `always()` or `once()` where replay safety matters.

### Vercel Connect

Mint the token from a Connect connector instead of `GITHUB_TOKEN` — `connectGithubTools` derives scopes from `preset` and fetches the token lazily inside each tool call:

```ts
// agent/tools/github.ts
import { connectGithubTools } from '@github-tools/sdk/connect/eve'

export default connectGithubTools('github/my-connector', {
  preset: 'maintainer',
})
```

Add `build: { externalDependencies: ['@vercel/connect'] }` to `agent.ts` — see [Vercel Connect](#vercel-connect) above for the full setup checklist.

> `eve` is an optional peer dependency — install it only when using the `/eve` subpath.

See [`examples/eve-agent`](../../examples/eve-agent) for a minimal agent.

## Available Tools

### Repository

| Tool | Description |
|---|---|
| `getRepository` | Get repository metadata (stars, language, default branch, …) |
| `listBranches` | List branches |
| `getFileContent` | Read a file or directory listing |
| `createOrUpdateFile` | Create or update a file and commit it |

### Pull Requests

| Tool | Description |
|---|---|
| `listPullRequests` | List PRs filtered by state |
| `getPullRequest` | Get a PR's full details (diff stats, body, merge status) |
| `listPullRequestFiles` | List files changed in a PR with diff status and patches |
| `listPullRequestReviews` | List reviews on a PR (approvals, change requests, comments) |
| `createPullRequest` | Open a new PR |
| `mergePullRequest` | Merge a PR (merge, squash, or rebase) |
| `addPullRequestComment` | Post a comment on a PR |
| `createPullRequestReview` | Submit a formal review (approve, request changes, or comment) with inline comments |

### Issues

| Tool | Description |
|---|---|
| `listIssues` | List issues filtered by state and labels |
| `getIssue` | Get an issue's full details |
| `createIssue` | Open a new issue |
| `addIssueComment` | Post a comment on an issue |
| `closeIssue` | Close an issue (completed or not planned) |
| `listLabels` | List labels available in a repository |
| `addLabels` | Add labels to an issue or pull request |
| `removeLabel` | Remove a label from an issue or pull request |

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
| `triggerWorkflow` | Trigger a workflow via workflow_dispatch event |
| `cancelWorkflowRun` | Cancel an in-progress workflow run |
| `rerunWorkflowRun` | Re-run a workflow run, optionally only failed jobs |

### Commits

| Tool | Description |
|---|---|
| `listCommits` | List commits, optionally filtered by file path, author, or date range |
| `getCommit` | Get a commit's full details including changed files and diffs |
| `getBlame` | Line-level git blame for a file (GitHub GraphQL) |

### Search

| Tool | Description |
|---|---|
| `searchCode` | Search code across GitHub with qualifier support |
| `searchRepositories` | Search repositories by keyword, topic, language, stars, … |

## GitHub Token

All tools authenticate with a GitHub personal access token (PAT).

### Fine-grained token (recommended)

Create one at **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.

| Permission | Level | Required for |
|---|---|---|
| **Metadata** | Read-only | Always required (auto-included) |
| **Contents** | Read-only | `getRepository`, `listBranches`, `getFileContent`, `listCommits`, `getCommit`, `getBlame` |
| **Contents** | Read and write | `createOrUpdateFile` |
| **Pull requests** | Read-only | `listPullRequests`, `getPullRequest`, `listPullRequestFiles`, `listPullRequestReviews` |
| **Pull requests** | Read and write | `createPullRequest`, `mergePullRequest`, `addPullRequestComment`, `createPullRequestReview` |
| **Issues** | Read-only | `listIssues`, `getIssue`, `listLabels` |
| **Issues** | Read and write | `createIssue`, `addIssueComment`, `closeIssue`, `addLabels`, `removeLabel` |

| **Gists** | Read-only | `listGists`, `getGist`, `listGistComments` |
| **Gists** | Read and write | `createGist`, `updateGist`, `deleteGist`, `createGistComment` |
| **Actions** | Read-only | `listWorkflows`, `listWorkflowRuns`, `getWorkflowRun`, `listWorkflowJobs` |
| **Actions** | Read and write | `triggerWorkflow`, `cancelWorkflowRun`, `rerunWorkflowRun` |

Search tools (`searchCode`, `searchRepositories`) work with any token.

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
}

type GithubTokenInput = string | (() => Promise<string>)

type GithubToolPreset = 'code-review' | 'issue-triage' | 'repo-explorer' | 'ci-ops' | 'maintainer'
```

### `createGithubAgent(options)`

Returns a `ToolLoopAgent` instance with `.generate()` and `.stream()` methods, pre-configured with GitHub tools and tailored instructions.

```ts
import { createGithubAgent } from '@github-tools/sdk'

// Minimal — all tools, generic prompt
const agent = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
})

// With preset — scoped tools + tailored prompt
const reviewer = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  preset: 'code-review',
})

// Add context to the built-in prompt
const triager = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  preset: 'issue-triage',
  additionalInstructions: 'Focus on the nuxt/ui repository. Always respond in French.',
})

// Full override — replace the built-in prompt entirely
const custom = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  instructions: 'You are a security auditor. Only flag security-related issues.',
})

// Use the agent
const result = await reviewer.generate({ prompt: 'Review PR #42 on vercel/ai' })
const stream = reviewer.stream({ prompt: 'Review PR #42 on vercel/ai' })
```

| Option | Description |
|---|---|
| `model` | Language model — string (`'anthropic/claude-sonnet-4.6'`) or provider instance |
| `token` | GitHub token string or async provider |
| `preset` | Optional preset or array of presets to scope tools |
| `requireApproval` | Approval config (same as `createGithubTools`) |
| `instructions` | Replaces the built-in system prompt entirely |
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

#### Non-streaming (bot / background job — needs `"use step"`)

```ts
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

All presets (`code-review`, `issue-triage`, `ci-ops`, `repo-explorer`, `maintainer`) work with `createDurableGithubAgent`. Options mirror `createGithubAgent` with additional pass-through for `WorkflowAgentOptions` fields like `experimental_telemetry`, `onStepEnd`, `onEnd`, and `prepareStep`. Write tools honor `requireApproval` via `needsApproval`.

### `resolveGithubToken(token?)`

Resolves a `GithubTokenInput` (token string, async provider, or `process.env.GITHUB_TOKEN`) to a token string. Throws when no token is available.

### `createOctokit(token)`

Returns a configured [`octokit`](https://github.com/octokit/octokit.js) instance. Useful for building custom tools.

## License

[MIT](./LICENSE)

Made by [@HugoRCD](https://github.com/HugoRCD)
