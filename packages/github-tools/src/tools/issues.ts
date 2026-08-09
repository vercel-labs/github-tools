import { tool } from 'ai'
import {
  listIssuesInputSchema,
  listIssuesDescription,
  listIssuesCore,
  getIssueInputSchema,
  getIssueDescription,
  getIssueCore,
  listIssueCommentsInputSchema,
  listIssueCommentsDescription,
  listIssueCommentsCore,
  createIssueInputSchema,
  createIssueDescription,
  createIssueCore,
  addIssueCommentInputSchema,
  addIssueCommentDescription,
  addIssueCommentCore,
  closeIssueInputSchema,
  closeIssueDescription,
  closeIssueCore,
  updateIssueInputSchema,
  updateIssueDescription,
  updateIssueCore,
  updateIssueCommentInputSchema,
  updateIssueCommentDescription,
  updateIssueCommentCore,
  deleteIssueCommentInputSchema,
  deleteIssueCommentDescription,
  deleteIssueCommentCore,
  listLabelsInputSchema,
  listLabelsDescription,
  listLabelsCore,
  addLabelsInputSchema,
  addLabelsDescription,
  addLabelsCore,
  removeLabelInputSchema,
  removeLabelDescription,
  removeLabelCore,
  createLabelInputSchema,
  createLabelDescription,
  createLabelCore,
  updateLabelInputSchema,
  updateLabelDescription,
  updateLabelCore,
  deleteLabelInputSchema,
  deleteLabelDescription,
  deleteLabelCore,
  addAssigneesInputSchema,
  addAssigneesDescription,
  addAssigneesCore,
  removeAssigneesInputSchema,
  removeAssigneesDescription,
  removeAssigneesCore,
} from '../core/issues'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { ToolOptions, GithubTool } from '../types'

async function listIssuesStep(args: Parameters<typeof listIssuesCore>[0]) {
  "use step"
  return listIssuesCore(args)
}

/** List issues for a GitHub repository (excludes pull requests). */
export const listIssues = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listIssuesDescription,
    inputSchema: listIssuesInputSchema,
    execute: async args => listIssuesStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getIssueStep(args: Parameters<typeof getIssueCore>[0]) {
  "use step"
  return getIssueCore(args)
}

/** Get detailed information about a specific issue. */
export const getIssue = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getIssueDescription,
    inputSchema: getIssueInputSchema,
    execute: async args => getIssueStep({ token: await resolveGithubToken(token), ...args }),
  })

async function listIssueCommentsStep(args: Parameters<typeof listIssueCommentsCore>[0]) {
  "use step"
  return listIssueCommentsCore(args)
}

/** List comments on a GitHub issue. Prefer getIssueContext for the first page when triaging. */
export const listIssueComments = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listIssueCommentsDescription,
    inputSchema: listIssueCommentsInputSchema,
    execute: async args => listIssueCommentsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function createIssueStep(args: Parameters<typeof createIssueCore>[0]) {
  "use step"
  return createIssueCore(args)
}

/** Create a new issue in a GitHub repository. Requires approval by default. */
export const createIssue = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createIssueDescription,
    needsApproval,
    inputSchema: createIssueInputSchema,
    execute: async args => createIssueStep({ token: await resolveGithubToken(token), ...args }),
  })

async function addIssueCommentStep(args: Parameters<typeof addIssueCommentCore>[0]) {
  "use step"
  return addIssueCommentCore(args)
}

/** Add a comment to a GitHub issue. Requires approval by default. */
export const addIssueComment = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addIssueCommentDescription,
    needsApproval,
    inputSchema: addIssueCommentInputSchema,
    execute: async args => addIssueCommentStep({ token: await resolveGithubToken(token), ...args }),
  })

async function closeIssueStep(args: Parameters<typeof closeIssueCore>[0]) {
  "use step"
  return closeIssueCore(args)
}

/** Close an open GitHub issue. Requires approval by default. */
export const closeIssue = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: closeIssueDescription,
    needsApproval,
    inputSchema: closeIssueInputSchema,
    execute: async args => closeIssueStep({ token: await resolveGithubToken(token), ...args }),
  })

async function updateIssueStep(args: Parameters<typeof updateIssueCore>[0]) {
  "use step"
  return updateIssueCore(args)
}

