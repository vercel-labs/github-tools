# @github-tools/eve-extension

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
