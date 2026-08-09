import { describe, expect, it } from 'vitest'
import {
  PRESET_CONNECT_SCOPES,
  connectGithubScopesForPreset,
  connectGithubScopesForSelection,
  connectGithubScopesForTools,
} from './scopes'

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

describe('connectGithubScopesForTools', () => {
  it('always includes metadata:read', () => {
    expect(connectGithubScopesForTools(['getRepository'])).toEqual([
      'contents:read',
      'metadata:read',
    ])
  })

  it('does not request administration for a hand-picked read set', () => {
    const scopes = connectGithubScopesForTools(['getRepository', 'listIssues', 'addLabels'])
    expect(scopes).toEqual([
      'contents:read',
      'metadata:read',
      'issues:read',
      'issues:write',
    ])
    expect(scopes).not.toEqual(expect.arrayContaining(['administration:write']))
  })

  it('requests administration only when createRepository is selected', () => {
    expect(connectGithubScopesForTools(['createRepository'])).toEqual([
      'metadata:read',
      'administration:read',
      'administration:write',
    ])
  })
})

describe('connectGithubScopesForSelection', () => {
  it('falls back to preset mapping when include/exclude are omitted', () => {
    expect(connectGithubScopesForSelection({ preset: 'code-review' })).toEqual(
      connectGithubScopesForPreset('code-review'),
    )
  })

  it('derives scopes from include without minting the full union', () => {
    const scopes = connectGithubScopesForSelection({
      include: ['getRepository', 'listIssues', 'addLabels'],
    })
    expect(scopes).toEqual([
      'contents:read',
      'metadata:read',
      'issues:read',
      'issues:write',
    ])
    expect(scopes).not.toContain('administration:write')
  })

  it('drops administration when createRepository is excluded from maintainer', () => {
    const scopes = connectGithubScopesForSelection({
      preset: 'maintainer',
      exclude: ['createRepository'],
    })
    expect(scopes).not.toContain('administration:write')
    expect(scopes).not.toContain('administration:read')
    expect(scopes).toEqual(expect.arrayContaining(['issues:write', 'pull_requests:write']))
  })
})
