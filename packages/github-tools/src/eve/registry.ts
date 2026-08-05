import type { ToolModelOutput } from 'eve/tools'
import type { z } from 'zod'
import type { CommitIdentity } from '../types'
import * as checks from '../core/checks'
import * as commits from '../core/commits'
import * as gists from '../core/gists'
import * as issues from '../core/issues'
import {
  compareCommitsToModelOutput,
  getCommitToModelOutput,
  getFileContentToModelOutput,
  listPullRequestFilesToModelOutput,
} from '../core/model-output'
import * as pullRequests from '../core/pull-requests'
import * as releases from '../core/releases'
import * as repository from '../core/repository'
import * as search from '../core/search'
import * as workflows from '../core/workflows'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { GithubWriteToolName } from '../core/write-tools'
import type { GithubToolName } from '../core/tool-names'
export type { GithubToolName } from '../core/tool-names'
export { ALL_GITHUB_TOOL_NAMES } from '../core/tool-names'

export type ToolBuildContext = {
  token: GithubTokenInput
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
  return async (input: Record<string, unknown>) => core({ token: await resolveGithubToken(ctx.token), ...extra, ...input } as T & { token: string })
}

function modelOutputAdapter(
  fn: (options: { toolCallId: string, input: unknown, output: unknown }) => { type: 'json' | 'text', value: unknown },
) {
  return (output: unknown) => fn({ toolCallId: '', input: {}, output }) as ToolModelOutput
}

export function createToolRegistry(ctx: ToolBuildContext): ToolRegistryEntry[] {
  return [
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
      toModelOutput: modelOutputAdapter(getFileContentToModelOutput),
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
      name: 'addPullRequestComment',
      writeTool: 'addPullRequestComment',
      description: pullRequests.addPullRequestCommentDescription,
      inputSchema: pullRequests.addPullRequestCommentInputSchema,
      execute: withToken(pullRequests.addPullRequestCommentCore, ctx),
    },
    {
      name: 'listPullRequestFiles',
      description: pullRequests.listPullRequestFilesDescription,
      inputSchema: pullRequests.listPullRequestFilesInputSchema,
      execute: withToken(pullRequests.listPullRequestFilesCore, ctx),
      toModelOutput: modelOutputAdapter(listPullRequestFilesToModelOutput),
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
      name: 'closeIssue',
      writeTool: 'closeIssue',
      description: issues.closeIssueDescription,
      inputSchema: issues.closeIssueInputSchema,
      execute: withToken(issues.closeIssueCore, ctx),
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
      toModelOutput: modelOutputAdapter(getCommitToModelOutput),
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
      toModelOutput: modelOutputAdapter(compareCommitsToModelOutput),
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
      name: 'createRelease',
      writeTool: 'createRelease',
      description: releases.createReleaseDescription,
      inputSchema: releases.createReleaseInputSchema,
      execute: withToken(releases.createReleaseCore, ctx),
    },
  ]
}
