---
'@github-tools/sdk': patch
---

Object-shaped eve `ApprovalConfiguration` values (`{ request, response }`) passed via `requireApproval` or `overrides.approval` are now honored instead of being silently replaced by `always()`. Configurations pass through to `defineTool` unchanged so a `response` authorizer survives. Also declares the tested eve peer range (`>=0.44.0 <0.48.0` instead of `>=0.19.0`) and deprecates `MISSING_EVE_MESSAGE`, which has not been thrown since eve moved to static imports.
