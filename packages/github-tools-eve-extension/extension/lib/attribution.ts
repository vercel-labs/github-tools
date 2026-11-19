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
import extension, { type GithubExtensionAttribution } from '../extension'

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

function credits(): { footer: NonNullable<GithubExtensionAttribution['footer']>, coAuthor: boolean } {
  const { attribution = true } = extension.config
  if (typeof attribution === 'boolean') return { footer: attribution, coAuthor: attribution }
  return { footer: attribution.footer ?? true, coAuthor: attribution.coAuthor ?? true }
}

function footerText(footer: GithubExtensionAttribution['footer'], bot: GithubAppBot): string | undefined {
  if (typeof footer === 'function') return footer(bot)
  return typeof footer === 'string' ? footer : undefined
}

type PullRequestInput = { title: string, body?: string, draft?: boolean }

/**
 * The input and options of a call that runs with a person's `token`, with the App credited as
 * `attribution` asks: a footer on a new pull request, from `createPullRequest` or from
 * `editFiles` with `pullRequest`, and a co-author on a commit.
 */
export async function withAttribution(
  name: GithubToolName,
  args: Record<string, unknown>,
  options: EveGithubToolsOptions,
  token: string,
): Promise<{ args: Record<string, unknown>, options: EveGithubToolsOptions }> {
  const { footer, coAuthor } = credits()
  const pullRequest = name === 'editFiles' ? args.pullRequest as PullRequestInput | undefined : undefined
  const addFooter = footer !== false && (name === 'createPullRequest' || pullRequest !== undefined)
  const addCoAuthor = coAuthor && GITHUB_COMMIT_TOOLS.has(name)
  if (!addFooter && !addCoAuthor) return { args, options: { ...options, token } }
  const bot = await appBot(token)
  const credit = (body: string | undefined) => withGithubAppFooter(body, bot, footerText(footer, bot))
  return {
    args: !addFooter
      ? args
      : pullRequest
        ? { ...args, pullRequest: { ...pullRequest, body: credit(pullRequest.body) } }
        : { ...args, body: credit(args.body as string | undefined) },
    options: {
      ...options,
      token,
      ...(addCoAuthor && { coAuthors: [...options.coAuthors ?? [], githubAppBotIdentity(bot)] }),
    },
  }
}
