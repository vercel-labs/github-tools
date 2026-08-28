## Overview

`@github-tools/sdk` wraps GitHub's REST API as 79 AI SDK-compatible tools for agents and `generateText`/`streamText` calls — with presets, approval control, and integrations for eve, Vercel Workflow, and Chat SDK. Docs: [github-tools.com](https://github-tools.com).

## Commands

```sh
pnpm build              # Build all packages (turbo)
pnpm lint               # Lint all packages
pnpm typecheck          # Type-check all packages
pnpm test               # SDK vitest + eve-extension durable-callback guard
pnpm dev                # Run the chat app in dev mode
pnpm docs:dev           # Run the docs site in dev mode

# SDK-specific
pnpm --filter @github-tools/sdk build
pnpm --filter @github-tools/sdk lint
pnpm --filter @github-tools/sdk typecheck
pnpm --filter @github-tools/sdk test

# Release
pnpm changeset          # Create a changeset for user-facing changes
pnpm version-packages   # Apply changesets
pnpm release            # Build SDK + publish
```

Verify changes with `pnpm build && pnpm lint && pnpm typecheck && pnpm test`. The SDK has vitest (`packages/github-tools/**/*.test.ts`). The eve extension has an AST guard (`packages/github-tools-eve-extension/test/durable-define-tool.test.ts`) that fails CI if `execute` / `toModelOutput` / `approval` are spread or not inline on `defineTool`.

## Monorepo Structure

pnpm workspaces + Turborepo. Three packages:

- **`packages/github-tools`** — the SDK (`@github-tools/sdk`), published to npm. Built with `tsdown` to ESM (`.mjs`/`.d.mts`).
- **`apps/chat`** — Nuxt 4 demo app with NuxtHub (SQLite + blob), GitHub OAuth, dual-mode agent (standard `ToolLoopAgent` vs durable `WorkflowAgent`).
- **`apps/docs`** — Nuxt 4 docs site built on Docus. Also publishes a consumer-facing Agent Skill at `apps/docs/skills/github-tools-agents/` (served via `/.well-known/skills/`, see `apps/docs/content/docs/1.getting-started/4.agent-skills.md`).

Turbo task dependencies: `lint`, `lint:fix`, `typecheck`, and `test` all depend on `^build` (upstream packages must build first).

## SDK Architecture (`packages/github-tools`)

### Tool Pattern

Every tool splits into a **core** function and a **tool factory**. This split is critical to maintain when adding tools:

```ts
// src/core/{domain}.ts — pure logic, no "use step", no approval concerns
export const myToolInputSchema = z.object({ /* .describe() on every field */ })
export const myToolDescription = 'One sentence, present tense.'
export async function myToolCore({ token, ...args }: { token: string /* ... */ }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.someEndpoint(...)
  return shapedResult // Always shape the return — never return raw API responses
}

// src/tools/{domain}.ts — the "use step" directive + ai SDK wrapper
async function myToolStep(args: Parameters<typeof myToolCore>[0]) {
  "use step" // required for Vercel Workflow durable steps
  return myToolCore(args)
}

// Read tools take (token). Write tools also take ToolOptions for needsApproval.
export const myTool = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: myToolDescription,
    needsApproval, // write tools only
    inputSchema: myToolInputSchema,
    execute: async args => myToolStep({ token: await resolveGithubToken(token), ...args }),
  })
```

