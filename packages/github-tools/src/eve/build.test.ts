import { describe, expect, it, vi } from 'vitest'
import { PRESET_TOOLS } from '../core/presets'
import * as repositoryCore from '../core/repository'
import { buildEveToolDefinition, buildEveToolMap, createEveGithubToolsDynamic, executeGithubEveTool, formatGithubEveToolOutput, hasGithubEveToolModelOutput, listResolvedEveToolNames } from './build'
import { getEveTools } from './load-eve'

describe('createGithubTools eve integration', () => {
  it('resolves the same tool names as the AI SDK presets', () => {
    for (const preset of Object.keys(PRESET_TOOLS) as Array<keyof typeof PRESET_TOOLS>) {
      expect(listResolvedEveToolNames({ preset }).sort()).toEqual([...PRESET_TOOLS[preset]].sort())
    }
  })

  it('returns a defineDynamic wrapper with step.started resolver', async () => {
    const dynamic = createEveGithubToolsDynamic({ token: 'ghp_test', preset: 'code-review' })
    expect(dynamic).toMatchObject({ kind: expect.any(String), events: { 'step.started': expect.any(Function) } })

    const tools = await dynamic.events['step.started']!({}, {} as never)
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

  it('restricts to an exact allow-list via `include`', () => {
    const tools = buildEveToolMap({
      token: 'ghp_test',
      include: ['getRepository', 'mergePullRequest'],
    })

    expect(Object.keys(tools).sort()).toEqual(['getRepository', 'mergePullRequest'])
  })

  it('unions `preset` and `include` when both are provided', () => {
    const tools = buildEveToolMap({
      token: 'ghp_test',
      preset: 'code-review',
      // mergePullRequest is not part of the code-review preset — `include` adds it.
      include: ['mergePullRequest'],
    })

    expect(Object.keys(tools).sort()).toEqual([...PRESET_TOOLS['code-review'], 'mergePullRequest'].sort())
  })

  it('removes tools via `exclude`, applied after `preset` + `include`', () => {
    const tools = buildEveToolMap({
      token: 'ghp_test',
      preset: 'code-review',
      include: ['mergePullRequest'],
      exclude: ['getBlame', 'mergePullRequest'],
    })

    const expected = [...PRESET_TOOLS['code-review'], 'mergePullRequest']
      .filter(name => !['getBlame', 'mergePullRequest'].includes(name))

    expect(Object.keys(tools).sort()).toEqual(expected.sort())
  })

  it('resolves the same `include` allow-list via listResolvedEveToolNames', () => {
    expect(listResolvedEveToolNames({ include: ['getRepository', 'mergePullRequest'] }).sort())
      .toEqual(['getRepository', 'mergePullRequest'])
  })

  it('unions preset + include and applies exclude via listResolvedEveToolNames', () => {
    const names = listResolvedEveToolNames({
      preset: 'code-review',
      include: ['mergePullRequest'],
      exclude: ['getBlame', 'mergePullRequest'],
    })

    const expected = [...PRESET_TOOLS['code-review'], 'mergePullRequest']
      .filter(name => !['getBlame', 'mergePullRequest'].includes(name))

    expect(names.sort()).toEqual(expected.sort())
  })

  it('maps approval config onto write tools in the dynamic set', async () => {
    const tools = buildEveToolMap({
      token: 'ghp_test',
      preset: 'issue-triage',
      requireApproval: {
        createIssue: 'once',
        addIssueComment: false,
      },
    })

    expect(tools.createIssue?.approval).toBeDefined()
    expect(tools.addIssueComment?.approval).toBeUndefined()
    expect(tools.listIssues?.approval).toBeUndefined()
  })

  it('looks up built-in toModelOutput formatters by tool name', () => {
    expect(hasGithubEveToolModelOutput('getFileContent')).toBe(true)
    expect(hasGithubEveToolModelOutput('listIssues')).toBe(false)
    expect(formatGithubEveToolOutput('getFileContent', {
      type: 'file',
      path: 'README.md',
      sha: 'abc',
      size: 5,
      content: 'hello',
    })).toEqual({
      type: 'json',
      value: {
        type: 'file',
        path: 'README.md',
        sha: 'abc',
        size: 5,
        content: 'hello',
      },
    })
  })

  it('strips rateLimit before applying a built-in formatter', () => {
    expect(formatGithubEveToolOutput('getFileContent', {
      type: 'file',
      path: 'README.md',
      sha: 'abc',
      size: 5,
      content: 'hello',
      rateLimit: { remaining: 38, limit: 5000, reset: 1774800000, resource: 'core' },
    })).toEqual({
      type: 'json',
      value: {
        type: 'file',
        path: 'README.md',
        sha: 'abc',
        size: 5,
        content: 'hello',
      },
    })
  })

  it('returns an error payload instead of throwing when execute fails', async () => {
    await expect(executeGithubEveTool('getRepository', { owner: 'octocat', repo: 'hello-world' }, {
      token: async () => {
        throw new Error('Unable to find project root directory. Have you linked your project with `vc link?`')
      },
    })).resolves.toEqual({
      error: 'Unable to find project root directory. Have you linked your project with `vc link?`',
    })
  })

  it('returns stripped json for tools without a built-in formatter', () => {
    expect(formatGithubEveToolOutput('getRepository', {
      name: 'hello-world',
      rateLimit: { remaining: 38, limit: 5000, reset: 1774800000 },
    })).toEqual({
      type: 'json',
      value: { name: 'hello-world' },
    })
  })
})
