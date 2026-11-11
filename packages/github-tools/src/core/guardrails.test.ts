import type { ModelMessage } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGithubAgent, createGithubTools } from '../index'
import { executeGithubEveTool } from '../eve-runtime'
import { guardrailViolation, mergeGuardrailViolation } from './guardrails'
import { githubTokenCall } from './token'
import type { GithubToolName } from './tool-names'
import type { GithubTool } from '../types'

const call = (name: GithubToolName, input: Record<string, unknown>) => githubTokenCall(name, input)
const guardrails = { repositories: ['vercel-labs/*', 'vercel/ai'], branches: ['agent/*'] }
const options = { toolCallId: 'call-1', messages: [] as ModelMessage[] }
const needsApproval = (tool: GithubTool, input: Record<string, unknown>) => (tool.needsApproval as (input: unknown, options: { toolCallId: string, messages: ModelMessage[] }) => Promise<boolean>)(input, options)
const execute = (tool: GithubTool, input: Record<string, unknown>) => (tool.execute as (input: unknown, options: { toolCallId: string, messages: ModelMessage[] }) => Promise<unknown>)(input, options)

function stubGithub(route: (url: URL, init?: RequestInit) => Response | undefined = () => undefined) {
  const requests: string[] = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const url = new URL(String(input))
    requests.push(`${init?.method ?? 'GET'} ${url.pathname}`)
    return route(url, init) ?? new Response(JSON.stringify({ message: 'Not Found' }), { status: 404, headers: { 'content-type': 'application/json' } })
  }))
  return requests
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('guardrailViolation', () => {
  it('allows the listed repositories, ignoring case, and blocks the rest', () => {
    expect(guardrailViolation(call('getRepository', { owner: 'Vercel-Labs', repo: 'github-tools' }), guardrails)).toBeUndefined()
    expect(guardrailViolation(call('createIssue', { owner: 'vercel', repo: 'ai', title: 'x' }), guardrails)).toBeUndefined()
    expect(guardrailViolation(call('createIssue', { owner: 'vercel', repo: 'next.js', title: 'x' }), guardrails)).toBe('`vercel/next.js` is outside the repositories these tools may act on: `vercel-labs/*`, `vercel/ai`.')
  })

  it('leaves tools without a repository target alone', () => {
    expect(guardrailViolation(call('searchCode', { query: 'token', owner: 'vercel', repo: 'next.js' }), guardrails)).toBeUndefined()
  })

  it('checks the full name of a repository a tool creates', () => {
    expect(guardrailViolation(call('createRepository', { name: 'sandbox', org: 'vercel-labs' }), guardrails)).toBeUndefined()
    expect(guardrailViolation(call('createRepository', { name: 'sandbox' }), guardrails)).toContain('needs `org`')
    expect(guardrailViolation(call('forkRepository', { owner: 'vercel', repo: 'ai', organization: 'acme' }), guardrails)).toContain('`acme/ai` is outside')
    expect(guardrailViolation(call('forkRepository', { owner: 'vercel', repo: 'ai' }), guardrails)).toContain('needs `organization`')
  })

  it('limits branch writes to the allowed patterns', () => {
    expect(guardrailViolation(call('createBranch', { owner: 'vercel', repo: 'ai', branch: 'agent/fix/flaky-test' }), guardrails)).toBeUndefined()
    expect(guardrailViolation(call('editFiles', { owner: 'vercel', repo: 'ai', branch: 'main' }), guardrails)).toBe('Writes are limited to branches matching `agent/*`, and `main` doesn\'t match.')
    expect(guardrailViolation(call('deleteBranch', { owner: 'vercel', repo: 'ai', branch: 'Agent/x' }), guardrails)).toContain('doesn\'t match')
    expect(guardrailViolation(call('createOrUpdateFile', { owner: 'vercel', repo: 'ai', path: 'a.md' }), guardrails)).toBe('Name a branch matching `agent/*`; without one, the commit goes to the default branch.')
  })

  it('checks the base branch of a merge', () => {
    expect(mergeGuardrailViolation(['agent/*'], 12, 'agent/base')).toBeUndefined()
    expect(mergeGuardrailViolation(['agent/*'], 12, 'main')).toBe('Merges are limited to base branches matching `agent/*`, and pull request #12 targets `main`.')
    expect(mergeGuardrailViolation(undefined, 12, 'main')).toBeUndefined()
  })
})

