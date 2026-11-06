---
'@github-tools/sdk': minor
---

Make `preset: 'auto'` and `requireApproval: 'auto'` handle follow-ups, and export routing.

- The evaluation model now sees `repliedTo`, the end of the assistant message the latest user message answers, next to `request`. A short reply such as "yes" to "Should I add the bug label?" is judged against that proposal. This applies to routing in every integration, and to approval in the AI SDK and TanStack integrations.
- `createGithubAgent({ preset: 'auto' })` routes each request once and reuses the result when the same request comes back. An approval continuation no longer calls the evaluation model again or swaps the active tools partway through a task.
- `selectPresets` is exported from `@github-tools/sdk` and `@github-tools/sdk/tanstack`, so `streamText` and `chat()` users can route without the agent:

```ts
const preset = await selectPresets(messages)
streamText({ model, tools: createGithubTools({ preset }), messages })
```

A request routed while the evaluation model was unavailable falls back to `repo-explorer` without caching that fallback, so the same request is routed again once the model recovers.
