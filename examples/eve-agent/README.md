# GitHub eve Agent

Minimal [eve](https://eve.dev) agent using `@github-tools/sdk/eve` with the `maintainer` preset.

> **Temporary:** this example uses [Vercel Connect](https://vercel.com/docs/connect) (`github/test-github-tools`) instead of a `GITHUB_TOKEN` PAT. Revert `agent/tools/github.ts` to drop the `token` provider when you're done testing.

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
  tools/github.ts       # GitHub tools via createGithubTools() + Vercel Connect
```

## Customize

Swap the preset or configure approval:

```ts
export default createGithubTools({
  preset: ['code-review', 'issue-triage'],
  token: () => getToken('github/test-github-tools', {
    subject: { type: 'app' },
    scopes: ['contents:read', 'pull_requests:read'],
  }),
  requireApproval: {
    mergePullRequest: true,
    addPullRequestComment: 'once',
  },
})
```

See the [@github-tools/sdk README](../../packages/github-tools/README.md#eve) for the full eve integration guide.
