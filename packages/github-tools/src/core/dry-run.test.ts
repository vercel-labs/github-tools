import type { ModelMessage } from 'ai'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGithubTools } from '../index'
import { executeGithubEveTool } from '../eve-runtime'
import * as tanstack from '../tanstack'
import type { GithubTool } from '../types'

const options = { toolCallId: 'call-1', messages: [] as ModelMessage[] }
const execute = (tool: GithubTool, input: Record<string, unknown>) => (tool.execute as (input: unknown, options: { toolCallId: string, messages: ModelMessage[] }) => Promise<unknown>)(input, options)

function stubGithub() {
  const requests: string[] = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input, init) => {
    requests.push(`${init?.method ?? 'GET'} ${new URL(String(input)).pathname}`)
    return new Response(JSON.stringify({ name: 'ai', full_name: 'vercel/ai', default_branch: 'main' }), { headers: { 'content-type': 'application/json' } })
  }))
  return requests
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('dryRun', () => {
  const issue = { owner: 'vercel', repo: 'ai', title: 'Flaky test' }

  it('answers writes without calling GitHub and runs reads as usual', async () => {
    const requests = stubGithub()
    const tools = createGithubTools({ token: 'test', dryRun: true })
    await expect(execute(tools.createIssue, issue)).resolves.toEqual({
      dryRun: true,
      tool: 'createIssue',
      input: expect.objectContaining(issue),
      message: 'Dry run: `createIssue` was not sent to GitHub, so nothing changed. Tell the user what this call would have done.',
    })
    await execute(tools.getRepository, { owner: 'vercel', repo: 'ai' })
    expect(requests).toEqual(['GET /repos/vercel/ai'])
  })

  it('fills context and still applies guardrails', async () => {
    stubGithub()
    const tools = createGithubTools({ token: 'test', dryRun: true, context: { owner: 'vercel', repo: 'ai' }, guardrails: { branches: ['agent/*'] } })
    await expect(execute(tools.createIssue, { title: 'x' })).resolves.toMatchObject({ input: { owner: 'vercel', repo: 'ai', title: 'x' } })
    await expect(execute(tools.createBranch, { branch: 'main' })).rejects.toThrow('Blocked by guardrails')
  })

  it('applies to TanStack tools and the eve runtime', async () => {
    const requests = stubGithub()
    const tool = tanstack.createIssue('test', { dryRun: true })
    await expect(tool.execute!(issue)).resolves.toMatchObject({ dryRun: true, tool: 'createIssue' })
    await expect(executeGithubEveTool('createIssue', issue, { token: 'test', dryRun: true })).resolves.toMatchObject({ dryRun: true, tool: 'createIssue' })
    expect(requests).toEqual([])
  })
})
