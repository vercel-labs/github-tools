import { createHmac } from 'node:crypto'
import { once } from 'node:events'
import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { startGithubEmulator, type GithubEmulator } from './emulator'
import { documentKey } from './supplement/graphql'

let github: GithubEmulator

// Over HTTP, as the agent calls the emulator, so the request log sees it.
async function api(login: string | undefined, method: string, path: string, body?: unknown, token = login && github.tokenFor(login)) {
  const response = await fetch(`${github.url}${path}`, {
    method,
    headers: { ...token ? { authorization: `Bearer ${token}` } : {}, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await response.text()
  return { status: response.status, body: text ? JSON.parse(text) : undefined }
}

const graphql = (login: string, query: string, variables: Record<string, unknown>) => api(login, 'POST', '/graphql', { query, variables })
const issue = (login: string) => github.request<{ number: number }>(login, 'POST', '/repos/acme/web/issues', { title: 'Crash on save' })

beforeAll(async () => {
  github = await startGithubEmulator({
    repositories: { 'acme/web': { labels: ['bug'] }, 'acme/secret': { private: true }, 'erin/dotfiles': {} },
    people: { alice: { role: 'write' }, tara: { role: 'triage' }, bob: { role: 'read' }, mallory: {}, erin: {} },
  })
})

beforeEach(() => github.reset())

afterAll(() => github.close())

describe('the role guard', () => {
  it('answers 401 to a token GitHub doesn\'t know, and to one that was revoked', async () => {
    expect((await api(undefined, 'GET', '/repos/acme/web', undefined, 'ghp_unknown')).status).toBe(401)
    github.registerToken('ghu_alice_1', 'alice')
    expect((await api(undefined, 'GET', '/repos/acme/web', undefined, 'ghu_alice_1')).status).toBe(200)
    github.revokeToken('ghu_alice_1')
    expect((await api(undefined, 'GET', '/repos/acme/web', undefined, 'ghu_alice_1')).status).toBe(401)
    expect((await api(undefined, 'GET', '/repos/acme/web')).status).toBe(200)
  })

  it('lets anyone who can read open an issue and comment, and needs Triage to label', async () => {
    const { number } = await issue('mallory')
    const label = (login: string) => api(login, 'POST', `/repos/acme/web/issues/${number}/labels`, { labels: ['bug'] })
    expect((await api('bob', 'POST', `/repos/acme/web/issues/${number}/comments`, { body: 'Same here.' })).status).toBe(201)
    expect([(await label('mallory')).status, (await label('bob')).status, (await label('tara')).status, (await label('alice')).status]).toEqual([403, 403, 200, 200])
  })

  it('needs Write to merge and to manage labels, which Triage doesn\'t give', async () => {
    const create = (login: string) => api(login, 'POST', '/repos/acme/web/labels', { name: `label-${login}`, color: 'ededed' })
    expect([(await create('bob')).status, (await create('tara')).status, (await create('alice')).status]).toEqual([403, 403, 201])
  })

  // What GitHub ignores from a person without Triage: its labels, assignees, and milestone.
  const triaged = async (number: number) => {
    const { body } = await api('alice', 'GET', `/repos/acme/web/issues/${number}`)
    return { labels: body.labels.map((label: { name: string }) => label.name), assignees: body.assignees.map((user: { login: string }) => user.login), milestone: body.milestone?.number ?? null }
  }

  it('lets an author edit and close their own issue, and refuses someone else below Triage', async () => {
    const { number } = await issue('bob')
    const patch = (login: string, body: unknown) => api(login, 'PATCH', `/repos/acme/web/issues/${number}`, body)
    expect((await patch('bob', { title: 'Crash on save, with a trace' })).status).toBe(200)
    expect((await patch('mallory', { state: 'closed' })).status).toBe(403)
    expect((await patch('mallory', { labels: ['bug'] })).status).toBe(403)
    expect((await patch('bob', { state: 'closed' })).body.state).toBe('closed')
  })

  it('accepts an issue from a person without Triage and drops its labels, assignees, and milestone, as GitHub does', async () => {
    const { number: milestone } = await github.request<{ number: number }>('alice', 'POST', '/repos/acme/web/milestones', { title: 'v1' })
    const fields = { labels: ['bug'], assignees: ['alice'], milestone }
    const create = (login: string) => api(login, 'POST', '/repos/acme/web/issues', { title: 'Crash on save', ...fields })

    const byReader = await create('bob')
    expect([byReader.status, byReader.body.title, await triaged(byReader.body.number)]).toEqual([201, 'Crash on save', { labels: [], assignees: [], milestone: null }])
    const byTriager = await create('tara')
    expect([byTriager.status, await triaged(byTriager.body.number)]).toEqual([201, fields])

    // An author's update goes through, without the fields they may not set.
    const updated = await api('bob', 'PATCH', `/repos/acme/web/issues/${byReader.body.number}`, { title: 'Crash on save, with a trace', ...fields })
    expect([updated.status, updated.body.title, await triaged(byReader.body.number)]).toEqual([200, 'Crash on save, with a trace', { labels: [], assignees: [], milestone: null }])
    const cleared = await api('bob', 'PATCH', `/repos/acme/web/issues/${byTriager.body.number}`, { labels: [], assignees: [], milestone: null })
    expect([cleared.status, await triaged(byTriager.body.number)]).toEqual([403, fields])
  })

  it('answers a person without Triage who assigns with success, and assigns nobody', async () => {
    const { number } = await issue('bob')
    const assign = (login: string, method: string) => api(login, method, `/repos/acme/web/issues/${number}/assignees`, { assignees: ['alice'] })
    // emulate answers 200 to everyone here, where GitHub answers 201.
    expect([(await assign('bob', 'POST')).status, (await triaged(number)).assignees]).toEqual([200, []])
    expect([(await assign('tara', 'POST')).status, (await triaged(number)).assignees]).toEqual([200, ['alice']])
    expect([(await assign('bob', 'DELETE')).status, (await triaged(number)).assignees]).toEqual([200, ['alice']])
    expect([(await assign('tara', 'DELETE')).status, (await triaged(number)).assignees]).toEqual([200, []])
  })

  it('lets an author edit their own comment, and needs Write for someone else\'s', async () => {
    const { number } = await issue('bob')
    const { id } = await github.request<{ id: number }>('bob', 'POST', `/repos/acme/web/issues/${number}/comments`, { body: 'First.' })
    const edit = (login: string) => api(login, 'PATCH', `/repos/acme/web/issues/comments/${id}`, { body: 'Edited.' })
    expect([(await edit('bob')).status, (await edit('tara')).status, (await edit('alice')).status]).toEqual([200, 403, 200])
  })

  it('reports the same roles it enforces, as GitHub names them', async () => {
    const role = async (repo: string, login: string) => {
      const { body } = await api('alice', 'GET', `/repos/${repo}/collaborators/${login}/permission`)
      return `${body.permission}/${body.role_name}`
    }
    expect(await Promise.all(['alice', 'tara', 'bob', 'mallory'].map(login => role('acme/web', login)))).toEqual(['write/write', 'read/triage', 'read/read', 'read/read'])
    expect(await role('acme/secret', 'mallory')).toBe('none/none')
    // A user's own repository: erin is its admin, and the people with a role keep it there.
    expect([await role('erin/dotfiles', 'erin'), await role('erin/dotfiles', 'alice')]).toEqual(['admin/admin', 'write/write'])
  })

  it('checks an installation token\'s permissions on a route the supplement adds', async () => {
    const { number } = await issue('bob')
    const narrowed = await github.mintInstallationToken({ permissions: { issues: 'read', metadata: 'read' } })
    const full = await github.mintInstallationToken()
    const react = (token: string) => api(undefined, 'POST', `/repos/acme/web/issues/${number}/reactions`, { content: 'eyes' }, token)
    expect((await react(narrowed.token!)).status).toBe(403)
    const reaction = await react(full.token!)
    expect([reaction.status, reaction.body.user.login]).toEqual([201, `${github.githubApp.slug}[bot]`])
  })
})

describe('the emulator', () => {
  it('logs each request over HTTP with who made it, and none of its own', async () => {
    const { number } = await issue('bob')
    await api('bob', 'POST', `/repos/acme/web/issues/${number}/labels`, { labels: ['bug'] })
    await api(undefined, 'GET', '/repos/acme/web')
    expect(github.requests).toEqual([
      { method: 'POST', path: `/repos/acme/web/issues/${number}/labels`, status: 403, actor: 'bob' },
      { method: 'GET', path: '/repos/acme/web', status: 200, actor: 'anonymous' },
    ])
  })

  it('answers no request a web page sends from another origin', async () => {
    const from = (origin: string, init: RequestInit = {}) => fetch(`${github.url}/repos/acme/web`, { ...init, headers: { ...init.headers, origin } })
    expect((await from('https://evil.example')).status).toBe(403)
    expect((await from('null')).status).toBe(403)
    // A browser asks before a request with an Authorization header, and reads the answer's CORS headers.
    const preflight = await from('https://evil.example', { method: 'OPTIONS', headers: { 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization' } })
    expect([preflight.status, preflight.headers.get('access-control-allow-origin')]).toEqual([403, null])
    expect((await from(github.url)).status).toBe(200)
  })

  it('gives each person a token that differs on every run', async () => {
    expect((await api(undefined, 'GET', '/repos/acme/web', undefined, 'ghp_alice')).status).toBe(401)
    expect((await api(undefined, 'GET', '/repos/acme/web', undefined, `ghp_${github.admin}`)).status).toBe(401)
    const other = await startGithubEmulator({ repositories: { 'acme/web': {} }, people: { alice: {} } })
    const tokens = [github.tokenFor('alice'), other.tokenFor('alice'), github.tokenFor(github.admin)]
    await other.close()
    expect(new Set(tokens).size).toBe(3)
    // The same token after a reset, since the agent may hold it.
    await github.reset()
    expect(github.tokenFor('alice')).toBe(tokens[0])
  })

  it('goes back to the seeded state on reset', async () => {
    await issue('bob')
    await github.reset()
    expect((await api('alice', 'GET', '/repos/acme/web/issues')).body).toEqual([])
    expect((await api('alice', 'GET', '/repos/acme/web/labels')).body.map((label: { name: string }) => label.name)).toEqual(['bug'])
    expect((await api('bob', 'POST', '/repos/acme/web/labels', { name: 'docs' })).status).toBe(403)
  })

  it('signs a webhook and names the pull request in an issue_comment payload', async () => {
    const received: Array<{ event: string, signature: string, body: string }> = []
    const read = (request: IncomingMessage) => new Promise<string>((resolve) => {
      let body = ''
      request.on('data', chunk => body += chunk).on('end', () => resolve(body))
    })
    const receiver = createServer(async (request, response) => {
      received.push({ event: String(request.headers['x-github-event']), signature: String(request.headers['x-hub-signature-256']), body: await read(request) })
      response.end()
    }).listen(0, '127.0.0.1')
    await once(receiver, 'listening')
    const url = `http://127.0.0.1:${(receiver.address() as AddressInfo).port}`
    await github.request(github.admin, 'POST', '/repos/acme/web/hooks', { config: { url, content_type: 'json', secret: github.githubApp.webhookSecret }, events: ['issue_comment'] })

    const { object } = await github.request<{ object: { sha: string } }>('alice', 'GET', '/repos/acme/web/git/ref/heads/main')
    await github.request('alice', 'POST', '/repos/acme/web/git/refs', { ref: 'refs/heads/fix', sha: object.sha })
    await github.request('alice', 'PUT', '/repos/acme/web/contents/fix.txt', { message: 'Fix', content: Buffer.from('fix\n').toString('base64'), branch: 'fix' })
    const pull = await github.request<{ number: number }>('alice', 'POST', '/repos/acme/web/pulls', { title: 'Fix', head: 'fix', base: 'main' })
    await github.request('alice', 'POST', `/repos/acme/web/issues/${pull.number}/comments`, { body: 'Ready.' })
    await expect.poll(() => received.length).toBe(1)
    receiver.close()

    const [{ event, signature, body }] = received as [typeof received[number]]
    const payload = JSON.parse(body)
    expect(event).toBe('issue_comment')
    expect(signature).toBe(`sha256=${createHmac('sha256', github.githubApp.webhookSecret).update(body).digest('hex')}`)
    expect(payload.issue.pull_request.url).toBe(`${github.url}/repos/acme/web/pulls/${pull.number}`)
    expect(payload.installation.id).toBe(github.githubApp.installations.acme)
  })
})

describe('the GraphQL handler', () => {
  it('names a document by its root field, with or without an operation name', () => {
    expect(documentKey('mutation($pullRequestId: ID!) { convertPullRequestToDraft(input: { pullRequestId: $pullRequestId }) { pullRequest { id } } }')).toBe('convertPullRequestToDraft')
    expect(documentKey('query ReviewThreads($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $number) { reviewThreads(first: 1) { totalCount } } } }')).toBe('repository.pullRequest.reviewThreads')
    expect(documentKey('query ($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { discussionCategories(first: 100) { nodes { id } } } }')).toBe('repository.discussionCategories')
  })

  it('answers a document it doesn\'t know with an error that says so, and records it', async () => {
    const { status, body } = await graphql('alice', 'query { viewer { login } }', {})
    expect(status).toBe(200)
    expect(body.errors[0]).toMatchObject({ type: 'EMULATOR_UNSUPPORTED', message: expect.stringContaining('query { viewer { login } }') })
    expect(github.unknownDocuments).toEqual(['query { viewer { login } }'])
  })

  it('lets the author of a pull request change its draft state, and needs Write from anyone else', async () => {
    // alice pushes the branch, and bob, who has Read, opens the pull request from it.
    const { object } = await github.request<{ object: { sha: string } }>('alice', 'GET', '/repos/acme/web/git/ref/heads/main')
    await github.request('alice', 'POST', '/repos/acme/web/git/refs', { ref: 'refs/heads/draft', sha: object.sha })
    await github.request('alice', 'PUT', '/repos/acme/web/contents/draft.txt', { message: 'Draft', content: Buffer.from('draft\n').toString('base64'), branch: 'draft' })
    const pull = await github.request<{ number: number, node_id: string }>('bob', 'POST', '/repos/acme/web/pulls', { title: 'Draft', head: 'draft', base: 'main' })
    const setDraft = (login: string, mutation: string) => graphql(login, `mutation($pullRequestId: ID!) { ${mutation}(input: { pullRequestId: $pullRequestId }) { pullRequest { id } } }`, { pullRequestId: pull.node_id })
    const draft = async () => (await api('alice', 'GET', `/repos/acme/web/pulls/${pull.number}`)).body.draft

    expect((await setDraft('tara', 'convertPullRequestToDraft')).body.errors[0].type).toBe('FORBIDDEN')
    expect(await draft()).toBe(false)
    expect((await setDraft('bob', 'convertPullRequestToDraft')).body.data.convertPullRequestToDraft.pullRequest.id).toBe(pull.node_id)
    expect(await draft()).toBe(true)
    expect((await setDraft('alice', 'markPullRequestReadyForReview')).body.errors).toBeUndefined()
    expect(await draft()).toBe(false)
  })

  it('blames each line on the commit that introduced it', async () => {
    const put = async (content: string, message: string, sha?: string) => {
      const { content: file, commit } = await github.request<{ content: { sha: string }, commit: { sha: string } }>('alice', 'PUT', '/repos/acme/web/contents/notes.md', { message, content: Buffer.from(content).toString('base64'), sha })
      return { blob: file.sha, commit: commit.sha }
    }
    const first = await put('one\ntwo\nthree\n', 'Add notes')
    const second = await put('one\nTWO\nthree\nfour\n', 'Change two, add four', first.blob)
    const { body } = await graphql('bob', 'query ($owner: String!, $name: String!, $expression: String!, $path: String!) { repository(owner: $owner, name: $name) { object(expression: $expression) { ... on Commit { oid blame(path: $path) { ranges { startingLine } } } } } }', { owner: 'acme', name: 'web', expression: 'main', path: 'notes.md' })
    const { oid, blame } = body.data.repository.object
    expect(oid).toBe(second.commit)
    expect(blame.ranges.map((range: { startingLine: number, endingLine: number, commit: { oid: string, messageHeadline: string } }) => [range.startingLine, range.endingLine, range.commit.messageHeadline])).toEqual([
      [1, 1, 'Add notes'],
      [2, 2, 'Change two, add four'],
      [3, 3, 'Add notes'],
      [4, 4, 'Change two, add four'],
    ])
  })
})