**Adding a new tool?** Follow the checklist in [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md#adding-a-new-tool) — registration files, chat metadata, docs, changeset.

### Key source files

- `src/index.ts` — public API: `createGithubTools()`, `allTools` composition, re-exports
- `src/agents.ts` — `createGithubAgent()` (`ToolLoopAgent`) with preset-specific system prompts
- `src/workflow.ts` — `createDurableGithubAgent()` (`WorkflowAgent` from `@ai-sdk/workflow`), exported from `@github-tools/sdk/workflow` subpath
- `src/eve-runtime.ts` — shared eve primitives for `@github-tools/eve-extension` (`listEveToolDescriptors`, `executeGithubEveTool`, approval helpers); public export `@github-tools/sdk/eve-runtime`
- `src/eve.ts` — deprecated consumer `createGithubTools` / per-tool factories for `agent/tools/` (`@github-tools/sdk/eve`)
- `src/client.ts` — `createOctokit(token)` wrapper
- `src/types.ts` — `ToolOptions`, `CommitToolOptions`, `ToolOverrides`, `GithubTool`
- `src/tools/` — domain files (the `ai` SDK wrapper layer): `repository.ts`, `pull-requests.ts`, `issues.ts`, `reactions.ts`, `discussions.ts`, `notifications.ts`, `commits.ts`, `gists.ts`, `workflows.ts`, `search.ts`, `checks.ts`, `releases.ts`, `bundles.ts`
- `src/core/` — matching domain files (pure logic: schema, description, `*Core` function) plus `tool-names.ts` (`GITHUB_TOOL_NAMES`/`GithubToolName`), `write-tools.ts` (`GITHUB_WRITE_TOOLS`/`GithubWriteToolName`), `presets.ts` (`PRESET_TOOLS`), `token.ts` (`resolveGithubToken`), `approval.ts` (`resolveAiSdkApproval`)

### Dual-Mode Agents

- **Standard**: `createGithubAgent()` → `ToolLoopAgent` — supports `requireApproval` for human-in-the-loop
- **Durable**: `createDurableGithubAgent()` → `WorkflowAgent` — crash-safe, retryable; `requireApproval` pauses the workflow until the user responds

### Tool Overrides

`createGithubTools` accepts an `overrides` option for per-tool customization (description, title, needsApproval, etc.) without changing the tool's implementation. `execute`, `inputSchema`, and `outputSchema` cannot be overridden. The `ToolOverrides` type is re-exported for consumers.

### Presets

Ten presets (`code-review`, `issue-triage`, `repo-explorer`, `ci-ops`, `security-audit`, `release-manager`, `discussion-moderator`, `notification-inbox`, `pr-author`, `maintainer`) defined in `src/core/presets.ts` as tool name arrays, with matching system prompts in `src/agents.ts`. Composable via arrays.

## eve extension durable callbacks (`packages/github-tools-eve-extension`)

On eve 0.44+, a missing durable descriptor on **any** dynamic-tool callback (`execute`, `toModelOutput`, `approval` / `approvalRequest`) discards the **entire** GitHub toolset. In `extension/tools/github.ts`, those three must be **direct** `defineTool` properties with inline functions (or identifiers). Conditional spreads and call expressions (`resolveEveApproval(...)`, `always()`) are invisible to eve's stamp. Callbacks may only close over a serializable tool `name` and re-read config via `buildSessionOptions()`. CI enforces this via `test/durable-define-tool.test.ts`. A scheduled canary (`.github/workflows/eve-canary.yml`) additionally builds and tests against `eve@latest` daily to catch upstream drift the static guard cannot see.

## Chat App Architecture (`apps/chat`)

- **Frontend**: Vue 3 + `@nuxt/ui`. Chat pages at `app/pages/chat/[id].vue` with tool invocation rendering and approval UI.
- **Backend**: Nitro server routes under `server/api/`. Standard chat at `server/api/chats/[id].post.ts`, durable chat at `server/api/workflow/chats/[id].post.ts`.
- **Database**: Drizzle ORM with SQLite (`@libsql/client`). Schema in `server/db/schema.ts` — `users`, `chats`, `messages` tables.
- **Auth**: GitHub OAuth via `nuxt-auth-utils`, stores `githubToken` in secure session.
- **AI routing**: Uses `@ai-sdk/gateway` for unified model routing. Model selected per-session via cookie.

## Conventions

- **TypeScript**: Strict mode, ESNext target, `verbatimModuleSyntax: true`
- **ESLint**: `typescript-eslint` flat config for SDK; `@nuxt/eslint` with stylistic rules for apps (no trailing commas, 1tbs brace style)
- **Peer deps**: `ai` and `zod` are peer deps of the SDK; `workflow` and `@workflow/ai` are optional peer deps for the workflow subpath; `@github-tools/eve-extension` requires `eve` `>=0.44`

### Code style — no slop

- **No gratuitous defensive code.** Don't add try/catch, null checks, or input validation the surrounding file doesn't have — especially on paths already validated upstream. Match the file's level of paranoia.
- **No silent fallbacks.** No empty `catch`, no `?? default` that masks a bug, no `as any` to silence TypeScript. If something can fail, let it fail loudly or handle it explicitly.
- **Comments are rare and earn their place.** Only for constraints the code can't express. Never paraphrase the code, never narrate a change.
- **This extends to all prose**: test names, error/log messages, changeset descriptions, PR bodies. Factual and plain — no emoji, no superlatives, no filler.
- **No speculative code.** No unrequested options or parameters, no "just in case" branches, no keeping the old code path alongside the new one.
- **Shape every API response.** Never return a raw Octokit response from a tool's `*Core` function — pick the fields the model actually needs.

### Changesets

**Every user-facing change to `@github-tools/sdk` or `@github-tools/eve-extension` must include a changeset.** Before opening a PR for features, bug fixes, or breaking changes, run `pnpm changeset` and commit the generated `.changeset/*.md` file alongside the code.

- **When to add one:** any change that affects the public API, adds a tool or preset, fixes a bug, or introduces a breaking change.
- **When you can skip:** changes confined to `apps/*` or `examples/*` (docs included), CI config, or internal refactors that don't touch the published packages.
- **Bump type:** `patch` for fixes, `minor` for features (new tools, new presets), `major` for breaking changes.
- **Description:** write from the consumer's perspective — what changed and how to use it.

On merge to `main`, `changesets/action` opens or updates the "Version Packages" PR; merging that publishes to npm and creates one GitHub release per package (tag `{name}@{version}`). `scripts/release-notes.mjs` then rewrites each release body from the PRs that actually touched that package's directory, grouped by the categories in `.github/release.yml` — see the script's header comment for why.

### Commits & PR titles

PR titles and commits follow [Conventional Commits](https://conventionalcommits.org). The CI source of truth is `.github/workflows/semantic-pull-request.yml` (lints PR titles via `amannn/action-semantic-pull-request`); `.github/pull_request_template.md` mirrors the same lists for contributors.

- **Subject must not start with an uppercase letter.** `feat: add stream server` ✓ — `feat: Add stream server` ✗.
- **Current scopes**: `chat`, `deps`, `docs`, `eve`, `sdk`. Individual tools/presets don't get their own scope — they use `sdk`.
- **When you add a new scope**, register it in **both** the workflow and the template, alphabetically sorted. The check reads the scope list from the PR's base branch (`pull_request_target`), so a brand-new scope can't validate the PR that introduces it — register it in a preceding PR, or omit the scope on the introducing PR.

### Keep the published skill in sync

`apps/docs/skills/github-tools-agents/SKILL.md` is published to consumers via `/.well-known/skills/`. When a change affects what it documents — tools, presets, approval control, agent setup — update it in the same PR. A skill describing stale behavior is worse than no skill.

### Docs site: package manager tabs

Any install or CLI command in `apps/docs/content/**/*.md` that a reader would run in their own project must show all four package managers, wrapped in a `:::code-group` (see `apps/docs/content/docs/1.getting-started/2.installation.md` for the canonical pattern):

````md
:::code-group
```bash [pnpm]
pnpm add @github-tools/sdk
```
```bash [npm]
npm install @github-tools/sdk
```
```bash [yarn]
yarn add @github-tools/sdk
```
```bash [bun]
bun add @github-tools/sdk
```
:::
````

This applies to every `pnpm add`/`pnpm install` in the docs site, including peer dependencies and framework-specific installs (eve extension, Vercel Connect, Workflow, Chat SDK). It does not apply to single, package-manager-agnostic commands (`npx eve dev`, `npx skills add ...`) or to `packages/github-tools/README.md` and the agent skill under `apps/docs/skills/`, which stay `pnpm`-only for brevity (npm's README renderer and Agent Skills consumed by an LLM don't support tabs).

## Definition of Done

A task is complete when **all** of the following pass:

1. `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` exit 0
2. New tools follow the full checklist in [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md#adding-a-new-tool)
3. A changeset is included for any user-facing change (`pnpm changeset`)
4. New public APIs have JSDoc
5. Docs are updated when behavior, tools, or paths change (`apps/docs/content/`, `packages/github-tools/README.md`)

## Boundaries

**Always do:**
- Run `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` before reporting done
- Follow existing code patterns — read neighboring files (and the matching `core/`/`tools/` pair) before writing new ones
- Add a changeset (`pnpm changeset`) for every user-facing change

**Ask first:**
- Adding new dependencies — `pnpm-workspace.yaml` sets `minimumReleaseAge: 2880`: a package published less than 48h ago fails to install unless added to `minimumReleaseAgeExclude`
- Changing package exports, the tool factory pattern, or approval defaults for an existing write tool
- Architectural decisions that affect multiple packages or presets

**Never:**
- Commit secrets, `.env` files, `GITHUB_TOKEN`, or API keys
- Skip lint, typecheck, or test to "fix later"
- Widen a type (`as any`) or drop a `.describe()` to silence an error — fix the underlying issue
- Return a raw, unshaped API response from a tool
- Modify `node_modules/` or generated files (`dist/`, `.nuxt/`, `.output/`)
- Open a PR for a user-facing change without a changeset

## Git & PRs — local always OK, remote on explicit instruction

Default: anything that stays on the local clone is fine, anything that touches the remote or GitHub requires an explicit instruction in the task at hand. Never act on assumption — if the maintainer didn't ask for a push or a PR, prepare the branch locally and stop there.

**OK (local-only, no ask needed):**
- `git branch`, `git checkout`, `git switch`, `git checkout -b` — create and move between branches freely
- `git add`, `git commit` — staging and local commits are fine
- `git status`, `git diff`, `git log`, `git show`, `git stash`, `git restore`, `git reset` (local only)
- `gh pr view`, `gh pr list`, `gh pr diff`, `gh issue view`, `gh run view` — read-only GitHub queries

**OK when the maintainer explicitly asks (in the current task):**
- `git push -u origin <feature-branch>` — push a feature branch you just prepared
- `gh pr create --base main --head <feature-branch>` — open a PR
- Write a **PR title** (Conventional Commits, see above) and a **PR body** — keep the body factual, mirror the changeset, reference the issue (`Closes #X`)

**Never (no exceptions, even when asked):**
- Push directly to `main` — protected, always goes through a PR
- `git push --force` without `--with-lease`, `git push --tags`
- `gh pr merge`, `gh pr close`, `gh pr review`, `gh issue create`, `gh issue edit`, `gh release create`
- Add a `Co-authored-by`, `Signed-off-by`, "Generated with…", "🤖", or any signature/attribution that names an agent, model, or tool

## When Stuck

- Unsure about the tool pattern or a touchpoint → read `.github/CONTRIBUTING.md` or ask
- Unclear requirements → ask a clarifying question before making large speculative changes

## Feedback & Self-Maintenance

**This file is living documentation — keep it true.** If you catch it contradicting the repo (a command that doesn't exist, a path that moved, a described pattern that isn't real), flag it immediately and propose the fix, even if it's unrelated to your task. Update it when you encounter a recurring mistake, explicit guidance from the maintainer, or a new convention that should be applied consistently. A correction is a few lines, not a rewrite — keep this file lean.
