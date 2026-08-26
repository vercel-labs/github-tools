import { z } from 'zod'
import { withComposedRateLimit } from './rate-limit'
import { getCombinedStatusCore, listCheckRunsCore } from './checks'
import { compareCommitsCore } from './commits'
import { detailSchema, type DetailLevel } from './detail'
import {
  getIssueCore,
  listIssueCommentsCore,
  listLabelsCore,
} from './issues'
import {
  getPullRequestCore,
  listPullRequestFilesCore,
  listPullRequestReviewsCore,
} from './pull-requests'
import { getLatestReleaseCore, getReleaseCore, listReleasesCore } from './releases'
import { listWorkflowJobsCore, listWorkflowRunsCore } from './workflows'

export const getPullRequestContextInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  includeFiles: z.boolean().optional().default(true).describe('Include changed files metadata'),
  includeReviews: z.boolean().optional().default(true).describe('Include existing reviews'),
  includeChecks: z.boolean().optional().default(false).describe('Include check runs and combined status for the PR head SHA'),
  includePatch: z.boolean().optional().default(false).describe('Include diff patches in files (token-heavy; prefer false then fetch specific files with listPullRequestFiles)'),
  filesPerPage: z.number().optional().default(100).describe('Max files to return when includeFiles is true (max 100)'),
  detail: detailSchema,
})

export const getPullRequestContextDescription = 'Fetch pull request details plus files, reviews, and optional CI checks in one call — prefer this over separate getPullRequest / listPullRequestFiles / listPullRequestReviews calls'

export async function getPullRequestContextCore({
  token,
  owner,
  repo,
  pullNumber,
  includeFiles,
  includeReviews,
  includeChecks,
  includePatch,
  filesPerPage,
  detail = 'summary',
}: {
  token: string
  owner: string
  repo: string
  pullNumber: number
  includeFiles: boolean
  includeReviews: boolean
  includeChecks: boolean
  includePatch: boolean
  filesPerPage: number
  detail?: DetailLevel
}) {
  const pullRequest = await getPullRequestCore({ token, owner, repo, pullNumber, detail })

  const [files, reviews, checks] = await Promise.all([
    includeFiles
      ? listPullRequestFilesCore({
          token,
          owner,
          repo,
          pullNumber,
          includePatch,
          perPage: filesPerPage,
          page: 1,
        })
      : Promise.resolve(undefined),
    includeReviews
      ? listPullRequestReviewsCore({ token, owner, repo, pullNumber, perPage: 30, page: 1 })
      : Promise.resolve(undefined),
    includeChecks
      ? Promise.all([
          listCheckRunsCore({ token, owner, repo, ref: pullRequest.headSha, perPage: 100, maxPages: 1 }),
          getCombinedStatusCore({ token, owner, repo, ref: pullRequest.headSha }),
        ]).then(([checkRuns, combinedStatus]) => ({ checkRuns, combinedStatus }))
      : Promise.resolve(undefined),
  ])

  return withComposedRateLimit({
    pullRequest,
    ...files !== undefined ? { files } : {},
    ...reviews !== undefined ? { reviews } : {},
    ...checks !== undefined ? { checks } : {},
  })
}

export const getIssueContextInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue number'),
  includeLabels: z.boolean().optional().default(true).describe('Include available repository label names for triage (names only — use listLabels for descriptions)'),
  includeComments: z.boolean().optional().default(true).describe('Include recent issue comments'),
  maxComments: z.number().optional().default(5).describe('Max recent comments to include (keep small — fetch more only when needed)'),
  // Context tools are one-shot — default to the full body so the agent does not re-fetch with detail full
  detail: z
    .enum(['summary', 'full'])
    .optional()
    .default('full')
    .describe('full returns the complete body (default for this one-shot tool); summary truncates to ~500 chars'),
})

export const getIssueContextDescription = 'Fetch an issue plus available label names and recent comments in one call — prefer this over separate getIssue / listLabels / comment calls when triaging. Call once; do not re-fetch the same issue.'

export async function getIssueContextCore({
  token,
  owner,
  repo,
  issueNumber,
  includeLabels,
  includeComments,
  maxComments,
  detail = 'full',
}: {
  token: string
  owner: string
  repo: string
  issueNumber: number
  includeLabels: boolean
  includeComments: boolean
  maxComments: number
  detail?: DetailLevel
}) {
  const [issue, labels, comments] = await Promise.all([
    getIssueCore({ token, owner, repo, issueNumber, detail }),
    includeLabels
      ? listLabelsCore({ token, owner, repo, perPage: 100, page: 1 })
      : Promise.resolve(undefined),
    includeComments
      ? listIssueCommentsCore({
          token,
          owner,
          repo,
          issueNumber,
          perPage: maxComments,
          page: 1,
          detail,
        })
      : Promise.resolve(undefined),
  ])

  return withComposedRateLimit({
    issue,
    // Names only — full label objects (color/description) dominate triage payloads on large repos
    ...labels !== undefined ? { labelNames: labels.map(label => label.name) } : {},
    ...comments !== undefined ? { comments } : {},
  })
}

