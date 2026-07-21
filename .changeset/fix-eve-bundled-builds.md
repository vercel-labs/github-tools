---
"@github-tools/sdk": patch
---

Fix eve / Connect integration for bundled serverless builds: widen `eve` and `@vercel/connect` peer ranges, replace runtime `createRequire("eve/tools")` with static ESM imports, and document lazy Connect token minting for eve tool modules.
