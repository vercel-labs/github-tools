---
"@github-tools/sdk": patch
---

Deprecate the direct `@github-tools/sdk/eve` import — `createGithubTools`, the standalone per-tool eve factories, and `connectGithubTools` from `/connect/eve` are now marked `@deprecated` in favor of `@github-tools/eve-extension`, the recommended way to add GitHub tools to an eve agent. Direct imports continue to work; only the documentation and JSDoc guidance changed. See the new [eve extension guide](https://github-tools.com/frameworks/eve-extension).
