import { tool } from 'ai'
import {
  listDiscussionsInputSchema,
  listDiscussionsDescription,
  listDiscussionsCore,
  getDiscussionInputSchema,
  getDiscussionDescription,
  getDiscussionCore,
  addDiscussionCommentInputSchema,
  addDiscussionCommentDescription,
  addDiscussionCommentCore,
} from '../core/discussions'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { ToolOptions, GithubTool } from '../types'

async function listDiscussionsStep(args: Parameters<typeof listDiscussionsCore>[0]) {
  "use step"
  return listDiscussionsCore(args)
}

/** List discussions in a repository, optionally filtered by category. */
export const listDiscussions = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listDiscussionsDescription,
    inputSchema: listDiscussionsInputSchema,
    execute: async args => listDiscussionsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getDiscussionStep(args: Parameters<typeof getDiscussionCore>[0]) {
  "use step"
  return getDiscussionCore(args)
}

/** Get a discussion by number. */
export const getDiscussion = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getDiscussionDescription,
    inputSchema: getDiscussionInputSchema,
    execute: async args => getDiscussionStep({ token: await resolveGithubToken(token), ...args }),
  })

async function addDiscussionCommentStep(args: Parameters<typeof addDiscussionCommentCore>[0]) {
  "use step"
  return addDiscussionCommentCore(args)
}

/** Add a comment to a discussion. Requires approval by default. */
export const addDiscussionComment = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addDiscussionCommentDescription,
    needsApproval,
    inputSchema: addDiscussionCommentInputSchema,
    execute: async args => addDiscussionCommentStep({ token: await resolveGithubToken(token), ...args }),
  })
