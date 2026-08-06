import { describe, expect, it } from 'vitest'
import { PRESET_CONNECT_SCOPES, connectGithubScopesForPreset } from './scopes'

describe('connectGithubScopesForPreset', () => {
  it('returns scopes for a single preset', () => {
    expect(connectGithubScopesForPreset('repo-explorer')).toEqual([
      'contents:read',
      'metadata:read',
      'pull_requests:read',
      'issues:read',
      'discussions:read',
      'actions:read',
      'checks:read',
      'statuses:read',
    ])
  })

  it('deduplicates scopes when combining presets', () => {
    const scopes = connectGithubScopesForPreset(['repo-explorer', 'code-review'])
    expect(scopes).toEqual(expect.arrayContaining([
      'contents:read',
      'metadata:read',
      'pull_requests:read',
      'issues:read',
      'discussions:read',
      'actions:read',
      'checks:read',
      'statuses:read',
      'pull_requests:write',
    ]))
    expect(scopes).toHaveLength(9)
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

  it('maps discussion-moderator and pr-author scopes', () => {
    expect(connectGithubScopesForPreset('discussion-moderator')).toEqual(
      expect.arrayContaining(['discussions:read', 'discussions:write', 'issues:write']),
    )
    expect(connectGithubScopesForPreset('pr-author')).toEqual([
      'contents:read',
      'contents:write',
      'metadata:read',
      'pull_requests:read',
      'pull_requests:write',
    ])
  })
})
