import { z } from 'zod'
import { withOctokit } from '../client'
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
import { getWorkflowJobLogsCore, getWorkflowRunCore, listWorkflowJobsCore, listWorkflowRunsCore } from './workflows'

export const getPullRequestContextInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  pullNumber: z.number().describe('Pull request number'),
  includeFiles: z.boolean().optional().default(true).describe('Include changed files metadata'),
  includeReviews: z.boolean().optional().default(true).describe('Include existing reviews'),
  includeChecks: z.boolean().optional().default(false).describe('Include check runs and combined status for the PR head SHA'),
  includePatch: z.boolean().optional().default(false).describe('Include diff patches in files (token-heavy; prefer false then fetch specific files with listPullRequestFiles)'),
  filesPerPage: z.number().optional().default(100).describe('Max files to return when includeFiles is true (max 100)'),
  includeLinkedIssues: z.boolean().optional().default(false).describe('Include the issues this pull request closes when merged ("Fixes #12" in its body, or linked in the sidebar). Needs read access to issues'),
  detail: detailSchema,
})

export const getPullRequestContextDescription = 'Fetch pull request details plus files, reviews, and optional CI checks and linked issues in one call — prefer this over separate getPullRequest / listPullRequestFiles / listPullRequestReviews calls. filesHasMore / reviewsHasMore mean more pages exist on those lists.'

