# @github-tools/sdk

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
