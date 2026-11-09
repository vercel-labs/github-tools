---
'@github-tools/sdk': minor
---

**Breaking for `createDurableGithubAgent(...).generate()`:** call it from the `"use workflow"` function instead of a `"use step"` function, upgrade `@ai-sdk/workflow` to 2.0.59 or later, and read the fields you need from the new result type. `.stream()` is unchanged.

`createDurableGithubAgent(...).generate()` now runs `WorkflowAgent.generate()` from `@ai-sdk/workflow` 2.0.59 or later. Each model call and tool call is its own durable, retriable step, as with `.stream()`, and writes that need approval end the call with a `tool-approval-request` you can answer on the next call. Before, it ran `generateText` as one block that had to sit inside a `"use step"` function and only accepted `prompt` and `stopWhen`.

Call `.generate()` from the `"use workflow"` function, pass any `WorkflowAgent.generate()` option (`messages`, `stopWhen`, `output`, …), and return the fields you need, since the result isn't serializable:

```ts
const result = await agent.generate({ messages })
return { text: result.text, responseMessages: result.responseMessages }
```

`DurableGithubAgentGenerateResult` is now the `WorkflowAgent` generation result. On an older `@ai-sdk/workflow`, `.generate()` throws `github_tools.DURABLE_GENERATE_UNAVAILABLE`; `.stream()` is unchanged.
