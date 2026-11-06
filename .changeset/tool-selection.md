---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Add `evaluation.selection: 'tools'` to `preset: 'auto'`. Instead of routing to presets (11 to 39 tools each), one decision call asks about each tool and lists only the likely ones, plus the core read tools (`CORE_READ_TOOLS`). This sends far fewer tool definitions on every step.

```ts
createGithubAgent({ model, preset: 'auto', evaluation: { selection: 'tools' } })
```

- `minToolProbability` (default `0.5`) and `maxTools` (default `8`) tune how many tools are listed.
- Tools are picked once, on the conversation's first request, so the tool list stays the same and providers that cache prompts keep reading the cached conversation instead of writing it again. `evaluation.scope: 'turn'` picks again for each request. The eve extension also accepts `scope: 'session'` with preset routing.
- The rest of the catalog stays reachable:
  - `createGithubAgent` adds an `enableGithubTools` tool (`ENABLE_GITHUB_TOOLS`) that names every GitHub tool; tools the model enables are listed from the next step.
  - The eve extension defers the rest, reachable through `eve__search`.
- `selectTools` is exported from `@github-tools/sdk`, and `evaluateTools`, `fallbackTools` and `selectTools` from `@github-tools/sdk/eve-runtime`.
- When the decision call fails, the read-only `repo-explorer` tools are listed.
