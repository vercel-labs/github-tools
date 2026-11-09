---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Add six tools for production bots: checking who may trigger the bot, reporting results, keeping pull requests up to date, and planning work.

- `getCollaboratorPermission` returns a user's permission on a repository (`admin`, `write`, `read` or `none`) and role name (`admin`, `maintain`, `write`, `triage`, `read` or a custom role), so a bot can check whether the person who asked may trigger it or approve an action. On a public repository every user has at least `read`. It needs only the Metadata permission. It's in `code-review`, `issue-triage`, `pr-author` and `maintainer`.
- `createCommitStatus` sets a commit status (`error`, `failure`, `pending` or `success`) with a `context`, and an optional `description` and `targetUrl`. Unlike check runs, which only a GitHub App can create, it works with a personal access token too. It needs the Commit statuses permission (write), `statuses:write` with Vercel Connect, and is in `code-review`, `ci-ops` and `maintainer`.
- `updatePullRequestBranch` merges a pull request's base branch into its head branch, like the "Update branch" button, with an optional `expectedHeadSha`. With `guardrails`, it checks the pull request's head branch and the head's repository, which can be a fork, and fails with `github_tools.GUARDRAIL_BLOCKED` when either doesn't match. The factory takes `guardrails`. It's in `pr-author` and `maintainer`.
- `listMilestones` lists milestones by `state` with their due dates and open and closed issue counts. `createIssue` now takes `milestone`.
- `listSubIssues` lists the sub-issues of an issue, and `addSubIssue` adds an existing issue as a sub-issue by its number, from the same repository or another one with the same owner (`subIssueRepo`), with `replaceParent` to move it from its current parent. With `guardrails.repositories`, `addSubIssue` also checks the sub-issue's repository. These three tools are in `issue-triage` and `maintainer`.

**Vercel Connect:** a preset's token requests the scopes of every tool in the preset, so tokens for `code-review`, `ci-ops` and `maintainer` now also ask for `statuses:write`. Add the **Commit statuses** permission (read and write) to your GitHub App before upgrading. Otherwise GitHub can refuse the token, and every tool in those presets fails, not only `createCommitStatus`. To keep the App's current permissions instead, leave the tool out of the token's scopes: on the eve extension, set `exclude: ['createCommitStatus']`. With the AI SDK, `connectGithubTools` always requests the whole preset's scopes, so build the token with `connectGithubToken(connector, { preset, exclude: ['createCommitStatus'] })` and pass it to `createGithubTools`.

The write tools (`createCommitStatus`, `updatePullRequestBranch`, `addSubIssue`) require approval by default and aren't covered by `requireApproval: 'auto'` unless you opt them in. The eve extension gets all six tools through the catalog.
