import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GithubClient } from './client'
import { startGithubEmulator, type GithubEmulator } from './github/emulator'

let github: GithubEmulator
let client: GithubClient

beforeAll(async () => {
  github = await startGithubEmulator({ repositories: { 'acme/web': {} }, people: { alice: { role: 'write' } } })
  client = new GithubClient(github, ['acme/web'])
})

afterAll(() => github.close())

describe('createPullRequest', () => {
  it('changes a file that is on the base branch, and adds a new one', async () => {
    const pull = await client.repo('acme/web').as('alice').createPullRequest({ title: 'Rewrite the README', files: { 'README.md': '# Web\n', 'docs/guide.md': 'A guide.\n' } })
    const files = await github.request<Array<{ filename: string, status: string }>>('alice', 'GET', `/repos/acme/web/pulls/${pull.number}/files`)
    expect(files.map(file => `${file.status} ${file.filename}`).sort()).toEqual(['added docs/guide.md', 'modified README.md'])
    const counters = await github.request<{ changed_files: number, additions: number, deletions: number }>('alice', 'GET', `/repos/acme/web/pulls/${pull.number}`)
    expect([counters.changed_files, counters.additions, counters.deletions]).toEqual([2, 2, 1])
  })

  it('lists the files of commits pushed after the pull request was opened', async () => {
    const pull = await client.repo('acme/web').as('alice').createPullRequest({ title: 'Add the changelog' })
    await github.request('alice', 'PUT', '/repos/acme/web/contents/CHANGELOG.md', { message: 'Add the changelog', content: Buffer.from('# Changelog\n').toString('base64'), branch: pull.head })
    const files = await github.request<Array<{ filename: string }>>('alice', 'GET', `/repos/acme/web/pulls/${pull.number}/files`)
    expect(files.map(file => file.filename).sort()).toEqual(['CHANGELOG.md', `${pull.head}.txt`])
    const after = await github.request<{ head: { sha: string } }>('alice', 'GET', `/repos/acme/web/pulls/${pull.number}`)
    // The reason the diff is read from the branch: emulate keeps the head SHA the pull request was opened with.
    expect(after.head.sha).toBe(pull.headSha)
  })

  it('opens a pull request with one new file when given none', async () => {
    const pull = await client.repo('acme/web').as('alice').createPullRequest({ title: 'Fix the crash' })
    const files = await github.request<Array<{ filename: string, status: string }>>('alice', 'GET', `/repos/acme/web/pulls/${pull.number}/files`)
    expect(files.map(file => `${file.status} ${file.filename}`)).toEqual([`added ${pull.head}.txt`])
  })
})
