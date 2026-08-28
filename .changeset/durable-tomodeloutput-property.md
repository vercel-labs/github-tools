---
'@github-tools/eve-extension': patch
---

Register `toModelOutput` as a direct `defineTool` property so eve 0.44+ can stamp a durable descriptor. Agents on eve 0.46.1 no longer lose the whole GitHub toolset when a formatter like `getFileContent` fails descriptor validation. Requires `eve` `>=0.44.0`.
