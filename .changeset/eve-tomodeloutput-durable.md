---
'@github-tools/eve-extension': patch
'@github-tools/sdk': patch
---

Apply built-in eve `toModelOutput` formatters through an inline callback that only closes over the tool name. On eve 0.44.x this keeps tools like `getFileContent` from failing durable-descriptor validation and dropping the whole GitHub toolset.
