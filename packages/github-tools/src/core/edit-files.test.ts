import { afterEach, describe, expect, it, vi } from 'vitest'
import { editFilesCore } from './repository'

const README = '# github-tools\n\nA typed tool layer for GitHub AI agents.\n'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const GUIDE = '# Guide\n\nSet `foo` to enable it.\n'

function stubGithub({ branchExists = false, openPulls = [] }: { branchExists?: boolean, openPulls?: unknown[] } = {}) {
  const requests: Array<{ method: string, path: string, ref?: string | null, body?: unknown }> = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const url = new URL(decodeURIComponent(String(input)))
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    requests.push({ method, path: url.pathname, ref: url.searchParams.get('ref'), body })
    const route = `${method} ${url.pathname}`
    if (route === 'GET /repos/vercel/ai') return json({ default_branch: 'main' })
    if (route === 'GET /repos/vercel/ai/git/ref/heads/docs/wording') return branchExists ? json({ object: { sha: 'branch-sha' } }) : json({ message: 'Not Found' }, 404)
    if (route === 'GET /repos/vercel/ai/git/ref/heads/main') return json({ object: { sha: 'main-sha' } })
    if (route === 'GET /repos/vercel/ai/contents/README.md') return json({ type: 'file', path: 'README.md', sha: 'readme-sha', content: Buffer.from(README).toString('base64') })
    if (route === 'GET /repos/vercel/ai/contents/docs/guide.md') return json({ type: 'file', path: 'docs/guide.md', sha: 'guide-sha', content: Buffer.from(GUIDE).toString('base64') })
    if (route === 'GET /repos/vercel/ai/pulls') return json(openPulls)
    if (route === 'POST /repos/vercel/ai/git/refs') return json({ ref: 'refs/heads/docs/wording' }, 201)
    if (route === 'POST /graphql') return json({ data: { createCommitOnBranch: { commit: { oid: 'commit-sha', url: 'https://github.com/vercel/ai/commit/commit-sha' } } } })
    if (route === 'PUT /repos/vercel/ai/contents/README.md') return json({ content: { path: 'README.md', sha: 'new-sha' }, commit: { sha: 'rest-commit', html_url: 'https://github.com/vercel/ai/commit/rest-commit' } })
    if (route === 'POST /repos/vercel/ai/pulls') return json({ number: 7, title: body.title, html_url: 'https://github.com/vercel/ai/pull/7', draft: false }, 201)
    return json({ message: `Unexpected ${route}` }, 500)
  }))
  return requests
}

