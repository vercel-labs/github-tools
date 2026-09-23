import { afterEach, describe, expect, it, vi } from 'vitest'
import { perRepository } from './connect/per-repository'
import * as repositoryCore from './core/repository'
import * as searchCore from './core/search'
import { githubTokenCall } from './core/token'
import { runGithubToolStep } from './eve/steps'
import { createGithubTools } from './index'

const toolOptions = { toolCallId: 'call_1', messages: [], context: {} }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('githubTokenCall', () => {
  it('reads owner and repo from string inputs only', () => {
    expect(githubTokenCall('getRepository', { owner: 'evloghq', repo: 'evlog' }))
      .toEqual({ toolName: 'getRepository', input: { owner: 'evloghq', repo: 'evlog' }, owner: 'evloghq', repo: 'evlog' })
    expect(githubTokenCall('searchCode', { query: 'evlog', perPage: 10 }))
      .toEqual({ toolName: 'searchCode', input: { query: 'evlog', perPage: 10 } })
  })

  it('ignores context-merged owner and repo on tools without a repository target', () => {
    expect(githubTokenCall('listNotifications', { owner: 'evloghq', repo: 'evlog', all: false }))
      .toEqual({ toolName: 'listNotifications', input: { owner: 'evloghq', repo: 'evlog', all: false } })
  })
})

describe('token call threading', () => {
  it('passes the context-defaulted repository to the AI SDK token provider', async () => {
    vi.spyOn(repositoryCore, 'getRepositoryCore').mockResolvedValue({} as never)
    const token = vi.fn(async () => 'ghp_test')
    const tools = createGithubTools({ token, context: { owner: 'evloghq', repo: 'evlog' } })

    await tools.getRepository.execute!({}, toolOptions)
    await tools.getRepository.execute!({ owner: 'hugorcd', repo: 'hr-folio' }, toolOptions)

    expect(token).toHaveBeenNthCalledWith(1, expect.objectContaining({ toolName: 'getRepository', owner: 'evloghq', repo: 'evlog' }))
    expect(token).toHaveBeenNthCalledWith(2, expect.objectContaining({ toolName: 'getRepository', owner: 'hugorcd', repo: 'hr-folio' }))
  })

  it('passes no repository for tools without a repository target', async () => {
    vi.spyOn(searchCore, 'searchCodeCore').mockResolvedValue({} as never)
    const token = vi.fn(async () => 'ghp_test')
    const tools = createGithubTools({ token, context: { owner: 'evloghq', repo: 'evlog' } })

    await tools.searchCode.execute!({ query: 'evlog', perPage: 10 }, toolOptions)

    expect(token).toHaveBeenCalledWith({ toolName: 'searchCode', input: expect.objectContaining({ query: 'evlog' }) })
  })

  it('passes the context-defaulted repository to the eve token provider', async () => {
    vi.spyOn(repositoryCore, 'getRepositoryCore').mockResolvedValue({} as never)
    const token = vi.fn(async () => 'ghp_test')

    await runGithubToolStep('getRepository', {}, { token, context: { owner: 'evloghq', repo: 'evlog' } })

    expect(token).toHaveBeenCalledWith(expect.objectContaining({ toolName: 'getRepository', owner: 'evloghq', repo: 'evlog' }))
  })
})

describe('perRepository', () => {
  const call = { toolName: 'createPullRequest', input: {}, owner: 'hugorcd', repo: 'hr-folio' } as const

  it('reads the call from the eve extension (ctx, call) form', () => {
    expect(perRepository({ scopes: ['pull_requests:write'] })({ session: {} }, call)).toEqual({
      scopes: ['pull_requests:write'],
      authorizationDetails: [{ type: 'github_app_installation', org: 'hugorcd', repositories: ['hr-folio'] }],
    })
  })

  it('returns the static params when the call has no repository target', () => {
    const params = { installationId: 'inst_default' }
    expect(perRepository(params)()).toBe(params)
    expect(perRepository(params)({ toolName: 'listNotifications', input: {} })).toBe(params)
  })
})