export const getReleaseContextInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  releaseId: z.number().optional().describe('Release ID — omit to use the latest published release'),
  includePrevious: z.boolean().optional().default(true).describe('Include the previous release for comparison'),
  includeCompare: z.boolean().optional().default(true).describe('Include a compare between the previous and current release tags'),
  detail: detailSchema,
})

export const getReleaseContextDescription = 'Fetch a release (latest or by ID) plus the previous release and tag comparison in one call — prefer this when preparing or reviewing a release'

export async function getReleaseContextCore({
  token,
  owner,
  repo,
  releaseId,
  includePrevious,
  includeCompare,
  detail = 'summary',
}: {
  token: string
  owner: string
  repo: string
  releaseId?: number
  includePrevious: boolean
  includeCompare: boolean
  detail?: DetailLevel
}) {
  const release = releaseId != null
    ? await getReleaseCore({ token, owner, repo, releaseId, detail })
    : await getLatestReleaseCore({ token, owner, repo, detail })

  let previous: Awaited<ReturnType<typeof listReleasesCore>>[number] | undefined
  if (includePrevious || includeCompare) {
    const releases = await listReleasesCore({
      token,
      owner,
      repo,
      perPage: 10,
      maxPages: 1,
      detail,
    })
    previous = releases.find(r => r.id !== release.id && !r.draft)
  }

  let comparison: Awaited<ReturnType<typeof compareCommitsCore>> | undefined
  if (includeCompare && previous) {
    comparison = await compareCommitsCore({
      token,
      owner,
      repo,
      base: previous.tagName,
      head: release.tagName,
      includePatch: false,
    })
  }

  return withComposedRateLimit({
    release,
    ...previous !== undefined ? { previousRelease: previous } : {},
    ...comparison !== undefined ? { comparison } : {},
  })
}

export const getCiFailureContextInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  ref: z.string().describe('Branch, tag, or commit SHA to inspect'),
  maxFailedRuns: z.number().optional().default(5).describe('Max recent failed workflow runs to include'),
  maxFailedJobs: z.number().optional().default(10).describe('Max failed jobs (with failed steps) from the latest failed run'),
})

export const getCiFailureContextDescription = 'Diagnose CI failures for a ref in one call — combined status, failing check runs, recent failed workflow runs, and failed jobs/steps from the latest failure'

const FAILURE_CONCLUSIONS = new Set(['failure', 'timed_out', 'action_required', 'cancelled', 'startup_failure'])

export async function getCiFailureContextCore({
  token,
  owner,
  repo,
  ref,
  maxFailedRuns,
  maxFailedJobs,
}: {
  token: string
  owner: string
  repo: string
  ref: string
  maxFailedRuns: number
  maxFailedJobs: number
}) {
  const [combinedStatus, checkRunsResult, failedRuns] = await Promise.all([
    getCombinedStatusCore({ token, owner, repo, ref }),
    listCheckRunsCore({ token, owner, repo, ref, perPage: 100, maxPages: 1 }),
    listWorkflowRunsCore({
      token,
      owner,
      repo,
      branch: ref,
      status: 'failure',
      perPage: maxFailedRuns,
      page: 1,
      maxPages: 1,
    }),
  ])

  const failedCheckRuns = checkRunsResult.checkRuns.filter(
    run => run.conclusion != null && FAILURE_CONCLUSIONS.has(run.conclusion),
  )

  const latestFailedRun = failedRuns.runs[0]
  let latestFailure:
    | {
        run: (typeof failedRuns.runs)[number]
        jobs: Array<{
          id: number
          name: string
          status: string
          conclusion: string | null
          url: string | null
          startedAt: string
          completedAt: string | null
          steps?: Array<{
            name: string
            status: string
            conclusion: string | null
            number: number
            startedAt?: string | null
            completedAt?: string | null
          }>
        }>
      }
    | undefined

  if (latestFailedRun) {
    const jobsResult = await listWorkflowJobsCore({
      token,
      owner,
      repo,
      runId: latestFailedRun.id,
      filter: 'latest',
      perPage: 100,
      page: 1,
    })

    const failedJobs = jobsResult.jobs
      .filter(job => job.conclusion != null && FAILURE_CONCLUSIONS.has(job.conclusion))
      .slice(0, maxFailedJobs)
      .map(job => ({
        id: job.id,
        name: job.name,
        status: job.status,
        conclusion: job.conclusion,
        url: job.url,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        steps: job.steps?.filter(
          step => step.conclusion != null && FAILURE_CONCLUSIONS.has(step.conclusion),
        ),
      }))

    latestFailure = { run: latestFailedRun, jobs: failedJobs }
  }

  return withComposedRateLimit({
    ref,
    combinedStatus,
    failedCheckRuns,
    checkRunTotalCount: checkRunsResult.totalCount,
    recentFailedRuns: failedRuns.runs,
    ...latestFailure !== undefined ? { latestFailure } : {},
  })
}
