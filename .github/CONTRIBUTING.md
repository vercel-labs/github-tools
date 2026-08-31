# Contributing

Thanks for your interest in contributing to `@github-tools/sdk`.

## Setup

1. Fork and clone the repository
2. Install dependencies:

```sh
pnpm install
```

3. Set up a GitHub token for testing:

```sh
export GITHUB_TOKEN=github_pat_xxxxxxxxxxxx
```

## Development

This is a pnpm monorepo managed by Turborepo with three packages:

- `packages/github-tools` — the SDK (`@github-tools/sdk`)
- `apps/chat` — demo chat app
- `apps/docs` — documentation site

### Common commands

```sh
pnpm build              # Build all packages
pnpm lint               # Lint all packages
pnpm typecheck          # Type-check all packages
pnpm dev                # Run the chat app in dev mode
pnpm docs:dev           # Run the docs site in dev mode
```

### SDK-specific commands

```sh
pnpm --filter @github-tools/sdk build      # Build the SDK
pnpm --filter @github-tools/sdk lint       # Lint the SDK
pnpm --filter @github-tools/sdk typecheck  # Type-check the SDK
```

## Adding a new tool

Every tool splits into a **core** function (pure logic) and a **tool factory** (the `ai` SDK wrapper). See `getGistCore`/`getGist` (`packages/github-tools/src/core/gists.ts` / `src/tools/gists.ts`) for a read tool, `createIssue` (`src/tools/issues.ts`) for a write tool.

1. **Core logic** — add `{name}InputSchema` (zod, `.describe()` on every field), `{name}Description`, and `{name}Core({ token, ...args })` to `packages/github-tools/src/core/{domain}.ts`. Shape the return — never return the raw Octokit response. REST list tools return `pagedList(...)` (`{ items, hasMore, page, perPage, nextPage? }`); object-shaped lists add the same paging fields next to existing keys (`checkRuns`, `runs`, …).
2. **Tool factory** — add the `"use step"` wrapper and the exported factory to `packages/github-tools/src/tools/{domain}.ts`. Read tools take `(token)`; write tools also take `({ needsApproval = true }: ToolOptions = {})`.
3. **Register** (new domain? add a re-export in `packages/github-tools/src/core/index.ts` too):
   - `packages/github-tools/src/core/catalog.ts` — add one `GITHUB_TOOL_CATALOG` entry (JSDoc, `description`, `inputSchema`, `get core()`, `write: true` for write tools, `connectScopes`). `GITHUB_TOOL_NAMES`, `GITHUB_WRITE_TOOLS`, `TOOL_CONNECT_SCOPES`, and the eve registry are all derived from it — no separate registration
   - `packages/github-tools/src/index.ts` — add to `allTools` in `createGithubTools()` (compile-enforced by `satisfies AllGithubTools`), re-export the factory at the bottom (guarded by `src/index.test.ts`)
   - `packages/github-tools/src/core/presets.ts` — add to every preset it belongs in (update each preset's JSDoc tool list too)
   - `packages/github-tools/src/connect/scopes.ts` — only if a preset now needs a scope family it did not have: update `PRESET_CONNECT_SCOPES`
   - `packages/github-tools/src/agents.ts` — mention the tool in `PRESET_INSTRUCTIONS` for presets where it changes the agent's behavior
4. **Chat app metadata** — add a `GITHUB_TOOL_META` entry in `apps/chat/shared/utils/tools/github.ts`
5. **Documentation**:
   - `apps/docs/content/docs/5.api/1.tools-catalog.md`
   - `apps/docs/content/docs/4.guide/2.approval-control.md` (write tools only)
   - `apps/docs/content/docs/4.guide/1.presets.md` and `apps/docs/content/docs/4.guide/4.tokens-and-auth.md` if the tool changes a preset's tool list or scopes
   - `apps/docs/content/docs/4.guide/6.working-context.md` if the tool is a composite or changes default payload behavior (`detail`, `includePatch`, ranges)
   - `packages/github-tools/README.md` (tool tables, preset tables, write tools list, token permissions) — the root `README.md` is a symlink to this file, no separate edit needed
   - New preset? Add it to `packages/github-tools-eve-extension/extension/extension.ts`'s `presetNameSchema` enum too
6. **Changeset** — `pnpm changeset` (`minor`)
7. Run checks:

```sh
pnpm build && pnpm lint && pnpm typecheck && pnpm test
```

### eve extension durable callbacks

`packages/github-tools-eve-extension/extension/tools/github.ts` must set `execute`, `toModelOutput`, and `approval` as **direct** `defineTool` properties with inline functions. Spreading those keys, or passing `resolveEveApproval(...)` / `always()` as the property value, leaves them without a durable descriptor: on eve 0.44+ the resolver then drops every `github__*` tool. `test/durable-define-tool.test.ts` fails CI if that pattern returns.

## Pull requests

- Create a feature branch from `main`
- Keep PRs focused — one feature or fix per commit in the PR
- Add a [changeset](https://github.com/changesets/changesets) for any user-facing changes:

```sh
pnpm changeset
```

- Ensure `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass before submitting

## Commit conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new features or tools
- `fix:` — bug fixes
- `docs:` — documentation changes
- `chore:` — maintenance tasks, dependency updates

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