describe('createGithubTools({ guardrails })', () => {
  it('fails a blocked call before any request reaches GitHub, and skips asking for approval', async () => {
    const requests = stubGithub()
    const tools = createGithubTools({ token: 'test', guardrails })
    expect(await needsApproval(tools.createBranch, { owner: 'vercel', repo: 'ai', branch: 'main' })).toBe(false)
    expect(await needsApproval(tools.createBranch, { owner: 'vercel', repo: 'ai', branch: 'agent/x' })).toBe(true)
    await expect(execute(tools.createBranch, { owner: 'vercel', repo: 'ai', branch: 'main' })).rejects.toThrow('Blocked by guardrails: Writes are limited to branches matching `agent/*`')
    await expect(execute(tools.getRepository, { owner: 'vercel', repo: 'next.js' })).rejects.toMatchObject({ code: 'github_tools.GUARDRAIL_BLOCKED' })
    expect(requests).toEqual([])
  })

  it('checks the repository from `context` when the model omits it', async () => {
    stubGithub()
    const tools = createGithubTools({ token: 'test', guardrails, context: { owner: 'vercel', repo: 'next.js' } })
    await expect(execute(tools.listIssues, {})).rejects.toThrow('`vercel/next.js` is outside')
  })

  it('refuses to merge into a base branch outside `branches`', async () => {
    const requests = stubGithub(url => url.pathname === '/repos/vercel/ai/pulls/12'
      ? new Response(JSON.stringify({ number: 12, base: { ref: 'main' } }), { headers: { 'content-type': 'application/json' } })
      : undefined)
    const tools = createGithubTools({ token: 'test', guardrails })
    await expect(execute(tools.mergePullRequest, { owner: 'vercel', repo: 'ai', pullNumber: 12, mergeMethod: 'squash' })).rejects.toThrow('pull request #12 targets `main`')
    expect(requests).toEqual(['GET /repos/vercel/ai/pulls/12'])
  })
})

describe('createGithubAgent({ guardrails })', () => {
  it('denies a blocked write with the reason instead of asking for approval', async () => {
    const requests = stubGithub()
    let calls = 0
    const model = new MockLanguageModelV4({
      doGenerate: async () => calls++ === 0
        ? { content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'createBranch', input: JSON.stringify({ owner: 'vercel', repo: 'ai', branch: 'main' }) }], finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }, warnings: [] }
        : { content: [{ type: 'text', text: 'ok' }], finishReason: { unified: 'stop', raw: 'stop' }, usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }, warnings: [] },
    })
    const result = await createGithubAgent({ model, token: 'test', guardrails }).generate({ prompt: 'Create a branch called main' })
    // The AI SDK records a policy's denial as an automatic approval request and a denied response.
    expect(result.steps[0]!.content.filter(part => part.type === 'tool-approval-request' || part.type === 'tool-approval-response')).toEqual([
      expect.objectContaining({ type: 'tool-approval-request', isAutomatic: true }),
      expect.objectContaining({ type: 'tool-approval-response', approved: false, reason: 'Writes are limited to branches matching `agent/*`, and `main` doesn\'t match.' }),
    ])
    expect(requests).toEqual([])
  })
})

describe('eve runtime guardrails', () => {
  it('throws GUARDRAIL_BLOCKED for a blocked call without calling GitHub', async () => {
    const requests = stubGithub()
    await expect(executeGithubEveTool('createBranch', { owner: 'vercel', repo: 'ai', branch: 'main' }, { token: 'test', guardrails }))
      .rejects.toThrow('github_tools.GUARDRAIL_BLOCKED')
    expect(requests).toEqual([])
  })
})
