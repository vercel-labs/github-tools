import { resolveGithubConnector } from '@github-tools/sdk/connect'
import {
  GITHUB_COMMIT_TOOLS,
  githubAppBot,
  githubAppBotIdentity,
  withGithubAppFooter,
  type EveGithubToolsOptions,
  type GithubAppBot,
  type GithubToolName,
} from '@github-tools/sdk/eve-runtime'
import extension from '../extension'

// The App behind a connector never changes, so each process reads its bot once.
const bots = new Map<string, Promise<GithubAppBot>>()

async function appBot(token: string): Promise<GithubAppBot> {
  const connector = await resolveGithubConnector(extension.config.connector!)
  const cached = bots.get(connector)
  if (cached) return cached
  const bot = githubAppBot(token)
  bots.set(connector, bot)
  bot.catch(() => bots.delete(connector))
  return bot
}

function credits() {
  const { attribution = true } = extension.config
  if (typeof attribution === 'boolean') return { footer: attribution, coAuthor: attribution }
  return { footer: attribution.footer ?? true, coAuthor: attribution.coAuthor ?? true }
}

/**
 * The input and options of a call that runs with a person's `token`, with the App credited as
 * `attribution` asks: a footer on a new pull request, a co-author on a commit.
 */
export async function withAttribution(
  name: GithubToolName,
  args: Record<string, unknown>,
  options: EveGithubToolsOptions,
  token: string,
): Promise<{ args: Record<string, unknown>, options: EveGithubToolsOptions }> {
  const { footer, coAuthor } = credits()
  const addFooter = footer && name === 'createPullRequest'
  const addCoAuthor = coAuthor && GITHUB_COMMIT_TOOLS.has(name)
  if (!addFooter && !addCoAuthor) return { args, options: { ...options, token } }
  const bot = await appBot(token)
  return {
    args: addFooter ? { ...args, body: withGithubAppFooter(args.body as string | undefined, bot) } : args,
    options: {
      ...options,
      token,
      ...(addCoAuthor && { coAuthors: [...options.coAuthors ?? [], githubAppBotIdentity(bot)] }),
    },
  }
}
