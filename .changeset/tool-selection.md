---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

`preset: 'auto'` now picks single tools instead of presets. One decision call asks about each tool and lists only the likely ones, plus the core read tools (`CORE_READ_TOOLS`), so far fewer tool definitions are sent. The tools are picked once, on the conversation's first request, so the tool list stays the same and providers that cache prompts keep reading the cached conversation instead of writing it again. In the eve benchmark with Claude Opus 5.5, this cost 24% less than the full catalog on single requests and 17% less over six requests in one session, while preset routing cost the same as the full catalog on single requests.

```ts
createGithubAgent({ model, preset: 'auto' })
```

- The rest of the catalog stays reachable:
  - `createGithubAgent` adds an `enableGithubTools` tool (`ENABLE_GITHUB_TOOLS`) that names every GitHub tool; tools the model enables are listed from the next step.
  - The eve extension defers the rest, reachable through `eve__search`.
- `evaluation: { selection: 'presets' }` routes to presets instead. On `createGithubAgent` it routes each request and uses the presets' system prompts, as before. The eve extension routes presets once per session; add `scope: 'turn'` for the previous per-request routing.
- `evaluation.scope: 'turn'` picks tools again for each request.
- `minToolProbability` (default `0.5`) and `maxTools` (default `8`) tune how many tools are listed.
- `selectTools` is exported from `@github-tools/sdk`, and `evaluateTools`, `fallbackTools` and `selectTools` from `@github-tools/sdk/eve-runtime`.
- When the decision call fails, the read-only `repo-explorer` tools are listed.
- TanStack AI's `preset: 'auto'` still routes to presets.
