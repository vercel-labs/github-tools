---
'@github-tools/sdk': minor
'@github-tools/eve-extension': minor
---

Fill the gaps in presets and `preset: 'auto'`.

- Every task preset now reads files, history and code: `getRepository`, `getFileContent`, `getRepositoryTree`, `searchCode` and `listCommits`. Also added:
  - `ci-ops`: `getPullRequest`
  - `issue-triage`: `getPullRequest`
  - `release-manager`: `getCombinedStatus` and `getCiFailureContext`, which its prompt already named
  - `notification-inbox`: `getIssueContext` and `getDiscussion`
  - `pr-author`: `listPullRequests`
- `PRESET_CONNECT_SCOPES` is derived from each preset's tools. `issue-triage` and `discussion-moderator` gain `pull_requests:read`, which `searchIssues` needs; the new tools add `pull_requests:read` to `ci-ops`, `checks:read` and `statuses:read` to `release-manager`, and `discussions:read` to `notification-inbox`. A GitHub App or fine-grained PAT set up from the old matrix may need these read permissions.
- Several presets, from an array or from `preset: 'auto'`, now combine their system prompts instead of falling back to the generic prompt.
- eve extension: with `preset: 'auto'`, tools outside the routed presets are deferred instead of removed. The model can find them with `eve__search` and call them with `eve__tool`, so a request such as merging a pull request no longer dead-ends. Deferred write tools keep their approval policy.
