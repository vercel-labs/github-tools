import { describe, expect, it } from 'vitest'
import { PRESET_CONNECT_SCOPES, connectGithubScopesForPreset } from './scopes'

describe('connectGithubScopesForPreset', () => {
  it('returns scopes for a single preset', () => {
    expect(connectGithubScopesForPreset('repo-explorer')).toEqual([
      'contents:read',
      'metadata:read',
      'pull_requests:read',
      'issues:read',
      'actions:read',
    ])
  })

  it('deduplicates scopes when combining presets', () => {
    const scopes = connectGithubScopesForPreset(['repo-explorer', 'code-review'])
    expect(scopes).toEqual(expect.arrayContaining([
      'contents:read',
      'metadata:read',
      'pull_requests:read',
      'issues:read',
      'actions:read',
      'pull_requests:write',
    ]))
    expect(scopes).toHaveLength(6)
  })

  it('returns the union of all preset scopes when no preset is given', () => {
    const allPresets = Object.values(PRESET_CONNECT_SCOPES).flat()
    const scopes = connectGithubScopesForPreset()
    expect(scopes).toHaveLength(new Set(allPresets).size)
    expect(scopes).toEqual(expect.arrayContaining(allPresets))
  })

  it('includes administration scopes for maintainer', () => {
    expect(connectGithubScopesForPreset('maintainer')).toEqual(
      expect.arrayContaining(['administration:read', 'administration:write']),
    )
  })
})
