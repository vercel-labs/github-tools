---
'@github-tools/eve-extension': patch
---

Register `approval` as a direct `defineTool` property so eve 0.44+ can stamp a durable `approvalRequest` descriptor. Write tools no longer cause the resolver to discard the whole GitHub toolset. Requires `eve` `>=0.44.0`.
