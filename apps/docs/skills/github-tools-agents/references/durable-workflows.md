---
name: durable-workflows
description: Best practices for using GitHub tools within Vercel Workflow, including step directives and streaming responses.
tags: [workflow, durable, DurableAgent, use-step, use-workflow, streaming, vercel]
---

# Durable workflows

## Concepts

- **`"use workflow"`** — Entry function runs as a Vercel Workflow: durable orchestration, replay, observability.
- **`"use step"`** — Each GitHub tool invocation is implemented as a step (retries, isolation, full Node in the workflow runtime).
- **`createDurableGithubAgent`** — From `@github-tools/sdk/workflow`, wraps tools in `DurableAgent` so **model steps and tool calls** participate in the same durable execution model.

## Dependencies

```bash
pnpm add workflow @workflow/ai @github-tools/sdk ai zod
```

## Minimal pattern

1. Define a workflow function with `'use workflow'` at the top of the async body.
2. `createDurableGithubAgent({ model, token, preset?, maxSteps?, … })`.
3. `getWritable<UIMessageChunk>()` when streaming chunks to a UI (chat).
4. `await agent.stream({ messages, writable })` (or the non-stream API your app uses).

## Approval

Do not rely on `requireApproval` for durable agents until Workflow supports the same approval UX as `ToolLoopAgent`. Prefer:

- **Non-durable** `createGithubAgent` / `createGithubTools` for human-in-the-loop writes, or
- **Application-level** guards (only pass write-capable tokens in trusted routes, or branch on environment).

## Framework notes

- **Nuxt**: define workflows under `server/workflows/` (or your bundler’s workflow root), call from server routes that start runs and forward streams.
- **Next.js**: follow Vercel Workflow docs for app-router workflow entrypoints and webhook or streaming response patterns.

## Doc paths (site)

- `/guide/durable-workflows`
- `/api/reference` (`createDurableGithubAgent` section)
