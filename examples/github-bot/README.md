# Durable GitHub Bot

A durable PR review bot in **~80 lines of code**. Combines four primitives:

- **[@github-tools/sdk](https://github-tools.com)** — 36 AI-callable GitHub tools (PRs, commits, issues, code search...)
- **[Chat SDK](https://chat-sdk.dev)** — multi-platform bot framework, here with the GitHub adapter
- **[Vercel Workflow](https://vercel.com/docs/workflow)** — durable execution that survives timeouts and restarts
- **[evlog](https://evlog.dev)** — AI observability (token usage, tool calls, cost, timing)

## How it works

1. A developer **@mentions** the bot on a PR or issue
2. Chat SDK receives the webhook, subscribes to the thread, and **starts a durable workflow**
3. The workflow runs an AI agent with the `code-review` preset — it reads PR files, commits, diffs, and blame using GitHub tools
4. Each tool call is a **durable step** (crash-safe, retryable)
5. The agent posts its review back to the thread
6. Follow-up messages **resume** the same workflow via hooks — no state is lost

## Setup

### 1. Environment variables

Copy `.env.example` to `.env` and fill in:

```bash
# GitHub PAT with `repo` scope
GITHUB_TOKEN=ghp_...

# Must match your GitHub webhook config
GITHUB_WEBHOOK_SECRET=...

# Bot username for @mention detection
GITHUB_BOT_USERNAME=my-review-bot
```

### 2. Configure a GitHub webhook

1. Go to your repository **Settings > Webhooks > Add webhook**
2. **Payload URL**: `https://your-domain.com/webhooks/github` (or your tunnel URL for local dev)
3. **Content type**: `application/json`
4. **Secret**: same value as `GITHUB_WEBHOOK_SECRET`
5. **Events**: select _Issue comments_ and _Pull request review comments_

### 3. Install and run

```bash
pnpm install
pnpm dev
```

For local development, expose your server with a tunnel (e.g. `ngrok http 3000`) and update the webhook URL.

### 4. Try it

Open a PR and comment `@my-review-bot review this PR`. The bot will analyze the changes and post a review.

## Project structure

```
server/
  lib/bot.ts                    # Chat SDK instance + event handlers
  routes/webhooks/github.post.ts # Webhook endpoint
  workflows/review.ts            # Durable agent workflow + evlog observability
```

## Customization

**Change the preset** — swap `code-review` for `maintainer`, `issue-triage`, `ci-ops`, or `repo-explorer` in `review.ts`.

**Change the model** — replace `anthropic/claude-sonnet-4.6` with any AI Gateway model string.

**Add a platform** — install another Chat SDK adapter (e.g. `@chat-adapter/slack`) and add it to the `adapters` object in `bot.ts`. Your handlers work across all platforms.

**Production state** — replace `createMemoryState()` with `createRedisState()` from `@chat-adapter/state-redis` for persistent thread subscriptions.
