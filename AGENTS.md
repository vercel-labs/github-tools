## Overview

`@github-tools/sdk` wraps GitHub's REST API as 36 AI SDK-compatible tools for agents and `generateText`/`streamText` calls. The tools cover repositories, branches, pull requests, issues, commits, search, gists, and workflows, with built-in approval control for write operations.

## Commands

```sh
pnpm build              # Build all packages (turbo)
pnpm lint               # Lint all packages
pnpm typecheck          # Type-check all packages
pnpm dev                # Run the chat app in dev mode
pnpm docs:dev           # Run the docs site in dev mode

# SDK-specific
pnpm --filter @github-tools/sdk build
pnpm --filter @github-tools/sdk lint
pnpm --filter @github-tools/sdk typecheck

# Release
pnpm changeset          # Create a changeset for user-facing changes
pnpm version-packages   # Apply changesets
pnpm release            # Build SDK + publish
```

There is no test suite. Verify changes with `pnpm build && pnpm lint && pnpm typecheck`.

## Monorepo Structure

pnpm workspaces + Turborepo. Three packages:

- **`packages/github-tools`** — the SDK (`@github-tools/sdk`), published to npm. Built with `tsdown` to ESM (`.mjs`/`.d.mts`).
- **`apps/chat`** — Nuxt 4 demo app with NuxtHub (SQLite + blob), GitHub OAuth, dual-mode agent (standard `ToolLoopAgent` vs durable `DurableAgent`).
- **`apps/docs`** — Nuxt 4 docs site built on Docus.

Turbo task dependencies: `lint`, `lint:fix`, and `typecheck` all depend on `^build` (upstream packages must build first).

## SDK Architecture (`packages/github-tools`)

### Tool Pattern

Every tool follows the same factory pattern. This is critical to maintain when adding tools:

```ts
// 1. Named step function with "use step" directive (required for Vercel Workflow durable steps)
async function myToolStep({ token, ...args }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.someEndpoint(...)
  return shapedResult  // Always shape the return — never return raw API responses
}

// 2. Tool factory: read tools take (token), write tools take (token, options: ToolOptions)
export const myTool = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: '...',
    needsApproval,  // only on write tools
    inputSchema: z.object({ /* .describe() on every field */ }),
    execute: async args => myToolStep({ token, ...args }),
  })
```

### Key source files

- `src/index.ts` — public API: `createGithubTools()`, all re-exports
- `src/presets.ts` — tool name lists (`GITHUB_TOOL_NAMES`, `GITHUB_WRITE_TOOL_NAMES`), `PRESET_TOOLS`, preset/tool name types. Must stay free of runtime imports — the CLI bundles it
- `src/agents.ts` — `createGithubAgent()` (`ToolLoopAgent`) with preset-specific system prompts
- `src/workflow.ts` — `createDurableGithubAgent()` (`DurableAgent`), exported from `@github-tools/sdk/workflow` subpath
- `src/eve.ts` — `toEveTool()` adapter + `githubToken()` helper for the Eve framework, exported from `@github-tools/sdk/eve` subpath
- `src/cli.ts` — `github-tools eve` scaffold CLI (generates Eve `agent/tools/*.ts` files), built to `dist/cli.mjs` (the package `bin`)
- `src/client.ts` — `createOctokit(token)` wrapper
- `src/tools/` — 7 domain files: `repository.ts`, `pull-requests.ts`, `issues.ts`, `commits.ts`, `gists.ts`, `workflows.ts`, `search.ts`

### Adding a New Tool

1. Add the tool in the appropriate `src/tools/*.ts` file following the pattern above
2. Register in `src/presets.ts` (`GITHUB_TOOL_NAMES`, `GITHUB_WRITE_TOOL_NAMES` if write, `PRESET_TOOLS`) and `src/index.ts` (imports, `createGithubTools()` `allTools`, re-exports)
3. Add display metadata in `apps/chat/shared/utils/tools/github.ts` (`GITHUB_TOOL_META`)
4. Update docs: `apps/docs/content/docs/3.api/1.tools-catalog.md`, approval docs (for write tools), `packages/github-tools/README.md`

### Dual-Mode Agents

- **Standard**: `createGithubAgent()` → `ToolLoopAgent` — supports `requireApproval` for human-in-the-loop
- **Durable**: `createDurableGithubAgent()` → `DurableAgent` — crash-safe, retryable; `requireApproval` is accepted but currently ignored

### Tool Overrides

`createGithubTools` accepts an `overrides` option for per-tool customization (description, title, needsApproval, etc.) without changing the tool's implementation. `execute`, `inputSchema`, and `outputSchema` cannot be overridden. The `ToolOverrides` type is re-exported for consumers.

### Presets

Five presets (`code-review`, `issue-triage`, `repo-explorer`, `ci-ops`, `maintainer`) defined in `src/index.ts` as tool name arrays, with matching system prompts in `src/agents.ts`. Composable via arrays.

## Chat App Architecture (`apps/chat`)

- **Frontend**: Vue 3 + `@nuxt/ui`. Chat pages at `app/pages/chat/[id].vue` with tool invocation rendering and approval UI.
- **Backend**: Nitro server routes under `server/api/`. Standard chat at `server/api/chats/[id].post.ts`, durable chat at `server/api/workflow/chats/[id].post.ts`.
- **Database**: Drizzle ORM with SQLite (`@libsql/client`). Schema in `server/db/schema.ts` — `users`, `chats`, `messages` tables.
- **Auth**: GitHub OAuth via `nuxt-auth-utils`, stores `githubToken` in secure session.
- **AI routing**: Uses `@ai-sdk/gateway` for unified model routing. Model selected per-session via cookie.

## Conventions

- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **PRs**: One feature or fix per commit, create from `main`, include a changeset for user-facing changes
- **TypeScript**: Strict mode, ESNext target, `verbatimModuleSyntax: true`
- **ESLint**: `typescript-eslint` flat config for SDK; `@nuxt/eslint` with stylistic rules for apps (no trailing commas, 1tbs brace style)
- **Peer deps**: `ai` and `zod` are peer deps of the SDK; `workflow` and `@workflow/ai` are optional peer deps for the workflow subpath; `eve` is an optional peer dep for the eve subpath
