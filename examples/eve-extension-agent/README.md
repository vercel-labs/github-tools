# GitHub eve Extension Agent

Minimal [eve](https://eve.dev) agent mounting `@github-tools/eve-extension` with the
`code-review` preset and a [Vercel Connect](https://vercel.com/docs/connect) connector.

## Setup

### 1. Link the Connect connector

The connector `github/test-github-tools` must be linked to your Vercel project and installed on
the GitHub org/repos you want the agent to access.

### 2. Pull the OIDC token for local dev

```bash
pnpm install
cd examples/eve-extension-agent
vercel link    # select the github-tools-docs project (or your linked project)
vercel env pull
```

This writes `VERCEL_OIDC_TOKEN` into `.env`. Re-run `vercel env pull` when the token expires.

Requires Node 24+ and `ai` v7 (peer of `eve` v0.19+).

## Run

From the example directory:

```bash
pnpm dev
# or: npx eve dev
```

From the monorepo root:

```bash
pnpm dev:eve-extension-agent
```

## Project structure

```
agent/
  agent.ts               # eve agent config
  instructions.md        # system prompt
  extensions/
    github.ts            # GitHub tools via @github-tools/eve-extension
```

## Customize

Swap the preset or configure approval:

```ts
import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  connector: 'github/test-github-tools',
  preset: ['code-review', 'issue-triage'],
  requireApproval: {
    mergePullRequest: true,
    addPullRequestComment: 'once',
  },
})
```

See the [@github-tools/eve-extension README](../../packages/github-tools-eve-extension/README.md).
