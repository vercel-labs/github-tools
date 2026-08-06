---
"@github-tools/sdk": minor
---

Add 8 mutation tools: `updateIssue` (also reopens closed issues via `state: 'open'`), `updateIssueComment`, `deleteIssueComment`, `updatePullRequest` (title, body, state, base, and draft status — draft toggling uses the GitHub GraphQL API), `updatePullRequestComment`, `deletePullRequestComment`, `updateRelease`, and `deleteRelease`. Added to the `code-review`, `issue-triage`, `release-manager`, and `maintainer` presets.
