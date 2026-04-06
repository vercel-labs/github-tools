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

1. Add the tool function to the appropriate file in `packages/github-tools/src/tools/`. Follow the existing pattern:
   - Separate step function with `"use step"` directive
   - Tool factory that accepts `token: string` (and `ToolOptions` for write tools)
   - Zod schema with `.describe()` on every field
   - Shaped return objects (no raw API responses)

2. Register the tool in `packages/github-tools/src/index.ts`:
   - Add to imports
   - Add write tool names to `GithubWriteToolName` (if applicable)
   - Add to relevant preset arrays in `PRESET_TOOLS`
   - Add to `allTools` in `createGithubTools()`
   - Add to re-exports at the bottom

3. Update the chat app metadata in `apps/chat/shared/utils/tools/github.ts`

4. Update documentation:
   - `apps/docs/content/docs/3.api/1.tools-catalog.md`
   - `apps/docs/content/docs/2.guide/3.approval-control.md` (for write tools)
   - `packages/github-tools/README.md` (tool tables, preset tables, write tools list, token permissions)

5. Run checks:

```sh
pnpm build && pnpm lint && pnpm typecheck
```

## Pull requests

- Create a feature branch from `main`
- Keep PRs focused — one feature or fix per commit in the PR
- Add a [changeset](https://github.com/changesets/changesets) for any user-facing changes:

```sh
pnpm changeset
```

- Ensure `pnpm build`, `pnpm lint`, and `pnpm typecheck` all pass before submitting

## Commit conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new features or tools
- `fix:` — bug fixes
- `docs:` — documentation changes
- `chore:` — maintenance tasks, dependency updates

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
