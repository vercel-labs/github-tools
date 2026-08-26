---
'@github-tools/sdk': patch
---

`connectGithubToken` now passes `VERCEL_OIDC_TOKEN` to Connect as `vercelToken` so local eve/workflow steps do not fail looking for a `.vercel` project root.
