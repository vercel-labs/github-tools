import type { ToolModelOutput } from 'eve/tools'
import type { z } from 'zod'
import type { CommitIdentity } from '../types'
import * as bundles from '../core/bundles'
import * as checks from '../core/checks'
import * as commits from '../core/commits'
import { mergeContextArgs, softenContextSchema, type GithubToolsContext } from '../core/context'
import * as discussions from '../core/discussions'
import * as gists from '../core/gists'
import * as issues from '../core/issues'
import * as notifications from '../core/notifications'
import {
  compareCommitsToModelOutput,
  getCommitToModelOutput,
  getFileContentToModelOutput,
  getPullRequestContextToModelOutput,
  listPullRequestFilesToModelOutput,
} from '../core/model-output'
import * as pullRequests from '../core/pull-requests'
import * as reactions from '../core/reactions'
import * as releases from '../core/releases'
import * as repository from '../core/repository'
import * as search from '../core/search'
import * as workflows from '../core/workflows'
import { stripRateLimit } from '../core/rate-limit'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { GithubWriteToolName } from '../core/write-tools'
import type { GithubToolName } from '../core/tool-names'
export type { GithubToolName } from '../core/tool-names'
export { ALL_GITHUB_TOOL_NAMES } from '../core/tool-names'

export type ToolBuildContext = {
  token: GithubTokenInput
  context?: GithubToolsContext
  author?: CommitIdentity
  committer?: CommitIdentity
  coAuthors?: CommitIdentity[]
}

type ToolRegistryEntry = {
  name: GithubToolName
  writeTool?: GithubWriteToolName
  description: string
  inputSchema: z.ZodType
  execute: (args: Record<string, unknown>) => Promise<unknown>
  toModelOutput?: (output: unknown) => ToolModelOutput
}

function withToken<T extends Record<string, unknown>>(
  core: (args: T & { token: string }) => Promise<unknown>,
  ctx: ToolBuildContext,
  extra?: Record<string, unknown>,
) {
  return async (input: Record<string, unknown>) =>
    core({
      token: await resolveGithubToken(ctx.token),
      ...extra,
      ...mergeContextArgs(input, ctx.context ?? {}),
    } as T & { token: string })
}

function modelOutputAdapter(
  fn: (options: { toolCallId: string, input: unknown, output: unknown }) => { type: 'json' | 'text', value: unknown },
) {
  return (output: unknown) => fn({ toolCallId: '', input: {}, output }) as ToolModelOutput
}

const GITHUB_EVE_TOOL_MODEL_OUTPUT = {
  getFileContent: modelOutputAdapter(getFileContentToModelOutput),
  listPullRequestFiles: modelOutputAdapter(listPullRequestFilesToModelOutput),
  getPullRequestContext: modelOutputAdapter(getPullRequestContextToModelOutput),
  getCommit: modelOutputAdapter(getCommitToModelOutput),
  compareCommits: modelOutputAdapter(compareCommitsToModelOutput),
} satisfies Partial<Record<GithubToolName, (output: unknown) => ToolModelOutput>>

/** Whether a GitHub tool has a built-in eve `toModelOutput` projection. */
export function hasGithubEveToolModelOutput(name: GithubToolName): boolean {
  return Object.hasOwn(GITHUB_EVE_TOOL_MODEL_OUTPUT, name)
}

/**
 * Apply the built-in eve `toModelOutput` projection for a tool.
 * Strips `rateLimit` so it never reaches the model. Tools without a dedicated
 * formatter get `{ type: 'json', value }` of the remaining payload.
 * Used by `@github-tools/eve-extension` so the callback only closes over a serializable tool name.
 */
export function formatGithubEveToolOutput(name: GithubToolName, output: unknown): ToolModelOutput {
  const stripped = stripRateLimit(output)
  // `runGithubToolStep` returns `{ error }` when execute throws. The per-tool
  // formatters assume the success shape (e.g. `listPullRequestFilesToModelOutput`
  // calls `.map` on the payload), so dispatching an error payload would throw a
  // second time inside model-output formatting and re-break the tool loop.
  if (isErrorPayload(stripped)) {
    return { type: 'json', value: stripped }
  }
  const format = GITHUB_EVE_TOOL_MODEL_OUTPUT[name as keyof typeof GITHUB_EVE_TOOL_MODEL_OUTPUT]
  if (!format) {
    return { type: 'json', value: stripped }
  }
  return format(stripped)
}

