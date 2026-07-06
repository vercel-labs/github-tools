# GitHub eve Agent

Minimal [eve](https://eve.dev) agent using `@github-tools/sdk/eve` with the `code-review` preset.

## Setup

```bash
pnpm install
cp .env.example .env
# set GITHUB_TOKEN in .env
```

Requires `ai` v7 (peer of `eve` v0.19+) and Node 24+.

## Run

From the example directory:

```bash
pnpm dev
# or: npx eve dev
```

From the monorepo root:

```bash
pnpm dev:eve-agent
```

Open the dev TUI and ask it to review a pull request on a repo your token can access.

## Project structure

```
agent/
  agent.ts              # eve agent config
  instructions.md       # system prompt
  tools/github.ts       # all GitHub tools via createGithubTools()
```

## Customize

Swap the preset or configure approval:

```ts
export default createGithubTools({
  preset: ['code-review', 'issue-triage'],
  requireApproval: {
    mergePullRequest: true,
    addPullRequestComment: 'once',
  },
})
```

See the [@github-tools/sdk README](../../packages/github-tools/README.md#eve) for the full eve integration guide.