/** Update a GitHub issue — title, body, state, labels, milestone, or assignees. Requires approval by default. */
export const updateIssue = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: updateIssueDescription,
    needsApproval,
    inputSchema: updateIssueInputSchema,
    execute: async args => updateIssueStep({ token: await resolveGithubToken(token), ...args }),
  })

async function updateIssueCommentStep(args: Parameters<typeof updateIssueCommentCore>[0]) {
  "use step"
  return updateIssueCommentCore(args)
}

/** Update the body of a comment on a GitHub issue. Requires approval by default. */
export const updateIssueComment = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: updateIssueCommentDescription,
    needsApproval,
    inputSchema: updateIssueCommentInputSchema,
    execute: async args => updateIssueCommentStep({ token: await resolveGithubToken(token), ...args }),
  })

async function deleteIssueCommentStep(args: Parameters<typeof deleteIssueCommentCore>[0]) {
  "use step"
  return deleteIssueCommentCore(args)
}

/** Delete a comment from a GitHub issue permanently. Requires approval by default. */
export const deleteIssueComment = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: deleteIssueCommentDescription,
    needsApproval,
    inputSchema: deleteIssueCommentInputSchema,
    execute: async args => deleteIssueCommentStep({ token: await resolveGithubToken(token), ...args }),
  })

async function listLabelsStep(args: Parameters<typeof listLabelsCore>[0]) {
  "use step"
  return listLabelsCore(args)
}

/** List labels available in a GitHub repository. */
export const listLabels = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listLabelsDescription,
    inputSchema: listLabelsInputSchema,
    execute: async args => listLabelsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function addLabelsStep(args: Parameters<typeof addLabelsCore>[0]) {
  "use step"
  return addLabelsCore(args)
}

/** Add labels to an issue or pull request. Requires approval by default. */
export const addLabels = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addLabelsDescription,
    needsApproval,
    inputSchema: addLabelsInputSchema,
    execute: async args => addLabelsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function removeLabelStep(args: Parameters<typeof removeLabelCore>[0]) {
  "use step"
  return removeLabelCore(args)
}

/** Remove a label from an issue or pull request. Requires approval by default. */
export const removeLabel = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: removeLabelDescription,
    needsApproval,
    inputSchema: removeLabelInputSchema,
    execute: async args => removeLabelStep({ token: await resolveGithubToken(token), ...args }),
  })

async function createLabelStep(args: Parameters<typeof createLabelCore>[0]) {
  "use step"
  return createLabelCore(args)
}

/** Create a label in a GitHub repository. Requires approval by default. */
export const createLabel = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createLabelDescription,
    needsApproval,
    inputSchema: createLabelInputSchema,
    execute: async args => createLabelStep({ token: await resolveGithubToken(token), ...args }),
  })

async function updateLabelStep(args: Parameters<typeof updateLabelCore>[0]) {
  "use step"
  return updateLabelCore(args)
}

/** Update a label in a GitHub repository. Requires approval by default. */
export const updateLabel = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: updateLabelDescription,
    needsApproval,
    inputSchema: updateLabelInputSchema,
    execute: async args => updateLabelStep({ token: await resolveGithubToken(token), ...args }),
  })

async function deleteLabelStep(args: Parameters<typeof deleteLabelCore>[0]) {
  "use step"
  return deleteLabelCore(args)
}

/** Delete a label from a GitHub repository permanently. Requires approval by default. */
export const deleteLabel = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: deleteLabelDescription,
    needsApproval,
    inputSchema: deleteLabelInputSchema,
    execute: async args => deleteLabelStep({ token: await resolveGithubToken(token), ...args }),
  })

async function addAssigneesStep(args: Parameters<typeof addAssigneesCore>[0]) {
  "use step"
  return addAssigneesCore(args)
}

/** Assign users to an issue or pull request. Requires approval by default. */
export const addAssignees = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addAssigneesDescription,
    needsApproval,
    inputSchema: addAssigneesInputSchema,
    execute: async args => addAssigneesStep({ token: await resolveGithubToken(token), ...args }),
  })

async function removeAssigneesStep(args: Parameters<typeof removeAssigneesCore>[0]) {
  "use step"
  return removeAssigneesCore(args)
}

/** Remove assignees from an issue or pull request. Requires approval by default. */
export const removeAssignees = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: removeAssigneesDescription,
    needsApproval,
    inputSchema: removeAssigneesInputSchema,
    execute: async args => removeAssigneesStep({ token: await resolveGithubToken(token), ...args }),
  })
