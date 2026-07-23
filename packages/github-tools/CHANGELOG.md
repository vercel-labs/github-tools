# @github-tools/sdk

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
