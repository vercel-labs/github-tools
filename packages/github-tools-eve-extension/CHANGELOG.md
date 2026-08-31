# @github-tools/eve-extension

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
