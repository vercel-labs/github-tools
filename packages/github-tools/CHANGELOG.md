# @github-tools/sdk

## 1.22.1

### Patch Changes

- [#253](https://github.com/vercel-labs/github-tools/pull/253) [`0d813ba`](https://github.com/vercel-labs/github-tools/commit/0d813bab14a3a7ec6ad28aded643496cdfe21d39) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Report a failed GitHub call as failed in eve.
  
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

## 1.22.0

### Minor Changes

- [#247](https://github.com/vercel-labs/github-tools/pull/247) [`00029d7`](https://github.com/vercel-labs/github-tools/commit/00029d7e0340d4409ff2fe567198d08ddc602a96) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Make an agent on eve's GitHub channel act for the person who commented, and choose who it answers.
  
  **`actAs: 'caller'` now works for people who comment on GitHub.** GitHub identifies a commenter, but a public comment can't carry a sign-in, so a `'caller'` call from one used to stop at "Authorization required". It now runs with the App's token, limited to the commenter's own role:
  
  - Before each call, the extension reads the commenter's role on the repository the call targets. A read needs Read and a write needs Write, so someone who can write to one repository can't have the agent read another one they can't see.
  - A refused call fails with `github_tools.CALLER_FORBIDDEN` before it reaches GitHub. The message names the role the person has and the one the call needs.
  - `resolveReviewThread` needs Write on the repository the thread is in.
  - A search runs only when the App's token reaches the thread's repository and no other, and is refused otherwise, for example when `connect` pins an installation or several repositories.
  - Every other tool without a repository is refused: gists, notifications, `createRepository` and `forkRepository`.
  - With `approvers: 'anyone'`, a call another commenter approved is checked against the approver's role.
  
  `'app'` and `'user'` are unchanged, and so are `'caller'` turns from other channels.
  
  **`githubChannel` with `respondTo`.** `@github-tools/eve-extension/channels` exports eve's `githubChannel` with one more option, which limits who can reach the agent with a comment:
  
  ```ts
  // agent/channels/github.ts
  import { connectGitHubCredentials } from '@vercel/connect/eve'
  import { githubChannel } from '@github-tools/eve-extension/channels'
  
  export default githubChannel({
    credentials: connectGitHubCredentials('github/my-connector'),
    respondTo: 'writers',
  })
  ```
  
  `respondTo` takes `'anyone'` (default), `'triagers'`, `'writers'`, `'maintainers'` or `'admins'`: GitHub's repository roles, each meaning that role and everyone above it. A comment from someone below it starts no turn, so it leaves no reaction, no session and no model call. Every other option is eve's.
  
  `@github-tools/sdk/eve-runtime` exports what both are built from: `withGithubCallerAccess(token, { login, repository? })`, `githubRoleRank` and `GITHUB_ROLES`.

### Patch Changes

- [#242](https://github.com/vercel-labs/github-tools/pull/242) [`29c5e3f`](https://github.com/vercel-labs/github-tools/commit/29c5e3f2013e4ab9a29e9172a94a0d861fe1f702) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Error and deprecation messages link to the new documentation URLs, such as `https://github-tools.com/auth` instead of `/guide/tokens-and-auth`. The old URLs redirect.

## 1.21.0

### Minor Changes

- [#236](https://github.com/vercel-labs/github-tools/pull/236) [`5018863`](https://github.com/vercel-labs/github-tools/commit/501886399c5978663806d4996ed53eeaeb497e70) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Block calls whose input contains a credential, so an agent can't post one to GitHub. The check runs on every tool call by default, even without `guardrails`, and recognizes GitHub, npm, Slack, Stripe, Anthropic, OpenAI, Google and AWS keys, and private keys. A blocked call fails with `github_tools.GUARDRAIL_BLOCKED`, for example "The input contains what looks like a GitHub token. Never send credentials to GitHub; remove it and try again."
  
  `createGithubAgent` and the eve extension deny such a write instead of asking anyone. `createGithubTools` skips the approval request when `guardrails` are set, and otherwise asks before the call fails. Set `guardrails: { secrets: 'allow' }` when the agent has to write fake keys, for example in test fixtures.

- [#237](https://github.com/vercel-labs/github-tools/pull/237) [`f13dada`](https://github.com/vercel-labs/github-tools/commit/f13dada774d5f6c1ed217fd72e85eae81ae947a8) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add six tools for production bots: checking who may trigger the bot, reporting results, keeping pull requests up to date, and planning work.
  
  - `getCollaboratorPermission` returns a user's permission on a repository (`admin`, `write`, `read` or `none`) and role name (`admin`, `maintain`, `write`, `triage`, `read` or a custom role), so a bot can check whether the person who asked may trigger it or approve an action. On a public repository every user has at least `read`. It needs only the Metadata permission. It's in `code-review`, `issue-triage`, `pr-author` and `maintainer`.
  - `createCommitStatus` sets a commit status (`error`, `failure`, `pending` or `success`) with a `context`, and an optional `description` and `targetUrl`. Unlike check runs, which only a GitHub App can create, it works with a personal access token too. It needs the Commit statuses permission (write), `statuses:write` with Vercel Connect, and is in `code-review`, `ci-ops` and `maintainer`.
  - `updatePullRequestBranch` merges a pull request's base branch into its head branch, like the "Update branch" button, with an optional `expectedHeadSha`. With `guardrails`, it checks the pull request's head branch and the head's repository, which can be a fork, and fails with `github_tools.GUARDRAIL_BLOCKED` when either doesn't match. The factory takes `guardrails`. It's in `pr-author` and `maintainer`.
  - `listMilestones` lists milestones by `state` with their due dates and open and closed issue counts. `createIssue` now takes `milestone`.
  - `listSubIssues` lists the sub-issues of an issue, and `addSubIssue` adds an existing issue as a sub-issue by its number, from the same repository or another one with the same owner (`subIssueRepo`), with `replaceParent` to move it from its current parent. With `guardrails.repositories`, `addSubIssue` also checks the sub-issue's repository. These three tools are in `issue-triage` and `maintainer`.
  
  **Vercel Connect:** a preset's token requests the scopes of every tool in the preset, so tokens for `code-review`, `ci-ops` and `maintainer` now also ask for `statuses:write`. Add the **Commit statuses** permission (read and write) to your GitHub App before upgrading. Otherwise GitHub can refuse the token, and every tool in those presets fails, not only `createCommitStatus`. To keep the App's current permissions instead, leave the tool out of the token's scopes: on the eve extension, set `exclude: ['createCommitStatus']`. With the AI SDK, `connectGithubTools` always requests the whole preset's scopes, so build the token with `connectGithubToken(connector, { preset, exclude: ['createCommitStatus'] })` and pass it to `createGithubTools`.
  
  The write tools (`createCommitStatus`, `updatePullRequestBranch`, `addSubIssue`) require approval by default and aren't covered by `requireApproval: 'auto'` unless you opt them in. The eve extension gets all six tools through the catalog.

- [#234](https://github.com/vercel-labs/github-tools/pull/234) [`9f75c39`](https://github.com/vercel-labs/github-tools/commit/9f75c39000482159ad0753f5128d2a29245003ca) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `dryRun`, a shadow mode to see what an agent would do on real repositories before it writes. Reads go to GitHub as usual. Writes don't reach GitHub and nobody is asked to approve them: each write goes through `guardrails`, then returns what it would have done and what approval would have decided.
  
  ```ts
  createGithubAgent({ model, preset: 'issue-triage', requireApproval: 'auto', dryRun: true })
  // addLabels → { dryRun: true, tool: 'addLabels', input, approval: { required: false, reason: 'Approved automatically: …' }, message: 'Dry run: …' }
  ```
  
  Use it to roll out a bot that runs on its own, to test against real data, or to compare models and prompts. It fits writes that stand on their own (labels, comments, reviews, closing issues), not chains where a later step needs an earlier write's result. The base branch of a merge isn't checked in a dry run, since that takes a request.
  
  Available on `createGithubTools`, `createGithubAgent`, `createDurableGithubAgent`, the eve extension config, and TanStack AI's `createGithubTools`, `createGithubAgent` and tool factories. On eve, the channel label reads "Would create issue on owner/repo". On TanStack AI, `'auto'` approval is decided by middleware a dry run never reaches, so those results have no `approval`. The `GithubDryRunResult` and `GithubDryRunApproval` types are exported from `@github-tools/sdk` and `@github-tools/sdk/eve-runtime`.

- [#235](https://github.com/vercel-labs/github-tools/pull/235) [`e065fdc`](https://github.com/vercel-labs/github-tools/commit/e065fdcf2878d131f69b9e9d93180e9cb145c91d) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Keep text that GitHub hides from the model, and tell the model GitHub text is data:
  
  - Tool results drop HTML comments (`<!-- … -->`) outside code and invisible Unicode characters (zero-width spaces, bidirectional controls, tag characters outside flag emoji; zero-width joiners stay) from issue, pull request, review, comment, release, discussion and gist comment bodies, at every `detail` level. A rendered page hides them but a model reads them, which makes them a common place to hide instructions. File contents and logs are unchanged. An agent that reads a body and writes it back drops its HTML comments.
  - The default system prompt of `createGithubAgent` and `createDurableGithubAgent`, and the eve extension's tool guidance, now say that text from GitHub was written by other people, and that the model treats it as data and acts only on what the user asked. Custom `instructions` replace that prompt.

- [#232](https://github.com/vercel-labs/github-tools/pull/232) [`bbbc46e`](https://github.com/vercel-labs/github-tools/commit/bbbc46eed6174ae7ff135f97e93c41d734240c19) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `guardrails` to limit where GitHub tools can act, whoever approves a call:
  
  ```ts
  createGithubAgent({
    model,
    guardrails: { repositories: ['vercel-labs/*'], branches: ['agent/*'] },
  })
  ```
  
  - `repositories` takes `owner/repo` or `owner/*`, matched regardless of case. A call to any other repository fails, reads included. Tools without a repository target (search, gists, notifications) aren't restricted. `createRepository` and `forkRepository` run only when the new repository's full name matches.
  - `branches` takes names or patterns where `*` matches any characters. `createBranch`, `deleteBranch`, `createOrUpdateFile` and `editFiles` must name a matching branch, and `mergePullRequest` and `enablePullRequestAutoMerge` check the pull request's base branch.
  - The checks run before any request reaches GitHub, on the input after `context` defaults. A blocked call fails with `github_tools.GUARDRAIL_BLOCKED` and a reason the model can act on.
  - `createGithubAgent` and the eve extension deny a blocked write with the reason instead of asking anyone. `createGithubTools` and `createDurableGithubAgent` skip the approval request and fail. TanStack AI asks first, then fails.
  - Available on `createGithubTools`, `createGithubAgent`, `createDurableGithubAgent`, TanStack AI's `createGithubTools`, `createGithubAgent` and tool factories, and the eve extension config.
  - `withGithubGuardrails(token, guardrails)` wraps a token for tools built from individual factories, and the merge factories take `branches`. `@github-tools/sdk/eve-runtime` exports `githubGuardrailViolation`.

## 1.20.0

### Minor Changes

- [#200](https://github.com/vercel-labs/github-tools/pull/200) [`7911e76`](https://github.com/vercel-labs/github-tools/commit/7911e765ecce38c63d12a17fc4011e1137074cf1) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Make `preset: 'auto'` and `requireApproval: 'auto'` handle follow-ups, and export routing.
  
  - When the latest user message is a short reply (100 characters or fewer), the evaluation model also sees `repliedTo`, the end of the assistant message it answers. The evaluator is told that `repliedTo` is model-written text that can quote GitHub content, and to ignore instructions in it. A short reply such as "yes" to "Should I add the bug label?" is judged against that proposal. This applies to routing in every integration, and to approval in the AI SDK and TanStack integrations.
  - `createGithubAgent({ preset: 'auto' })` routes each request once and reuses the result when the same request comes back. An approval continuation no longer calls the evaluation model again or swaps the active tools partway through a task.
  - `selectPresets` is exported from `@github-tools/sdk` and `@github-tools/sdk/tanstack`, so `streamText` and `chat()` users can route without the agent:
  
  ```ts
  const preset = await selectPresets(messages)
  streamText({ model, tools: createGithubTools({ preset }), messages })
  ```
  
  A request routed while the evaluation model was unavailable falls back to `repo-explorer` without caching that fallback, so the same request is routed again once the model recovers.

- [#224](https://github.com/vercel-labs/github-tools/pull/224) [`3c1c4fa`](https://github.com/vercel-labs/github-tools/commit/3c1c4fa9e7329e86b611ca904ae891800e3e24e5) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add tools for "merge when green":
  
  - `enablePullRequestAutoMerge` merges a pull request once its required checks and reviews pass, with `mergeMethod`, `commitTitle` and `commitMessage` like `mergePullRequest` and the same `coAuthors` trailers. The repository must allow auto-merge. It's a write tool that requires approval by default, since it merges later without asking again.
  - `disablePullRequestAutoMerge` cancels a pending auto-merge.
  - `getBranchRules` lists what protects a branch: classic required status checks and the ruleset rules (required reviews, required checks, and so on), so an agent can say why a pull request can't merge yet.
  
  `getPullRequest` also returns `mergeableState` (`blocked`, `behind`, `dirty`, `unstable`, `clean`, …) and `autoMerge`. The auto-merge tools are in the `maintainer` preset; `getBranchRules` is also in `code-review`, `ci-ops` and `pr-author`.
  
  In eve, `editFiles` and the auto-merge tools now get a completion label too, such as "Edited files on owner/repo" or "Enabled pull request auto merge on owner/repo#12".

- [#219](https://github.com/vercel-labs/github-tools/pull/219) [`2dcbc88`](https://github.com/vercel-labs/github-tools/commit/2dcbc88f14eccc528191a844d13716247e42950c) Thanks [@HugoRCD](https://github.com/HugoRCD)! - The combined read tools take the inputs agents ask with, so one call answers more requests:
  
  - `getCiFailureContext` takes a `runId` as well as a `ref`, for "why did run 123 fail?". It also returns the end of the log of each of the first three failed jobs, so the agent no longer needs `getWorkflowRun`, `listWorkflowJobs` and `getWorkflowJobLogs` in turn. `logLines` (default 40) sets the length, and `0` skips logs. A log GitHub no longer has comes back as `logError` on that job.
  - `getRelease` and `getReleaseContext` take a `tag`, such as `v2.3.0`. `getReleaseContext` also takes a `previousTag` to compare against, for repositories that publish several packages, and otherwise compares a release with the one published before it; before, an older release was compared with the newest one.
  - `getPullRequestContext({ includeLinkedIssues: true })` adds the issues the pull request closes when merged. It needs read access to issues, which the `code-review` Connect scopes don't include.

- [#205](https://github.com/vercel-labs/github-tools/pull/205) [`2dca773`](https://github.com/vercel-labs/github-tools/commit/2dca773e92a80c5004e0332037ec7a27ec8e303f) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Use the AI SDK decision API behind `requireApproval: 'auto'` and `preset: 'auto'`.
  
  - The SDK calls `experimental_decide`, which replaced `experimental_evaluate` in `ai` 7.0.128, and falls back to `experimental_evaluate` on earlier 7.x releases.
  - A refused question no longer reads as an outage. A refused approval question asks for approval without logging `EVALUATION_FAILED`. A refused preset question counts as a no: routing asks once more without it, instead of falling back to `repo-explorer`.
  - New `evaluation.providerOptions`, passed to every decision call. For example, `{ gateway: { zeroDataRetention: true } }`. The eve extension accepts it in its `evaluation` config.

- [#218](https://github.com/vercel-labs/github-tools/pull/218) [`12b6876`](https://github.com/vercel-labs/github-tools/commit/12b68769e4d50542072b181812bb4dc629802d71) Thanks [@HugoRCD](https://github.com/HugoRCD)! - **Breaking for `createDurableGithubAgent(...).generate()`:** call it from the `"use workflow"` function instead of a `"use step"` function, upgrade `@ai-sdk/workflow` to 2.0.59 or later, and read the fields you need from the new result type. `.stream()` is unchanged.
  
  `createDurableGithubAgent(...).generate()` now runs `WorkflowAgent.generate()` from `@ai-sdk/workflow` 2.0.59 or later. Each model call and tool call is its own durable, retriable step, as with `.stream()`, and writes that need approval end the call with a `tool-approval-request` you can answer on the next call. Before, it ran `generateText` as one block that had to sit inside a `"use step"` function and only accepted `prompt` and `stopWhen`.
  
  Call `.generate()` from the `"use workflow"` function, pass any `WorkflowAgent.generate()` option (`messages`, `stopWhen`, `output`, …), and return the fields you need, since the result isn't serializable:
  
  ```ts
  const result = await agent.generate({ messages })
  return { text: result.text, responseMessages: result.responseMessages }
  ```
  
  `DurableGithubAgentGenerateResult` is now the `WorkflowAgent` generation result. On an older `@ai-sdk/workflow`, `.generate()` throws `github_tools.DURABLE_GENERATE_UNAVAILABLE`; `.stream()` is unchanged.

- [#221](https://github.com/vercel-labs/github-tools/pull/221) [`344aaa8`](https://github.com/vercel-labs/github-tools/commit/344aaa8c9ba74cc4a93958ed7e1d04fe5d9d1681) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `editFiles`, a write tool that changes files and commits them in one call. Each edit either replaces an exact piece of text, so the agent reads only the part it changes and never resends a whole file to fix a line, or writes a whole file. It creates the branch from `baseBranch` (the default branch unless set) when it doesn't exist, commits every edit in one signed commit, and opens a pull request when you pass `pullRequest`:
  
  ```ts
  editFiles({
    owner: 'vercel', repo: 'ai', branch: 'docs/wording', message: 'docs: reword the intro',
    edits: [{ path: 'README.md', find: 'A typed tool layer', replace: 'A typed toolkit' }],
    pullRequest: { title: 'docs: reword the intro' },
  })
  ```
  
  `find` must match exactly once; otherwise nothing is written and the error says whether the text was missing or ambiguous. To change more files later, call `editFiles` again on the same `branch`: the new commit lands on the open pull request, and passing `pullRequest` again returns that pull request (`existing: true`) instead of failing. Like `createOrUpdateFile`, it takes `author`, `committer` and `coAuthors`; a custom author or committer commits through the REST API, one commit per file. It's in the `pr-author` and `maintainer` presets, requires approval by default, and its Connect scopes are `contents:write` and `pull_requests:write`.

- [#230](https://github.com/vercel-labs/github-tools/pull/230) [`fd7f172`](https://github.com/vercel-labs/github-tools/commit/fd7f17214616b653abd0b0eb51e94e4b9fd9fa1d) Thanks [@HugoRCD](https://github.com/HugoRCD)! - The eve extension now explains `requireApproval: 'auto'` decisions, as `createGithubAgent` does:
  
  - An approval prompt ends with the evaluation model's verdict, such as "Add labels on owner/repo#12? Hard to undo (risk 2 of 2), 100% likely you asked for it."
  - A call the evaluation model lets through returns `'approved'` from the approval policy, so eve records `clearedBy: { policy: 'approval' }` on its `call.started` event. Before, it looked like a call that needed no approval.
  
  `@github-tools/sdk/eve-runtime` exports `autoApprovalDecision`, which returns `{ ask, reason }` for a GitHub write.

- [#220](https://github.com/vercel-labs/github-tools/pull/220) [`b627f1d`](https://github.com/vercel-labs/github-tools/commit/b627f1d97590ce6724bb042207ff949451bd9a7b) Thanks [@HugoRCD](https://github.com/HugoRCD)! - The eve extension now adds a system instruction on how to use the GitHub tools: the preset's tool rules, or without a preset the rule to prefer `getPullRequestContext`, `getIssueContext`, `getReleaseContext` and `getCiFailureContext` over chains of single reads, plus the shared rules on paged lists and denied approvals, and the working `context`. It leaves out the presets' "You are …" openers, so your agent keeps its own identity. With `preset: 'auto'`, it also says that other tools can be found with `eve__search`. The text depends only on the extension config, so it doesn't change between model calls.
  
  Write tools now also set eve's `label.complete`, so channels show what a write did once it succeeds, such as "Created issue on vercel/eve#123", instead of keeping the "Create issue on vercel/eve" label.
  
  `@github-tools/sdk/eve-runtime` exports the `resolveToolGuidance({ preset, context })` helper that builds this text.

- [#226](https://github.com/vercel-labs/github-tools/pull/226) [`f4f638a`](https://github.com/vercel-labs/github-tools/commit/f4f638acdcb5e9c2444318d9a0a4cb9fcfcc8836) Thanks [@HugoRCD](https://github.com/HugoRCD)! - `createGithubAgent` now decides approvals with the AI SDK's call-level `toolApproval`, which replaces tool-level `needsApproval` in AI SDK 7, and explains `requireApproval: 'auto'` decisions:
  
  - An approval request carries the evaluator's verdict as its `reason`, such as "Visible but reversible (risk 0.5 of 2), 1% likely you asked for it." UIs read it from `part.approval.requestReason`.
  - A call the evaluator lets through is recorded as an automatic approval (`isAutomatic: true`) with its verdict, so the conversation shows what ran without a person.
  - A failed or refused evaluation asks, and says why.
  
  Calls through `callGithubTool` follow the approval of the tool they name. A tool you add outside the GitHub catalog, for example through `prepareCall`, keeps its own `needsApproval`. Passing your own `toolApproval` replaces this policy. `createGithubTools` keeps tool-level `needsApproval` for `generateText` and `streamText`, without reasons.

- [#206](https://github.com/vercel-labs/github-tools/pull/206) [`9b1a2c5`](https://github.com/vercel-labs/github-tools/commit/9b1a2c5cff2e999ad00cd696f4c9618f5d1ab4c1) Thanks [@HugoRCD](https://github.com/HugoRCD)! - The default decision model for `requireApproval: 'auto'` and `preset: 'auto'` is now `typesafe-ai/jev-1.14.0`, the latest Jev release, pinned instead of the moving `typesafe-ai/jev` alias. A new Jev release no longer changes how often the agent asks for approval until the SDK moves to it. Set `evaluation.model: 'typesafe-ai/jev'` to follow the latest release. The TanStack AI integration keeps `vercelGatewayDecider('typesafe-ai/jev')`, because `@tanstack/ai-vercel-gateway` 0.3 only accepts that model ID.

- [#223](https://github.com/vercel-labs/github-tools/pull/223) [`edb15cf`](https://github.com/vercel-labs/github-tools/commit/edb15cf245dae6e7926e3ab8e5ff521ba34d5916) Thanks [@HugoRCD](https://github.com/HugoRCD)! - `createPullRequestReview` comments take `startLine` (and `startSide`) for a comment on a range of lines, with `line` as the last one. A ```` ```suggestion ```` block in such a comment replaces the whole range when the author applies it, so a review can propose a fix that spans several lines. The `code-review` prompt tells the agent to use it.

- [#199](https://github.com/vercel-labs/github-tools/pull/199) [`5222a3b`](https://github.com/vercel-labs/github-tools/commit/5222a3b6f0fd3717095d48078ed05af7f034d6de) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Fill the gaps in presets and `preset: 'auto'`.
  
  - Every task preset now reads files, history and code: `getRepository`, `getFileContent`, `getRepositoryTree`, `searchCode` and `listCommits`. Also added:
    - `ci-ops`: `getPullRequest`
    - `issue-triage`: `getPullRequest`
    - `release-manager`: `getCombinedStatus` and `getCiFailureContext`, which its prompt already named
    - `notification-inbox`: `getIssueContext` and `getDiscussion`
    - `pr-author`: `listPullRequests`
  - `PRESET_CONNECT_SCOPES` is derived from each preset's tools. `issue-triage` and `discussion-moderator` gain `pull_requests:read`, which `searchIssues` needs; the new tools add `pull_requests:read` to `ci-ops`, `checks:read` and `statuses:read` to `release-manager`, and `discussions:read` to `notification-inbox`. A GitHub App or fine-grained PAT set up from the old matrix may need these read permissions.
  - Several presets, from an array or from `preset: 'auto'`, now combine their system prompts instead of falling back to the generic prompt.
  - eve extension: with `preset: 'auto'`, tools outside the routed presets are deferred instead of removed. The model can find them with `eve__search` and call them with `eve__tool`, so a request such as merging a pull request no longer dead-ends. Deferred write tools keep their approval policy.

- [#225](https://github.com/vercel-labs/github-tools/pull/225) [`37a6ecb`](https://github.com/vercel-labs/github-tools/commit/37a6ecb18e125786b2e5c3be6abd8b0d3e808638) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add read tools for the security alerts GitHub already tracks, in the `security-audit` and `maintainer` presets:
  
  - `listCodeScanningAlerts`: code scanning alerts (CodeQL and other tools) with the rule, severity, and the file and line of the latest instance.
  - `listDependabotAlerts`: vulnerable dependencies with the package, the advisory (GHSA and CVE IDs, severity, summary), the vulnerable range and the first patched version. This endpoint pages with cursors: pass `nextCursor` as `after`.
  - `listSecretScanningAlerts`: leaked credentials with the secret type, whether the secret is still valid, and whether push protection was bypassed. The tool asks GitHub to hide the secret and never returns it.
  
  They need the "Code scanning alerts", "Dependabot alerts" and "Secret scanning alerts" read permissions (the `security_events` scope on a classic token). Their Connect scopes are `security_events:read`, `vulnerability_alerts:read` and `secret_scanning_alerts:read`.

- [#207](https://github.com/vercel-labs/github-tools/pull/207) [`2c5ed63`](https://github.com/vercel-labs/github-tools/commit/2c5ed634166b3f8ee5c1ee021d859d3175164b59) Thanks [@HugoRCD](https://github.com/HugoRCD)! - `preset: 'auto'` now picks single tools instead of presets. One decision call asks about each tool and lists only the likely ones, plus the core read tools (`CORE_READ_TOOLS`), so far fewer tool definitions are sent. The tools are picked once, on the conversation's first request, so the tool list stays the same and providers that cache prompts keep reading the cached conversation instead of writing it again. In the eve benchmark with Claude Opus 5.5, averaged over three runs, this cost 27% less than the full catalog over six requests in one session and about 10% less on single requests, while preset routing cost 9% more than the full catalog on single requests.
  
  ```ts
  createGithubAgent({ model, preset: 'auto' })
  ```
  
  - The rest of the catalog stays reachable:
    - `createGithubAgent` adds a `callGithubTool` tool (`CALL_GITHUB_TOOL`) that calls any GitHub tool by name, with that tool's approval, `toModelOutput` and overrides. Omitting `input` returns the tool's description and input schema. The tool list never changes, so the provider's prompt cache holds.
    - The eve extension defers the rest, reachable through `eve__search`.
  - `evaluation: { selection: 'presets' }` routes to presets instead. On `createGithubAgent` it routes each request and uses the presets' system prompts, as before. The eve extension routes presets once per session; add `scope: 'turn'` for the previous per-request routing.
  - `evaluation.scope: 'turn'` picks tools again for each request.
  - `minToolProbability` (default `0.5`) and `maxTools` (default `8`) tune how many tools are listed.
  - `evaluation.store` (`{ get, set }`) keeps `createGithubAgent`'s decisions across processes, such as serverless instances, so another instance doesn't decide again.
  - `selectTools` is exported from `@github-tools/sdk`, and `evaluateTools`, `fallbackTools` and `selectTools` from `@github-tools/sdk/eve-runtime`.
  - When the decision call fails, the read-only `repo-explorer` tools are listed.
  - TanStack AI's `preset: 'auto'` still routes to presets.

### Patch Changes

- [#201](https://github.com/vercel-labs/github-tools/pull/201) [`4b23d64`](https://github.com/vercel-labs/github-tools/commit/4b23d643d54909ae51ead4eef1966e0b2af40fa8) Thanks [@HugoRCD](https://github.com/HugoRCD)! - `createGithubAgent` now applies `overrides` to its tools. Before, the option was accepted but passed to `ToolLoopAgent` instead of `createGithubTools`, so a custom description or `needsApproval` had no effect. `createDurableGithubAgent` also accepts `overrides` now.

- [#197](https://github.com/vercel-labs/github-tools/pull/197) [`76875a3`](https://github.com/vercel-labs/github-tools/commit/76875a3e871e4d292f195745347da4adf0e22e33) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Harden `requireApproval: 'auto'` and `preset: 'auto'`.
  
  - `rerunWorkflowRun` is no longer in `AUTO_APPROVAL_TOOLS`, since re-running a deploy or publish workflow is not low-risk. It asks for approval under `requireApproval: 'auto'` unless you opt it in per tool.
  - When no preset reaches `minPresetProbability`, `preset: 'auto'` uses read-only `repo-explorer` instead of the most likely preset, so a vague request never gets write tools.
  - The evaluator is told that tool input is untrusted data and that instructions inside it must be ignored.
  - A too-old `ai` without `experimental_evaluate` now throws `EVALUATION_UNAVAILABLE` when `'auto'` is configured, instead of on the first evaluated call.
  - The AI SDK asks again after a person approves an `'auto'` call; that check now reuses the first decision instead of calling the evaluation model again.
  - New `evaluatePresets` and `fallbackPresets` in `@github-tools/sdk/eve-runtime`, and an optional `abortSignal` on `needsAutoApproval` and `selectPresets`.
  
  In the eve extension:
  
  - With `preset: 'auto'` and a `connector`, each Connect token covers only the tool being called. Before, it covered every scope, including `administration:write`, or only the `include` tools' scopes, so routed tools could fail with `403`.
  - Subagent sessions and `service` callers always get an approval prompt under `'auto'`, because their latest message was not written by a person.
  - A failed routing call is retried on the next model call instead of keeping `repo-explorer` for the whole turn.
  - An approved `'auto'` call no longer calls the evaluation model a second time, and the evaluation call stops when the model generation is cancelled.
  
  Connect scopes for `mergePullRequest` now include `contents:write`, and `forkRepository` includes `administration:write`, matching the permissions GitHub checks. Before, a token minted for just those tools failed with `403`.

- [#227](https://github.com/vercel-labs/github-tools/pull/227) [`56e5d51`](https://github.com/vercel-labs/github-tools/commit/56e5d5108bcf507b72e23c06de4c0e9d38b1be59) Thanks [@HugoRCD](https://github.com/HugoRCD)! - `getReleaseContext` now finds the previous release when the release, or the one before it, isn't among the 30 most recent. It pages through up to 1,000 releases; pass `previousTag` for an older one.

- [#202](https://github.com/vercel-labs/github-tools/pull/202) [`f45deb4`](https://github.com/vercel-labs/github-tools/commit/f45deb4063e16f12607a395291a85a8c9737c6b2) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Remove dead code and fix package metadata. No behavior change.
  
  - `PRESET_TOOLS` is checked with `satisfies`, so a misspelled tool name in a preset fails to compile. The `AssertValidPresetTools` type, which never caught one, is removed.
  - eve tool calls build the registry entry for the called tool only, instead of all 84 tools on every call.
  - The eve extension derives its `preset` config enum from `PRESET_TOOLS`.
  - `package.json` declares `"sideEffects": false` instead of an entry that matched no file, and its `author` field is fixed.

## 1.19.0

### Minor Changes

- [#186](https://github.com/vercel-labs/github-tools/pull/186) [`9d0bec6`](https://github.com/vercel-labs/github-tools/commit/9d0bec605a892f9bd02a8a6351efe29965b5c9b3) Thanks [@bensabic](https://github.com/bensabic)! - Support eve 1.0. The optional `eve` peer range is now `>=0.84.0 || >=1.0.0-0`, so npm installs the SDK next to `eve@1.0.0-rc.1` instead of failing with `ERESOLVE`. The deprecated `createGithubTools` from `@github-tools/sdk/eve` now returns `defineDynamic(() => tools)`, the form eve 0.84 introduced, and needs eve 0.84 or later.
  
  Connect errors handle the token-exchange subject added in `@vercel/connect` 2.7, whose `type` is optional.

## 1.18.0

### Minor Changes

- [#172](https://github.com/vercel-labs/github-tools/pull/172) [`be6f4a8`](https://github.com/vercel-labs/github-tools/commit/be6f4a869b4fc9695d2fc61bac0735a7728ce9e7) Thanks [@bensabic](https://github.com/bensabic)! - Add TanStack AI tools and a prebuilt GitHub agent with Jev-based preset selection and approval through `@github-tools/sdk/tanstack`. Auto-preset continuations retain pending tools without re-routing, and `generate()` throws when a run needs human review.

- [#176](https://github.com/vercel-labs/github-tools/pull/176) [`4810ba8`](https://github.com/vercel-labs/github-tools/commit/4810ba8a20898c51a8058dff665ee2a4060c7231) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Support Workflow 5 for `createDurableGithubAgent`. The optional peer ranges now accept `workflow` `^4.5.0 || ^5.0.0` and `@ai-sdk/workflow` `^1.0.16 || ^2.0.0`, so installing `workflow@5` with `@ai-sdk/workflow@2` no longer reports peer conflicts. The unused `@workflow/ai` optional peer is removed; the durable agent requires `workflow` and `@ai-sdk/workflow`.
  
  `createDurableGithubAgent` no longer pulls Octokit into the workflow flow bundle, which Workflow 5 rejects with `WorkflowBuildError: Workflow bundle cannot run in the workflow sandbox`. Tool implementations moved from `GITHUB_TOOL_CATALOG` to a separate internal map; the public API is unchanged.

## 1.17.0

### Minor Changes

- [#158](https://github.com/vercel-labs/github-tools/pull/158) [`5df1f13`](https://github.com/vercel-labs/github-tools/commit/5df1f135fcf9ba59549c36f91835bb3ba582c058) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Mint Vercel Connect tokens per tool call.
  
  - `connect` on `githubExtension` accepts a `(ctx, call) => params` resolver, where `call` is `{ toolName, input, owner?, repo? }`. `owner` / `repo` are the tool's inputs after `context` defaults, and are undefined for tools without a repository target (search, gists, notifications). The static shape and the `connect.subject` resolver keep working unchanged.
  - `connectGithubTools` / `connectGithubToken` accept a `(call) => params` resolver as `connect` / `params`. Scopes still derive from `preset` / `include` / `exclude` unless the resolved params set `scopes`. Connect caches tokens per connector and params, so calls on the same repository reuse one token.
  - Token providers (`GithubTokenInput`) now receive an optional `GithubTokenCall` argument on every tool call, from both `createGithubTools` and the eve runtime. Existing `() => Promise<string>` providers are unaffected.
  - `CONNECT_INSTALLATION_REQUIRED` names the target account ("The connector's GitHub App is not installed on <owner>") when the token targets an org or repository owner.

- [#161](https://github.com/vercel-labs/github-tools/pull/161) [`db141c9`](https://github.com/vercel-labs/github-tools/commit/db141c939ad4bcf20c0e20320cc1caf1a0ee7a93) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Target the GitHub App installation that owns each tool call's repository by default. A GitHub App installed on several accounts now works with `githubExtension({ connector })`, `connectGithubTools` and `connectGithubToken` as they are, with nothing to configure.
  
  - App-subject tokens for a call with `owner` / `repo` (after `context` defaults) get `authorizationDetails: [{ type: 'github_app_installation', org: owner, repositories: [repo] }]`. Static `connect` params merge in. Calls without a repository target and calls outside a tool use the connector's default installation, as before.
  - An explicit `installationId`, `authorizationDetails` or `repositories` in the resolved params pins the installation and is never overridden. User subjects (`{ type: 'user' }`) are not targeted: a user token already spans installations.
  - Scopes still derive from `preset` / `include` / `exclude`. Connect caches tokens per connector and params, so calls on one repository reuse the token; single-installation connectors resolve to the same installation they used before.

- [#157](https://github.com/vercel-labs/github-tools/pull/157) [`90fd219`](https://github.com/vercel-labs/github-tools/commit/90fd219dad4956e300b5802958f120c737120904) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `'auto'` modes to the eve extension. They need `ai` 7.0.105 or later.
  
  - `preset: 'auto'` routes each user message to at most two presets with the evaluation model and registers only their tools for that turn. Tools the agent already called stay registered, so a parked approval can still resume after routing changes.
  - `requireApproval: 'auto'` lets low-risk write tools (`AUTO_APPROVAL_TOOLS`) run without a prompt when the evaluation model rates the call low-risk and the user's latest request asked for it. Other write tools keep requiring approval. Per-tool values in `requireApproval` and `overrides[tool].approval` also accept `'auto'`.
  - The `evaluation` option (`{ model, maxRisk, minIntent, minPresetProbability, maxPresets }`) tunes both modes, as in the SDK.
  
  `@github-tools/sdk/eve-runtime` now exports `AUTO_APPROVAL_TOOLS`, `latestUserText`, `needsAutoApproval`, `selectPresets` and the `GithubEvaluationOptions` type.

- [#157](https://github.com/vercel-labs/github-tools/pull/157) [`90fd219`](https://github.com/vercel-labs/github-tools/commit/90fd219dad4956e300b5802958f120c737120904) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `'auto'` modes for approval and presets. Both need `ai` 7.0.105 or later. Everything else still works on `ai` 6.
  
  - `requireApproval: 'auto'` on `createGithubTools` / `createGithubAgent`: low-risk write tools (`AUTO_APPROVAL_TOOLS`: labels, assignees, reactions, comments, review-thread replies, reviewer requests, notification reads, workflow re-runs) run without a prompt when an evaluation model rates the call low-risk and the latest user message asked for it. Otherwise approval is requested as usual. Other write tools keep requiring approval. Per-tool values also accept `'auto'`, for example `requireApproval: { updateIssue: 'auto', mergePullRequest: true }`.
  - `createGithubAgent({ preset: 'auto' })` selects presets per call from the latest user message, narrows the active tools, and uses the matching preset's system prompt. It combines at most two presets. Read-only `repo-explorer` is only used when no other preset matches. When none clears the threshold it uses the most likely one. It never exposes the full catalog.
  - The new optional `evaluation` option (`{ model, maxRisk, minIntent, minPresetProbability, maxPresets }`, defaults `1`, `0.6`, `0.7`, `2`) tunes both modes. The model defaults to TypeSafe's Jev (`'typesafe-ai/jev'` through AI Gateway).
  - When the evaluation call fails (model not enabled on AI Gateway, no credits, outage), `'auto'` approval asks for approval and `preset: 'auto'` uses `repo-explorer`. Both log a `github_tools.EVALUATION_FAILED` warning with the gateway error as `cause`.
  - `ToolOptions.needsApproval` on individual tool factories now also accepts an AI SDK approval function.
  
  `createDurableGithubAgent` does not accept `'auto'`.

### Patch Changes

- [#157](https://github.com/vercel-labs/github-tools/pull/157) [`90fd219`](https://github.com/vercel-labs/github-tools/commit/90fd219dad4956e300b5802958f120c737120904) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Fix eve tool output formatting for GitHub API errors. A 404, 403 or rate-limit error from a tool with a built-in eve formatter (`listPullRequestFiles`, `getFileContent`, `getRepositoryTree`, `getPullRequestContext`, `getCommit`, `compareCommits`) no longer breaks the next model step with `Cannot read properties of undefined`. The structured error now reaches the model as is.

## 1.16.1

### Patch Changes

- [#142](https://github.com/vercel-labs/github-tools/pull/142) [`542c417`](https://github.com/vercel-labs/github-tools/commit/542c4178fdfba3a103966400701ada0429188bbc) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Widen the optional `eve` peer dependency from `>=0.44.0 <0.48.0` to `>=0.44.0`, so `@github-tools/sdk/eve-runtime` and the deprecated `@github-tools/sdk/eve` / `@github-tools/sdk/connect/eve` entry points install against current eve releases without a peer conflict. Verified against eve 0.53.
  
  These entry points keep their existing behavior and stay deprecated in favor of `@github-tools/eve-extension`.

## 1.16.0

### Minor Changes

- [#127](https://github.com/vercel-labs/github-tools/pull/127) [`d6a0ef3`](https://github.com/vercel-labs/github-tools/commit/d6a0ef32a79dcc80e43111b786629b87223c566d) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Structured error catalog (evlog): classifiable failures now carry a stable `code`, a `why` (technical cause), and a `fix` (actionable remedy) instead of a bare message.

  - GitHub API errors are mapped by status: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `RATE_LIMITED` (403/429, with reset info), `NOT_FOUND` (404 — explicitly states GitHub masks no-access private resources as 404), `VALIDATION_FAILED` (422). Unmapped statuses pass through; the original Octokit error stays as `cause`.
  - An expired `VERCEL_OIDC_TOKEN` now throws `OIDC_TOKEN_EXPIRED` with the exact expiry time before any Connect request, instead of surfacing as an opaque 403. `@vercel/connect` failures map to `CONNECT_NOT_AUTHORIZED`, `CONNECT_USER_NOT_CONNECTED`, and `CONNECT_INSTALLATION_REQUIRED`.
  - In the eve extension, failing tools return `{ error: { code, message, why, fix, link } }` to the model; unclassified failures keep the plain message string.
  - The catalog is exported as `githubToolsErrors`; use evlog's `parseError` to read the structure from thrown errors in AI SDK apps.

## 1.15.0

### Minor Changes

- [#125](https://github.com/vercel-labs/github-tools/pull/125) [`c84ae07`](https://github.com/vercel-labs/github-tools/commit/c84ae075c8ccb3791e73e7897b7b7c2bc0898a96) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Support per-user Vercel Connect subjects. `GithubConnectParams` now accepts a `subject` (default stays `{ type: 'app' }`, the project's GitHub App installation), so multi-user apps can mint each caller's own connection token with `subject: { type: 'user', id }`. In the eve extension, `connect.subject` also accepts a per-caller resolver called with the tool execution context on every call — e.g. `(ctx) => ({ type: 'user', id: ctx.session.auth.current!.principalId })` — so each signed-in user reaches GitHub through their own connection instead of the shared app installation.

## 1.14.0

### Minor Changes

- [#119](https://github.com/vercel-labs/github-tools/pull/119) [`8bcb3fb`](https://github.com/vercel-labs/github-tools/commit/8bcb3fb7c459000106bcc018bb6685c84c7189e5) Thanks [@HugoRCD](https://github.com/HugoRCD)! - REST list tools now return `{ items, hasMore, page, perPage, nextPage }` instead of a bare array. Object-shaped lists (`listCheckRuns`, `listWorkflowRuns`, `listWorkflows`, `listWorkflowJobs`, reactions) add the same paging fields next to their existing keys. When `hasMore` is true, call again with `nextPage` (or raise `maxPages`) — do not repeat the same page. `page` is restored on `listCommits`, `listIssues`, `listPullRequests`, `listCheckRuns`, `listReleases`, and `listBranches`. Filter `listCommits` with `path` / `author` / `since` / `until`. `getRepositoryTree` accepts a `path` prefix; tree and large diffs are capped in the model-facing output.

## 1.13.0

### Minor Changes

- [#115](https://github.com/vercel-labs/github-tools/pull/115) [`d5ea800`](https://github.com/vercel-labs/github-tools/commit/d5ea800436cd0f79a49378ccb5ec8873f5521a2e) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add five tools (84 total): `getWorkflowJobLogs` reads a workflow job's log output, returning the last `maxLines` lines (default 200, max 2000) with per-line timestamps stripped to keep token usage low. `listPullRequestReviewThreads` lists PR review threads via GraphQL with resolution state and the IDs needed to reply or resolve — unresolved threads only and truncated comment bodies by default (`status: 'all'`, `detail: 'full'` to override). `replyToReviewComment` and `resolveReviewThread` answer and close review threads, and `deleteBranch` deletes a branch — all three are write tools requiring approval by default. Presets updated: `ci-ops`, `security-audit`, and `repo-explorer` gain job logs; `code-review` and `pr-author` gain the review-thread tools; `pr-author` also gains `deleteBranch`.

### Patch Changes

- [#114](https://github.com/vercel-labs/github-tools/pull/114) [`09aeafb`](https://github.com/vercel-labs/github-tools/commit/09aeafb86c29db0cdfe4d616180f3720ad02a93b) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Object-shaped eve `ApprovalConfiguration` values (`{ request, response }`) passed via `requireApproval` or `overrides.approval` are now honored instead of being silently replaced by `always()`. Configurations pass through to `defineTool` unchanged so a `response` authorizer survives. Also declares the tested eve peer range (`>=0.44.0 <0.48.0` instead of `>=0.19.0`) and deprecates `MISSING_EVE_MESSAGE`, which has not been thrown since eve moved to static imports.

- [#116](https://github.com/vercel-labs/github-tools/pull/116) [`c38cb9b`](https://github.com/vercel-labs/github-tools/commit/c38cb9bbf5a84caa6b4fc06944683bbd2e403271) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Internal refactor: introduce `GITHUB_TOOL_CATALOG` as the single source of truth for tool metadata. `GITHUB_TOOL_NAMES`, `GITHUB_WRITE_TOOLS`, `TOOL_CONNECT_SCOPES`, and the eve tool registry are now derived from it instead of being maintained as parallel hand-written registries. No public API changes.

## 1.12.0

### Minor Changes

- [#106](https://github.com/vercel-labs/github-tools/pull/106) [`584817c`](https://github.com/vercel-labs/github-tools/commit/584817c310adc11acb92a101e677d2343faf9c92) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Object-shaped tool results now include `rateLimit` (`remaining`, `limit`, `reset`, `resource`) from the last GitHub response. The field is stripped before the model sees the output. Array-shaped list tools are unchanged. 403/429 errors include remaining/reset in the message.

### Patch Changes

- [#107](https://github.com/vercel-labs/github-tools/pull/107) [`2edd9ea`](https://github.com/vercel-labs/github-tools/commit/2edd9ea9372c707808d2246965dfb57f8c8e08a1) Thanks [@HugoRCD](https://github.com/HugoRCD)! - `connectGithubToken` now passes `VERCEL_OIDC_TOKEN` to Connect as `vercelToken` so local eve/workflow steps do not fail looking for a `.vercel` project root.

- [#100](https://github.com/vercel-labs/github-tools/pull/100) [`0a9eae4`](https://github.com/vercel-labs/github-tools/commit/0a9eae4df8c431faa63aadad18112149aabab6f9) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Apply built-in eve `toModelOutput` formatters through an inline callback that only closes over the tool name. On eve 0.44.x this keeps tools like `getFileContent` from failing durable-descriptor validation and dropping the whole GitHub toolset.

- [#108](https://github.com/vercel-labs/github-tools/pull/108) [`5bbcab1`](https://github.com/vercel-labs/github-tools/commit/5bbcab1e45ce86b8a2edd06a2d5a025ad8d255c5) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Eve GitHub tool execute now returns `{ error }` on failure instead of throwing, so the model always gets a `tool_result` and the turn does not die with `MODEL_CALL_FAILED`.

- [#101](https://github.com/vercel-labs/github-tools/pull/101) [`ade87da`](https://github.com/vercel-labs/github-tools/commit/ade87da57d9a9de4994ed2848244a9404f5c369e) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Skip the REST update when `updatePullRequest` is called with only `draft`. Octokit was sending an empty PATCH body (`''`), which GitHub rejects with 400 before the GraphQL draft mutation could run.

## 1.11.1

### Patch Changes

- [#77](https://github.com/vercel-labs/github-tools/pull/77) [`d2c65d3`](https://github.com/vercel-labs/github-tools/commit/d2c65d367e54e8e1bad99de78613d2c2dc3dcc51) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Fix eve durable tool registration so consumers can drop pnpm patches: rebuild options per execute (no module-level race), resolve tools on `step.started`, and omit the `approval` field for `false` / `'never'` instead of attaching `never()`. Also map `listIssueComments` in Connect tool scopes.

## 1.11.0

### Minor Changes

- [#74](https://github.com/vercel-labs/github-tools/pull/74) [`c445040`](https://github.com/vercel-labs/github-tools/commit/c445040528b42bcc47ef2e27e11e090f8dcdbe8e) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `createLabel`, `updateLabel`, and `deleteLabel` tools for repository label management. Included in the `issue-triage` and `maintainer` presets.

- [#75](https://github.com/vercel-labs/github-tools/pull/75) [`827e856`](https://github.com/vercel-labs/github-tools/commit/827e8567a2ac39f8ad3716555a0908f20b922893) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Expose `listIssueComments` as a public tool for paginating issue comments beyond `getIssueContext`. Included in the `issue-triage`, `repo-explorer`, and `maintainer` presets.

### Patch Changes

- [#73](https://github.com/vercel-labs/github-tools/pull/73) [`538d3f3`](https://github.com/vercel-labs/github-tools/commit/538d3f3f9086b962811dfdec9915e6c17e0890e3) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Derive Connect scopes from the resolved `include` / `exclude` tool set instead of minting the full preset union (including `administration:write`) when `preset` is omitted.

## 1.10.0

### Minor Changes

- [#62](https://github.com/vercel-labs/github-tools/pull/62) [`6887d70`](https://github.com/vercel-labs/github-tools/commit/6887d709b0d094a2925d0ce00993648bc64c05f4) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add 8 mutation tools: `updateIssue` (also reopens closed issues via `state: 'open'`), `updateIssueComment`, `deleteIssueComment`, `updatePullRequest` (title, body, state, base, and draft status — draft toggling uses the GitHub GraphQL API), `updatePullRequestComment`, `deletePullRequestComment`, `updateRelease`, and `deleteRelease`. Added to the `code-review`, `issue-triage`, `release-manager`, and `maintainer` presets.

- [#61](https://github.com/vercel-labs/github-tools/pull/61) [`df53f0f`](https://github.com/vercel-labs/github-tools/commit/df53f0f9016d8d0b4ff8dea67f2ba26dccb5825f) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Make eve-extension tools durable across multi-turn Workflow replay (inline execute + serializable tool names, fixes [#51](https://github.com/vercel-labs/github-tools/issues/51)), add a `context` option to the extension config, and introduce `@github-tools/sdk/eve-runtime` for shared eve primitives used by the extension. Only the legacy `createGithubTools` / per-tool factories on `@github-tools/sdk/eve` (and `@github-tools/sdk/connect/eve`) stay deprecated for direct `agent/tools/` registration.

- [#64](https://github.com/vercel-labs/github-tools/pull/64) [`eb48422`](https://github.com/vercel-labs/github-tools/commit/eb484226c97e835343f543b90d303273aaf8f5ca) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add discussion, notification, and reaction tools (75 total).

  - Discussions (GraphQL): `listDiscussions`, `getDiscussion`, `addDiscussionComment`. `listDiscussions` filters by category name and paginates by cursor (`after` / `endCursor`); `getDiscussion` truncates the body unless `detail: 'full'`. Added to `repo-explorer` (reads) and `maintainer`.
  - Notifications: `listNotifications`, `markNotificationRead`. Added to `maintainer`. Notifications are account-level, so they need a PAT with the "Notifications" permission and do not work with a Vercel Connect installation token.
  - Reactions: `listIssueReactions`, `addIssueReaction`, `listCommentReactions`, `addCommentReaction`, covering issues, pull request conversations, and their comments. Added to `issue-triage` and `maintainer`. Covered by the existing Issues permission.

  `PRESET_CONNECT_SCOPES` now requests `discussions:read` for `repo-explorer` and `discussions:read` / `discussions:write` for `maintainer`.

- [#67](https://github.com/vercel-labs/github-tools/pull/67) [`2937d88`](https://github.com/vercel-labs/github-tools/commit/2937d8832158f85c54e4f966006abfcc97f8454a) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add three focused presets: `discussion-moderator`, `notification-inbox`, and `pr-author`. Prefer a preset for most agents; use `maintainer` or omit `preset` when you need the full catalog. Docs and the agent skill lead with presets and the manager/sub-agents composition pattern.

- [#63](https://github.com/vercel-labs/github-tools/pull/63) [`239f43d`](https://github.com/vercel-labs/github-tools/commit/239f43dac7ca1366ba03cad3e2b812f5dfe66e32) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `searchIssues` to search issues and pull requests with GitHub qualifiers (`is:open`, `type:pr`, `label:bug`, …), with `sort` and `order` options. Added to the `issue-triage`, `repo-explorer`, `security-audit`, and `maintainer` presets. `searchCode` now requests text-match snippets from GitHub and returns them as `textMatches` on each result.

### Patch Changes

- [#58](https://github.com/vercel-labs/github-tools/pull/58) [`a0df8d9`](https://github.com/vercel-labs/github-tools/commit/a0df8d96e73ff47d9dc828d2994b699e56819d11) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Make `getIssueContext` return `labelNames` (strings only), default to the full issue body (one-shot, no re-fetch), use fewer comments, slim the `issue-triage` preset (drop redundant `getIssue` / `listLabels`), and tighten agent presets so independent reads run in the same step.

## 1.9.0

### Minor Changes

- [#56](https://github.com/vercel-labs/github-tools/pull/56) [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `listCheckRuns` (Checks API) and `getCombinedStatus` (Statuses API) to read CI results from providers beyond GitHub Actions. Included in the `repo-explorer`, `code-review`, `ci-ops`, `security-audit`, and `maintainer` presets, which now request the `checks:read` and `statuses:read` Vercel Connect scopes.

- [#56](https://github.com/vercel-labs/github-tools/pull/56) [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `compareCommits` (ahead/behind counts, commits, and file diffs between two refs) and `getRepositoryTree` (recursive file/directory listing at a ref). `compareCommits` is available in all presets; `getRepositoryTree` is included in `repo-explorer`, `security-audit`, and `maintainer`.

- [#56](https://github.com/vercel-labs/github-tools/pull/56) [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add an optional `maxPages` input to `listCommits`, `listPullRequests`, `listIssues`, `listWorkflowRuns`, `listCheckRuns`, and `listReleases`. Set it alongside `perPage` to sequentially fetch and combine up to that many pages in one tool call, stopping early once a page comes back short — omit it to keep fetching a single page as before.

- [#56](https://github.com/vercel-labs/github-tools/pull/56) [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add release tools: `listReleases`, `getLatestRelease`, `getRelease`, and `createRelease`. Included in the `repo-explorer`, `release-manager`, and `maintainer` presets.

- [#56](https://github.com/vercel-labs/github-tools/pull/56) [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `requestReviewers` (pull requests) and `addAssignees` / `removeAssignees` (issues and pull requests). `requestReviewers` is included in `code-review` and `maintainer`; `addAssignees` / `removeAssignees` are included in `issue-triage` and `maintainer`.

- [#56](https://github.com/vercel-labs/github-tools/pull/56) [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add two presets: `security-audit` (read-only repository, PR, and CI exploration plus issue reporting — no destructive writes) and `release-manager` (releases, diffs, and CI status for cutting releases). Both come with tailored `createGithubAgent` system prompts and Vercel Connect scope mappings, and are available on the `githubExtension()` `preset` option.

- [`48da771`](https://github.com/vercel-labs/github-tools/commit/48da77108fc6dd44c3f5297c19e5607f4205fa19) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add composite context tools (`getPullRequestContext`, `getIssueContext`, `getReleaseContext`, `getCiFailureContext`), omit diff patches by default (`includePatch`), truncate bodies by default (`detail: summary`), support line ranges on `getFileContent`, and add a `context` option to default owner/repo/PR/issue/ref on tools and agents.

- [#53](https://github.com/vercel-labs/github-tools/pull/53) [`9f3eadd`](https://github.com/vercel-labs/github-tools/commit/9f3eadd85d93ae152b40a08d42f17f36c69f419d) Thanks [@HugoRCD](https://github.com/HugoRCD)! - `connectGithubTools` and `connectGithubToken` now accept a `() => string | Promise<string>` resolver in place of a static connector name, re-resolved on every call. Use it to pick a Vercel Connect connector dynamically — e.g. per environment (production vs. preview) or per tenant — instead of hardcoding one connector name.

- [#55](https://github.com/vercel-labs/github-tools/pull/55) [`55fadcc`](https://github.com/vercel-labs/github-tools/commit/55fadcc39683aa77d60cade0a2bb3de4caf790c4) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `include` and `exclude` options for eve integrations. `include` adds tool names on top of a `preset` (union), or serves as the full set standalone; `exclude` removes tool names from the resolved `preset` + `include` set. Available on `EveGithubToolsOptions` (`buildEveToolMap`, `createGithubTools` from `@github-tools/sdk/eve`) and on the `githubExtension()` config schema.

### Patch Changes

- [#55](https://github.com/vercel-labs/github-tools/pull/55) [`55fadcc`](https://github.com/vercel-labs/github-tools/commit/55fadcc39683aa77d60cade0a2bb3de4caf790c4) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Deprecate the direct `@github-tools/sdk/eve` import — `createGithubTools`, the standalone per-tool eve factories, and `connectGithubTools` from `/connect/eve` are now marked `@deprecated` in favor of `@github-tools/eve-extension`, the recommended way to add GitHub tools to an eve agent. Direct imports continue to work; only the documentation and JSDoc guidance changed. See the new [eve extension guide](https://github-tools.com/frameworks/eve-extension).

## 1.8.2

### Patch Changes

- [#48](https://github.com/vercel-labs/github-tools/pull/48) [`9502941`](https://github.com/vercel-labs/github-tools/commit/9502941f0ff174a3122d156723dc238f686254df) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Document `@github-tools/eve-extension` — a mountable eve extension distribution for the GitHub tools, built on top of the existing `@github-tools/sdk/eve` subpath. See `packages/github-tools-eve-extension` and the `examples/eve-extension-agent` starter.

## 1.8.1

### Patch Changes

- [#46](https://github.com/vercel-labs/github-tools/pull/46) [`88559b2`](https://github.com/vercel-labs/github-tools/commit/88559b221f6b4f4cc147bdae27e9597d4a0ddde5) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Fix eve / Connect integration for bundled serverless builds: widen `eve` and `@vercel/connect` peer ranges, replace runtime `createRequire("eve/tools")` with static ESM imports, and document lazy Connect token minting for eve tool modules.

## 1.8.0

### Minor Changes

- [#42](https://github.com/vercel-labs/github-tools/pull/42) [`58d0158`](https://github.com/vercel-labs/github-tools/commit/58d01586241495daee93b126704740562e90b683) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Allow GitHub token inputs to be strings or async provider functions (`GithubTokenInput`). Adds a `resolveGithubToken` helper for custom tool factories.

- [#44](https://github.com/vercel-labs/github-tools/pull/44) [`a6ff194`](https://github.com/vercel-labs/github-tools/commit/a6ff194f5604f6dad74e7dc59261f6d1e342bf4a) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `@github-tools/sdk/connect` and `@github-tools/sdk/connect/eve` helpers for Vercel Connect — preset-derived scopes, `connectGithubToken`, and `connectGithubTools`.

## 1.7.0

### Minor Changes

- [#35](https://github.com/vercel-labs/github-tools/pull/35) [`021a8ab`](https://github.com/vercel-labs/github-tools/commit/021a8ab2687afa86e49f33dba9933691a2e4e0dc) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add native eve integration via `@github-tools/sdk/eve` with `defineDynamic` tool registration, rich approval mapping (`once`, predicates), shared core refactor, and an `examples/eve-agent` starter.

- [#35](https://github.com/vercel-labs/github-tools/pull/35) [`021a8ab`](https://github.com/vercel-labs/github-tools/commit/021a8ab2687afa86e49f33dba9933691a2e4e0dc) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Migrate `createDurableGithubAgent` from `DurableAgent` to `WorkflowAgent` (`@ai-sdk/workflow`). Write tools now honor `requireApproval` via `needsApproval` — the workflow pauses until the user approves or denies.

### Patch Changes

- [#38](https://github.com/vercel-labs/github-tools/pull/38) [`c96c15b`](https://github.com/vercel-labs/github-tools/commit/c96c15b7d40555de85ae82eb67aa17b749b8b607) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Improve JSDoc and TypeScript types for richer IDE hover and autocomplete — preset-aware tool sets, typed tool/write-tool catalogs, and stricter option keys.

## 1.6.0

### Minor Changes

- [#29](https://github.com/vercel-labs/github-tools/pull/29) [`92f90e0`](https://github.com/vercel-labs/github-tools/commit/92f90e0912bb49f54615e7a417895dccb77e6f00) Thanks [@visyat](https://github.com/visyat)! - Adding support for coauthors on code authoring tools

## 1.5.0

### Minor Changes

- [#27](https://github.com/vercel-labs/github-tools/pull/27) [`3b2f12c`](https://github.com/vercel-labs/github-tools/commit/3b2f12c54fe48b723d4cb995912e22d469477782) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `.generate()` to `DurableGithubAgent` for non-streaming durable workflows

  `createDurableGithubAgent` now returns a `DurableGithubAgent` wrapper with both `.stream()` and `.generate()` methods. `.generate()` uses `generateText` from the AI SDK internally and must be called from a `"use step"` context in workflows.

  `CreateDurableGithubAgentOptions` now extends all `DurableAgentOptions` fields (e.g. `experimental_telemetry`, `onStepFinish`, `onFinish`, `prepareStep`) instead of a narrow subset, enabling evlog and other observability integrations at the agent level.

## 1.4.0

### Minor Changes

- [#23](https://github.com/vercel-labs/github-tools/pull/23) [`daa610c`](https://github.com/vercel-labs/github-tools/commit/daa610c07441c978668c9cd40aa1fed07828242e) Thanks [@bensabic](https://github.com/bensabic)! - Add PR review tools (`listPullRequestFiles`, `listPullRequestReviews`, `createPullRequestReview`) and label tools (`listLabels`, `addLabels`, `removeLabel`).

- [#26](https://github.com/vercel-labs/github-tools/pull/26) [`4cfaf0c`](https://github.com/vercel-labs/github-tools/commit/4cfaf0c27d1282f7c63d3ea877ab3123eb866f42) Thanks [@bensabic](https://github.com/bensabic)! - Add per-tool `overrides` option to `createGithubTools` for customizing tool behavior (description, title, needsApproval, etc.) without changing the underlying implementation.

## 1.3.0

### Minor Changes

- [#21](https://github.com/vercel-labs/github-tools/pull/21) [`675ae88`](https://github.com/vercel-labs/github-tools/commit/675ae88b8944a5bcb7fca4ba0d30058eb26c006c) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add Vercel Workflow SDK support. Tool factories now take `token: string` instead of `Octokit`. Each tool uses a named module-level step function with `"use step"` for proper step registration and full Node.js access in the workflow sandbox. Add `@github-tools/sdk/workflow` subpath with `createDurableGithubAgent` powered by `DurableAgent`. Note: `requireApproval` is accepted for forward-compatibility but currently ignored by `DurableAgent`.

- [#17](https://github.com/vercel-labs/github-tools/pull/17) [`ebdfcdb`](https://github.com/vercel-labs/github-tools/commit/ebdfcdb3e3c9189335eb15ed61c410e9e009966b) Thanks [@bensabic](https://github.com/bensabic)! - Add GitHub Gist and workflow tools, plus a CI-ops agent preset for operational tasks.

- [#20](https://github.com/vercel-labs/github-tools/pull/20) [`d22085f`](https://github.com/vercel-labs/github-tools/commit/d22085fcb40a6f98c720e289f622023b423586f2) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `getBlame` for line-level git blame on repository files (GitHub GraphQL `Commit.blame`).

### Patch Changes

- [#18](https://github.com/vercel-labs/github-tools/pull/18) [`26571fb`](https://github.com/vercel-labs/github-tools/commit/26571fbf41dcfe8113d6138047f26dffbdd6159e) Thanks [@bensabic](https://github.com/bensabic)! - Document optional `token` (defaults to `process.env.GITHUB_TOKEN`) and add toolpick integration examples in the package README.

## 1.2.0

### Minor Changes

- [#15](https://github.com/vercel-labs/github-tools/pull/15) [`991d3f2`](https://github.com/vercel-labs/github-tools/commit/991d3f27f812f53f5741f644fedcb9b78b3c16fa) Thanks [@HugoRCD](https://github.com/HugoRCD)! - feat: add repository management tools

## 1.1.0

### Minor Changes

- [#10](https://github.com/vercel-labs/github-tools/pull/10) [`49f3733`](https://github.com/vercel-labs/github-tools/commit/49f37330555ace81d486a10b6818605dd2db350b) Thanks [@HugoRCD](https://github.com/HugoRCD)! - auto-detect github token from process.env

## 1.0.0

### Major Changes

- [`5d3a2db`](https://github.com/vercel-labs/github-tools/commit/5d3a2db0f1b97646f05a40d92a56d05e0afcbe1b) Thanks [@HugoRCD](https://github.com/HugoRCD)! - first version
