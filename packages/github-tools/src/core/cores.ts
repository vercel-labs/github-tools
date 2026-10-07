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
import type { GithubToolName } from './catalog'

/**
 * The `*Core` implementation of every tool, keyed by tool name.
 *
 * Kept apart from `GITHUB_TOOL_CATALOG` so that importing tool metadata does
 * not pull Octokit into a Vercel Workflow flow bundle, which cannot load
 * Node.js built-ins. Argument types vary per tool, so callers cast at the
 * dispatch boundary. Entries are getters so the ESM binding stays live
 * (module spies in tests).
 */
export const GITHUB_TOOL_CORES = {
  get getRepository() { return repository.getRepositoryCore },
  get listBranches() { return repository.listBranchesCore },
  get getFileContent() { return repository.getFileContentCore },
  get getRepositoryTree() { return repository.getRepositoryTreeCore },
  get createBranch() { return repository.createBranchCore },
  get deleteBranch() { return repository.deleteBranchCore },
  get forkRepository() { return repository.forkRepositoryCore },
  get createRepository() { return repository.createRepositoryCore },
  get createOrUpdateFile() { return repository.createOrUpdateFileCore },
  get listPullRequests() { return pullRequests.listPullRequestsCore },
  get getPullRequest() { return pullRequests.getPullRequestCore },
  get createPullRequest() { return pullRequests.createPullRequestCore },
  get mergePullRequest() { return pullRequests.mergePullRequestCore },
  get updatePullRequest() { return pullRequests.updatePullRequestCore },
  get addPullRequestComment() { return pullRequests.addPullRequestCommentCore },
  get updatePullRequestComment() { return pullRequests.updatePullRequestCommentCore },
  get deletePullRequestComment() { return pullRequests.deletePullRequestCommentCore },
  get listPullRequestFiles() { return pullRequests.listPullRequestFilesCore },
  get listPullRequestReviews() { return pullRequests.listPullRequestReviewsCore },
  get createPullRequestReview() { return pullRequests.createPullRequestReviewCore },
  get listPullRequestReviewThreads() { return pullRequests.listPullRequestReviewThreadsCore },
  get replyToReviewComment() { return pullRequests.replyToReviewCommentCore },
  get resolveReviewThread() { return pullRequests.resolveReviewThreadCore },
  get requestReviewers() { return pullRequests.requestReviewersCore },
  get getPullRequestContext() { return bundles.getPullRequestContextCore },
  get getIssueContext() { return bundles.getIssueContextCore },
  get listIssues() { return issues.listIssuesCore },
  get getIssue() { return issues.getIssueCore },
  get listIssueComments() { return issues.listIssueCommentsCore },
  get createIssue() { return issues.createIssueCore },
  get addIssueComment() { return issues.addIssueCommentCore },
  get updateIssueComment() { return issues.updateIssueCommentCore },
  get deleteIssueComment() { return issues.deleteIssueCommentCore },
  get closeIssue() { return issues.closeIssueCore },
  get updateIssue() { return issues.updateIssueCore },
  get listLabels() { return issues.listLabelsCore },
  get addLabels() { return issues.addLabelsCore },
  get removeLabel() { return issues.removeLabelCore },
  get createLabel() { return issues.createLabelCore },
  get updateLabel() { return issues.updateLabelCore },
  get deleteLabel() { return issues.deleteLabelCore },
  get addAssignees() { return issues.addAssigneesCore },
  get removeAssignees() { return issues.removeAssigneesCore },
  get listIssueReactions() { return reactions.listIssueReactionsCore },
  get addIssueReaction() { return reactions.addIssueReactionCore },
  get listCommentReactions() { return reactions.listCommentReactionsCore },
  get addCommentReaction() { return reactions.addCommentReactionCore },
  get listDiscussions() { return discussions.listDiscussionsCore },
  get getDiscussion() { return discussions.getDiscussionCore },
  get addDiscussionComment() { return discussions.addDiscussionCommentCore },
  get listNotifications() { return notifications.listNotificationsCore },
  get markNotificationRead() { return notifications.markNotificationReadCore },
  get searchCode() { return search.searchCodeCore },
  get searchRepositories() { return search.searchRepositoriesCore },
  get searchIssues() { return search.searchIssuesCore },
  get listCommits() { return commits.listCommitsCore },
  get getCommit() { return commits.getCommitCore },
  get getBlame() { return commits.getBlameCore },
  get compareCommits() { return commits.compareCommitsCore },
  get listGists() { return gists.listGistsCore },
  get getGist() { return gists.getGistCore },
  get listGistComments() { return gists.listGistCommentsCore },
  get createGist() { return gists.createGistCore },
  get updateGist() { return gists.updateGistCore },
  get deleteGist() { return gists.deleteGistCore },
  get createGistComment() { return gists.createGistCommentCore },
  get listWorkflows() { return workflows.listWorkflowsCore },
  get listWorkflowRuns() { return workflows.listWorkflowRunsCore },
  get getWorkflowRun() { return workflows.getWorkflowRunCore },
  get listWorkflowJobs() { return workflows.listWorkflowJobsCore },
  get getWorkflowJobLogs() { return workflows.getWorkflowJobLogsCore },
  get triggerWorkflow() { return workflows.triggerWorkflowCore },
  get cancelWorkflowRun() { return workflows.cancelWorkflowRunCore },
  get rerunWorkflowRun() { return workflows.rerunWorkflowRunCore },
  get listCheckRuns() { return checks.listCheckRunsCore },
  get getCombinedStatus() { return checks.getCombinedStatusCore },
  get getCiFailureContext() { return bundles.getCiFailureContextCore },
  get listReleases() { return releases.listReleasesCore },
  get getLatestRelease() { return releases.getLatestReleaseCore },
  get getRelease() { return releases.getReleaseCore },
  get getReleaseContext() { return bundles.getReleaseContextCore },
  get createRelease() { return releases.createReleaseCore },
  get updateRelease() { return releases.updateReleaseCore },
  get deleteRelease() { return releases.deleteReleaseCore },
} satisfies Record<GithubToolName, (args: never) => Promise<unknown>>
