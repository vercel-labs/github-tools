# GitHub eve Extension Agent

Minimal [eve](https://eve.dev) agent mounting `@github-tools/eve-extension` with the
`code-review` preset and a [Vercel Connect](https://vercel.com/docs/connect) connector.

## Setup

### 1. Link the Connect connector

The connector `github/test-github-tools` must be linked to your Vercel project and installed on
the GitHub org/repos you want the agent to access.

For GitHub @mentions / webhooks, attach the Connect trigger to eve's GitHub route (not the
default Connect path):

```bash
vercel connect attach github/test-github-tools --triggers --trigger-path /eve/v1/github --yes
```

Set `botName` in `agent/channels/github.ts` to the GitHub App slug people `@mention`.

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
  channels/
    eve.ts               # HTTP API (TUI / curl / frontend) + OIDC auth
    github.ts            # inbound GitHub (@mentions / webhooks)
  extensions/
    github.ts            # GitHub API tools via @github-tools/eve-extension
```

The **channels** are how clients reach the agent (HTTP or GitHub). The **extension** is how the
agent calls the GitHub API. GitHub turns only dispatch when the comment `@mention`s `botName`.

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
