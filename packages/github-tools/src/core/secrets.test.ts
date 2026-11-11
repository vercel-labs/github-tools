import type { ModelMessage } from 'ai'
import { MockLanguageModelV4 } from 'ai/test'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGithubAgent, createGithubTools } from '../index'
import { executeGithubEveTool } from '../eve-runtime'
import type { GithubTool } from '../types'
import { findSecret } from './secrets'

// Assembled at runtime so this file holds no literal credential.
const fake = (...parts: string[]) => parts.join('')
const githubToken = fake('gh', 'p_', 'A1b2C3d4E5'.repeat(3), 'f6G7h8')
const awsKey = fake('AK', 'IA', 'ABCDEFGHIJKLMNOP')
const privateKey = fake('-----BEGIN ', 'RSA PRIVATE', ' KEY-----\nMIIEow...')

const options = { toolCallId: 'call-1', messages: [] as ModelMessage[] }
const execute = (tool: GithubTool, input: Record<string, unknown>) => (tool.execute as (input: unknown, options: { toolCallId: string, messages: ModelMessage[] }) => Promise<unknown>)(input, options)

function stubGithub() {
  const requests: string[] = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input, init) => {
    requests.push(`${init?.method ?? 'GET'} ${new URL(String(input)).pathname}`)
    return new Response(JSON.stringify({ number: 1, html_url: 'https://github.com/vercel/ai/issues/1', title: 'x', state: 'open', labels: [], assignees: [] }), { status: 201, headers: { 'content-type': 'application/json' } })
  }))
  return requests
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('findSecret', () => {
  it('finds credentials anywhere in the input', () => {
    expect(findSecret({ body: `Use ${githubToken} to deploy` })).toBe('a GitHub token')
    expect(findSecret({ edits: [{ path: '.env', content: `AWS_ACCESS_KEY_ID=${awsKey}` }] })).toBe('an AWS access key')
    expect(findSecret({ files: { 'id_rsa': { content: privateKey } } })).toBe('a private key')
  })

  it('finds GitHub tokens longer than 36 characters, and credentials in object keys', () => {
    expect(findSecret({ body: fake('gh', 's_', 'A1b2C3d4E5'.repeat(5)) })).toBe('a GitHub token')
    expect(findSecret({ body: fake('gh', 'r_', 'A1b2C3d4E5'.repeat(7), 'f6G7h8') })).toBe('a GitHub token')
    expect(findSecret({ files: { [githubToken]: { content: 'notes' } } })).toBe('a GitHub token')
  })

  it('leaves ordinary text and placeholders alone', () => {
    expect(findSecret({ title: 'Rotate the ghp_xxx token', body: 'Set GITHUB_TOKEN=<your token>', labels: ['security'] })).toBeUndefined()
  })
})

describe('credentials in tool input', () => {
  const issue = { owner: 'vercel', repo: 'ai', title: 'Deploy key', body: `Token: ${githubToken}` }

  it('fails a call carrying a credential before it reaches GitHub, without guardrails configured', async () => {
    const requests = stubGithub()
    const tools = createGithubTools({ token: 'test', requireApproval: false })
    await expect(execute(tools.createIssue, issue)).rejects.toThrow('Blocked by guardrails: The input contains what looks like a GitHub token.')
    expect(requests).toEqual([])
  })

  it("skips asking for approval when guardrails are configured, and allows credentials with secrets: 'allow'", async () => {
    const requests = stubGithub()
    const guarded = createGithubTools({ token: 'test', guardrails: { repositories: ['vercel/*'] } })
    await expect((guarded.createIssue.needsApproval as (input: unknown, options: unknown) => Promise<boolean>)(issue, options)).resolves.toBe(false)
    const allowed = createGithubTools({ token: 'test', requireApproval: false, guardrails: { secrets: 'allow' } })
    await execute(allowed.createIssue, issue)
    expect(requests).toEqual(['POST /repos/vercel/ai/issues'])
  })

  it('is denied by createGithubAgent and returned as an error on eve', async () => {
    const requests = stubGithub()
    let calls = 0
    const usage = { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }
    const model = new MockLanguageModelV4({
      doGenerate: async () => calls++ === 0
        ? { content: [{ type: 'tool-call', toolCallId: 'call-1', toolName: 'createIssue', input: JSON.stringify(issue) }], finishReason: { unified: 'tool-calls', raw: 'tool_calls' }, usage, warnings: [] }
        : { content: [{ type: 'text', text: 'ok' }], finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [] },
    })
    const result = await createGithubAgent({ model, token: 'test' }).generate({ prompt: 'File the deploy key as an issue' })
    expect(result.steps[0]!.content).toContainEqual(expect.objectContaining({ type: 'tool-approval-response', approved: false, reason: expect.stringContaining('a GitHub token') }))
    await expect(executeGithubEveTool('createIssue', issue, { token: 'test' })).rejects.toThrow('github_tools.GUARDRAIL_BLOCKED')
    expect(requests).toEqual([])
  })
})
