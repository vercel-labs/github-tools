---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Use the AI SDK decision API behind `requireApproval: 'auto'` and `preset: 'auto'`.

- The SDK calls `experimental_decide`, which replaced `experimental_evaluate` in `ai` 7.0.128, and falls back to `experimental_evaluate` on earlier 7.x releases.
- A refused question no longer reads as an outage. A refused approval question asks for approval without logging `EVALUATION_FAILED`. A refused preset question counts as a no: routing asks once more without it, instead of falling back to `repo-explorer`.
- New `evaluation.providerOptions`, passed to every decision call. For example, `{ gateway: { zeroDataRetention: true } }`. The eve extension accepts it in its `evaluation` config.