const args = {
  token: 'test',
  owner: 'vercel',
  repo: 'ai',
  branch: 'docs/wording',
  message: 'docs: reword the opening paragraph',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('editFiles', () => {
  it('creates the branch, replaces the text in one signed commit, and opens the pull request', async () => {
    const requests = stubGithub()
    const result = await editFilesCore({
      ...args,
      edits: [{ path: 'README.md', find: 'A typed tool layer', replace: 'A typed toolkit' }],
      pullRequest: { title: 'docs: reword the opening paragraph', draft: false },
    })
    expect(result).toEqual({
      branch: 'docs/wording',
      baseBranch: 'main',
      createdBranch: true,
      files: [{ path: 'README.md', replacements: 1 }],
      commits: [{ sha: 'commit-sha', url: 'https://github.com/vercel/ai/commit/commit-sha' }],
      pullRequest: { number: 7, title: 'docs: reword the opening paragraph', url: 'https://github.com/vercel/ai/pull/7', draft: false, existing: false },
    })
    const commit = requests.find(request => request.path === '/graphql')!.body as { variables: { input: { expectedHeadOid: string, fileChanges: { additions: Array<{ contents: string }> } } } }
    expect(commit.variables.input.expectedHeadOid).toBe('main-sha')
    expect(Buffer.from(commit.variables.input.fileChanges.additions[0]!.contents, 'base64').toString()).toBe(README.replace('A typed tool layer', 'A typed toolkit'))
    expect(requests.map(request => `${request.method} ${request.path}`).filter(route => !route.startsWith('GET'))).toEqual([
      'POST /repos/vercel/ai/git/refs',
      'POST /graphql',
      'POST /repos/vercel/ai/pulls',
    ])
  })

  it('commits edits to several files, and several edits to one file, in one commit', async () => {
    const requests = stubGithub()
    const result = await editFilesCore({
      ...args,
      edits: [
        { path: 'README.md', find: 'A typed tool layer', replace: 'A typed toolkit' },
        { path: 'docs/guide.md', find: 'Set `foo`', replace: 'Set `bar`' },
        { path: 'README.md', find: 'GitHub AI agents', replace: 'GitHub agents' },
        { path: 'docs/new.md', content: '# New\n' },
      ],
      pullRequest: { title: 'Rename foo', draft: false },
    })
    expect(result.files).toEqual([
      { path: 'README.md', replacements: 2 },
      { path: 'docs/guide.md', replacements: 1 },
      { path: 'docs/new.md', replacements: 0 },
    ])
    const commits = requests.filter(request => request.path === '/graphql')
    expect(commits).toHaveLength(1)
    const additions = (commits[0]!.body as { variables: { input: { fileChanges: { additions: Array<{ path: string, contents: string }> } } } }).variables.input.fileChanges.additions
    expect(additions.map(({ path, contents }) => [path, Buffer.from(contents, 'base64').toString()])).toEqual([
      ['README.md', '# github-tools\n\nA typed toolkit for GitHub agents.\n'],
      ['docs/guide.md', '# Guide\n\nSet `bar` to enable it.\n'],
      ['docs/new.md', '# New\n'],
    ])
    expect(requests.filter(request => request.method === 'POST' && request.path === '/repos/vercel/ai/pulls')).toHaveLength(1)
  })

  it('returns the open pull request of an existing branch instead of opening another', async () => {
    const requests = stubGithub({ branchExists: true, openPulls: [{ number: 3, title: 'Rename foo', html_url: 'https://github.com/vercel/ai/pull/3', draft: false }] })
    const result = await editFilesCore({ ...args, edits: [{ path: 'README.md', find: 'A typed tool layer', replace: 'A typed toolkit' }], pullRequest: { title: 'Rename foo again', draft: false } })
    expect(result.pullRequest).toEqual({ number: 3, title: 'Rename foo', url: 'https://github.com/vercel/ai/pull/3', draft: false, existing: true })
    expect(requests.find(request => request.method === 'GET' && request.path === '/repos/vercel/ai/pulls')).toBeDefined()
    expect(requests.some(request => request.method === 'POST' && request.path === '/repos/vercel/ai/pulls')).toBe(false)
  })

  it('opens a pull request for an existing branch that has none', async () => {
    const requests = stubGithub({ branchExists: true })
    const result = await editFilesCore({ ...args, edits: [{ path: 'README.md', find: 'A typed tool layer', replace: 'A typed toolkit' }], pullRequest: { title: 'Rename foo', draft: false } })
    expect(result.pullRequest).toMatchObject({ number: 7, existing: false })
    expect(requests.some(request => request.method === 'POST' && request.path === '/repos/vercel/ai/pulls')).toBe(true)
  })

  it.each([
    ['is missing', 'A typed toolbox', 'not found in README.md'],
    ['appears twice', 'tool', 'appears 2 times in README.md'],
  ])('writes nothing when the find text %s', async (_, find, error) => {
    const requests = stubGithub()
    await expect(editFilesCore({ ...args, edits: [{ path: 'README.md', find, replace: 'x' }] })).rejects.toThrow(error)
    expect(requests.filter(request => request.method !== 'GET')).toEqual([])
  })

  it('commits through the REST API, with the file sha, when a custom author is set', async () => {
    const requests = stubGithub({ branchExists: true })
    const author = { name: 'Bot', email: 'bot@example.com' }
    const result = await editFilesCore({ ...args, baseBranch: 'main', author, edits: [{ path: 'README.md', find: 'A typed tool layer', replace: 'A typed toolkit' }] })
    expect(result.createdBranch).toBe(false)
    expect(result.commits).toEqual([{ sha: 'rest-commit', url: 'https://github.com/vercel/ai/commit/rest-commit' }])
    expect(requests.find(request => request.method === 'PUT')!.body).toMatchObject({ branch: 'docs/wording', sha: 'readme-sha', author })
  })

  it('reads the sha for a whole-file rewrite at the head the edits started from', async () => {
    const requests = stubGithub({ branchExists: true })
    await editFilesCore({ ...args, baseBranch: 'main', author: { name: 'Bot', email: 'bot@example.com' }, edits: [{ path: 'README.md', content: '# new\n' }] })
    expect(requests.find(request => request.method === 'GET' && request.path === '/repos/vercel/ai/contents/README.md')!.ref).toBe('branch-sha')
    expect(requests.find(request => request.method === 'PUT')!.body).toMatchObject({ sha: 'readme-sha' })
  })
})
