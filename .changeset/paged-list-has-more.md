---
'@github-tools/sdk': minor
---

REST list tools now return `{ items, hasMore, page, perPage, nextPage }` instead of a bare array. Object-shaped lists (`listCheckRuns`, `listWorkflowRuns`, `listWorkflows`, `listWorkflowJobs`, reactions) add the same paging fields next to their existing keys. When `hasMore` is true, call again with `nextPage` (or raise `maxPages`) — do not repeat the same page. `page` is restored on `listCommits`, `listIssues`, `listPullRequests`, `listCheckRuns`, `listReleases`, and `listBranches`. Filter `listCommits` with `path` / `author` / `since` / `until`. `getRepositoryTree` accepts a `path` prefix; tree and large diffs are capped in the model-facing output.