const CLOSING_ISSUES_QUERY = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      closingIssuesReferences(first: 10) { nodes { number title state url repository { nameWithOwner } } }
    }
  }
}`

type ClosingIssuesQueryData = {
  repository: { pullRequest: { closingIssuesReferences: { nodes: Array<{ number: number, title: string, state: string, url: string, repository: { nameWithOwner: string } }> } } }
}

async function listLinkedIssues({ token, owner, repo, pullNumber }: { token: string, owner: string, repo: string, pullNumber: number }) {
  return withOctokit(token, async (octokit) => {
    const data = (await octokit.graphql(CLOSING_ISSUES_QUERY, { owner, name: repo, number: pullNumber })) as ClosingIssuesQueryData
    return {
      items: data.repository.pullRequest.closingIssuesReferences.nodes.map(issue => ({
        repository: issue.repository.nameWithOwner,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.url,
      })),
    }
  })
}

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
  includeLinkedIssues,
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
  includeLinkedIssues: boolean
  detail?: DetailLevel
}) {
  const pullRequest = await getPullRequestCore({ token, owner, repo, pullNumber, detail })

  const [files, reviews, checks, linkedIssues] = await Promise.all([
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
    includeLinkedIssues
      ? listLinkedIssues({ token, owner, repo, pullNumber })
      : Promise.resolve(undefined),
  ])

  return withComposedRateLimit({
    pullRequest,
    ...files !== undefined ? { files: files.items, filesHasMore: files.hasMore } : {},
    ...reviews !== undefined ? { reviews: reviews.items, reviewsHasMore: reviews.hasMore } : {},
    ...checks !== undefined ? { checks } : {},
    ...linkedIssues !== undefined ? { linkedIssues: linkedIssues.items } : {},
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

export const getIssueContextDescription = 'Fetch an issue plus available label names and recent comments in one call — prefer this over separate getIssue / listLabels / comment calls when triaging. Call once; do not re-fetch the same issue. commentsHasMore means more comments exist — use listIssueComments with nextPage.'

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
    ...labels !== undefined ? { labelNames: labels.items.map(label => label.name) } : {},
    ...comments !== undefined ? { comments: comments.items, commentsHasMore: comments.hasMore } : {},
  })
}

export const getReleaseContextInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  releaseId: z.number().optional().describe('Release ID. Omit this and `tag` to use the latest published release'),
  tag: z.string().optional().describe('Release tag, such as "v2.3.0". Omit this and `releaseId` to use the latest published release'),
  previousTag: z.string().optional().describe('Tag to compare against, such as "v2.2.0". Defaults to the release published before this one; set it when a repository publishes several packages'),
  includePrevious: z.boolean().optional().default(true).describe('Include the previous release for comparison'),
  includeCompare: z.boolean().optional().default(true).describe('Include a compare between the previous and current release tags'),
  detail: detailSchema,
})

export const getReleaseContextDescription = 'Fetch a release (latest, by ID, or by tag) plus the release before it and the comparison between their tags in one call — prefer this when preparing or reviewing a release'

// Stops looking for the previous release after 1,000 releases; pass `previousTag` for an older one.
const MAX_RELEASE_PAGES = 10

export async function getReleaseContextCore({
  token,
  owner,
  repo,
  releaseId,
  tag,
  previousTag,
  includePrevious,
  includeCompare,
  detail = 'summary',
}: {
  token: string
  owner: string
  repo: string
  releaseId?: number
  tag?: string
  previousTag?: string
  includePrevious: boolean
  includeCompare: boolean
  detail?: DetailLevel
}) {
  const release = releaseId !== undefined || tag !== undefined
    ? await getReleaseCore({ token, owner, repo, releaseId, tag, detail })
    : await getLatestReleaseCore({ token, owner, repo, detail })

  let previous: Awaited<ReturnType<typeof getReleaseCore>> | Awaited<ReturnType<typeof listReleasesCore>>['items'][number] | undefined
  if (previousTag !== undefined) {
    previous = await getReleaseCore({ token, owner, repo, tag: previousTag, detail })
  }
  else if (includePrevious || includeCompare) {
    // Releases come newest first, so the previous one is the next published release after this one.
    let seen = false
    for (let page = 1; page <= MAX_RELEASE_PAGES && previous === undefined; page++) {
      const releases = await listReleasesCore({ token, owner, repo, perPage: 100, page, detail })
      const index: number = seen ? -1 : releases.items.findIndex(r => r.id === release.id)
      seen ||= index !== -1
      if (seen) previous = releases.items.slice(index + 1).find(r => !r.draft)
      if (!releases.hasMore) break
    }
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
  ref: z.string().optional().describe('Branch, tag, or commit SHA to inspect. Pass this or `runId`'),
  runId: z.number().optional().describe('Workflow run ID to diagnose, such as the number in a run URL. Pass this or `ref`'),
  maxFailedRuns: z.number().optional().default(5).describe('Max recent failed workflow runs to include for a `ref`'),
  maxFailedJobs: z.number().optional().default(10).describe('Max failed jobs (with failed steps) from the run'),
  logLines: z.number().optional().default(40).describe('Lines from the end of the log of each of the first three failed jobs; 0 to skip logs'),
})

export const getCiFailureContextDescription = 'Diagnose CI failures in one call, for a ref or one workflow run: failing checks and statuses (for a ref), recent failed runs, failed jobs and steps, and the end of each failed job\'s log'

const MAX_LOGGED_JOBS = 3

const FAILURE_CONCLUSIONS = new Set(['failure', 'timed_out', 'action_required', 'cancelled', 'startup_failure'])

export async function getCiFailureContextCore({
  token,
  owner,
  repo,
  ref,
  runId,
  maxFailedRuns,
  maxFailedJobs,
  logLines,
}: {
  token: string
  owner: string
  repo: string
  ref?: string
  runId?: number
  maxFailedRuns: number
  maxFailedJobs: number
  logLines: number
}) {
  if (runId !== undefined) {
    const [run, failedJobs] = await Promise.all([
      getWorkflowRunCore({ token, owner, repo, runId }),
      failedJobsWithLogs({ token, owner, repo, runId, maxFailedJobs, logLines }),
    ])
    return withComposedRateLimit({ run, failedJobs })
  }
  if (ref === undefined) throw new Error('getCiFailureContext needs `ref` or `runId`.')

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
  const latestFailure = latestFailedRun
    ? { run: latestFailedRun, jobs: await failedJobsWithLogs({ token, owner, repo, runId: latestFailedRun.id, maxFailedJobs, logLines }) }
    : undefined

  return withComposedRateLimit({
    ref,
    combinedStatus,
    failedCheckRuns,
    checkRunTotalCount: checkRunsResult.totalCount,
    recentFailedRuns: failedRuns.runs,
    ...latestFailure !== undefined ? { latestFailure } : {},
  })
}

async function failedJobsWithLogs({ token, owner, repo, runId, maxFailedJobs, logLines }: {
  token: string
  owner: string
  repo: string
  runId: number
  maxFailedJobs: number
  logLines: number
}) {
  const jobsResult = await listWorkflowJobsCore({ token, owner, repo, runId, filter: 'latest', perPage: 100, page: 1 })
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
  if (logLines === 0) return failedJobs
  // GitHub deletes logs after the retention period, so one missing log reports its error instead of failing the diagnosis.
  const logs = await Promise.all(failedJobs.slice(0, MAX_LOGGED_JOBS).map(job =>
    getWorkflowJobLogsCore({ token, owner, repo, jobId: job.id, maxLines: logLines })
      .then(({ log, omittedLines }) => ({ log, omittedLogLines: omittedLines }))
      .catch((error: unknown) => ({ logError: error instanceof Error ? error.message : String(error) })),
  ))
  return failedJobs.map((job, index) => ({ ...job, ...logs[index] }))
}
