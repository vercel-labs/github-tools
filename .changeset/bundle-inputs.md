---
'@github-tools/sdk': minor
---

The combined read tools take the inputs agents ask with, so one call answers more requests:

- `getCiFailureContext` takes a `runId` as well as a `ref`, for "why did run 123 fail?". It also returns the end of the log of each of the first three failed jobs, so the agent no longer needs `getWorkflowRun`, `listWorkflowJobs` and `getWorkflowJobLogs` in turn. `logLines` (default 40) sets the length, and `0` skips logs. A log GitHub no longer has comes back as `logError` on that job.
- `getRelease` and `getReleaseContext` take a `tag`, such as `v2.3.0`. `getReleaseContext` also takes a `previousTag` to compare against, for repositories that publish several packages, and otherwise compares a release with the one published before it; before, an older release was compared with the newest one.
- `getPullRequestContext({ includeLinkedIssues: true })` adds the issues the pull request closes when merged. It needs read access to issues, which the `code-review` Connect scopes don't include.
