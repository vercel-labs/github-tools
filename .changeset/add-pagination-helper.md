---
"@github-tools/sdk": minor
---

Add an optional `maxPages` input to `listCommits`, `listPullRequests`, `listIssues`, `listWorkflowRuns`, `listCheckRuns`, and `listReleases`. Set it alongside `perPage` to sequentially fetch and combine up to that many pages in one tool call, stopping early once a page comes back short — omit it to keep fetching a single page as before.
