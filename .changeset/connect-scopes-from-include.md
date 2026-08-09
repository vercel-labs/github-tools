---
"@github-tools/sdk": patch
"@github-tools/eve-extension": patch
---

Derive Connect scopes from the resolved `include` / `exclude` tool set instead of minting the full preset union (including `administration:write`) when `preset` is omitted.
