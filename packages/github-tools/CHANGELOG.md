# @github-tools/sdk

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
