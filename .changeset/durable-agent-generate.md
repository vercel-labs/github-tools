---
"@github-tools/sdk": minor
---

Add `.generate()` to `DurableGithubAgent` for non-streaming durable workflows

`createDurableGithubAgent` now returns a `DurableGithubAgent` wrapper with both `.stream()` and `.generate()` methods. `.generate()` uses `generateText` from the AI SDK internally and must be called from a `"use step"` context in workflows.

`CreateDurableGithubAgentOptions` now extends all `DurableAgentOptions` fields (e.g. `experimental_telemetry`, `onStepFinish`, `onFinish`, `prepareStep`) instead of a narrow subset, enabling evlog and other observability integrations at the agent level.
