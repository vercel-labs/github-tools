import { describe, expect, it } from 'vitest'
import type { GithubToolName } from './registry'
import { runGithubToolStep } from './steps'

describe('runGithubToolStep error payloads', () => {
  it('returns the structured { code, message, why, fix } payload for catalog errors', async () => {
    const result = await runGithubToolStep('getRepository', { owner: 'o', repo: 'r' }, {
      token: async () => '',
    })

    expect(result).toMatchObject({
      error: {
        code: 'github_tools.TOKEN_REQUIRED',
        message: expect.stringContaining('GitHub token is required'),
        why: expect.any(String),
        fix: expect.any(String),
      },
    })
  })

  it('keeps the plain message string for non-catalog errors', async () => {
    const result = await runGithubToolStep('nonexistentTool' as GithubToolName, {}, { token: 'ghp_x' })

    expect(result).toEqual({ error: 'Unknown GitHub tool: nonexistentTool' })
  })
})