function isErrorPayload(output: unknown): output is { error: string } {
  return (
    output != null
    && typeof output === 'object'
    && !Array.isArray(output)
    && typeof (output as { error?: unknown }).error === 'string'
  )
}

export function createToolRegistry(ctx: ToolBuildContext): ToolRegistryEntry[] {
  const entries: ToolRegistryEntry[] = [
    {
      name: 'getRepository',
      description: repository.getRepositoryDescription,
      inputSchema: repository.getRepositoryInputSchema,
      execute: withToken(repository.getRepositoryCore, ctx),
    },
    {
      name: 'listBranches',
      description: repository.listBranchesDescription,
      inputSchema: repository.listBranchesInputSchema,
      execute: withToken(repository.listBranchesCore, ctx),
    },
    {
      name: 'getFileContent',
      description: repository.getFileContentDescription,
      inputSchema: repository.getFileContentInputSchema,
      execute: withToken(repository.getFileContentCore, ctx),
      toModelOutput: GITHUB_EVE_TOOL_MODEL_OUTPUT.getFileContent,
    },
    {
      name: 'getRepositoryTree',
      description: repository.getRepositoryTreeDescription,
      inputSchema: repository.getRepositoryTreeInputSchema,
      execute: withToken(repository.getRepositoryTreeCore, ctx),
    },
    {
      name: 'createBranch',
      writeTool: 'createBranch',
      description: repository.createBranchDescription,
      inputSchema: repository.createBranchInputSchema,
      execute: withToken(repository.createBranchCore, ctx),
    },
    {
      name: 'forkRepository',
      writeTool: 'forkRepository',
      description: repository.forkRepositoryDescription,
      inputSchema: repository.forkRepositoryInputSchema,
      execute: withToken(repository.forkRepositoryCore, ctx),
    },
    {
      name: 'createRepository',
      writeTool: 'createRepository',
      description: repository.createRepositoryDescription,
      inputSchema: repository.createRepositoryInputSchema,
      execute: withToken(repository.createRepositoryCore, ctx),
    },
    {
      name: 'createOrUpdateFile',
      writeTool: 'createOrUpdateFile',
      description: repository.createOrUpdateFileDescription,
      inputSchema: repository.createOrUpdateFileInputSchema,
      execute: withToken(repository.createOrUpdateFileCore, ctx, {
        author: ctx.author,
        committer: ctx.committer,
        coAuthors: ctx.coAuthors,
      }),
    },
    {
      name: 'listPullRequests',
      description: pullRequests.listPullRequestsDescription,
      inputSchema: pullRequests.listPullRequestsInputSchema,
      execute: withToken(pullRequests.listPullRequestsCore, ctx),
    },
    {
      name: 'getPullRequest',
      description: pullRequests.getPullRequestDescription,
      inputSchema: pullRequests.getPullRequestInputSchema,
      execute: withToken(pullRequests.getPullRequestCore, ctx),
    },
    {
      name: 'createPullRequest',
      writeTool: 'createPullRequest',
      description: pullRequests.createPullRequestDescription,
      inputSchema: pullRequests.createPullRequestInputSchema,
      execute: withToken(pullRequests.createPullRequestCore, ctx),
    },
    {
      name: 'mergePullRequest',
      writeTool: 'mergePullRequest',
      description: pullRequests.mergePullRequestDescription,
      inputSchema: pullRequests.mergePullRequestInputSchema,
      execute: withToken(pullRequests.mergePullRequestCore, ctx, { coAuthors: ctx.coAuthors }),
    },
    {
      name: 'updatePullRequest',
      writeTool: 'updatePullRequest',
      description: pullRequests.updatePullRequestDescription,
      inputSchema: pullRequests.updatePullRequestInputSchema,
      execute: withToken(pullRequests.updatePullRequestCore, ctx),
    },
    {
      name: 'addPullRequestComment',
      writeTool: 'addPullRequestComment',
      description: pullRequests.addPullRequestCommentDescription,
      inputSchema: pullRequests.addPullRequestCommentInputSchema,
      execute: withToken(pullRequests.addPullRequestCommentCore, ctx),
    },
    {
      name: 'updatePullRequestComment',
      writeTool: 'updatePullRequestComment',
      description: pullRequests.updatePullRequestCommentDescription,
      inputSchema: pullRequests.updatePullRequestCommentInputSchema,
      execute: withToken(pullRequests.updatePullRequestCommentCore, ctx),
    },
    {
      name: 'deletePullRequestComment',
      writeTool: 'deletePullRequestComment',
      description: pullRequests.deletePullRequestCommentDescription,
      inputSchema: pullRequests.deletePullRequestCommentInputSchema,
      execute: withToken(pullRequests.deletePullRequestCommentCore, ctx),
    },
    {
      name: 'listPullRequestFiles',
      description: pullRequests.listPullRequestFilesDescription,
      inputSchema: pullRequests.listPullRequestFilesInputSchema,
      execute: withToken(pullRequests.listPullRequestFilesCore, ctx),
      toModelOutput: GITHUB_EVE_TOOL_MODEL_OUTPUT.listPullRequestFiles,
    },
    {
      name: 'listPullRequestReviews',
      description: pullRequests.listPullRequestReviewsDescription,
      inputSchema: pullRequests.listPullRequestReviewsInputSchema,
      execute: withToken(pullRequests.listPullRequestReviewsCore, ctx),
    },
    {
      name: 'createPullRequestReview',
      writeTool: 'createPullRequestReview',
      description: pullRequests.createPullRequestReviewDescription,
      inputSchema: pullRequests.createPullRequestReviewInputSchema,
      execute: withToken(pullRequests.createPullRequestReviewCore, ctx),
    },
    {
      name: 'requestReviewers',
      writeTool: 'requestReviewers',
      description: pullRequests.requestReviewersDescription,
      inputSchema: pullRequests.requestReviewersInputSchema,
      execute: withToken(pullRequests.requestReviewersCore, ctx),
    },
    {
      name: 'getPullRequestContext',
      description: bundles.getPullRequestContextDescription,
      inputSchema: bundles.getPullRequestContextInputSchema,
      execute: withToken(bundles.getPullRequestContextCore, ctx),
      toModelOutput: GITHUB_EVE_TOOL_MODEL_OUTPUT.getPullRequestContext,
    },
    {
      name: 'getIssueContext',
      description: bundles.getIssueContextDescription,
      inputSchema: bundles.getIssueContextInputSchema,
      execute: withToken(bundles.getIssueContextCore, ctx),
    },
    {
      name: 'listIssues',
      description: issues.listIssuesDescription,
      inputSchema: issues.listIssuesInputSchema,
      execute: withToken(issues.listIssuesCore, ctx),
    },
    {
      name: 'getIssue',
      description: issues.getIssueDescription,
      inputSchema: issues.getIssueInputSchema,
      execute: withToken(issues.getIssueCore, ctx),
    },
    {
      name: 'listIssueComments',
      description: issues.listIssueCommentsDescription,
      inputSchema: issues.listIssueCommentsInputSchema,
      execute: withToken(issues.listIssueCommentsCore, ctx),
    },
    {
      name: 'createIssue',
      writeTool: 'createIssue',
      description: issues.createIssueDescription,
      inputSchema: issues.createIssueInputSchema,
      execute: withToken(issues.createIssueCore, ctx),
    },
    {
      name: 'addIssueComment',
      writeTool: 'addIssueComment',
      description: issues.addIssueCommentDescription,
      inputSchema: issues.addIssueCommentInputSchema,
      execute: withToken(issues.addIssueCommentCore, ctx),
    },
    {
      name: 'updateIssueComment',
      writeTool: 'updateIssueComment',
      description: issues.updateIssueCommentDescription,
      inputSchema: issues.updateIssueCommentInputSchema,
      execute: withToken(issues.updateIssueCommentCore, ctx),
    },
    {
      name: 'deleteIssueComment',
      writeTool: 'deleteIssueComment',
      description: issues.deleteIssueCommentDescription,
      inputSchema: issues.deleteIssueCommentInputSchema,
      execute: withToken(issues.deleteIssueCommentCore, ctx),
    },
    {
      name: 'closeIssue',
      writeTool: 'closeIssue',
      description: issues.closeIssueDescription,
      inputSchema: issues.closeIssueInputSchema,
      execute: withToken(issues.closeIssueCore, ctx),
    },
    {
      name: 'updateIssue',
      writeTool: 'updateIssue',
      description: issues.updateIssueDescription,
      inputSchema: issues.updateIssueInputSchema,
      execute: withToken(issues.updateIssueCore, ctx),
    },
    {
      name: 'listLabels',
      description: issues.listLabelsDescription,
      inputSchema: issues.listLabelsInputSchema,
      execute: withToken(issues.listLabelsCore, ctx),
    },
    {
      name: 'addLabels',
      writeTool: 'addLabels',
      description: issues.addLabelsDescription,
      inputSchema: issues.addLabelsInputSchema,
      execute: withToken(issues.addLabelsCore, ctx),
    },
    {
      name: 'removeLabel',
      writeTool: 'removeLabel',
      description: issues.removeLabelDescription,
      inputSchema: issues.removeLabelInputSchema,
      execute: withToken(issues.removeLabelCore, ctx),
    },
    {
      name: 'createLabel',
      writeTool: 'createLabel',
      description: issues.createLabelDescription,
      inputSchema: issues.createLabelInputSchema,
      execute: withToken(issues.createLabelCore, ctx),
    },
    {
      name: 'updateLabel',
      writeTool: 'updateLabel',
      description: issues.updateLabelDescription,
      inputSchema: issues.updateLabelInputSchema,
      execute: withToken(issues.updateLabelCore, ctx),
    },
    {
      name: 'deleteLabel',
      writeTool: 'deleteLabel',
      description: issues.deleteLabelDescription,
      inputSchema: issues.deleteLabelInputSchema,
      execute: withToken(issues.deleteLabelCore, ctx),
    },
    {
      name: 'addAssignees',
      writeTool: 'addAssignees',
      description: issues.addAssigneesDescription,
      inputSchema: issues.addAssigneesInputSchema,
      execute: withToken(issues.addAssigneesCore, ctx),
    },
    {
      name: 'removeAssignees',
      writeTool: 'removeAssignees',
      description: issues.removeAssigneesDescription,
      inputSchema: issues.removeAssigneesInputSchema,
      execute: withToken(issues.removeAssigneesCore, ctx),
    },
    {
      name: 'listIssueReactions',
      description: reactions.listIssueReactionsDescription,
      inputSchema: reactions.listIssueReactionsInputSchema,
      execute: withToken(reactions.listIssueReactionsCore, ctx),
    },
    {
      name: 'addIssueReaction',
      writeTool: 'addIssueReaction',
      description: reactions.addIssueReactionDescription,
      inputSchema: reactions.addIssueReactionInputSchema,
      execute: withToken(reactions.addIssueReactionCore, ctx),
    },
    {
      name: 'listCommentReactions',
      description: reactions.listCommentReactionsDescription,
      inputSchema: reactions.listCommentReactionsInputSchema,
      execute: withToken(reactions.listCommentReactionsCore, ctx),
    },
    {
      name: 'addCommentReaction',
      writeTool: 'addCommentReaction',
      description: reactions.addCommentReactionDescription,
      inputSchema: reactions.addCommentReactionInputSchema,
      execute: withToken(reactions.addCommentReactionCore, ctx),
    },
    {
      name: 'listDiscussions',
      description: discussions.listDiscussionsDescription,
      inputSchema: discussions.listDiscussionsInputSchema,
      execute: withToken(discussions.listDiscussionsCore, ctx),
    },
    {
      name: 'getDiscussion',
      description: discussions.getDiscussionDescription,
      inputSchema: discussions.getDiscussionInputSchema,
      execute: withToken(discussions.getDiscussionCore, ctx),
    },
    {
      name: 'addDiscussionComment',
      writeTool: 'addDiscussionComment',
      description: discussions.addDiscussionCommentDescription,
      inputSchema: discussions.addDiscussionCommentInputSchema,
      execute: withToken(discussions.addDiscussionCommentCore, ctx),
    },
    {
      name: 'listNotifications',
      description: notifications.listNotificationsDescription,
      inputSchema: notifications.listNotificationsInputSchema,
      execute: withToken(notifications.listNotificationsCore, ctx),
    },
    {
      name: 'markNotificationRead',
      writeTool: 'markNotificationRead',
      description: notifications.markNotificationReadDescription,
      inputSchema: notifications.markNotificationReadInputSchema,
      execute: withToken(notifications.markNotificationReadCore, ctx),
    },
    {
      name: 'searchCode',
      description: search.searchCodeDescription,
      inputSchema: search.searchCodeInputSchema,
      execute: withToken(search.searchCodeCore, ctx),
    },
    {
      name: 'searchRepositories',
      description: search.searchRepositoriesDescription,
      inputSchema: search.searchRepositoriesInputSchema,
      execute: withToken(search.searchRepositoriesCore, ctx),
    },
    {
      name: 'searchIssues',
      description: search.searchIssuesDescription,
      inputSchema: search.searchIssuesInputSchema,
      execute: withToken(search.searchIssuesCore, ctx),
    },
    {
      name: 'listCommits',
      description: commits.listCommitsDescription,
      inputSchema: commits.listCommitsInputSchema,
      execute: withToken(commits.listCommitsCore, ctx),
    },
    {
      name: 'getCommit',
      description: commits.getCommitDescription,
      inputSchema: commits.getCommitInputSchema,
      execute: withToken(commits.getCommitCore, ctx),
      toModelOutput: GITHUB_EVE_TOOL_MODEL_OUTPUT.getCommit,
    },
    {
      name: 'getBlame',
      description: commits.getBlameDescription,
      inputSchema: commits.getBlameInputSchema,
      execute: withToken(commits.getBlameCore, ctx),
    },
    {
      name: 'compareCommits',
      description: commits.compareCommitsDescription,
      inputSchema: commits.compareCommitsInputSchema,
      execute: withToken(commits.compareCommitsCore, ctx),
      toModelOutput: GITHUB_EVE_TOOL_MODEL_OUTPUT.compareCommits,
    },
    {
      name: 'listGists',
      description: gists.listGistsDescription,
      inputSchema: gists.listGistsInputSchema,
      execute: withToken(gists.listGistsCore, ctx),
    },
    {
      name: 'getGist',
      description: gists.getGistDescription,
      inputSchema: gists.getGistInputSchema,
      execute: withToken(gists.getGistCore, ctx),
    },
    {
      name: 'listGistComments',
      description: gists.listGistCommentsDescription,
      inputSchema: gists.listGistCommentsInputSchema,
      execute: withToken(gists.listGistCommentsCore, ctx),
    },
    {
      name: 'createGist',
      writeTool: 'createGist',
      description: gists.createGistDescription,
      inputSchema: gists.createGistInputSchema,
      execute: withToken(gists.createGistCore, ctx),
    },
    {
      name: 'updateGist',
      writeTool: 'updateGist',
      description: gists.updateGistDescription,
      inputSchema: gists.updateGistInputSchema,
      execute: withToken(gists.updateGistCore, ctx),
    },
    {
      name: 'deleteGist',
      writeTool: 'deleteGist',
      description: gists.deleteGistDescription,
      inputSchema: gists.deleteGistInputSchema,
      execute: withToken(gists.deleteGistCore, ctx),
    },
    {
      name: 'createGistComment',
      writeTool: 'createGistComment',
      description: gists.createGistCommentDescription,
      inputSchema: gists.createGistCommentInputSchema,
      execute: withToken(gists.createGistCommentCore, ctx),
    },
    {
      name: 'listWorkflows',
      description: workflows.listWorkflowsDescription,
      inputSchema: workflows.listWorkflowsInputSchema,
      execute: withToken(workflows.listWorkflowsCore, ctx),
    },
    {
      name: 'listWorkflowRuns',
      description: workflows.listWorkflowRunsDescription,
      inputSchema: workflows.listWorkflowRunsInputSchema,
      execute: withToken(workflows.listWorkflowRunsCore, ctx),
    },
    {
      name: 'getWorkflowRun',
      description: workflows.getWorkflowRunDescription,
      inputSchema: workflows.getWorkflowRunInputSchema,
      execute: withToken(workflows.getWorkflowRunCore, ctx),
    },
    {
      name: 'listWorkflowJobs',
      description: workflows.listWorkflowJobsDescription,
      inputSchema: workflows.listWorkflowJobsInputSchema,
      execute: withToken(workflows.listWorkflowJobsCore, ctx),
    },
    {
      name: 'triggerWorkflow',
      writeTool: 'triggerWorkflow',
      description: workflows.triggerWorkflowDescription,
      inputSchema: workflows.triggerWorkflowInputSchema,
      execute: withToken(workflows.triggerWorkflowCore, ctx),
    },
    {
      name: 'cancelWorkflowRun',
      writeTool: 'cancelWorkflowRun',
      description: workflows.cancelWorkflowRunDescription,
      inputSchema: workflows.cancelWorkflowRunInputSchema,
      execute: withToken(workflows.cancelWorkflowRunCore, ctx),
    },
    {
      name: 'rerunWorkflowRun',
      writeTool: 'rerunWorkflowRun',
      description: workflows.rerunWorkflowRunDescription,
      inputSchema: workflows.rerunWorkflowRunInputSchema,
      execute: withToken(workflows.rerunWorkflowRunCore, ctx),
    },
    {
      name: 'listCheckRuns',
      description: checks.listCheckRunsDescription,
      inputSchema: checks.listCheckRunsInputSchema,
      execute: withToken(checks.listCheckRunsCore, ctx),
    },
    {
      name: 'getCombinedStatus',
      description: checks.getCombinedStatusDescription,
      inputSchema: checks.getCombinedStatusInputSchema,
      execute: withToken(checks.getCombinedStatusCore, ctx),
    },
    {
      name: 'getCiFailureContext',
      description: bundles.getCiFailureContextDescription,
      inputSchema: bundles.getCiFailureContextInputSchema,
      execute: withToken(bundles.getCiFailureContextCore, ctx),
    },
    {
      name: 'listReleases',
      description: releases.listReleasesDescription,
      inputSchema: releases.listReleasesInputSchema,
      execute: withToken(releases.listReleasesCore, ctx),
    },
    {
      name: 'getLatestRelease',
      description: releases.getLatestReleaseDescription,
      inputSchema: releases.getLatestReleaseInputSchema,
      execute: withToken(releases.getLatestReleaseCore, ctx),
    },
    {
      name: 'getRelease',
      description: releases.getReleaseDescription,
      inputSchema: releases.getReleaseInputSchema,
      execute: withToken(releases.getReleaseCore, ctx),
    },
    {
      name: 'getReleaseContext',
      description: bundles.getReleaseContextDescription,
      inputSchema: bundles.getReleaseContextInputSchema,
      execute: withToken(bundles.getReleaseContextCore, ctx),
    },
    {
      name: 'createRelease',
      writeTool: 'createRelease',
      description: releases.createReleaseDescription,
      inputSchema: releases.createReleaseInputSchema,
      execute: withToken(releases.createReleaseCore, ctx),
    },
    {
      name: 'updateRelease',
      writeTool: 'updateRelease',
      description: releases.updateReleaseDescription,
      inputSchema: releases.updateReleaseInputSchema,
      execute: withToken(releases.updateReleaseCore, ctx),
    },
    {
      name: 'deleteRelease',
      writeTool: 'deleteRelease',
      description: releases.deleteReleaseDescription,
      inputSchema: releases.deleteReleaseInputSchema,
      execute: withToken(releases.deleteReleaseCore, ctx),
    },
  ]

  if (!ctx.context) return entries

  return entries.map(entry => ({
    ...entry,
    inputSchema: softenContextSchema(entry.inputSchema, ctx.context!),
  }))
}
