---
name: github-tools-agents
description: Add GitHub API tools to Vercel AI SDK apps using @github-tools/sdk. Covers tool setup, presets, approval control, token scoping, standard agents (ToolLoopAgent), and crash-safe durable agents (Vercel Workflow SDK).
license: MIT
metadata:
  author: "HugoRCD"
  repository: "https://github.com/vercel-labs/github-tools"
  url: "https://github-tools.com/.well-known/skills"
  version: "1.0.0"
  keywords: "ai, agent, skill, vercel, ai sdk, github, tools, octokit, durable, workflow"
---

# GitHub Tools for AI agents

Use this skill when the user wants **GitHub API access from an LLM** via the [`@github-tools/sdk`](https://www.npmjs.com/package/@github-tools/sdk) package: `generateText` / `streamText`, `createGithubAgent`, or **durable** `createDurableGithubAgent` with the Vercel Workflow SDK.

Official docs: **https://github-tools.com** — paths such as `/getting-started/installation`, `/guide/quick-start`, `/guide/durable-workflows`, `/guide/approval-control`, `/guide/token-permissions`, `/api/reference`. Copy-prompts for assistants are embedded on those pages.

## When to use

- **Greenfield**: "Add GitHub tools to my AI app" / "Wire Octokit-style ops for the model."
- **Existing repo**: "We already use the AI SDK — add repo/PR/issue tools."
- **Agents**: "Use `createGithubAgent` with a preset" / custom system instructions.
- **Durable**: "Run the agent inside Vercel Workflow" / `"use workflow"` / crash-safe tool steps.
- **Safety**: "Gate merges / file writes with approval" / fine-grained PAT scopes.
- **Narrow scope**: Presets (`code-review`, `issue-triage`, `repo-explorer`, `ci-ops`, `maintainer`) or cherry-picked tool factories.

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
  preset: 'issue-triage',
  system: '…',
})
await agent.generate({ prompt: '…' })
```

### Durable agent (Vercel Workflow)

Requires optional peers: `workflow`, `@workflow/ai`. Import from `@github-tools/sdk/workflow`.

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

**Limitation:** `requireApproval` is accepted but **ignored** by `DurableAgent` today. Use `createGithubAgent` + `createGithubTools({ requireApproval: … })` when you need interactive approval on writes.

## Presets

| Preset | Purpose |
|--------|---------|
| `code-review` | PRs, commits, files, review comments |
| `issue-triage` | Issues, comments, create/close |
| `repo-explorer` | Read-only + search + gists/workflows reads |
| `ci-ops` | Actions workflows, runs, trigger/cancel/rerun |
| `maintainer` | All tools |

Array presets merge: `preset: ['code-review', 'issue-triage']`.

## Write safety

- Default: writes go through **approval** (AI SDK tool approval flow) unless `requireApproval: false` or per-tool overrides.
- Map token scopes to tools (Actions, Contents, Issues, Pull requests, Gists, …).

## Durable steps

Each packaged tool uses a named module-level **`"use step"`** function so individual GitHub calls register as workflow steps when running under the Workflow SDK. See `./references/durable-workflows.md`.

## Reference Documentation

Each reference file includes YAML frontmatter with `name`, `description`, and `tags` for searchability. Use the search script available in `scripts/search_references.py` to quickly find relevant references by tag or keyword.

- [Durable Workflows](references/durable-workflows.md): Best practices for using GitHub tools within Vercel Workflow, including step directives and streaming responses.
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
