---
'@github-tools/sdk': patch
---

Skip the REST update when `updatePullRequest` is called with only `draft`. Octokit was sending an empty PATCH body (`''`), which GitHub rejects with 400 before the GraphQL draft mutation could run.
