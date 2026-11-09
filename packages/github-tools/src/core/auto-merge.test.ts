import { afterEach, describe, expect, it, vi } from 'vitest'
import { disablePullRequestAutoMergeCore, enablePullRequestAutoMergeCore, getPullRequestCore } from './pull-requests'
import { getBranchRulesCore } from './repository'

function json(body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
}

const pull = { number: 12, node_id: 'PR_node', title: 'Fix retries', body: '', state: 'open', html_url: 'https://github.com/vercel/ai/pull/12', user: { login: 'octocat' }, head: { ref: 'fix', sha: 'abc' }, base: { ref: 'main' }, draft: false, merged: false, mergeable: true, mergeable_state: 'blocked', auto_merge: null, additions: 1, deletions: 1, changed_files: 1, created_at: '', updated_at: '', merged_at: null }

function stubGithub(graphqlData: unknown) {
  const requests: Array<{ route: string, body?: unknown }> = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const url = new URL(String(input))
    const route = `${init?.method ?? 'GET'} ${url.pathname}`
    requests.push({ route, body: init?.body ? JSON.parse(String(init.body)) : undefined })
    if (route === 'GET /repos/vercel/ai/pulls/12') return json(pull)
    if (route === 'POST /graphql') return json({ data: graphqlData })
    if (route === 'GET /repos/vercel/ai/rules/branches/main') return json([
      { type: 'pull_request', ruleset_source: 'vercel/ai', parameters: { required_approving_review_count: 1 } },
      { type: 'deletion', ruleset_source: 'vercel/ai' },
    ])
    if (route === 'GET /repos/vercel/ai/branches/main') return json({ name: 'main', protected: true, protection: { required_status_checks: { contexts: ['ci / test'] } } })
    return new Response(JSON.stringify({ message: `Unexpected ${route}` }), { status: 500 })
  }))
  return requests
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('auto-merge', () => {
  it('enables auto-merge on the pull request node with the merge method and co-author trailers', async () => {
    const requests = stubGithub({ enablePullRequestAutoMerge: { pullRequest: { number: 12, url: pull.html_url, autoMergeRequest: { enabledAt: '2026-01-01T00:00:00Z', mergeMethod: 'SQUASH' } } } })
    const result = await enablePullRequestAutoMergeCore({ token: 'test', owner: 'vercel', repo: 'ai', pullNumber: 12, mergeMethod: 'squash', coAuthors: [{ name: 'Bot', email: 'bot@example.com' }] })
    expect(result).toMatchObject({ number: 12, autoMerge: { enabledAt: '2026-01-01T00:00:00Z', mergeMethod: 'squash' } })
    const { variables } = requests.find(request => request.route === 'POST /graphql')!.body as { variables: Record<string, unknown> }
    expect(variables).toMatchObject({ pullRequestId: 'PR_node', mergeMethod: 'SQUASH' })
    expect(variables.commitBody).toContain('Co-authored-by: Bot <bot@example.com>')
  })

  it('disables auto-merge', async () => {
    const requests = stubGithub({ disablePullRequestAutoMerge: { pullRequest: { number: 12, url: pull.html_url, autoMergeRequest: null } } })
    await expect(disablePullRequestAutoMergeCore({ token: 'test', owner: 'vercel', repo: 'ai', pullNumber: 12 })).resolves.toMatchObject({ number: 12, autoMerge: null })
    expect((requests.find(request => request.route === 'POST /graphql')!.body as { variables: unknown }).variables).toEqual({ pullRequestId: 'PR_node' })
  })

  it('reports why a pull request cannot merge yet', async () => {
    stubGithub({})
    await expect(getPullRequestCore({ token: 'test', owner: 'vercel', repo: 'ai', pullNumber: 12 })).resolves.toMatchObject({ mergeable: true, mergeableState: 'blocked', autoMerge: null })
    await expect(getBranchRulesCore({ token: 'test', owner: 'vercel', repo: 'ai', branch: 'main' })).resolves.toMatchObject({
      branch: 'main',
      protected: true,
      requiredStatusChecks: ['ci / test'],
      rules: [
        { type: 'pull_request', source: 'vercel/ai', parameters: { required_approving_review_count: 1 } },
        { type: 'deletion', source: 'vercel/ai' },
      ],
    })
  })
})
