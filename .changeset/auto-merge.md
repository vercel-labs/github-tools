---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Add tools for "merge when green":

- `enablePullRequestAutoMerge` merges a pull request once its required checks and reviews pass, with `mergeMethod`, `commitTitle` and `commitMessage` like `mergePullRequest` and the same `coAuthors` trailers. The repository must allow auto-merge. It's a write tool that requires approval by default, since it merges later without asking again.
- `disablePullRequestAutoMerge` cancels a pending auto-merge.
- `getBranchRules` lists what protects a branch: classic required status checks and the ruleset rules (required reviews, required checks, and so on), so an agent can say why a pull request can't merge yet.

`getPullRequest` also returns `mergeableState` (`blocked`, `behind`, `dirty`, `unstable`, `clean`, …) and `autoMerge`. The auto-merge tools are in the `maintainer` preset; `getBranchRules` is also in `code-review`, `ci-ops` and `pr-author`.

In eve, `editFiles` and the auto-merge tools now get a completion label too, such as "Edited files on owner/repo" or "Enabled pull request auto merge on owner/repo#12".
