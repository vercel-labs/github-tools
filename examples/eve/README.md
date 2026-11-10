# GitHub agent

A GitHub agent your team reaches in Slack and on GitHub. Mention it in a Slack channel, send it a direct message, or mention it on an issue or a pull request, to ask about pull requests, issues, CI runs and releases, or to make changes on GitHub. It's an [eve](https://eve.dev) agent that mounts [`@github-tools/eve-extension`](https://github-tools.com/integrations/eve), and it runs on Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fvercel-labs%2Fgithub-tools%2Ftree%2Fmain%2Fexamples%2Feve&project-name=github-agent&repository-name=github-agent)

## What you get

```text
agent/
  agent.ts               # model
  instructions.md        # system prompt
  channels/
    slack.ts             # Slack mentions, direct messages and approval buttons
    github.ts            # GitHub mentions, limited to people who can push
    eve.ts               # HTTP API for the terminal UI, closed to anonymous callers
  extensions/
    github.ts            # GitHub tools and approval
```

- **No stored tokens.** [Vercel Connect](https://vercel.com/docs/connect) holds the GitHub App and the Slack app. Each tool call gets a short-lived GitHub App token scoped to that tool.
- **Writes need approval.** With `requireApproval: 'auto'`, low-risk writes the person asked for (labels, reactions, comments, review replies) run directly. Every other write asks first, with **Approve** and **Deny** buttons in Slack and a comment to answer on GitHub. Only the person who asked can approve.
- **Strangers can't use it on GitHub.** A mention reaches the agent only when its author can push to the repository, so a stranger's comment on a public repository does nothing. A turn started on GitHub only gets tokens for the repository of its thread, so it can't read or change another repository the App is installed on.
- **Only the tools a request needs.** `preset: 'auto'` lists the tools the first message calls for and defers the rest.
- **Credentials stay out of GitHub.** A call whose input contains what looks like a token or a private key is blocked.
- **GitHub text is data.** HTML comments and invisible characters are removed from issue and pull request bodies, and the agent is told to act only on what the person asked.

Every call runs as the GitHub App, so in Slack anyone who can message the app can read what the App can read, and can approve their own writes. Install the App only on the repositories the agent works on, and see [Customize](#customize) to restrict it further.

## Before you start

- Node.js 24
- A Vercel account and the [Vercel CLI](https://vercel.com/docs/cli)
- A Slack workspace where you can install apps
- A GitHub organization or account where you can install a GitHub App

## Set up

1. Get the code. Use the **Deploy** button above and clone the repository it creates, or copy the folder:

   ```bash
   npx giget@latest gh:vercel-labs/github-tools/examples/eve github-agent
   cd github-agent
   pnpm install
   ```

   Commit the lockfile that `pnpm install` creates, so deployments keep the versions you tested.

2. Link a Vercel project. This also pulls `VERCEL_OIDC_TOKEN` into `.env.local`:

   ```bash
   npx eve link
   ```

3. Create the Slack app. The setup creates it through Vercel Connect, asks you to install it in your workspace, routes its events to `/eve/v1/slack`, and writes the connector name into `agent/channels/slack.ts`:

   ```bash
   npx eve add channel/slack
   ```

4. Create the GitHub connector, then attach it to the project with its webhooks routed to the agent:

   ```bash
   vercel connect create github --name github-agent
   vercel connect attach github/github-agent --triggers --trigger-path /eve/v1/github
   ```

   Install the connector's GitHub App on your organization or account, and pick the repositories the agent may work on. The App needs the permissions of the tools the agent may call, which [Permissions per preset](https://github-tools.com/auth#permissions-per-preset) lists.

5. Set `botName` in `agent/channels/github.ts` to the GitHub App's slug, the last part of its `github.com/apps/<slug>` URL. It's the name people mention. If you chose another connector name, set it in `agent/channels/github.ts` and `agent/extensions/github.ts`.

6. Deploy:

   ```bash
   npx eve deploy
   ```

7. Try it. In Slack, invite the app to a channel and mention it:

   ```text
   @github-agent which pull requests on my-org/my-repo are waiting for review?
   ```

   On GitHub, comment on a pull request with the name you set as `botName`:

   ```text
   @github-agent review this pull request
   ```

   The agent replies in the thread. Mention it again there to continue the conversation.

## Approve a write

In Slack, the agent posts **Approve** and **Deny** buttons in the thread.

On GitHub, it posts a comment that names the action. Answer by mentioning the agent in a reply:

```text
@github-agent Yes
```

## Run it locally

```bash
pnpm dev
```

This opens eve's terminal UI. When `VERCEL_OIDC_TOKEN` expires, run `vercel env pull` again. From the root of the github-tools repository, `pnpm dev:eve` does the same.

## Customize

Each change below is an option of `githubExtension` in `agent/extensions/github.ts`. The [eve integration guide](https://github-tools.com/integrations/eve) documents all of them.

Limit the agent to some repositories and branches, whoever asks and whoever approves:

```ts
guardrails: { repositories: ['my-org/*'], branches: ['agent/*'] },
```

See what the agent would do before it writes. Reads run as usual, and each write returns what it would have done:

```ts
dryRun: true,
```

Pin a preset instead of routing each session:

```ts
preset: 'code-review',
```

Make each Slack user act with their own GitHub access instead of the App's. This only suits an agent without the GitHub channel: a GitHub comment can't show a sign-in, so a turn started there stops at "Authorization required".

```ts
actAs: 'caller',
```

To answer Slack thread replies without a mention or change where approvals appear, see eve's [Slack channel](https://eve.dev/docs/channels/slack). To wake the agent on new issues, pull requests or failed CI, see eve's [GitHub channel](https://eve.dev/docs/channels/github).
