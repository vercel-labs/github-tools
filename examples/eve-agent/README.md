# GitHub eve Agent

Minimal [eve](https://eve.dev) agent using `@github-tools/sdk/connect/eve` with the `maintainer` preset and a [Vercel Connect](https://vercel.com/docs/connect) connector.

## Setup

### 1. Link the Connect connector

The connector `github/test-github-tools` must be linked to your Vercel project and installed on the GitHub org/repos you want the agent to access.

### 2. Pull the OIDC token for local dev

```bash
pnpm install
cd examples/eve-agent
vercel link    # select the github-tools-docs project (or your linked project)
vercel env pull
```

This writes `VERCEL_OIDC_TOKEN` into `.env.local`. Re-run `vercel env pull` when the token expires.

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

Open the dev TUI and ask it to review a pull request on a repo your connector can access.

## Project structure

```
agent/
  agent.ts              # eve agent config
  instructions.md       # system prompt
  tools/github.ts       # GitHub tools via connectGithubTools()
```

## Customize

Swap the preset or configure approval:

```ts
import { connectGithubTools } from '@github-tools/sdk/connect/eve'

export default connectGithubTools('github/test-github-tools', {
  preset: ['code-review', 'issue-triage'],
  requireApproval: {
    mergePullRequest: true,
    addPullRequestComment: 'once',
  },
})
```

See the [@github-tools/sdk README](../../packages/github-tools/README.md#vercel-connect) for the full Connect integration guide.
