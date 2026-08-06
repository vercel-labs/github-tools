---
"@github-tools/eve-extension": minor
"@github-tools/sdk": minor
---

Make eve-extension tools durable across multi-turn Workflow replay (inline execute + serializable tool names, fixes #51), add a `context` option to the extension config, and introduce `@github-tools/sdk/eve-runtime` for shared eve primitives used by the extension. Only the legacy `createGithubTools` / per-tool factories on `@github-tools/sdk/eve` (and `@github-tools/sdk/connect/eve`) stay deprecated for direct `agent/tools/` registration.
