import { z } from 'zod'
import { withOctokit } from '../client'
import { fetchAllPages, maxPagesSchema, pageSchema, pagedList } from './pagination'

export const listCodeScanningAlertsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'dismissed', 'fixed']).optional().default('open').describe('Alert state'),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'warning', 'note', 'error']).optional().describe('Only alerts of this severity'),
  ref: z.string().optional().describe('Git ref to list alerts for, such as refs/heads/main or refs/pull/12/merge. Defaults to the default branch'),
  perPage: z.number().optional().default(30).describe('Number of results to return per page (max 100)'),
  page: pageSchema,
  maxPages: maxPagesSchema,
})

export const listCodeScanningAlertsDescription = 'List code scanning alerts (CodeQL and other analysis tools) for a repository, newest first, with the rule, its severity, and the file and line of the latest instance. Needs code scanning set up on the repository. When hasMore, pass nextPage.'

export async function listCodeScanningAlertsCore({ token, owner, repo, state, severity, ref, perPage, page = 1, maxPages }: {
  token: string
  owner: string
  repo: string
  state: 'open' | 'dismissed' | 'fixed'
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'warning' | 'note' | 'error'
  ref?: string
  perPage: number
  page?: number
  maxPages?: number
}) {
  return withOctokit(token, async (octokit) => {
  const { items, hasMore } = await fetchAllPages(async (currentPage) => {
    const { data } = await octokit.rest.codeScanning.listAlertsForRepo({ owner, repo, state, severity, ref, per_page: perPage, page: currentPage })
    return data
  }, perPage, maxPages, page)
  return pagedList(items.map(alert => ({
    number: alert.number,
    state: alert.state,
    severity: alert.rule.security_severity_level ?? alert.rule.severity,
    rule: { id: alert.rule.id, description: alert.rule.description },
    tool: alert.tool.name,
    path: alert.most_recent_instance.location?.path,
    line: alert.most_recent_instance.location?.start_line,
    url: alert.html_url,
    createdAt: alert.created_at,
    dismissedReason: alert.dismissed_reason,
  })), perPage, page, hasMore)
  })
}

export const listDependabotAlertsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'fixed', 'dismissed', 'auto_dismissed']).optional().default('open').describe('Alert state'),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('Only alerts of this severity'),
  ecosystem: z.string().optional().describe('Only alerts for this package ecosystem, such as npm, pip or maven'),
  perPage: z.number().optional().default(30).describe('Number of results to return per page (max 100)'),
  after: z.string().optional().describe('nextCursor from a previous call, to fetch the next page'),
})

export const listDependabotAlertsDescription = 'List Dependabot alerts for vulnerable dependencies, newest first, with the package, the advisory (GHSA and CVE IDs, severity, summary), the vulnerable range and the first patched version. When hasMore, pass nextCursor as after.'

export async function listDependabotAlertsCore({ token, owner, repo, state, severity, ecosystem, perPage, after }: {
  token: string
  owner: string
  repo: string
  state: 'open' | 'fixed' | 'dismissed' | 'auto_dismissed'
  severity?: 'critical' | 'high' | 'medium' | 'low'
  ecosystem?: string
  perPage: number
  after?: string
}) {
  return withOctokit(token, async (octokit) => {
  const { data, headers } = await octokit.rest.dependabot.listAlertsForRepo({ owner, repo, state, severity, ecosystem, per_page: perPage, after })
  // This endpoint pages with cursors: the next one is the `after` parameter of the Link header's rel="next" URL.
  const next = headers.link?.match(/<([^>]+)>;\s*rel="next"/)?.[1]
  const nextCursor = next ? new URL(next).searchParams.get('after') ?? undefined : undefined
  return {
    items: data.map(alert => ({
      number: alert.number,
      state: alert.state,
      severity: alert.security_advisory.severity,
      package: alert.dependency.package?.name,
      ecosystem: alert.dependency.package?.ecosystem,
      manifestPath: alert.dependency.manifest_path,
      scope: alert.dependency.scope,
      advisory: { ghsaId: alert.security_advisory.ghsa_id, cveId: alert.security_advisory.cve_id, summary: alert.security_advisory.summary },
      vulnerableVersionRange: alert.security_vulnerability.vulnerable_version_range,
      firstPatchedVersion: alert.security_vulnerability.first_patched_version?.identifier,
      url: alert.html_url,
      createdAt: alert.created_at,
    })),
    hasMore: nextCursor !== undefined,
    perPage,
    ...nextCursor !== undefined ? { nextCursor } : {},
  }
  })
}

export const listSecretScanningAlertsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  state: z.enum(['open', 'resolved']).optional().default('open').describe('Alert state'),
  secretType: z.string().optional().describe('Comma-separated secret types, such as github_personal_access_token or aws_access_key_id'),
  perPage: z.number().optional().default(30).describe('Number of results to return per page (max 100)'),
  page: pageSchema,
  maxPages: maxPagesSchema,
})

export const listSecretScanningAlertsDescription = 'List secret scanning alerts for credentials committed to a repository, newest first, with the secret type, whether the secret is still valid, and whether push protection was bypassed. The secret itself is never returned. When hasMore, pass nextPage.'

export async function listSecretScanningAlertsCore({ token, owner, repo, state, secretType, perPage, page = 1, maxPages }: {
  token: string
  owner: string
  repo: string
  state: 'open' | 'resolved'
  secretType?: string
  perPage: number
  page?: number
  maxPages?: number
}) {
  return withOctokit(token, async (octokit) => {
  const { items, hasMore } = await fetchAllPages(async (currentPage) => {
    // `hide_secret` keeps the credential out of the response, so it never reaches the model.
    const { data } = await octokit.rest.secretScanning.listAlertsForRepo({ owner, repo, state, secret_type: secretType, per_page: perPage, page: currentPage, hide_secret: true })
    return data
  }, perPage, maxPages, page)
  return pagedList(items.map(alert => ({
    number: alert.number,
    state: alert.state,
    secretType: alert.secret_type,
    secretTypeDisplayName: alert.secret_type_display_name,
    validity: alert.validity,
    pushProtectionBypassed: alert.push_protection_bypassed,
    resolution: alert.resolution,
    url: alert.html_url,
    createdAt: alert.created_at,
  })), perPage, page, hasMore)
  })
}
