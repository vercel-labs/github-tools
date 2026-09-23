---
"@github-tools/eve-extension": minor
"@github-tools/sdk": minor
---

Add `'auto'` modes to the eve extension. They need `ai` 7.0.105 or later.

- `preset: 'auto'` routes each user message to at most two presets with the evaluation model and registers only their tools for that turn. Tools the agent already called stay registered, so a parked approval can still resume after routing changes.
- `requireApproval: 'auto'` lets low-risk write tools (`AUTO_APPROVAL_TOOLS`) run without a prompt when the evaluation model rates the call low-risk and the user's latest request asked for it. Other write tools keep requiring approval. Per-tool values in `requireApproval` and `overrides[tool].approval` also accept `'auto'`.
- The `evaluation` option (`{ model, maxRisk, minIntent, minPresetProbability, maxPresets }`) tunes both modes, as in the SDK.

`@github-tools/sdk/eve-runtime` now exports `AUTO_APPROVAL_TOOLS`, `latestUserText`, `needsAutoApproval`, `selectPresets` and the `GithubEvaluationOptions` type.
