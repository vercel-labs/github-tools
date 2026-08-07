import { describe, expect, it, vi } from 'vitest'
import { PRESET_TOOLS } from '../core/presets'
import * as repositoryCore from '../core/repository'
import { buildEveToolDefinition, buildEveToolMap, createEveGithubToolsDynamic, listResolvedEveToolNames } from './build'
import { getEveTools } from './load-eve'

describe('createGithubTools eve integration', () => {
  it('resolves the same tool names as the AI SDK presets', () => {
    for (const preset of Object.keys(PRESET_TOOLS) as Array<keyof typeof PRESET_TOOLS>) {
      expect(listResolvedEveToolNames({ preset }).sort()).toEqual([...PRESET_TOOLS[preset]].sort())
    }
  })

  it('resolves tools once when a session starts', async () => {
    const dynamic = createEveGithubToolsDynamic({ token: 'ghp_test', preset: 'code-review' })
    expect(dynamic).toMatchObject({ kind: expect.any(String), events: { 'session.started': expect.any(Function) } })

    const tools = await dynamic.events['session.started']!({}, {} as never)
    expect(Object.keys(tools!).sort()).toEqual([...PRESET_TOOLS['code-review']].sort())
  })

  it('builds defineTool values with bare tool names', () => {
    const tool = buildEveToolDefinition('listPullRequests', { token: 'ghp_test' })
    const { defineTool } = getEveTools()
    expect(tool).toEqual(expect.objectContaining({
      description: expect.any(String),
      inputSchema: expect.any(Object),
      execute: expect.any(Function),
    }))
    expect(defineTool(tool)).toBe(tool)
  })

  it('passes commit attribution into createOrUpdateFile core args', async () => {
    const coAuthors = [{ name: 'bot[bot]', email: '1+bot@users.noreply.github.com' }]
    const coreSpy = vi.spyOn(repositoryCore, 'createOrUpdateFileCore')
      .mockResolvedValue({ path: 'README.md', sha: 'abc', commitSha: 'def', commitUrl: 'https://example.com' })

    const tool = buildEveToolDefinition('createOrUpdateFile', {
      token: 'ghp_test',
      author: { name: 'Author', email: 'author@example.com' },
      committer: { name: 'Committer', email: 'committer@example.com' },
      coAuthors,
    })

    await tool.execute({
      owner: 'vercel-labs',
      repo: 'github-tools',
      path: 'README.md',
      message: 'update',
      content: 'hello',
    }, {} as never)

    expect(coreSpy).toHaveBeenCalledWith(expect.objectContaining({
      token: 'ghp_test',
      author: { name: 'Author', email: 'author@example.com' },
      committer: { name: 'Committer', email: 'committer@example.com' },
      coAuthors,
    }))

    coreSpy.mockRestore()
  })

  it('composes response authorization with global and overridden request policies', () => {
    const response = vi.fn()
    const tools = buildEveToolMap({
      token: 'ghp_test',
      preset: 'issue-triage',
      requireApproval: { createIssue: 'once' },
      authorizeApprovalResponse: response,
      overrides: { createIssue: { approval: 'never' } },
    })

    expect(tools.createIssue?.approval).toEqual({
      request: expect.any(Function),
      response,
    })
    expect(tools.listIssues?.approval).toBeUndefined()
  })

  it('uses a per-tool response authorization policy', () => {
    const response = vi.fn()
    const tool = buildEveToolDefinition('createIssue', {
      token: 'ghp_test',
      authorizeApprovalResponse: { createIssue: response },
    })

    expect(tool.approval).toEqual({ request: expect.any(Function), response })
  })
})
