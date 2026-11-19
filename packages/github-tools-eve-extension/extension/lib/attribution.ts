import { resolveGithubConnector } from '@github-tools/sdk/connect'
import {
  DEFAULT_GITHUB_FOOTER,
  fillGithubFooter,
  GITHUB_COMMIT_TOOLS,
  githubAppBot,
  githubAppFooterValues,
  githubFooterTokens,
  githubLogin,
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

async function footerText(footer: GithubExtensionAttribution['footer'], bot: GithubAppBot, token: string, channel: string): Promise<string> {
  if (typeof footer === 'function') return footer(bot)
  const template = typeof footer === 'string' ? footer : DEFAULT_GITHUB_FOOTER
  // The requester costs a GitHub call, so it is read only for a template that names them.
  const requester = githubFooterTokens(template).includes('requester') ? `@${await githubLogin(token)}` : undefined
  return fillGithubFooter(template, { ...githubAppFooterValues(bot), channel: channel.replace(/^channel:/, ''), ...(requester && { requester }) })
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
  channel: string,
): Promise<{ args: Record<string, unknown>, options: EveGithubToolsOptions }> {
  const { footer, coAuthor } = credits()
  const pullRequest = name === 'editFiles' ? args.pullRequest as PullRequestInput | undefined : undefined
  const addFooter = footer !== false && (name === 'createPullRequest' || pullRequest !== undefined)
  const addCoAuthor = coAuthor && GITHUB_COMMIT_TOOLS.has(name)
  if (!addFooter && !addCoAuthor) return { args, options: { ...options, token } }
  const bot = await appBot(token)
  const line = addFooter ? await footerText(footer, bot, token, channel) : undefined
  const credit = (body: string | undefined) => withGithubAppFooter(body, bot, line)
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
