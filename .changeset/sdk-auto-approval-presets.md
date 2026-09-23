---
"@github-tools/sdk": minor
---

Add `'auto'` modes for approval and presets. Both need `ai` 7.0.105 or later. Everything else still works on `ai` 6.

- `requireApproval: 'auto'` on `createGithubTools` / `createGithubAgent`: low-risk write tools (`AUTO_APPROVAL_TOOLS`: labels, assignees, reactions, comments, review-thread replies, reviewer requests, notification reads, workflow re-runs) run without a prompt when an evaluation model rates the call low-risk and the latest user message asked for it. Otherwise approval is requested as usual. Other write tools keep requiring approval. Per-tool values also accept `'auto'`, for example `requireApproval: { updateIssue: 'auto', mergePullRequest: true }`.
- `createGithubAgent({ preset: 'auto' })` selects presets per call from the latest user message, narrows the active tools, and uses the matching preset's system prompt. It combines at most two presets. When none clears the threshold it uses the most likely one, and read-only `repo-explorer` when nothing stands out. It never exposes the full catalog.
- The new optional `evaluation` option (`{ model, maxRisk, minIntent, minPresetProbability, maxPresets }`) tunes both modes. The model defaults to TypeSafe's Jev (`'typesafe-ai/jev'` through AI Gateway).
- `ToolOptions.needsApproval` on individual tool factories now also accepts an AI SDK approval function.

`createDurableGithubAgent` does not accept `'auto'`.
