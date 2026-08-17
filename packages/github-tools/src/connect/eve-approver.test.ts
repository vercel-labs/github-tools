import { describe, expect, it, vi } from 'vitest'
import { connect } from '@vercel/connect/eve'
import { connectGithubApproverAuth } from './eve-approver'

vi.mock('@vercel/connect/eve', () => ({ connect: vi.fn() }))

const mockedConnect = vi.mocked(connect)

describe('connectGithubApproverAuth', () => {
  it('creates a user-scoped identity provider with read:user by default', () => {
    connectGithubApproverAuth('github')

    expect(mockedConnect).toHaveBeenCalledWith({
      connector: 'github',
      displayName: 'GitHub',
      principalType: 'user',
      tokenParams: { scopes: ['read:user'] },
    })
  })

  it('preserves supplied token parameters but removes repository selection', () => {
    connectGithubApproverAuth('github', { repositories: ['vercel/sdk'], scopes: ['user:email'] })

    expect(mockedConnect).toHaveBeenLastCalledWith(expect.objectContaining({
      tokenParams: { scopes: ['user:email'] },
    }))
  })
})
