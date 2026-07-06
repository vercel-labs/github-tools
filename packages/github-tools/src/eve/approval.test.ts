import type { ApprovalContext } from 'eve/tools'
import { describe, expect, it } from 'vitest'
import { always, never, once } from 'eve/tools/approval'
import { mapEveApprovalValue, resolveEveApproval } from './approval'

const approvalCtx = {
  session: { id: 's1', auth: {}, turn: 1 },
  toolName: 'createIssue',
  approvedTools: new Set<string>(),
  toolInput: { owner: 'vercel-labs' },
  getSandbox: () => { throw new Error('not implemented') },
  getSkill: () => { throw new Error('not implemented') },
} as unknown as ApprovalContext

describe('resolveEveApproval', () => {
  it('defaults write tools to always()', () => {
    expect(resolveEveApproval('mergePullRequest', undefined)!(approvalCtx)).toBe('user-approval')
    expect(always()(approvalCtx)).toBe('user-approval')
  })

  it('maps requireApproval: false to never()', () => {
    expect(resolveEveApproval('createIssue', false)!(approvalCtx)).toBe('not-applicable')
    expect(never()(approvalCtx)).toBe('not-applicable')
  })

  it('maps requireApproval: true to always()', () => {
    expect(resolveEveApproval('createIssue', true)!(approvalCtx)).toBe('user-approval')
  })

  it('maps per-tool boolean overrides', () => {
    expect(resolveEveApproval('createIssue', { createIssue: false })!(approvalCtx)).toBe('not-applicable')
    expect(resolveEveApproval('mergePullRequest', { createIssue: false })!(approvalCtx)).toBe('user-approval')
  })

  it('maps string sugar', () => {
    expect(resolveEveApproval('createIssue', { createIssue: 'once' })!(approvalCtx)).toBe('user-approval')
    expect(resolveEveApproval('createIssue', { createIssue: 'never' })!(approvalCtx)).toBe('not-applicable')
    expect(resolveEveApproval('createIssue', { createIssue: 'always' })!(approvalCtx)).toBe('user-approval')
    expect(once()({ ...approvalCtx, approvedTools: new Set(['createIssue']) })).toBe('not-applicable')
  })

  it('passes through eve approval helpers and predicates', () => {
    const predicate = ({ toolInput }: { toolInput?: { owner?: string } }) =>
      toolInput?.owner !== 'vercel-labs' ? 'user-approval' : 'not-applicable'

    expect(mapEveApprovalValue(predicate)(approvalCtx)).toBe('not-applicable')
    expect(mapEveApprovalValue(predicate)({ ...approvalCtx, toolInput: { owner: 'other' } })).toBe('user-approval')
  })

  it('keeps unlisted write tools on always() fail-safe default', () => {
    expect(resolveEveApproval('deleteGist', { mergePullRequest: false })!(approvalCtx)).toBe('user-approval')
  })
})
