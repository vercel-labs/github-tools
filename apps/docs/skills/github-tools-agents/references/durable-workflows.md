---
name: durable-workflows
description: Best practices for using GitHub tools within Vercel Workflow, including step directives and streaming responses.
tags: [workflow, durable, WorkflowAgent, use-step, use-workflow, streaming, vercel]
---

# Durable workflows

## Concepts

- **`"use workflow"`** — Entry function runs as a Vercel Workflow: durable orchestration, replay, observability.
- **`"use step"`** — Each GitHub tool invocation is implemented as a step (retries, isolation, full Node in the workflow runtime).
- **`createDurableGithubAgent`** — From `@github-tools/sdk/workflow`, wraps tools in `WorkflowAgent` (`@ai-sdk/workflow`) so **model steps and tool calls** participate in the same durable execution model.

## Dependencies

```bash
pnpm add workflow @ai-sdk/workflow @github-tools/sdk ai zod
```

## Minimal pattern

1. Define a workflow function with `'use workflow'` at the top of the async body.
2. `createDurableGithubAgent({ model, token, preset?, requireApproval?, stopWhen?, … })`.
3. `getWritable<ModelCallStreamPart>()` when streaming chunks to a UI (chat).
4. `await agent.stream({ messages, writable })`.
5. In the route handler, pipe `run.readable` through `createModelCallToUIChunkTransform()` and return `x-workflow-run-id`.

## Approval

`requireApproval` maps to `needsApproval` on write tools. `WorkflowAgent` pauses the workflow and emits approval requests to the stream until the user responds. Wire the client with `WorkflowChatTransport` and a GET reconnect route.

For predicate/`once` approval policies, prefer [eve agents](/guide/eve-agents).

## Framework notes

- **Nuxt**: define workflows under `server/workflows/` (or your bundler’s workflow root), call from server routes that start runs and forward streams.
- **Next.js**: follow Vercel Workflow docs for app-router workflow entrypoints and webhook or streaming response patterns.

## Doc paths (site)

- `/guide/durable-workflows`
- `/api/reference` (`createDurableGithubAgent` section)
