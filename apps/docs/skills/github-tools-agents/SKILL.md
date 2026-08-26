---
name: github-tools-agents
description: Give an AI agent GitHub access via @github-tools/sdk. Mount as an eve extension, or use with the AI SDK, Vercel Workflow, and Chat SDK. Covers tools, presets, approval control, token scoping, and durable agents.
license: MIT
metadata:
  author: "HugoRCD"
  repository: "https://github.com/vercel-labs/github-tools"
  url: "https://github-tools.com/.well-known/skills"
  version: "1.3.0"
  keywords: "ai, agent, skill, vercel, ai sdk, github, tools, octokit, durable, workflow"
---

# GitHub tools for AI agents

Use this skill when the user wants **GitHub API access from an LLM** via the [`@github-tools/sdk`](https://www.npmjs.com/package/@github-tools/sdk) package: `generateText` / `streamText`, `createGithubAgent`, or **durable** `createDurableGithubAgent` with the Vercel Workflow SDK.

Official docs: **https://github-tools.com**, with paths such as `/getting-started/installation`, `/getting-started/quick-start`, `/frameworks/ai-sdk`, `/frameworks/eve-extension`, `/deprecated/eve` (deprecated direct import), `/frameworks/vercel-workflow`, `/frameworks/chat-sdk`, `/guide/approval-control`, `/guide/tokens-and-auth`, `/api/reference`. Copy-prompts for assistants are embedded on those pages.

## When to use

- **Build an agent (eve, recommended)**: "Add GitHub tools to an eve agent" / `defineExtension` / `@github-tools/eve-extension`; the direct `@github-tools/sdk/eve` / `defineDynamic` import is deprecated.
- **Greenfield AI SDK app**: "Add GitHub tools to my AI app" / "Wire Octokit-style ops for the model."
- **Existing repo**: "We already use the AI SDK, add repo/PR/issue tools."
- **Reusable agent**: "Use `createGithubAgent` with a preset" / custom system instructions.
- **Durable**: "Run the agent inside Vercel Workflow" / `"use workflow"` / crash-safe tool steps.
- **Safety**: "Gate merges / file writes with approval" / fine-grained PAT scopes.
- **Narrow scope**: Prefer a preset (`code-review`, `issue-triage`, `repo-explorer`, `ci-ops`, `security-audit`, `release-manager`, `discussion-moderator`, `notification-inbox`, `pr-author`, `maintainer`) or cherry-picked tool factories. For multi-role products, use a manager with preset-scoped sub-agents (`/examples/manager-agent-with-subagents`).

## Install (required)

```bash
pnpm add @github-tools/sdk ai zod
```

Set `GITHUB_TOKEN` (fine-grained PAT recommended). The SDK reads `process.env.GITHUB_TOKEN` when `token` is omitted.

## Quick integration patterns

### Tools only

```ts
import { createGithubTools } from '@github-tools/sdk'
import { generateText } from 'ai'

await generateText({
  model,
  tools: createGithubTools({ preset: 'code-review' }),
  prompt: '…',
})
```

### Reusable agent (`ToolLoopAgent`)

```ts
import { createGithubAgent } from '@github-tools/sdk'

const agent = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  preset: 'code-review',
  context: { owner: 'vercel', repo: 'ai', pullNumber: 42 },
})
await agent.generate({ prompt: 'Review this PR' })
```

### Durable agent (Vercel Workflow)

Requires optional peers: `workflow`, `@ai-sdk/workflow`. Import from `@github-tools/sdk/workflow`.

```ts
import { createDurableGithubAgent } from '@github-tools/sdk/workflow'
import { getWritable } from 'workflow'

export async function run(messages: ModelMessage[], token: string) {
  'use workflow'
  const agent = createDurableGithubAgent({ model, token, preset: 'maintainer' })
  const writable = getWritable<UIMessageChunk>()
  await agent.stream({ messages, writable })
}
```

**Limitation:** Durable agents require `@ai-sdk/workflow` and `WorkflowChatTransport` on the client for resumable streams. For predicate/`once` approval policies, use the [eve extension](/frameworks/eve-extension).

### eve extension (recommended for eve agents)

Requires `eve` (transitively **`ai` v7**). Mount from `@github-tools/eve-extension` under `agent/extensions/`.

```ts
// agent/extensions/github.ts
import githubExtension from '@github-tools/eve-extension'

export default githubExtension({ preset: 'code-review' })
```

See `./references/eve-extension.md` and `/frameworks/eve-extension`.

### eve agent, direct import (deprecated)

Requires optional peers: `eve`, **`ai` v7**. Import from `@github-tools/sdk/eve`. Prefer the eve extension above for new agents.

```ts
// agent/tools/github.ts
import { createGithubTools } from '@github-tools/sdk/eve'

export default createGithubTools({ preset: 'code-review' })
```

See `./references/eve-agents.md` and `/deprecated/eve`.

## Presets

| Preset | Purpose |
|--------|---------|
| `code-review` | PRs, commits, files, review comments |
| `issue-triage` | Issues via getIssueContext, comments, reactions, create/close, assignees |
| `repo-explorer` | Read-only + search + discussions/gists/workflows reads |
| `ci-ops` | Actions workflows, runs, trigger/cancel/rerun |
| `security-audit` | Vulnerability scanning, risk reporting |
| `release-manager` | Changelog generation, release cutting |
| `discussion-moderator` | Discussions list/get/comment plus light issue context |
| `notification-inbox` | User notification triage (needs Notifications PAT) |
| `pr-author` | Branches, file edits, open/update PRs |
| `maintainer` | All 79 tools |

Array presets merge: `preset: ['code-review', 'issue-triage']`. Start with the smallest preset that fits; use `maintainer` when you need the full catalog. Multi-role: manager + sub-agents each with one preset.

## Working context

Pass `context: { owner, repo, pullNumber?, issueNumber?, ref? }` to `createGithubTools` / `createGithubAgent` / `createDurableGithubAgent` to default those fields on tool inputs and inject them into the agent system prompt. Prefer composite tools (`getPullRequestContext`, `getIssueContext`, `getReleaseContext`, `getCiFailureContext`) for multi-part reads — call follow-up reads in the same step when possible. Diff patches are omitted by default — set `includePatch: true` (optionally with `filenames`) when you need specific diffs. Bodies are truncated by default (`detail: 'summary'`). `getIssueContext` returns `labelNames` (strings) rather than full label objects. Prefer `getFileContent` with `startLine`/`endLine` or `maxLines` for large files.

## Write safety

- Default: writes go through **approval** (AI SDK tool approval flow) unless `requireApproval: false` or per-tool overrides.
- Map token scopes to tools (Actions, Contents, Issues, Pull requests, Discussions, Gists, …). Reactions fall under Issues. Gist and notification tools need account-level PAT permissions and do not work with a Vercel Connect installation token.
- Prefer `addIssueReaction` / `addCommentReaction` over a comment when only acknowledging a thread.

## Durable steps

Each packaged tool uses a named module-level **`"use step"`** function so individual GitHub calls register as workflow steps when running under the Workflow SDK. See `./references/durable-workflows.md`.

## Reference Documentation

Each reference file includes YAML frontmatter with `name`, `description`, and `tags` for searchability. Use the search script available in `scripts/search_references.py` to quickly find relevant references by tag or keyword.

- [Durable Workflows](references/durable-workflows.md): Best practices for using GitHub tools within Vercel Workflow, including step directives and streaming responses.
- [eve Extension](references/eve-extension.md): Recommended way to add GitHub tools to an eve agent, mount as an extension via defineExtension, approval policies, and the examples/eve starter.
- [eve Agents (deprecated)](references/eve-agents.md): Register GitHub tools in eve via the deprecated direct defineDynamic import.
- [Existing Project Integration](references/existing-project-integration.md): How to integrate GitHub tools into an existing codebase, including environment variable management and framework-specific hooks.
- [Tokens and Approval](references/tokens-and-approval.md): Guidance on mapping GitHub token scopes to specific tools and configuring approval flows for safe write operations.

### Searching References

```bash
# List all references with metadata
python scripts/search_references.py --list

# Search by tag (exact match)
python scripts/search_references.py --tag <tag>

# Search by keyword (across name, description, tags, and content)
python scripts/search_references.py --search <query>
```

## Scripts

- **`scripts/search_references.py`**: Search reference files by tag, keyword, or list all with metadata
