---
'@github-tools/eve-extension': minor
---

Accept an async token provider in the extension's `token` config (`string | (() => Promise<string>)`), matching the SDK's `GithubTokenInput`. Agents authenticating with a GitHub App can pass their installation-token minter directly instead of falling back to the `@github-tools/sdk/eve-runtime` subpath.
