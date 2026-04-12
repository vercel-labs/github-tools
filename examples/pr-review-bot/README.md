# GitHub PR Review Bot

A durable PR review bot in **~60 lines of code**. Tag it on any pull request, and it analyzes the changes, posts a structured review, and responds to follow-ups — all crash-safe.

Built with:

- **[@github-tools/sdk](https://github-tools.com)** — 36 AI-callable GitHub tools (PRs, commits, issues, code search...)
- **[Chat SDK](https://chat-sdk.dev)** — multi-platform bot framework with the GitHub adapter
- **[Vercel Workflow](https://useworkflow.dev)** — durable execution that survives timeouts and restarts
- **[evlog](https://evlog.dev)** — AI observability (token usage, tool calls, cost, timing)

## How it works

```
@my-bot review this PR
        │
        ▼
   Chat SDK receives webhook
        │
        ▼
   👀 reaction added ──► starts durable workflow
        │
        ▼
   Agent reads PR (files, diffs, commits)
        │
        ▼
   Posts structured review comment
        │
        ▼
   Listens for follow-up messages
```

Each tool call is a **durable step** — if the server crashes mid-review, the workflow resumes from the last completed step.

## Setup

### 1. Environment variables

Copy `.env.example` to `.env`:

```bash
# GitHub PAT with repo scope (or fine-grained with Issues + PRs read/write)
GITHUB_TOKEN=ghp_...

# Must match your GitHub webhook config
GITHUB_WEBHOOK_SECRET=...

# Bot username — this is how @mentions are detected
GITHUB_BOT_USERNAME=my-review-bot
```

> **Important**: use a different GitHub account for the bot than the one commenting. The Chat SDK filters self-messages to prevent loops.

### 2. Configure a GitHub webhook

1. Go to your repository **Settings > Webhooks > Add webhook**
2. **Payload URL**: `https://your-domain.com/webhooks/github` (or tunnel URL for local dev)
3. **Content type**: `application/json`
4. **Secret**: same value as `GITHUB_WEBHOOK_SECRET`
5. **Events**: select _Issue comments_ and _Pull request review comments_

### 3. Install and run

```bash
pnpm install
pnpm dev
```

For local development, expose your server with a tunnel:

```bash
# Using cloudflared (recommended)
cloudflared tunnel --url http://localhost:3000

# Or ngrok
ngrok http 3000
```

Then update the webhook URL in your GitHub repository settings.

### 4. Try it

Open a PR and comment `@my-review-bot review this PR`.

## Project structure

```
server/
  lib/bot.ts                       # Chat instance + event handlers
  routes/webhooks/github.post.ts   # Webhook endpoint (5 lines)
  workflows/review.ts              # Durable agent workflow
review-template.md                 # Review output format
```

## Customizing

### Review format

Edit `review-template.md` to change how the bot formats its reviews. The template is injected into the agent's instructions.

### Preset

The bot uses the `code-review` preset which includes tools for reading PRs, files, commits, and posting reviews. Swap it for any preset:

| Preset | Tools included | Use case |
|--------|---------------|----------|
| `code-review` | PR files, diffs, blame, review comments | PR review bots |
| `issue-triage` | Issues, labels, comments | Issue management |
| `maintainer` | All read + write tools | Full repo management |
| `ci-ops` | Workflow runs, jobs, dispatch | CI/CD monitoring |
| `repo-explorer` | All read-only tools | Code exploration |

```ts
const agent = createGithubAgent({
  model: 'anthropic/claude-sonnet-4.6',
  preset: 'maintainer', // ← change preset
  requireApproval: false,
})
```

### Model

Replace the model string with any [AI Gateway](https://vercel.com/docs/ai-gateway) model:

```ts
model: 'openai/gpt-4.1'
model: 'google/gemini-2.5-pro'
model: 'anthropic/claude-sonnet-4.6'
```

### Adding platforms

The bot works on GitHub out of the box, but Chat SDK supports multiple platforms. Add adapters to `bot.ts`:

```ts
import { createSlackAdapter } from '@chat-adapter/slack'

const adapters = {
  github: createGitHubAdapter(),
  slack: createSlackAdapter(),
}
```

Your handlers (`onNewMention`, `onSubscribedMessage`) work across all platforms automatically. Add a webhook route for each platform.

### Production state

Replace in-memory state with Redis for persistent thread subscriptions across restarts:

```ts
import { createRedisState } from '@chat-adapter/state-redis'

const bot = new Chat({
  // ...
  state: createRedisState(),
})
```

### Observability

The bot logs every agent turn with [evlog](https://evlog.dev), including:

- Model, provider, and call count
- Token usage and estimated cost
- Tool calls with timing and inputs
- Step-by-step breakdown

Logs appear in the terminal by default. Add a [drain](https://evlog.dev/drains) to forward them to Axiom, Datadog, or any OTLP-compatible service.
