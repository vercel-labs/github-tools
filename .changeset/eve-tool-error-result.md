---
'@github-tools/sdk': patch
---

Eve GitHub tool execute now returns `{ error }` on failure instead of throwing, so the model always gets a `tool_result` and the turn does not die with `MODEL_CALL_FAILED`.
