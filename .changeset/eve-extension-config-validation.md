---
'@github-tools/eve-extension': patch
---

Validate `requireApproval` and `overrides` keys against the GitHub tool catalog at mount time — a mistyped tool name now fails config validation instead of being silently ignored. The eve peer range is bounded to the tested versions (`>=0.44.0 <0.48.0`).
