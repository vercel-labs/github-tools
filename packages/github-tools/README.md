<img src="https://github.com/vercel-labs/github-tools/blob/main/assets/banner.jpg" width="100%" alt="GitHub Tools banner" />

# @github-tools/sdk

[![npm version](https://img.shields.io/npm/v/@github-tools/sdk?color=black)](https://npmjs.com/package/@github-tools/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@github-tools/sdk?color=black)](https://npm.chart.dev/@github-tools/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-black?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/github/license/vercel-labs/github-tools?color=black)](https://github.com/vercel-labs/github-tools/blob/main/LICENSE)

GitHub tools for the [AI SDK](https://ai-sdk.dev) — wrap GitHub's REST API as ready-to-use tools for any agent or `generateText` / `streamText` call.

36 tools covering repositories, branches, pull requests, issues, commits, search, gists, and workflows. Write operations support granular approval control out of the box.

## Installation

```sh
pnpm add @github-tools/sdk
```

`ai` and `zod` are peer dependencies:

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
| `code-review` | `getPullRequest`, `listPullRequests`, `getFileContent`, `listCommits`, `getCommit`, `getBlame`, `getRepository`, `listBranches`, `searchCode`, `addPullRequestComment` |
| `issue-triage` | `listIssues`, `getIssue`, `createIssue`, `addIssueComment`, `closeIssue`, `getRepository`, `searchRepositories`, `searchCode` |
| `repo-explorer` | All read-only tools including gists and workflows (no write operations) |
| `ci-ops` | `listWorkflows`, `listWorkflowRuns`, `getWorkflowRun`, `listWorkflowJobs`, `triggerWorkflow`, `cancelWorkflowRun`, `rerunWorkflowRun`, `getRepository`, `listBranches`, `listCommits`, `getCommit` |
| `maintainer` | All 36 tools |

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

Write tools: `createOrUpdateFile`, `createPullRequest`, `mergePullRequest`, `addPullRequestComment`, `createIssue`, `addIssueComment`, `closeIssue`, `createGist`, `updateGist`, `deleteGist`, `createGistComment`, `triggerWorkflow`, `cancelWorkflowRun`, `rerunWorkflowRun`.

All other tools are read-only and never require approval.

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

Use `DurableAgent` via the `@github-tools/sdk/workflow` subpath to make every LLM call and tool execution a retryable, crash-safe step:

```ts
import { createDurableGithubAgent } from '@github-tools/sdk/workflow'

const agent = createDurableGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  token: process.env.GITHUB_TOKEN!,
  preset: 'maintainer',
})
```

All presets work with `createDurableGithubAgent`.

> **Approval control limitation**: `requireApproval` is accepted for forward-compatibility but is currently ignored by `DurableAgent`. The Workflow SDK does not yet support interactive tool approval — all tools execute immediately. Use `createGithubAgent` (standard `ToolLoopAgent`) when human-in-the-loop approval is required.

> `workflow` and `@workflow/ai` are optional peer dependencies — install them only when using the workflow subpath.

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
| `createPullRequest` | Open a new PR |
| `mergePullRequest` | Merge a PR (merge, squash, or rebase) |
| `addPullRequestComment` | Post a comment on a PR |

### Issues

| Tool | Description |
|---|---|
| `listIssues` | List issues filtered by state and labels |
| `getIssue` | Get an issue's full details |
| `createIssue` | Open a new issue |
| `addIssueComment` | Post a comment on an issue |
| `closeIssue` | Close an issue (completed or not planned) |

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
| **Pull requests** | Read-only | `listPullRequests`, `getPullRequest` |
| **Pull requests** | Read and write | `createPullRequest`, `mergePullRequest`, `addPullRequestComment` |
| **Issues** | Read-only | `listIssues`, `getIssue` |
| **Issues** | Read and write | `createIssue`, `addIssueComment`, `closeIssue` |

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
  token?: string // defaults to process.env.GITHUB_TOKEN
  requireApproval?: boolean | Partial<Record<GithubWriteToolName, boolean>>
  preset?: GithubToolPreset | GithubToolPreset[]
}

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
| `token` | GitHub personal access token |
| `preset` | Optional preset or array of presets to scope tools |
| `requireApproval` | Approval config (same as `createGithubTools`) |
| `instructions` | Replaces the built-in system prompt entirely |
| `additionalInstructions` | Appended to the built-in system prompt |

All other `ToolLoopAgent` options (`stopWhen`, `toolChoice`, `onStepFinish`, etc.) are passed through.

### `createDurableGithubAgent(options)`

Returns a `DurableAgent` instance for use inside Vercel Workflow SDK functions. Every LLM call and tool execution runs as a durable step with automatic retries and crash recovery.

Requires the optional peer dependencies `workflow` and `@workflow/ai`:

```sh
pnpm add workflow @workflow/ai
```

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

All presets (`code-review`, `issue-triage`, `ci-ops`, `repo-explorer`, `maintainer`) work with `createDurableGithubAgent`. The options are the same as `createGithubAgent` except it returns a `DurableAgent` instead of a `ToolLoopAgent`.

> **Note:** `requireApproval` is accepted but currently ignored by `DurableAgent` — the Workflow SDK does not yet support interactive tool approval.

### `createOctokit(token)`

Returns a configured [`octokit`](https://github.com/octokit/octokit.js) instance. Useful for building custom tools.

## License

[MIT](./LICENSE)

Made by [@HugoRCD](https://github.com/HugoRCD)
