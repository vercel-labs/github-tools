import type { Entity } from '@emulators/core'
import type { GitHubRepo } from '@emulators/github'
import { findRepo, paginate, requireActor, type Ctx, type Role } from '../access.js'
import type { SupplementContext } from './context.js'

/** A code scanning alert to seed. */
export interface CodeScanningAlertSeed {
  rule: string
  description?: string
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'warning' | 'note' | 'error'
  tool?: string
  path?: string
  line?: number
  ref?: string
  state?: 'open' | 'dismissed' | 'fixed'
}

/** A Dependabot alert to seed. */
export interface DependabotAlertSeed {
  package: string
  ecosystem: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  summary: string
  manifestPath?: string
  ghsaId?: string
  cveId?: string
  vulnerableVersionRange?: string
  firstPatchedVersion?: string
  state?: 'open' | 'fixed' | 'dismissed' | 'auto_dismissed'
}

/** A secret scanning alert to seed. The secret itself is never stored. */
export interface SecretScanningAlertSeed {
  secretType: string
  displayName?: string
  validity?: 'active' | 'inactive' | 'unknown'
  state?: 'open' | 'resolved'
  resolution?: string
}

/** Security alerts to seed on a repository. The emulator lists them and never changes them. */
export interface SecurityAlertSeeds {
  codeScanning?: CodeScanningAlertSeed[]
  dependabot?: DependabotAlertSeed[]
  secretScanning?: SecretScanningAlertSeed[]
}

type Kind = 'code_scanning' | 'dependabot' | 'secret_scanning'

interface Alert extends Entity {
  repo_id: number
  kind: Kind
  number: number
  state: string
  /** GitHub's alert object, without the fields added when it is listed. */
  alert: Record<string, unknown>
  filters: Record<string, string | undefined>
}

// GitHub shows code scanning and Dependabot alerts to people who can write, and secret scanning alerts to admins.
const ACCESS: Record<Kind, { segment: string, permission: string, role: Role }> = {
  code_scanning: { segment: 'code-scanning', permission: 'security_events', role: 'write' },
  dependabot: { segment: 'dependabot', permission: 'vulnerability_alerts', role: 'write' },
  secret_scanning: { segment: 'secret-scanning', permission: 'secret_scanning_alerts', role: 'admin' },
}

export function registerSecurityAlerts({ app, store, gh, baseUrl }: SupplementContext) {
  const alerts = store.collection<Alert>('supplement.security_alerts', ['repo_id'])

  function list(c: Ctx, kind: Kind, filters: string[]) {
    const repo = findRepo(gh, c.req.param('owner'), c.req.param('repo'))
    requireActor(c, gh, repo, { permission: ACCESS[kind].permission, access: 'read', role: ACCESS[kind].role })
    const state = c.req.query('state')
    const matching = alerts.findBy('repo_id', repo.id)
      .filter(entry => entry.kind === kind && (!state || entry.state === state))
      .filter(entry => filters.every(name => !c.req.query(name) || entry.filters[name] === c.req.query(name)))
      .sort((a, b) => b.number - a.number)
    return { repo, matching }
  }

  const format = (repo: GitHubRepo, entry: Alert) => ({
    number: entry.number,
    state: entry.state,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    url: `${baseUrl}/repos/${repo.full_name}/${ACCESS[entry.kind].segment}/alerts/${entry.number}`,
    html_url: `${baseUrl}/${repo.full_name}/security/${ACCESS[entry.kind].segment}/${entry.number}`,
    ...entry.alert,
  })

  app.get('/repos/:owner/:repo/code-scanning/alerts', (c: Ctx) => {
    const { repo, matching } = list(c, 'code_scanning', ['severity', 'ref'])
    return c.json(paginate(c, matching).map(entry => format(repo, entry)))
  })

  app.get('/repos/:owner/:repo/secret-scanning/alerts', (c: Ctx) => {
    const { repo, matching } = list(c, 'secret_scanning', ['secret_type'])
    return c.json(paginate(c, matching).map(entry => format(repo, entry)))
  })

  // Dependabot alerts page with a cursor: the next one is the `after` parameter of the Link header.
  app.get('/repos/:owner/:repo/dependabot/alerts', (c: Ctx) => {
    const { repo, matching } = list(c, 'dependabot', ['severity', 'ecosystem'])
    const perPage = Math.min(Number(c.req.query('per_page') ?? 30) || 30, 100)
    const after = c.req.query('after')
    const rest = after ? matching.filter(entry => entry.number < Number(after)) : matching
    const page = rest.slice(0, perPage)
    if (rest.length > perPage) {
      const next = new URL(c.req.url)
      next.searchParams.set('after', String(page.at(-1)!.number))
      c.header('Link', `<${next.href}>; rel="next"`)
    }
    return c.json(page.map(entry => format(repo, entry)))
  })

  return function seed(repo: GitHubRepo, seeds: SecurityAlertSeeds): void {
    const insert = (kind: Kind, state: string, alert: Record<string, unknown>, filters: Alert['filters']) => {
      const number = alerts.findBy('repo_id', repo.id).filter(entry => entry.kind === kind).length + 1
      alerts.insert({ repo_id: repo.id, kind, number, state, alert, filters })
    }
    for (const seeded of seeds.codeScanning ?? []) {
      const state = seeded.state ?? 'open'
      const severity = seeded.severity ?? 'warning'
      const security = ['critical', 'high', 'medium', 'low'].includes(severity)
      insert('code_scanning', state, {
        dismissed_reason: state === 'dismissed' ? 'won\'t fix' : null,
        rule: {
          id: seeded.rule,
          description: seeded.description ?? seeded.rule,
          severity: security ? 'error' : severity,
          security_severity_level: security ? severity : null,
        },
        tool: { name: seeded.tool ?? 'CodeQL', version: null },
        most_recent_instance: {
          ref: seeded.ref ?? `refs/heads/${repo.default_branch}`,
          state,
          location: seeded.path ? { path: seeded.path, start_line: seeded.line ?? 1, end_line: seeded.line ?? 1 } : undefined,
        },
      }, { severity, ref: seeded.ref ?? `refs/heads/${repo.default_branch}` })
    }
    for (const seeded of seeds.dependabot ?? []) {
      insert('dependabot', seeded.state ?? 'open', {
        dependency: {
          package: { name: seeded.package, ecosystem: seeded.ecosystem },
          manifest_path: seeded.manifestPath ?? 'package.json',
          scope: 'runtime',
        },
        security_advisory: { ghsa_id: seeded.ghsaId ?? null, cve_id: seeded.cveId ?? null, summary: seeded.summary, severity: seeded.severity },
        security_vulnerability: {
          package: { name: seeded.package, ecosystem: seeded.ecosystem },
          severity: seeded.severity,
          vulnerable_version_range: seeded.vulnerableVersionRange ?? '>= 0',
          first_patched_version: seeded.firstPatchedVersion ? { identifier: seeded.firstPatchedVersion } : null,
        },
      }, { severity: seeded.severity, ecosystem: seeded.ecosystem })
    }
    for (const seeded of seeds.secretScanning ?? []) {
      const state = seeded.state ?? 'open'
      insert('secret_scanning', state, {
        secret_type: seeded.secretType,
        secret_type_display_name: seeded.displayName ?? seeded.secretType,
        validity: seeded.validity ?? 'unknown',
        push_protection_bypassed: false,
        resolution: state === 'resolved' ? seeded.resolution ?? 'revoked' : null,
      }, { secret_type: seeded.secretType })
    }
  }
}
