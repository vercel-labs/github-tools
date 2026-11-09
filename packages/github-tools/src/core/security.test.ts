import { afterEach, describe, expect, it, vi } from 'vitest'
import { listCodeScanningAlertsCore, listDependabotAlertsCore, listSecretScanningAlertsCore } from './security'

function stubGithub(route: (url: URL) => Response) {
  const urls: URL[] = []
  vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>(async (input) => {
    const url = new URL(String(input))
    urls.push(url)
    return route(url)
  }))
  return urls
}

function json(body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json', ...headers } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('security alerts', () => {
  it('lists code scanning alerts with their rule, severity and location', async () => {
    stubGithub(() => json([{
      number: 4, state: 'open', html_url: 'https://github.com/vercel/ai/security/code-scanning/4', created_at: '2026-01-01T00:00:00Z', dismissed_reason: null,
      rule: { id: 'js/sql-injection', severity: 'error', security_severity_level: 'high', description: 'Database query built from user-controlled sources' },
      tool: { name: 'CodeQL' },
      most_recent_instance: { location: { path: 'src/db.ts', start_line: 42 } },
    }]))
    const result = await listCodeScanningAlertsCore({ token: 'test', owner: 'vercel', repo: 'ai', state: 'open', perPage: 30 })
    expect(result.items).toEqual([{
      number: 4, state: 'open', severity: 'high', rule: { id: 'js/sql-injection', description: 'Database query built from user-controlled sources' },
      tool: 'CodeQL', path: 'src/db.ts', line: 42, url: 'https://github.com/vercel/ai/security/code-scanning/4', createdAt: '2026-01-01T00:00:00Z', dismissedReason: null,
    }])
    expect(result.hasMore).toBe(false)
  })

  it('pages Dependabot alerts with the cursor from the Link header', async () => {
    const urls = stubGithub(() => json([{
      number: 9, state: 'open', html_url: 'https://github.com/vercel/ai/security/dependabot/9', created_at: '2026-01-01T00:00:00Z',
      dependency: { package: { name: 'lodash', ecosystem: 'npm' }, manifest_path: 'package.json', scope: 'runtime' },
      security_advisory: { ghsa_id: 'GHSA-xxxx', cve_id: 'CVE-2026-1', summary: 'Prototype pollution', severity: 'high' },
      security_vulnerability: { vulnerable_version_range: '< 4.17.21', first_patched_version: { identifier: '4.17.21' } },
    }], { link: '<https://api.github.com/repositories/1/dependabot/alerts?per_page=1&after=Y3Vyc29y>; rel="next"' }))
    const result = await listDependabotAlertsCore({ token: 'test', owner: 'vercel', repo: 'ai', state: 'open', severity: 'high', perPage: 1, after: 'c3RhcnQ' })
    expect(urls[0]!.searchParams.get('after')).toBe('c3RhcnQ')
    expect(result).toMatchObject({ hasMore: true, nextCursor: 'Y3Vyc29y', items: [{ package: 'lodash', severity: 'high', advisory: { ghsaId: 'GHSA-xxxx', cveId: 'CVE-2026-1' }, firstPatchedVersion: '4.17.21' }] })
  })

  it('asks GitHub to hide secrets and never returns one', async () => {
    const urls = stubGithub(() => json([{
      number: 2, state: 'open', html_url: 'https://github.com/vercel/ai/security/secret-scanning/2', created_at: '2026-01-01T00:00:00Z',
      secret_type: 'github_personal_access_token', secret_type_display_name: 'GitHub Personal Access Token', validity: 'active',
      push_protection_bypassed: false, resolution: null, secret: 'ghp_shouldNeverReachTheModel',
    }]))
    const result = await listSecretScanningAlertsCore({ token: 'test', owner: 'vercel', repo: 'ai', state: 'open', perPage: 30 })
    expect(urls[0]!.searchParams.get('hide_secret')).toBe('true')
    expect(JSON.stringify(result)).not.toContain('ghp_shouldNeverReachTheModel')
    expect(result.items[0]).toMatchObject({ secretType: 'github_personal_access_token', validity: 'active' })
  })
})
