---
"@github-tools/sdk": minor
---

Support eve 1.0. The optional `eve` peer range is now `>=0.84.0 || >=1.0.0-0`, so npm installs the SDK next to `eve@1.0.0-rc.1` instead of failing with `ERESOLVE`. The deprecated `createGithubTools` from `@github-tools/sdk/eve` now returns `defineDynamic(() => tools)`, the form eve 0.84 introduced, and needs eve 0.84 or later.

Connect errors handle the token-exchange subject added in `@vercel/connect` 2.7, whose `type` is optional.
