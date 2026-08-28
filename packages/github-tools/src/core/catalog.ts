import type { z } from 'zod'
import * as bundles from './bundles'
import * as checks from './checks'
import * as commits from './commits'
import * as discussions from './discussions'
import * as gists from './gists'
import * as issues from './issues'
import * as notifications from './notifications'
import * as pullRequests from './pull-requests'
import * as reactions from './reactions'
import * as releases from './releases'
import * as repository from './repository'
import * as search from './search'
import * as workflows from './workflows'

/**
 * Vercel Connect scope sets, mirroring GitHub App permissions.
 * Release tools fall under `contents`, reaction tools under `issues`.
 * Gist and notification tools are intentionally unscoped: those APIs only
 * accept user access tokens, never the installation tokens Connect mints.
 */
export const CONTENTS_READ = ['contents:read', 'metadata:read'] as const
export const CONTENTS_WRITE = ['contents:read', 'contents:write', 'metadata:read'] as const
export const PR_READ = ['contents:read', 'metadata:read', 'pull_requests:read'] as const
export const PR_WRITE = ['contents:read', 'metadata:read', 'pull_requests:read', 'pull_requests:write'] as const
/** Read-only PR context (details, files, reviews) plus optional CI checks. */
export const PR_CONTEXT = ['contents:read', 'metadata:read', 'pull_requests:read', 'checks:read', 'statuses:read'] as const
export const ISSUES_READ = ['contents:read', 'metadata:read', 'issues:read'] as const
export const ISSUES_WRITE = ['contents:read', 'metadata:read', 'issues:read', 'issues:write'] as const
export const DISCUSSIONS_READ = ['contents:read', 'metadata:read', 'discussions:read'] as const
export const DISCUSSIONS_WRITE = ['contents:read', 'metadata:read', 'discussions:read', 'discussions:write'] as const
export const ACTIONS_READ = ['contents:read', 'metadata:read', 'actions:read'] as const
export const ACTIONS_WRITE = ['contents:read', 'metadata:read', 'actions:read', 'actions:write'] as const
export const CHECKS = ['contents:read', 'metadata:read', 'checks:read', 'statuses:read'] as const
export const CI_CONTEXT = ['contents:read', 'metadata:read', 'actions:read', 'checks:read', 'statuses:read'] as const
export const ADMIN = ['metadata:read', 'administration:read', 'administration:write'] as const
export const SEARCH_REPOS = ['metadata:read'] as const
export const SEARCH_ISSUES = ['metadata:read', 'issues:read', 'pull_requests:read'] as const
export const UNSCOPED = [] as const

/**
 * One tool in the catalog. `core` argument types vary per tool, so the field
 * is typed contravariantly (`never`) — callers cast at the single dispatch
 * boundary (`withToken` in the eve registry). `core` is a getter so the ESM
 * binding stays live (module spies in tests, hot reload).
 */
type GithubToolDescriptor = {
  description: string
  inputSchema: z.ZodType
  core: (args: never) => Promise<unknown>
  /** Present on write tools — drives `GITHUB_WRITE_TOOLS` and approval defaults. */
  write?: true
  connectScopes: readonly string[]
}

/**
 * Single source of truth for every GitHub tool.
 *
 * `GITHUB_TOOL_NAMES`, `GITHUB_WRITE_TOOLS`, `TOOL_CONNECT_SCOPES`, and the
 * eve tool registry are all derived from this catalog. Adding a tool here (plus
 * its `"use step"` factory in `src/tools/` and `allTools` in `src/index.ts`,
 * both enforced at compile time) is the only registration needed.
 */
