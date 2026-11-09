import extension, { type GithubExtensionContext } from '../extension'

type SessionAuth = { readonly authenticator?: string, readonly attributes?: Readonly<Record<string, string | readonly string[]>> } | null | undefined

/**
 * The extension's `context`, with the fields it leaves out filled from the GitHub channel's thread:
 * the repository, and the issue or pull request number. Other channels add nothing.
 */
export function sessionContext(auth: SessionAuth): GithubExtensionContext | undefined {
  const configured = extension.config.context
  if (auth?.authenticator !== 'github-webhook') return configured
  const { repository, issue_number: issue, pull_request_number: pull } = auth.attributes ?? {}
  const [owner, repo] = typeof repository === 'string' ? repository.split('/') : []
  if (!owner || !repo) return configured
  const pullNumber = Number(pull) || undefined
  // A pull request is also an issue, so issue tools such as addIssueComment work on its thread.
  const issueNumber = Number(issue) || pullNumber
  return { owner, repo, ...(pullNumber && { pullNumber }), ...(issueNumber && { issueNumber }), ...configured }
}
