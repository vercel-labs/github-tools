import type { GitHubRepo } from '@emulators/github'
import type { SupplementContext } from './context.js'
import type { NotifyingPayload } from './notifications.js'

type Dispatch = SupplementContext['webhooks']['dispatch']

/**
 * Wraps the dispatcher after emulate has wrapped it, the way emulate adds `installation`, to fix
 * two payloads. emulate's `issue_comment` payload for a comment on a pull request has no
 * `issue.pull_request`, and without it eve's GitHub channel takes the thread for an issue and
 * loads no pull request context. Some payloads also lack their `action`.
 */
export function fixWebhookPayloads({ gh, webhooks, baseUrl }: SupplementContext, observe: (event: string, payload: NotifyingPayload, repo: GitHubRepo) => void): void {
  const dispatch: Dispatch = webhooks.dispatch.bind(webhooks)
  webhooks.dispatch = async (event, action, payload, owner, repo) => {
    const repository = repo === undefined ? undefined : gh.repos.findOneBy('full_name', `${owner}/${repo}`)
    const issue = (payload as { issue?: { number: number, pull_request?: unknown } } | null)?.issue
    const pull = event === 'issue_comment' && repository && issue && !issue.pull_request
      ? gh.pullRequests.findBy('repo_id', repository.id).find(candidate => candidate.number === issue.number)
      : undefined
    const amended = pull && repository
      ? {
          ...payload as object,
          issue: {
            ...issue,
            pull_request: {
              url: `${baseUrl}/repos/${repository.full_name}/pulls/${pull.number}`,
              html_url: `${baseUrl}/${repository.full_name}/pull/${pull.number}`,
              diff_url: `${baseUrl}/${repository.full_name}/pull/${pull.number}.diff`,
              patch_url: `${baseUrl}/${repository.full_name}/pull/${pull.number}.patch`,
              merged_at: pull.merged_at,
            },
          },
        }
      : payload
    // emulate passes the action beside some payloads, such as `workflow_run`, and GitHub puts it in every one.
    const complete = action && amended && typeof amended === 'object' && !('action' in amended) ? { ...amended, action } : amended
    if (repository && complete && typeof complete === 'object') observe(event, complete, repository)
    await dispatch(event, action, complete, owner, repo)
  }
}
