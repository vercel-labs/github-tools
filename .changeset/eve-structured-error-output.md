---
"@github-tools/sdk": patch
---

Fix eve tool output formatting for GitHub API errors. A 404, 403 or rate-limit error from a tool with a built-in eve formatter (`listPullRequestFiles`, `getFileContent`, `getRepositoryTree`, `getPullRequestContext`, `getCommit`, `compareCommits`) no longer breaks the next model step with `Cannot read properties of undefined`. The structured error now reaches the model as is.
