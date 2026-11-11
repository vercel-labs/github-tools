---
'@github-tools/eve-extension': patch
'@github-tools/sdk': patch
---

Report a failed GitHub call as failed in eve.

A tool whose GitHub request failed used to return `{ error }`, so eve recorded the call as `completed`. The tool now throws, and `call.settled` reports `outcome: 'failed'`. For an error from the [catalog](https://github-tools.com/errors), its `error.code` is the catalog code, such as `github_tools.NOT_FOUND`.

What changes for an agent:

- **Evals.** An eval that uses `noFailedCalls()` can start failing where it passed, and a failed tool call's `status` is `failed` where it was `completed`.
- **Hooks and instrumentation.** Code that reads `call.settled` sees the failure without parsing the output. The output is the error's message as a string, where it was `{ error }`.
- **The model.** It still gets a tool result for the call, marked as an error. The text is `Error: ` followed by the same `{ code, message, why, fix, link }` as JSON, without the `{ error }` wrapper. For an error outside the catalog, it is the error's name and message.
- **Labels.** A failed write keeps its start label, such as "Create issue on owner/repo". The "Couldn't create issue on owner/repo" label is gone, because eve doesn't run `label.complete` for a failed call.
- **`toModelOutput` overrides.** eve doesn't run `toModelOutput` for a failed call, so an override no longer receives `{ error }`.
- **Logs.** eve logs each failed call as `tool execution failed`, with the error and, for a catalog error, a `cause` that holds its code and HTTP status. The thrown error holds nothing from the GitHub request, so the log has no URL, headers, or body.

A write that `guardrails` block throws too. `getBlame`, `listDiscussions`, `getDiscussion`, `addDiscussionComment`, `listPullRequestReviewThreads`, and `resolveReviewThread` returned `{ error }` when GitHub had no such repository, discussion, or thread, and now throw in eve with that message. A `dryRun` write still returns its result.

`executeGithubEveTool` from `@github-tools/sdk/eve-runtime` and the tools from the deprecated `@github-tools/sdk/eve` throw the same way. The AI SDK, TanStack, and Workflow tools are unchanged.