export const GITHUB_TOOL_CATALOG = {
  /** Get information about a GitHub repository including description, stars, forks, language, and default branch. */
  getRepository: {
    description: repository.getRepositoryDescription,
    inputSchema: repository.getRepositoryInputSchema,
    get core() { return repository.getRepositoryCore },
    connectScopes: CONTENTS_READ,
  },
  /** List branches in a GitHub repository. */
  listBranches: {
    description: repository.listBranchesDescription,
    inputSchema: repository.listBranchesInputSchema,
    get core() { return repository.listBranchesCore },
    connectScopes: CONTENTS_READ,
  },
  /** Get the content of a file from a GitHub repository. Prefer startLine/endLine or maxLines for large files. */
  getFileContent: {
    description: repository.getFileContentDescription,
    inputSchema: repository.getFileContentInputSchema,
    get core() { return repository.getFileContentCore },
    connectScopes: CONTENTS_READ,
  },
  /** List the file and directory structure of a repository at a given ref. */
  getRepositoryTree: {
    description: repository.getRepositoryTreeDescription,
    inputSchema: repository.getRepositoryTreeInputSchema,
    get core() { return repository.getRepositoryTreeCore },
    connectScopes: CONTENTS_READ,
  },
  /** Create a new branch in a GitHub repository from an existing branch or commit SHA. Requires approval by default. */
  createBranch: {
    description: repository.createBranchDescription,
    inputSchema: repository.createBranchInputSchema,
    get core() { return repository.createBranchCore },
    write: true,
    connectScopes: CONTENTS_WRITE,
  },
  /** Delete a branch from a GitHub repository permanently. Requires approval by default. */
  deleteBranch: {
    description: repository.deleteBranchDescription,
    inputSchema: repository.deleteBranchInputSchema,
    get core() { return repository.deleteBranchCore },
    write: true,
    connectScopes: CONTENTS_WRITE,
  },
  /** Fork a GitHub repository to the authenticated user account or a specified organization. Requires approval by default. */
  forkRepository: {
    description: repository.forkRepositoryDescription,
    inputSchema: repository.forkRepositoryInputSchema,
    get core() { return repository.forkRepositoryCore },
    write: true,
    connectScopes: CONTENTS_READ,
  },
  /** Create a new GitHub repository for the authenticated user or a specified organization. Requires approval by default. */
  createRepository: {
    description: repository.createRepositoryDescription,
    inputSchema: repository.createRepositoryInputSchema,
    get core() { return repository.createRepositoryCore },
    write: true,
    connectScopes: ADMIN,
  },
  /** Create or update a file in a GitHub repository. Provide the SHA when updating an existing file. Requires approval by default. */
  createOrUpdateFile: {
    description: repository.createOrUpdateFileDescription,
    inputSchema: repository.createOrUpdateFileInputSchema,
    get core() { return repository.createOrUpdateFileCore },
    write: true,
    connectScopes: CONTENTS_WRITE,
  },
  /** List pull requests for a GitHub repository. */
  listPullRequests: {
    description: pullRequests.listPullRequestsDescription,
    inputSchema: pullRequests.listPullRequestsInputSchema,
    get core() { return pullRequests.listPullRequestsCore },
    connectScopes: PR_READ,
  },
  /** Get detailed information about a specific pull request. Body truncated by default (detail: summary). */
  getPullRequest: {
    description: pullRequests.getPullRequestDescription,
    inputSchema: pullRequests.getPullRequestInputSchema,
    get core() { return pullRequests.getPullRequestCore },
    connectScopes: PR_READ,
  },
  /** Create a new pull request in a GitHub repository. Requires approval by default. */
  createPullRequest: {
    description: pullRequests.createPullRequestDescription,
    inputSchema: pullRequests.createPullRequestInputSchema,
    get core() { return pullRequests.createPullRequestCore },
    write: true,
    connectScopes: PR_WRITE,
  },
  /** Merge a pull request. Requires approval by default. */
  mergePullRequest: {
    description: pullRequests.mergePullRequestDescription,
    inputSchema: pullRequests.mergePullRequestInputSchema,
    get core() { return pullRequests.mergePullRequestCore },
    write: true,
    connectScopes: PR_WRITE,
  },
  /** Update a pull request — title, body, state, base branch, or draft status. Requires approval by default. */
  updatePullRequest: {
    description: pullRequests.updatePullRequestDescription,
    inputSchema: pullRequests.updatePullRequestInputSchema,
    get core() { return pullRequests.updatePullRequestCore },
    write: true,
    connectScopes: PR_WRITE,
  },
  /** Add a comment to a pull request. Requires approval by default. */
  addPullRequestComment: {
    description: pullRequests.addPullRequestCommentDescription,
    inputSchema: pullRequests.addPullRequestCommentInputSchema,
    get core() { return pullRequests.addPullRequestCommentCore },
    write: true,
    connectScopes: PR_WRITE,
  },
  /** Update the body of a comment on a pull request. Requires approval by default. */
  updatePullRequestComment: {
    description: pullRequests.updatePullRequestCommentDescription,
    inputSchema: pullRequests.updatePullRequestCommentInputSchema,
    get core() { return pullRequests.updatePullRequestCommentCore },
    write: true,
    connectScopes: PR_WRITE,
  },
  /** Delete a comment from a pull request permanently. Requires approval by default. */
  deletePullRequestComment: {
    description: pullRequests.deletePullRequestCommentDescription,
    inputSchema: pullRequests.deletePullRequestCommentInputSchema,
    get core() { return pullRequests.deletePullRequestCommentCore },
    write: true,
    connectScopes: PR_WRITE,
  },
  /** List files changed in a pull request with status and stats. Patches omitted by default — set includePatch true for diffs. */
  listPullRequestFiles: {
    description: pullRequests.listPullRequestFilesDescription,
    inputSchema: pullRequests.listPullRequestFilesInputSchema,
    get core() { return pullRequests.listPullRequestFilesCore },
    connectScopes: PR_READ,
  },
  /** List reviews on a pull request (approvals, change requests, and comments). */
  listPullRequestReviews: {
    description: pullRequests.listPullRequestReviewsDescription,
    inputSchema: pullRequests.listPullRequestReviewsInputSchema,
    get core() { return pullRequests.listPullRequestReviewsCore },
    connectScopes: PR_READ,
  },
  /** Submit a pull request review — approve, request changes, or comment with optional inline comments on specific lines. Requires approval by default. */
  createPullRequestReview: {
    description: pullRequests.createPullRequestReviewDescription,
    inputSchema: pullRequests.createPullRequestReviewInputSchema,
    get core() { return pullRequests.createPullRequestReviewCore },
    write: true,
    connectScopes: PR_WRITE,
  },
  /** List review threads on a pull request with comments, resolution state, and the IDs needed to reply or resolve. Unresolved only by default. */
  listPullRequestReviewThreads: {
    description: pullRequests.listPullRequestReviewThreadsDescription,
    inputSchema: pullRequests.listPullRequestReviewThreadsInputSchema,
    get core() { return pullRequests.listPullRequestReviewThreadsCore },
    connectScopes: PR_READ,
  },
  /** Reply to a pull request review comment in its review thread. Requires approval by default. */
  replyToReviewComment: {
    description: pullRequests.replyToReviewCommentDescription,
    inputSchema: pullRequests.replyToReviewCommentInputSchema,
    get core() { return pullRequests.replyToReviewCommentCore },
    write: true,
    connectScopes: PR_WRITE,
  },
  /** Mark a pull request review thread as resolved. Requires approval by default. */
  resolveReviewThread: {
    description: pullRequests.resolveReviewThreadDescription,
    inputSchema: pullRequests.resolveReviewThreadInputSchema,
    get core() { return pullRequests.resolveReviewThreadCore },
    write: true,
    connectScopes: PR_WRITE,
  },
  /** Request reviews from users or teams on a pull request. Requires approval by default. */
  requestReviewers: {
    description: pullRequests.requestReviewersDescription,
    inputSchema: pullRequests.requestReviewersInputSchema,
    get core() { return pullRequests.requestReviewersCore },
    write: true,
    connectScopes: PR_WRITE,
  },
  /** Fetch pull request details plus files, reviews, and optional CI checks in one call. */
  getPullRequestContext: {
    description: bundles.getPullRequestContextDescription,
    inputSchema: bundles.getPullRequestContextInputSchema,
    get core() { return bundles.getPullRequestContextCore },
    connectScopes: PR_CONTEXT,
  },
  /** Fetch an issue plus available label names and recent comments in one call. */
  getIssueContext: {
    description: bundles.getIssueContextDescription,
    inputSchema: bundles.getIssueContextInputSchema,
    get core() { return bundles.getIssueContextCore },
    connectScopes: ISSUES_READ,
  },
  /** List issues for a GitHub repository (excludes pull requests). */
  listIssues: {
    description: issues.listIssuesDescription,
    inputSchema: issues.listIssuesInputSchema,
    get core() { return issues.listIssuesCore },
    connectScopes: ISSUES_READ,
  },
  /** Get detailed information about a specific issue. Body truncated by default (detail: summary). */
  getIssue: {
    description: issues.getIssueDescription,
    inputSchema: issues.getIssueInputSchema,
    get core() { return issues.getIssueCore },
    connectScopes: ISSUES_READ,
  },
  /** List comments on a GitHub issue. Bodies are truncated by default (detail: summary). Prefer getIssueContext for the first page when triaging. */
  listIssueComments: {
    description: issues.listIssueCommentsDescription,
    inputSchema: issues.listIssueCommentsInputSchema,
    get core() { return issues.listIssueCommentsCore },
    connectScopes: ISSUES_READ,
  },
  /** Create a new issue in a GitHub repository. Requires approval by default. */
  createIssue: {
    description: issues.createIssueDescription,
    inputSchema: issues.createIssueInputSchema,
    get core() { return issues.createIssueCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Add a comment to a GitHub issue. Requires approval by default. */
  addIssueComment: {
    description: issues.addIssueCommentDescription,
    inputSchema: issues.addIssueCommentInputSchema,
    get core() { return issues.addIssueCommentCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Update the body of a comment on a GitHub issue. Requires approval by default. */
  updateIssueComment: {
    description: issues.updateIssueCommentDescription,
    inputSchema: issues.updateIssueCommentInputSchema,
    get core() { return issues.updateIssueCommentCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Delete a comment from a GitHub issue permanently. Requires approval by default. */
  deleteIssueComment: {
    description: issues.deleteIssueCommentDescription,
    inputSchema: issues.deleteIssueCommentInputSchema,
    get core() { return issues.deleteIssueCommentCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Close an open GitHub issue. Requires approval by default. */
  closeIssue: {
    description: issues.closeIssueDescription,
    inputSchema: issues.closeIssueInputSchema,
    get core() { return issues.closeIssueCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Update a GitHub issue — title, body, state, labels, milestone, or assignees. Requires approval by default. */
  updateIssue: {
    description: issues.updateIssueDescription,
    inputSchema: issues.updateIssueInputSchema,
    get core() { return issues.updateIssueCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** List labels available in a GitHub repository. */
  listLabels: {
    description: issues.listLabelsDescription,
    inputSchema: issues.listLabelsInputSchema,
    get core() { return issues.listLabelsCore },
    connectScopes: ISSUES_READ,
  },
  /** Add labels to an issue or pull request. Requires approval by default. */
  addLabels: {
    description: issues.addLabelsDescription,
    inputSchema: issues.addLabelsInputSchema,
    get core() { return issues.addLabelsCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Remove a label from an issue or pull request. Requires approval by default. */
  removeLabel: {
    description: issues.removeLabelDescription,
    inputSchema: issues.removeLabelInputSchema,
    get core() { return issues.removeLabelCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Create a label in a GitHub repository. Requires approval by default. */
  createLabel: {
    description: issues.createLabelDescription,
    inputSchema: issues.createLabelInputSchema,
    get core() { return issues.createLabelCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Update a label in a GitHub repository — name, color, or description. Requires approval by default. */
  updateLabel: {
    description: issues.updateLabelDescription,
    inputSchema: issues.updateLabelInputSchema,
    get core() { return issues.updateLabelCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Delete a label from a GitHub repository permanently. Requires approval by default. */
  deleteLabel: {
    description: issues.deleteLabelDescription,
    inputSchema: issues.deleteLabelInputSchema,
    get core() { return issues.deleteLabelCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Assign users to an issue or pull request. Requires approval by default. */
  addAssignees: {
    description: issues.addAssigneesDescription,
    inputSchema: issues.addAssigneesInputSchema,
    get core() { return issues.addAssigneesCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** Remove assignees from an issue or pull request. Requires approval by default. */
  removeAssignees: {
    description: issues.removeAssigneesDescription,
    inputSchema: issues.removeAssigneesInputSchema,
    get core() { return issues.removeAssigneesCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** List reactions on an issue or pull request conversation, with per-emoji counts. */
  listIssueReactions: {
    description: reactions.listIssueReactionsDescription,
    inputSchema: reactions.listIssueReactionsInputSchema,
    get core() { return reactions.listIssueReactionsCore },
    connectScopes: ISSUES_READ,
  },
  /** React to an issue or pull request with an emoji. Requires approval by default. */
  addIssueReaction: {
    description: reactions.addIssueReactionDescription,
    inputSchema: reactions.addIssueReactionInputSchema,
    get core() { return reactions.addIssueReactionCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** List reactions on an issue or pull request comment, with per-emoji counts. */
  listCommentReactions: {
    description: reactions.listCommentReactionsDescription,
    inputSchema: reactions.listCommentReactionsInputSchema,
    get core() { return reactions.listCommentReactionsCore },
    connectScopes: ISSUES_READ,
  },
  /** React to an issue or pull request comment with an emoji. Requires approval by default. */
  addCommentReaction: {
    description: reactions.addCommentReactionDescription,
    inputSchema: reactions.addCommentReactionInputSchema,
    get core() { return reactions.addCommentReactionCore },
    write: true,
    connectScopes: ISSUES_WRITE,
  },
  /** List discussions in a GitHub repository, most recently updated first, optionally filtered by category. */
  listDiscussions: {
    description: discussions.listDiscussionsDescription,
    inputSchema: discussions.listDiscussionsInputSchema,
    get core() { return discussions.listDiscussionsCore },
    connectScopes: DISCUSSIONS_READ,
  },
  /** Get a GitHub discussion by number. Body truncated by default (detail: summary). */
  getDiscussion: {
    description: discussions.getDiscussionDescription,
    inputSchema: discussions.getDiscussionInputSchema,
    get core() { return discussions.getDiscussionCore },
    connectScopes: DISCUSSIONS_READ,
  },
  /** Add a comment to a GitHub discussion. Requires approval by default. */
  addDiscussionComment: {
    description: discussions.addDiscussionCommentDescription,
    inputSchema: discussions.addDiscussionCommentInputSchema,
    get core() { return discussions.addDiscussionCommentCore },
    write: true,
    connectScopes: DISCUSSIONS_WRITE,
  },
  /** List notification threads for the authenticated user. Requires a token with notifications access. */
  listNotifications: {
    description: notifications.listNotificationsDescription,
    inputSchema: notifications.listNotificationsInputSchema,
    get core() { return notifications.listNotificationsCore },
    connectScopes: UNSCOPED,
  },
  /** Mark a single notification thread as read. Requires approval by default. */
  markNotificationRead: {
    description: notifications.markNotificationReadDescription,
    inputSchema: notifications.markNotificationReadInputSchema,
    get core() { return notifications.markNotificationReadCore },
    write: true,
    connectScopes: UNSCOPED,
  },
  /** Search for code in GitHub repositories. Use qualifiers like "repo:owner/name" to scope the search. Results include matching text snippets when GitHub returns them. */
  searchCode: {
    description: search.searchCodeDescription,
    inputSchema: search.searchCodeInputSchema,
    get core() { return search.searchCodeCore },
    connectScopes: CONTENTS_READ,
  },
  /** Search for GitHub repositories by keyword, topic, language, or other qualifiers. */
  searchRepositories: {
    description: search.searchRepositoriesDescription,
    inputSchema: search.searchRepositoriesInputSchema,
    get core() { return search.searchRepositoriesCore },
    connectScopes: SEARCH_REPOS,
  },
  /** Search for issues and pull requests across GitHub using search qualifiers like "repo:owner/name is:open". */
  searchIssues: {
    description: search.searchIssuesDescription,
    inputSchema: search.searchIssuesInputSchema,
    get core() { return search.searchIssuesCore },
    connectScopes: SEARCH_ISSUES,
  },
  /** List commits for a GitHub repository. Filter by file path to see commits that touched a file. For line-by-line attribution at a given ref, use getBlame instead. */
  listCommits: {
    description: commits.listCommitsDescription,
    inputSchema: commits.listCommitsInputSchema,
    get core() { return commits.listCommitsCore },
    connectScopes: CONTENTS_READ,
  },
  /** Get detailed information about a specific commit, including the list of files changed. Patches omitted by default. */
  getCommit: {
    description: commits.getCommitDescription,
    inputSchema: commits.getCommitInputSchema,
    get core() { return commits.getCommitCore },
    connectScopes: CONTENTS_READ,
  },
  /** Line-level git blame for a file at a commit-like ref (branch, tag, or SHA). Returns contiguous ranges mapping lines to the commits that last modified them. */
  getBlame: {
    description: commits.getBlameDescription,
    inputSchema: commits.getBlameInputSchema,
    get core() { return commits.getBlameCore },
    connectScopes: CONTENTS_READ,
  },
  /** Compare two branches, tags, or commits — ahead/behind counts, commits in between, and differing files. Patches omitted by default. */
  compareCommits: {
    description: commits.compareCommitsDescription,
    inputSchema: commits.compareCommitsInputSchema,
    get core() { return commits.compareCommitsCore },
    connectScopes: CONTENTS_READ,
  },
  /** List gists for the authenticated user or a specific user. */
  listGists: {
    description: gists.listGistsDescription,
    inputSchema: gists.listGistsInputSchema,
    get core() { return gists.listGistsCore },
    connectScopes: UNSCOPED,
  },
  /** Get a gist by ID, including file contents. */
  getGist: {
    description: gists.getGistDescription,
    inputSchema: gists.getGistInputSchema,
    get core() { return gists.getGistCore },
    connectScopes: UNSCOPED,
  },
  /** List comments on a gist. */
  listGistComments: {
    description: gists.listGistCommentsDescription,
    inputSchema: gists.listGistCommentsInputSchema,
    get core() { return gists.listGistCommentsCore },
    connectScopes: UNSCOPED,
  },
  /** Create a new gist with one or more files. Requires approval by default. */
  createGist: {
    description: gists.createGistDescription,
    inputSchema: gists.createGistInputSchema,
    get core() { return gists.createGistCore },
    write: true,
    connectScopes: UNSCOPED,
  },
  /** Update an existing gist — edit description, update files, or remove files. Requires approval by default. */
  updateGist: {
    description: gists.updateGistDescription,
    inputSchema: gists.updateGistInputSchema,
    get core() { return gists.updateGistCore },
    write: true,
    connectScopes: UNSCOPED,
  },
  /** Delete a gist permanently. Requires approval by default. */
  deleteGist: {
    description: gists.deleteGistDescription,
    inputSchema: gists.deleteGistInputSchema,
    get core() { return gists.deleteGistCore },
    write: true,
    connectScopes: UNSCOPED,
  },
  /** Add a comment to a gist. Requires approval by default. */
  createGistComment: {
    description: gists.createGistCommentDescription,
    inputSchema: gists.createGistCommentInputSchema,
    get core() { return gists.createGistCommentCore },
    write: true,
    connectScopes: UNSCOPED,
  },
  /** List GitHub Actions workflows in a repository. */
  listWorkflows: {
    description: workflows.listWorkflowsDescription,
    inputSchema: workflows.listWorkflowsInputSchema,
    get core() { return workflows.listWorkflowsCore },
    connectScopes: ACTIONS_READ,
  },
  /** List workflow runs for a repository, optionally filtered by workflow, branch, status, or event. */
  listWorkflowRuns: {
    description: workflows.listWorkflowRunsDescription,
    inputSchema: workflows.listWorkflowRunsInputSchema,
    get core() { return workflows.listWorkflowRunsCore },
    connectScopes: ACTIONS_READ,
  },
  /** Get details of a specific workflow run including status, timing, and trigger info. */
  getWorkflowRun: {
    description: workflows.getWorkflowRunDescription,
    inputSchema: workflows.getWorkflowRunInputSchema,
    get core() { return workflows.getWorkflowRunCore },
    connectScopes: ACTIONS_READ,
  },
  /** List jobs for a workflow run, including step-level status and timing. */
  listWorkflowJobs: {
    description: workflows.listWorkflowJobsDescription,
    inputSchema: workflows.listWorkflowJobsInputSchema,
    get core() { return workflows.listWorkflowJobsCore },
    connectScopes: ACTIONS_READ,
  },
  /** Get the log output of a workflow job to diagnose failures. Returns the tail (default 200 lines) with timestamps stripped. */
  getWorkflowJobLogs: {
    description: workflows.getWorkflowJobLogsDescription,
    inputSchema: workflows.getWorkflowJobLogsInputSchema,
    get core() { return workflows.getWorkflowJobLogsCore },
    connectScopes: ACTIONS_READ,
  },
  /** Trigger a workflow via workflow_dispatch event. Requires approval by default. */
  triggerWorkflow: {
    description: workflows.triggerWorkflowDescription,
    inputSchema: workflows.triggerWorkflowInputSchema,
    get core() { return workflows.triggerWorkflowCore },
    write: true,
    connectScopes: ACTIONS_WRITE,
  },
  /** Cancel an in-progress workflow run. Requires approval by default. */
  cancelWorkflowRun: {
    description: workflows.cancelWorkflowRunDescription,
    inputSchema: workflows.cancelWorkflowRunInputSchema,
    get core() { return workflows.cancelWorkflowRunCore },
    write: true,
    connectScopes: ACTIONS_WRITE,
  },
  /** Re-run a workflow run, optionally only the failed jobs. Requires approval by default. */
  rerunWorkflowRun: {
    description: workflows.rerunWorkflowRunDescription,
    inputSchema: workflows.rerunWorkflowRunInputSchema,
    get core() { return workflows.rerunWorkflowRunCore },
    write: true,
    connectScopes: ACTIONS_WRITE,
  },
  /** List check runs (Checks API — GitHub Actions and other CI providers) for a commit, branch, or tag. */
  listCheckRuns: {
    description: checks.listCheckRunsDescription,
    inputSchema: checks.listCheckRunsInputSchema,
    get core() { return checks.listCheckRunsCore },
    connectScopes: CHECKS,
  },
  /** Get the combined commit status (Statuses API — legacy CI integrations) for a commit, branch, or tag. */
  getCombinedStatus: {
    description: checks.getCombinedStatusDescription,
    inputSchema: checks.getCombinedStatusInputSchema,
    get core() { return checks.getCombinedStatusCore },
    connectScopes: CHECKS,
  },
  /** Diagnose CI failures for a ref — combined status, failing checks, and failed workflow jobs in one call. */
  getCiFailureContext: {
    description: bundles.getCiFailureContextDescription,
    inputSchema: bundles.getCiFailureContextInputSchema,
    get core() { return bundles.getCiFailureContextCore },
    connectScopes: CI_CONTEXT,
  },
  /** List releases for a GitHub repository, newest first (includes drafts and prereleases). */
  listReleases: {
    description: releases.listReleasesDescription,
    inputSchema: releases.listReleasesInputSchema,
    get core() { return releases.listReleasesCore },
    connectScopes: CONTENTS_READ,
  },
  /** Get the latest published release for a GitHub repository (excludes drafts and prereleases). Body truncated by default. */
  getLatestRelease: {
    description: releases.getLatestReleaseDescription,
    inputSchema: releases.getLatestReleaseInputSchema,
    get core() { return releases.getLatestReleaseCore },
    connectScopes: CONTENTS_READ,
  },
  /** Get a specific release by ID, including its assets. Body truncated by default. */
  getRelease: {
    description: releases.getReleaseDescription,
    inputSchema: releases.getReleaseInputSchema,
    get core() { return releases.getReleaseCore },
    connectScopes: CONTENTS_READ,
  },
  /** Fetch a release plus the previous release and tag comparison in one call. */
  getReleaseContext: {
    description: bundles.getReleaseContextDescription,
    inputSchema: bundles.getReleaseContextInputSchema,
    get core() { return bundles.getReleaseContextCore },
    connectScopes: CONTENTS_READ,
  },
  /** Create a new release (and its tag if needed) in a GitHub repository. Requires approval by default. */
  createRelease: {
    description: releases.createReleaseDescription,
    inputSchema: releases.createReleaseInputSchema,
    get core() { return releases.createReleaseCore },
    write: true,
    connectScopes: CONTENTS_WRITE,
  },
  /** Update an existing release — tag, target, title, notes, draft, or prerelease status. Requires approval by default. */
  updateRelease: {
    description: releases.updateReleaseDescription,
    inputSchema: releases.updateReleaseInputSchema,
    get core() { return releases.updateReleaseCore },
    write: true,
    connectScopes: CONTENTS_WRITE,
  },
  /** Delete a release permanently. Requires approval by default. */
  deleteRelease: {
    description: releases.deleteReleaseDescription,
    inputSchema: releases.deleteReleaseInputSchema,
    get core() { return releases.deleteReleaseCore },
    write: true,
    connectScopes: CONTENTS_WRITE,
  },
} satisfies Record<string, GithubToolDescriptor>

export type GithubToolName = keyof typeof GITHUB_TOOL_CATALOG

/** Tool names whose catalog entry is marked `write: true`. */
export type GithubWriteToolName = {
  [K in GithubToolName]: (typeof GITHUB_TOOL_CATALOG)[K] extends { write: true } ? K : never
}[GithubToolName]

export const ALL_GITHUB_TOOL_NAMES = Object.keys(GITHUB_TOOL_CATALOG) as GithubToolName[]

export const GITHUB_WRITE_TOOL_NAMES = ALL_GITHUB_TOOL_NAMES.filter(
  name => 'write' in GITHUB_TOOL_CATALOG[name],
) as GithubWriteToolName[]

export function isGithubWriteToolName(name: GithubToolName): name is GithubWriteToolName {
  return 'write' in GITHUB_TOOL_CATALOG[name]
}
