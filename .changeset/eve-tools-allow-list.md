---
"@github-tools/sdk": minor
"@github-tools/eve-extension": minor
---

Add a `tools` option for eve integrations to hand-pick an exact allow-list of tool names, instead of (or intersected with) a `preset`. Available on `EveGithubToolsOptions` (`buildEveToolMap`, `createGithubTools` from `@github-tools/sdk/eve`) and on the `githubExtension()` config schema.
