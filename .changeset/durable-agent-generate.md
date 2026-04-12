---
"@github-tools/sdk": minor
---

Add `.generate()` to `createDurableGithubAgent` for non-streaming durable workflows

`createDurableGithubAgent` now returns a `DurableGithubAgent` wrapper with both `.stream()` and `.generate()` methods. The new `.generate({ prompt })` collects the full text response while preserving durable execution — each tool call remains an individually retriable workflow step.

`CreateDurableGithubAgentOptions` now extends all `DurableAgentOptions` fields (e.g. `experimental_telemetry`, `onStepFinish`, `onFinish`, `prepareStep`) instead of a narrow subset, enabling evlog and other observability integrations at the agent level.
