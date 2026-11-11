# @github-tools/eve-extension

## 0.13.1

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
- Updated dependencies [[`0d813ba`](https://github.com/vercel-labs/github-tools/commit/0d813bab14a3a7ec6ad28aded643496cdfe21d39)]:
  - @github-tools/sdk@1.22.1

## 0.13.0

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

- [#244](https://github.com/vercel-labs/github-tools/pull/244) [`c801d58`](https://github.com/vercel-labs/github-tools/commit/c801d58933629ce3d762b1b9b3445ffd76524e69) Thanks [@HugoRCD](https://github.com/HugoRCD)! - The extension now depends on `zod@^4.6.7`. Earlier versions allowed `^4.5.4`, so a project that resolved `ai` and `eve` to zod 4.6 could install a second zod copy for the extension, and `eve build` failed type-checking when a schema from one copy reached an API typed against the other.
- Updated dependencies [[`29c5e3f`](https://github.com/vercel-labs/github-tools/commit/29c5e3f2013e4ab9a29e9172a94a0d861fe1f702), [`00029d7`](https://github.com/vercel-labs/github-tools/commit/00029d7e0340d4409ff2fe567198d08ddc602a96)]:
  - @github-tools/sdk@1.22.0

## 0.12.0

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

- [#238](https://github.com/vercel-labs/github-tools/pull/238) [`9e5bff3`](https://github.com/vercel-labs/github-tools/commit/9e5bff3f75b02b69151bf168a0ab7bb986e74589) Thanks [@HugoRCD](https://github.com/HugoRCD)! - On eve's GitHub channel, the extension fills `context` from the thread: the repository, and the issue or pull request number (a pull request's number also fills `issueNumber`, so issue tools work on its thread). The model can leave them out of tool calls, approval prompts and labels name the thread, `guardrails` check the filled-in target, and the system prompt names the thread. Fields set in `context` take precedence, and turns from other channels are unchanged.

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

### Patch Changes

- Updated dependencies [[`5018863`](https://github.com/vercel-labs/github-tools/commit/501886399c5978663806d4996ed53eeaeb497e70), [`f13dada`](https://github.com/vercel-labs/github-tools/commit/f13dada774d5f6c1ed217fd72e85eae81ae947a8), [`9f75c39`](https://github.com/vercel-labs/github-tools/commit/9f75c39000482159ad0753f5128d2a29245003ca), [`e065fdc`](https://github.com/vercel-labs/github-tools/commit/e065fdcf2878d131f69b9e9d93180e9cb145c91d), [`bbbc46e`](https://github.com/vercel-labs/github-tools/commit/bbbc46eed6174ae7ff135f97e93c41d734240c19)]:
  - @github-tools/sdk@1.21.0

## 0.11.0

### Minor Changes

- [#224](https://github.com/vercel-labs/github-tools/pull/224) [`3c1c4fa`](https://github.com/vercel-labs/github-tools/commit/3c1c4fa9e7329e86b611ca904ae891800e3e24e5) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add tools for "merge when green":
  
  - `enablePullRequestAutoMerge` merges a pull request once its required checks and reviews pass, with `mergeMethod`, `commitTitle` and `commitMessage` like `mergePullRequest` and the same `coAuthors` trailers. The repository must allow auto-merge. It's a write tool that requires approval by default, since it merges later without asking again.
  - `disablePullRequestAutoMerge` cancels a pending auto-merge.
  - `getBranchRules` lists what protects a branch: classic required status checks and the ruleset rules (required reviews, required checks, and so on), so an agent can say why a pull request can't merge yet.
  
  `getPullRequest` also returns `mergeableState` (`blocked`, `behind`, `dirty`, `unstable`, `clean`, …) and `autoMerge`. The auto-merge tools are in the `maintainer` preset; `getBranchRules` is also in `code-review`, `ci-ops` and `pr-author`.
  
  In eve, `editFiles` and the auto-merge tools now get a completion label too, such as "Edited files on owner/repo" or "Enabled pull request auto merge on owner/repo#12".

- [#205](https://github.com/vercel-labs/github-tools/pull/205) [`2dca773`](https://github.com/vercel-labs/github-tools/commit/2dca773e92a80c5004e0332037ec7a27ec8e303f) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Use the AI SDK decision API behind `requireApproval: 'auto'` and `preset: 'auto'`.
  
  - The SDK calls `experimental_decide`, which replaced `experimental_evaluate` in `ai` 7.0.128, and falls back to `experimental_evaluate` on earlier 7.x releases.
  - A refused question no longer reads as an outage. A refused approval question asks for approval without logging `EVALUATION_FAILED`. A refused preset question counts as a no: routing asks once more without it, instead of falling back to `repo-explorer`.
  - New `evaluation.providerOptions`, passed to every decision call. For example, `{ gateway: { zeroDataRetention: true } }`. The eve extension accepts it in its `evaluation` config.

- [#221](https://github.com/vercel-labs/github-tools/pull/221) [`344aaa8`](https://github.com/vercel-labs/github-tools/commit/344aaa8c9ba74cc4a93958ed7e1d04fe5d9d1681) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `editFiles`, a write tool that changes files and commits them in one call. Each edit either replaces an exact piece of text, so the agent reads only the part it changes and never resends a whole file to fix a line, or writes a whole file. It creates the branch from `baseBranch` (the default branch unless set) when it doesn't exist, commits every edit in one signed commit, and opens a pull request when you pass `pullRequest`:
  
  ```ts
  editFiles({
    owner: 'vercel', repo: 'ai', branch: 'docs/wording', message: 'docs: reword the intro',
    edits: [{ path: 'README.md', find: 'A typed tool layer', replace: 'A typed toolkit' }],
    pullRequest: { title: 'docs: reword the intro' },
  })
  ```
  
  `find` must match exactly once; otherwise nothing is written and the error says whether the text was missing or ambiguous. To change more files later, call `editFiles` again on the same `branch`: the new commit lands on the open pull request, and passing `pullRequest` again returns that pull request (`existing: true`) instead of failing. Like `createOrUpdateFile`, it takes `author`, `committer` and `coAuthors`; a custom author or committer commits through the REST API, one commit per file. It's in the `pr-author` and `maintainer` presets, requires approval by default, and its Connect scopes are `contents:write` and `pull_requests:write`.

- [#195](https://github.com/vercel-labs/github-tools/pull/195) [`831bd2f`](https://github.com/vercel-labs/github-tools/commit/831bd2fb834507ef8c9ef51f23cbbee101e0b9e9) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `actAs` and `approvers` to choose whose GitHub access each tool call uses.
  
  ```ts
  export default githubExtension({
    connector: 'github/my-connector',
    actAs: 'caller',
  })
  ```
  
  `actAs` takes:
  
  - `'app'` (default, unchanged): the GitHub App installation token for every caller.
  - `'user'`: the signed-in user's own GitHub token. Sessions without a signed-in user fail instead of falling back to the App.
  - `'caller'`: the signed-in user when one drives the turn, and the App for turns nobody drives, such as schedules, `localDev()` runs and bots.
  
  Pass `{ read, write }` to pick per tool kind, or `overrides.<tool>.actAs` for one tool. GitHub allows a user-token call only when both the user and the App have access, so the agent can do what the user can do on GitHub and nothing more. A user who has not authorized the App gets an eve sign-in prompt, and the call resumes after it. They are asked again if GitHub rejects their token. A signed-in user never falls back to the App token.
  
  `approvers` takes:
  
  - `'requester'` (default): only the person who asked can answer an approval, so a colleague in a shared thread cannot approve someone else's request.
  - `'anyone'`: an opt-in for simple shared agents. Any signed-in user can approve and anyone can deny. For `'user'` and `'caller'` tools, the approved call runs with the approver's GitHub token, so GitHub checks and records the approver. An approver who has not authorized the App signs in before the approval counts. For `'app'` tools the approval is a gate only.
  
  `'user'` and `'caller'` need `connector`, and `connect` cannot be combined with `actAs: 'user'`. The `@vercel/connect` peer dependency now requires `>=2.7.0`, for the `@vercel/connect/eve` helper. The default `actAs` may change to `'caller'` in a future major version.

- [#230](https://github.com/vercel-labs/github-tools/pull/230) [`fd7f172`](https://github.com/vercel-labs/github-tools/commit/fd7f17214616b653abd0b0eb51e94e4b9fd9fa1d) Thanks [@HugoRCD](https://github.com/HugoRCD)! - The eve extension now explains `requireApproval: 'auto'` decisions, as `createGithubAgent` does:
  
  - An approval prompt ends with the evaluation model's verdict, such as "Add labels on owner/repo#12? Hard to undo (risk 2 of 2), 100% likely you asked for it."
  - A call the evaluation model lets through returns `'approved'` from the approval policy, so eve records `clearedBy: { policy: 'approval' }` on its `call.started` event. Before, it looked like a call that needed no approval.
  
  `@github-tools/sdk/eve-runtime` exports `autoApprovalDecision`, which returns `{ ask, reason }` for a GitHub write.

- [#220](https://github.com/vercel-labs/github-tools/pull/220) [`b627f1d`](https://github.com/vercel-labs/github-tools/commit/b627f1d97590ce6724bb042207ff949451bd9a7b) Thanks [@HugoRCD](https://github.com/HugoRCD)! - The eve extension now adds a system instruction on how to use the GitHub tools: the preset's tool rules, or without a preset the rule to prefer `getPullRequestContext`, `getIssueContext`, `getReleaseContext` and `getCiFailureContext` over chains of single reads, plus the shared rules on paged lists and denied approvals, and the working `context`. It leaves out the presets' "You are …" openers, so your agent keeps its own identity. With `preset: 'auto'`, it also says that other tools can be found with `eve__search`. The text depends only on the extension config, so it doesn't change between model calls.
  
  Write tools now also set eve's `label.complete`, so channels show what a write did once it succeeds, such as "Created issue on vercel/eve#123", instead of keeping the "Create issue on vercel/eve" label.
  
  `@github-tools/sdk/eve-runtime` exports the `resolveToolGuidance({ preset, context })` helper that builds this text.

- [#198](https://github.com/vercel-labs/github-tools/pull/198) [`a66db85`](https://github.com/vercel-labs/github-tools/commit/a66db8534ec8158664c27e0066cfec58a97f116d) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Build with eve 1.0.0-rc.6. The extension now mounts on eve 1.0.0-rc.6 or later; upgrade eve before upgrading the extension.
  
  - A failed GitHub call reaches the model as an error result (eve's `error-text` output) instead of a successful JSON output. `call.settled` still carries the full `{ error }` payload.
  - While a call runs, channels show the action and its target, such as `Create issue on vercel-labs/github-tools#12`, instead of the tool name.
  - Removed the filter for eve's `[Pending approvals]` message, which eve has rendered into the system prompt since 1.0.0-rc.3.

- [#206](https://github.com/vercel-labs/github-tools/pull/206) [`9b1a2c5`](https://github.com/vercel-labs/github-tools/commit/9b1a2c5cff2e999ad00cd696f4c9618f5d1ab4c1) Thanks [@HugoRCD](https://github.com/HugoRCD)! - The default decision model for `requireApproval: 'auto'` and `preset: 'auto'` is now `typesafe-ai/jev-1.14.0`, the latest Jev release, pinned instead of the moving `typesafe-ai/jev` alias. A new Jev release no longer changes how often the agent asks for approval until the SDK moves to it. Set `evaluation.model: 'typesafe-ai/jev'` to follow the latest release. The TanStack AI integration keeps `vercelGatewayDecider('typesafe-ai/jev')`, because `@tanstack/ai-vercel-gateway` 0.3 only accepts that model ID.

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

- [#212](https://github.com/vercel-labs/github-tools/pull/212) [`5c3b846`](https://github.com/vercel-labs/github-tools/commit/5c3b8467d114622985c0a508462e67ae228b975e) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Honor the `response` policy of an approval object passed in `requireApproval.<tool>` or `overrides.<tool>.approval`. It decides who can answer the approval, and the extension's sign-in checks still apply to the people it allows. The approval prompt now names the target the tool acts on: a `pullNumber` in `context` no longer replaces the issue number of an issue tool.

- [#222](https://github.com/vercel-labs/github-tools/pull/222) [`234a680`](https://github.com/vercel-labs/github-tools/commit/234a680b2a9d7a07716decf9bdbba54054795bcb) Thanks [@HugoRCD](https://github.com/HugoRCD)! - A GitHub tool call that fails no longer gets a success label in channels. Failed calls return `{ error }` instead of throwing, so eve still ran the completion label, and a failed `createIssue` showed "Created issue on owner/repo". It now shows "Couldn't create issue on owner/repo".

- [#202](https://github.com/vercel-labs/github-tools/pull/202) [`f45deb4`](https://github.com/vercel-labs/github-tools/commit/f45deb4063e16f12607a395291a85a8c9737c6b2) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Remove dead code and fix package metadata. No behavior change.
  
  - `PRESET_TOOLS` is checked with `satisfies`, so a misspelled tool name in a preset fails to compile. The `AssertValidPresetTools` type, which never caught one, is removed.
  - eve tool calls build the registry entry for the called tool only, instead of all 84 tools on every call.
  - The eve extension derives its `preset` config enum from `PRESET_TOOLS`.
  - `package.json` declares `"sideEffects": false` instead of an entry that matched no file, and its `author` field is fixed.
- Updated dependencies [[`4b23d64`](https://github.com/vercel-labs/github-tools/commit/4b23d643d54909ae51ead4eef1966e0b2af40fa8), [`76875a3`](https://github.com/vercel-labs/github-tools/commit/76875a3e871e4d292f195745347da4adf0e22e33), [`7911e76`](https://github.com/vercel-labs/github-tools/commit/7911e765ecce38c63d12a17fc4011e1137074cf1), [`3c1c4fa`](https://github.com/vercel-labs/github-tools/commit/3c1c4fa9e7329e86b611ca904ae891800e3e24e5), [`2dcbc88`](https://github.com/vercel-labs/github-tools/commit/2dcbc88f14eccc528191a844d13716247e42950c), [`2dca773`](https://github.com/vercel-labs/github-tools/commit/2dca773e92a80c5004e0332037ec7a27ec8e303f), [`12b6876`](https://github.com/vercel-labs/github-tools/commit/12b68769e4d50542072b181812bb4dc629802d71), [`344aaa8`](https://github.com/vercel-labs/github-tools/commit/344aaa8c9ba74cc4a93958ed7e1d04fe5d9d1681), [`fd7f172`](https://github.com/vercel-labs/github-tools/commit/fd7f17214616b653abd0b0eb51e94e4b9fd9fa1d), [`b627f1d`](https://github.com/vercel-labs/github-tools/commit/b627f1d97590ce6724bb042207ff949451bd9a7b), [`f4f638a`](https://github.com/vercel-labs/github-tools/commit/f4f638acdcb5e9c2444318d9a0a4cb9fcfcc8836), [`9b1a2c5`](https://github.com/vercel-labs/github-tools/commit/9b1a2c5cff2e999ad00cd696f4c9618f5d1ab4c1), [`edb15cf`](https://github.com/vercel-labs/github-tools/commit/edb15cf245dae6e7926e3ab8e5ff521ba34d5916), [`5222a3b`](https://github.com/vercel-labs/github-tools/commit/5222a3b6f0fd3717095d48078ed05af7f034d6de), [`56e5d51`](https://github.com/vercel-labs/github-tools/commit/56e5d5108bcf507b72e23c06de4c0e9d38b1be59), [`f45deb4`](https://github.com/vercel-labs/github-tools/commit/f45deb4063e16f12607a395291a85a8c9737c6b2), [`37a6ecb`](https://github.com/vercel-labs/github-tools/commit/37a6ecb18e125786b2e5c3be6abd8b0d3e808638), [`2c5ed63`](https://github.com/vercel-labs/github-tools/commit/2c5ed634166b3f8ee5c1ee021d859d3175164b59)]:
  - @github-tools/sdk@1.20.0

## 0.10.0

### Minor Changes

- [#186](https://github.com/vercel-labs/github-tools/pull/186) [`9d0bec6`](https://github.com/vercel-labs/github-tools/commit/9d0bec605a892f9bd02a8a6351efe29965b5c9b3) Thanks [@bensabic](https://github.com/bensabic)! - Build the extension with eve 1.0.0-rc.1, so it mounts on eve 1.0.0-rc.1 and later. Since eve 0.84, eve rejects the 0.9.x build with `uses an old epoch-based distribution manifest`, and `defineDurableSchema` and `defineDynamic({ events })` no longer exist. Agents on eve 0.81 to 0.83 can stay on 0.9.x.
  
  The tool file is now a `defineDynamic` function that eve runs before every model call. With `preset: 'auto'`, the routed presets are kept for the turn with `ctx.memo` instead of an in-process cache, so a resumed or replayed turn in a new process keeps the same tools without calling the evaluation model again. eve discards memoized results when the deployment changes, and a tool call the turn already made stays available either way.
  
  Extension config is unchanged. One behavior changes with `preset: 'auto'`: routing now runs once per turn instead of once per user message, so a message that steers a running turn keeps the presets the turn started with.

### Patch Changes

- Updated dependencies [[`9d0bec6`](https://github.com/vercel-labs/github-tools/commit/9d0bec605a892f9bd02a8a6351efe29965b5c9b3)]:
  - @github-tools/sdk@1.19.0

## 0.9.0

### Minor Changes

- [#180](https://github.com/vercel-labs/github-tools/pull/180) [`5017b58`](https://github.com/vercel-labs/github-tools/commit/5017b58f0741e3e92b3ecc701086863386483422) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Build the extension with eve 0.81.1. The published manifest now requires tool contract 93 and dynamic-tool contract 87, so the extension mounts on eve 0.81 and later. Agents on eve 0.72 to 0.80 can stay on 0.8.x.
  
  Approval requests for write tools now name the action and its target instead of eve's default `Approve <tool>?`, for example `Merge pull request on vercel-labs/github-tools#176?`. `owner`, `repo`, and the pull request, issue, or discussion number fall back to `context` when the call omits them.

## 0.8.1

### Patch Changes

- [#175](https://github.com/vercel-labs/github-tools/pull/175) [`73a9e73`](https://github.com/vercel-labs/github-tools/commit/73a9e7397987e139a593f9a3868bb691aef20454) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Build the extension with eve 0.72.1. The published manifest now requires tool contract 76 and dynamic-tool contract 72, so the extension mounts on eve 0.72 and later. Releases up to 0.8.0 required tool contract 54, which eve 0.72 no longer supports.
- Updated dependencies [[`be6f4a8`](https://github.com/vercel-labs/github-tools/commit/be6f4a869b4fc9695d2fc61bac0735a7728ce9e7), [`4810ba8`](https://github.com/vercel-labs/github-tools/commit/4810ba8a20898c51a8058dff665ee2a4060c7231)]:
  - @github-tools/sdk@1.18.0

## 0.8.0

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

### Patch Changes

- Updated dependencies [[`5df1f13`](https://github.com/vercel-labs/github-tools/commit/5df1f135fcf9ba59549c36f91835bb3ba582c058), [`db141c9`](https://github.com/vercel-labs/github-tools/commit/db141c939ad4bcf20c0e20320cc1caf1a0ee7a93), [`90fd219`](https://github.com/vercel-labs/github-tools/commit/90fd219dad4956e300b5802958f120c737120904), [`90fd219`](https://github.com/vercel-labs/github-tools/commit/90fd219dad4956e300b5802958f120c737120904), [`90fd219`](https://github.com/vercel-labs/github-tools/commit/90fd219dad4956e300b5802958f120c737120904)]:
  - @github-tools/sdk@1.17.0

## 0.7.4

### Patch Changes

- [`b652a7e`](https://github.com/vercel-labs/github-tools/commit/b652a7ef18a7e072b43e5788f5889c5b048184d9) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Rebuild the extension against eve 0.64. eve 0.64.0 dropped tool contract 53 and dynamic tool contract 51 with its sandbox session changes, so `eve build` rejected the 0.7.3 build on the newest eve. This release requires tool contract 54 and dynamic tool contract 52, which means agents must be on eve 0.64 or later.

## 0.7.3

### Patch Changes

- [#150](https://github.com/vercel-labs/github-tools/pull/150) [`eed4909`](https://github.com/vercel-labs/github-tools/commit/eed4909b3ed69adcc9d22d214b5ebf22211d0d34) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Rebuild the extension against eve 0.63. eve 0.63.0 dropped tool contracts 44 to 52 (including contract 52, which the 0.7.2 build requires), so `eve build` rejected the published extension on the newest eve; this release lands on the contracts 0.63.0 accepts.

## 0.7.2

### Patch Changes

- [#146](https://github.com/vercel-labs/github-tools/pull/146) [`56662a5`](https://github.com/vercel-labs/github-tools/commit/56662a518bd338adaec3098b8d5d040f2b63ad73) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Rebuild the extension against eve 0.62 and preserve dynamic input and output validation across durable replay. Tool schemas now use `defineDurableSchema` with a serializable tool-name closure, preventing eve 0.59 and newer from rejecting GitHub tools whose Zod schemas were captured through resolver-local descriptors.

## 0.7.1

### Patch Changes

- [#142](https://github.com/vercel-labs/github-tools/pull/142) [`542c417`](https://github.com/vercel-labs/github-tools/commit/542c4178fdfba3a103966400701ada0429188bbc) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Rebuild the extension against eve 0.53. eve 0.50 changed the dynamic-tool capability contract and requires extensions built against the earlier contract to be rebuilt, so agents on eve 0.50 or newer need this release.
  
  `eve` is now declared as a `*` peer dependency instead of `>=0.44.0 <0.48.0`. The consuming agent supplies the runtime copy of eve, and eve validates the extension's generated capability metadata at build time rather than an npm range, so a new eve release no longer produces a peer conflict. The exact `eve` devDependency is the authoring and build version.
  
  `engines.node` widens from `24.x` to `>=24`. Mount configuration and tool behavior are unchanged.
- Updated dependencies [[`542c417`](https://github.com/vercel-labs/github-tools/commit/542c4178fdfba3a103966400701ada0429188bbc)]:
  - @github-tools/sdk@1.16.1

## 0.7.0

### Minor Changes

- [#127](https://github.com/vercel-labs/github-tools/pull/127) [`d6a0ef3`](https://github.com/vercel-labs/github-tools/commit/d6a0ef32a79dcc80e43111b786629b87223c566d) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Structured error catalog (evlog): classifiable failures now carry a stable `code`, a `why` (technical cause), and a `fix` (actionable remedy) instead of a bare message.

  - GitHub API errors are mapped by status: `UNAUTHORIZED` (401), `FORBIDDEN` (403), `RATE_LIMITED` (403/429, with reset info), `NOT_FOUND` (404 — explicitly states GitHub masks no-access private resources as 404), `VALIDATION_FAILED` (422). Unmapped statuses pass through; the original Octokit error stays as `cause`.
  - An expired `VERCEL_OIDC_TOKEN` now throws `OIDC_TOKEN_EXPIRED` with the exact expiry time before any Connect request, instead of surfacing as an opaque 403. `@vercel/connect` failures map to `CONNECT_NOT_AUTHORIZED`, `CONNECT_USER_NOT_CONNECTED`, and `CONNECT_INSTALLATION_REQUIRED`.
  - In the eve extension, failing tools return `{ error: { code, message, why, fix, link } }` to the model; unclassified failures keep the plain message string.
  - The catalog is exported as `githubToolsErrors`; use evlog's `parseError` to read the structure from thrown errors in AI SDK apps.

### Patch Changes

- Updated dependencies [[`d6a0ef3`](https://github.com/vercel-labs/github-tools/commit/d6a0ef32a79dcc80e43111b786629b87223c566d)]:
  - @github-tools/sdk@1.16.0

## 0.6.0

### Minor Changes

- [#125](https://github.com/vercel-labs/github-tools/pull/125) [`c84ae07`](https://github.com/vercel-labs/github-tools/commit/c84ae075c8ccb3791e73e7897b7b7c2bc0898a96) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Support per-user Vercel Connect subjects. `GithubConnectParams` now accepts a `subject` (default stays `{ type: 'app' }`, the project's GitHub App installation), so multi-user apps can mint each caller's own connection token with `subject: { type: 'user', id }`. In the eve extension, `connect.subject` also accepts a per-caller resolver called with the tool execution context on every call — e.g. `(ctx) => ({ type: 'user', id: ctx.session.auth.current!.principalId })` — so each signed-in user reaches GitHub through their own connection instead of the shared app installation.

### Patch Changes

- Updated dependencies [[`c84ae07`](https://github.com/vercel-labs/github-tools/commit/c84ae075c8ccb3791e73e7897b7b7c2bc0898a96)]:
  - @github-tools/sdk@1.15.0

## 0.5.1

### Patch Changes

- Updated dependencies [[`8bcb3fb`](https://github.com/vercel-labs/github-tools/commit/8bcb3fb7c459000106bcc018bb6685c84c7189e5)]:
  - @github-tools/sdk@1.14.0

## 0.5.0

### Minor Changes

- [#115](https://github.com/vercel-labs/github-tools/pull/115) [`d5ea800`](https://github.com/vercel-labs/github-tools/commit/d5ea800436cd0f79a49378ccb5ec8873f5521a2e) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add five tools (84 total): `getWorkflowJobLogs` reads a workflow job's log output, returning the last `maxLines` lines (default 200, max 2000) with per-line timestamps stripped to keep token usage low. `listPullRequestReviewThreads` lists PR review threads via GraphQL with resolution state and the IDs needed to reply or resolve — unresolved threads only and truncated comment bodies by default (`status: 'all'`, `detail: 'full'` to override). `replyToReviewComment` and `resolveReviewThread` answer and close review threads, and `deleteBranch` deletes a branch — all three are write tools requiring approval by default. Presets updated: `ci-ops`, `security-audit`, and `repo-explorer` gain job logs; `code-review` and `pr-author` gain the review-thread tools; `pr-author` also gains `deleteBranch`.

### Patch Changes

- [#112](https://github.com/vercel-labs/github-tools/pull/112) [`790f68d`](https://github.com/vercel-labs/github-tools/commit/790f68dd1d92285beb5a730541711aa91422feed) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Register `approval` as a direct `defineTool` property so eve 0.44+ can stamp a durable `approvalRequest` descriptor. Write tools no longer cause the resolver to discard the whole GitHub toolset. Requires `eve` `>=0.44.0`.

- [#114](https://github.com/vercel-labs/github-tools/pull/114) [`09aeafb`](https://github.com/vercel-labs/github-tools/commit/09aeafb86c29db0cdfe4d616180f3720ad02a93b) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Validate `requireApproval` and `overrides` keys against the GitHub tool catalog at mount time — a mistyped tool name now fails config validation instead of being silently ignored. The eve peer range is bounded to the tested versions (`>=0.44.0 <0.48.0`).

- Updated dependencies [[`d5ea800`](https://github.com/vercel-labs/github-tools/commit/d5ea800436cd0f79a49378ccb5ec8873f5521a2e), [`09aeafb`](https://github.com/vercel-labs/github-tools/commit/09aeafb86c29db0cdfe4d616180f3720ad02a93b), [`c38cb9b`](https://github.com/vercel-labs/github-tools/commit/c38cb9bbf5a84caa6b4fc06944683bbd2e403271)]:
  - @github-tools/sdk@1.13.0

## 0.4.1

### Patch Changes

- [#110](https://github.com/vercel-labs/github-tools/pull/110) [`b57987f`](https://github.com/vercel-labs/github-tools/commit/b57987f6bb73f08f942baa25fd806ceef7e1ac80) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Register `toModelOutput` as a direct `defineTool` property so eve 0.44+ can stamp a durable descriptor. Agents on eve 0.46.1 no longer lose the whole GitHub toolset when a formatter like `getFileContent` fails descriptor validation. Requires `eve` `>=0.44.0`.

## 0.4.0

### Minor Changes

- [#98](https://github.com/vercel-labs/github-tools/pull/98) [`96059c2`](https://github.com/vercel-labs/github-tools/commit/96059c28492bdd3609253daa112c4d38bed46f18) Thanks [@ycarmel](https://github.com/ycarmel)! - Accept an async token provider in the extension's `token` config (`string | (() => Promise<string>)`), matching the SDK's `GithubTokenInput`. Agents authenticating with a GitHub App can pass their installation-token minter directly instead of falling back to the `@github-tools/sdk/eve-runtime` subpath.

### Patch Changes

- [#100](https://github.com/vercel-labs/github-tools/pull/100) [`0a9eae4`](https://github.com/vercel-labs/github-tools/commit/0a9eae4df8c431faa63aadad18112149aabab6f9) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Apply built-in eve `toModelOutput` formatters through an inline callback that only closes over the tool name. On eve 0.44.x this keeps tools like `getFileContent` from failing durable-descriptor validation and dropping the whole GitHub toolset.

- Updated dependencies [[`2edd9ea`](https://github.com/vercel-labs/github-tools/commit/2edd9ea9372c707808d2246965dfb57f8c8e08a1), [`0a9eae4`](https://github.com/vercel-labs/github-tools/commit/0a9eae4df8c431faa63aadad18112149aabab6f9), [`5bbcab1`](https://github.com/vercel-labs/github-tools/commit/5bbcab1e45ce86b8a2edd06a2d5a025ad8d255c5), [`584817c`](https://github.com/vercel-labs/github-tools/commit/584817c310adc11acb92a101e677d2343faf9c92), [`ade87da`](https://github.com/vercel-labs/github-tools/commit/ade87da57d9a9de4994ed2848244a9404f5c369e)]:
  - @github-tools/sdk@1.12.0

## 0.3.2

### Patch Changes

- [#77](https://github.com/vercel-labs/github-tools/pull/77) [`d2c65d3`](https://github.com/vercel-labs/github-tools/commit/d2c65d367e54e8e1bad99de78613d2c2dc3dcc51) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Fix eve durable tool registration so consumers can drop pnpm patches: rebuild options per execute (no module-level race), resolve tools on `step.started`, and omit the `approval` field for `false` / `'never'` instead of attaching `never()`. Also map `listIssueComments` in Connect tool scopes.

- Updated dependencies [[`d2c65d3`](https://github.com/vercel-labs/github-tools/commit/d2c65d367e54e8e1bad99de78613d2c2dc3dcc51)]:
  - @github-tools/sdk@1.11.1

## 0.3.1

### Patch Changes

- [#73](https://github.com/vercel-labs/github-tools/pull/73) [`538d3f3`](https://github.com/vercel-labs/github-tools/commit/538d3f3f9086b962811dfdec9915e6c17e0890e3) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Derive Connect scopes from the resolved `include` / `exclude` tool set instead of minting the full preset union (including `administration:write`) when `preset` is omitted.

- Updated dependencies [[`538d3f3`](https://github.com/vercel-labs/github-tools/commit/538d3f3f9086b962811dfdec9915e6c17e0890e3), [`c445040`](https://github.com/vercel-labs/github-tools/commit/c445040528b42bcc47ef2e27e11e090f8dcdbe8e), [`827e856`](https://github.com/vercel-labs/github-tools/commit/827e8567a2ac39f8ad3716555a0908f20b922893)]:
  - @github-tools/sdk@1.11.0

## 0.3.0

### Minor Changes

- [#61](https://github.com/vercel-labs/github-tools/pull/61) [`df53f0f`](https://github.com/vercel-labs/github-tools/commit/df53f0f9016d8d0b4ff8dea67f2ba26dccb5825f) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Make eve-extension tools durable across multi-turn Workflow replay (inline execute + serializable tool names, fixes [#51](https://github.com/vercel-labs/github-tools/issues/51)), add a `context` option to the extension config, and introduce `@github-tools/sdk/eve-runtime` for shared eve primitives used by the extension. Only the legacy `createGithubTools` / per-tool factories on `@github-tools/sdk/eve` (and `@github-tools/sdk/connect/eve`) stay deprecated for direct `agent/tools/` registration.

- [#67](https://github.com/vercel-labs/github-tools/pull/67) [`2937d88`](https://github.com/vercel-labs/github-tools/commit/2937d8832158f85c54e4f966006abfcc97f8454a) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add three focused presets: `discussion-moderator`, `notification-inbox`, and `pr-author`. Prefer a preset for most agents; use `maintainer` or omit `preset` when you need the full catalog. Docs and the agent skill lead with presets and the manager/sub-agents composition pattern.

### Patch Changes

- [#58](https://github.com/vercel-labs/github-tools/pull/58) [`a0df8d9`](https://github.com/vercel-labs/github-tools/commit/a0df8d96e73ff47d9dc828d2994b699e56819d11) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Make `getIssueContext` return `labelNames` (strings only), default to the full issue body (one-shot, no re-fetch), use fewer comments, slim the `issue-triage` preset (drop redundant `getIssue` / `listLabels`), and tighten agent presets so independent reads run in the same step.

- Updated dependencies [[`6887d70`](https://github.com/vercel-labs/github-tools/commit/6887d709b0d094a2925d0ce00993648bc64c05f4), [`df53f0f`](https://github.com/vercel-labs/github-tools/commit/df53f0f9016d8d0b4ff8dea67f2ba26dccb5825f), [`eb48422`](https://github.com/vercel-labs/github-tools/commit/eb484226c97e835343f543b90d303273aaf8f5ca), [`2937d88`](https://github.com/vercel-labs/github-tools/commit/2937d8832158f85c54e4f966006abfcc97f8454a), [`a0df8d9`](https://github.com/vercel-labs/github-tools/commit/a0df8d96e73ff47d9dc828d2994b699e56819d11), [`239f43d`](https://github.com/vercel-labs/github-tools/commit/239f43dac7ca1366ba03cad3e2b812f5dfe66e32)]:
  - @github-tools/sdk@1.10.0

## 0.2.0

### Minor Changes

- [#56](https://github.com/vercel-labs/github-tools/pull/56) [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add two presets: `security-audit` (read-only repository, PR, and CI exploration plus issue reporting — no destructive writes) and `release-manager` (releases, diffs, and CI status for cutting releases). Both come with tailored `createGithubAgent` system prompts and Vercel Connect scope mappings, and are available on the `githubExtension()` `preset` option.

- [`48da771`](https://github.com/vercel-labs/github-tools/commit/48da77108fc6dd44c3f5297c19e5607f4205fa19) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add composite context tools (`getPullRequestContext`, `getIssueContext`, `getReleaseContext`, `getCiFailureContext`), omit diff patches by default (`includePatch`), truncate bodies by default (`detail: summary`), support line ranges on `getFileContent`, and add a `context` option to default owner/repo/PR/issue/ref on tools and agents.

- [#53](https://github.com/vercel-labs/github-tools/pull/53) [`9f3eadd`](https://github.com/vercel-labs/github-tools/commit/9f3eadd85d93ae152b40a08d42f17f36c69f419d) Thanks [@HugoRCD](https://github.com/HugoRCD)! - The `connector` config field now also accepts a `() => string | Promise<string>` resolver, not just a static connector name, so a mounted extension can pick its Vercel Connect connector dynamically (e.g. per environment or tenant).

- [#55](https://github.com/vercel-labs/github-tools/pull/55) [`55fadcc`](https://github.com/vercel-labs/github-tools/commit/55fadcc39683aa77d60cade0a2bb3de4caf790c4) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Add `include` and `exclude` options for eve integrations. `include` adds tool names on top of a `preset` (union), or serves as the full set standalone; `exclude` removes tool names from the resolved `preset` + `include` set. Available on `EveGithubToolsOptions` (`buildEveToolMap`, `createGithubTools` from `@github-tools/sdk/eve`) and on the `githubExtension()` config schema.

### Patch Changes

- Updated dependencies [[`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7), [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7), [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7), [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7), [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7), [`304d0cf`](https://github.com/vercel-labs/github-tools/commit/304d0cfa366b17db6a9466e79e6172bc5bd743e7), [`48da771`](https://github.com/vercel-labs/github-tools/commit/48da77108fc6dd44c3f5297c19e5607f4205fa19), [`55fadcc`](https://github.com/vercel-labs/github-tools/commit/55fadcc39683aa77d60cade0a2bb3de4caf790c4), [`9f3eadd`](https://github.com/vercel-labs/github-tools/commit/9f3eadd85d93ae152b40a08d42f17f36c69f419d), [`55fadcc`](https://github.com/vercel-labs/github-tools/commit/55fadcc39683aa77d60cade0a2bb3de4caf790c4)]:
  - @github-tools/sdk@1.9.0

## 0.1.0

### Minor Changes

- [`2a34096`](https://github.com/vercel-labs/github-tools/commit/2a3409679981af7508fcee07d0e568376048c336) Thanks [@HugoRCD](https://github.com/HugoRCD)! - Publish `@github-tools/eve-extension` — a mountable [eve extension](https://eve.dev/docs/extensions) distribution for the GitHub tools, built on top of `@github-tools/sdk/eve`. Install with `pnpm add @github-tools/eve-extension` and mount it under `agent/extensions/`. See the package README and `examples/eve-extension-agent` for a runnable starter.

## 0.0.1

### Patch Changes

- Updated dependencies [[`9502941`](https://github.com/vercel-labs/github-tools/commit/9502941f0ff174a3122d156723dc238f686254df)]:
  - @github-tools/sdk@1.8.2
