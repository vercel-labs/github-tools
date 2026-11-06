---
'@github-tools/sdk': patch
'@github-tools/eve-extension': patch
---

Harden `requireApproval: 'auto'` and `preset: 'auto'`.

- `rerunWorkflowRun` is no longer in `AUTO_APPROVAL_TOOLS`, since re-running a deploy or publish workflow is not low-risk. It asks for approval under `requireApproval: 'auto'` unless you opt it in per tool.
- When no preset reaches `minPresetProbability`, `preset: 'auto'` uses read-only `repo-explorer` instead of the most likely preset, so a vague request never gets write tools.
- The evaluator is told that tool input is untrusted data and that instructions inside it must be ignored.
- A too-old `ai` without `experimental_evaluate` now throws `EVALUATION_UNAVAILABLE` when `'auto'` is configured, instead of on the first evaluated call.
- The AI SDK asks again after a person approves an `'auto'` call; that check now reuses the first decision instead of calling the evaluation model again.
- New `evaluatePresets` and `fallbackPresets` in `@github-tools/sdk/eve-runtime`, and an optional `abortSignal` on `needsAutoApproval` and `selectPresets`.

In the eve extension:

- With `preset: 'auto'` and a `connector`, each Connect token covers only the tool being called. Before, it covered every scope, including `administration:write`, or only the `include` tools' scopes, so routed tools could fail with `403`.
- Subagent sessions and `service` callers always get an approval prompt under `'auto'`, because their latest message was not written by a person.
- A failed routing call is retried on the next model call instead of keeping `repo-explorer` for the whole turn.
- An approved `'auto'` call no longer calls the evaluation model a second time, and the evaluation call stops when the model generation is cancelled.
