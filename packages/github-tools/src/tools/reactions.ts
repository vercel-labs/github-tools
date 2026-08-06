import { tool } from 'ai'
import {
  listIssueReactionsInputSchema,
  listIssueReactionsDescription,
  listIssueReactionsCore,
  addIssueReactionInputSchema,
  addIssueReactionDescription,
  addIssueReactionCore,
  listCommentReactionsInputSchema,
  listCommentReactionsDescription,
  listCommentReactionsCore,
  addCommentReactionInputSchema,
  addCommentReactionDescription,
  addCommentReactionCore,
} from '../core/reactions'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { ToolOptions, GithubTool } from '../types'

async function listIssueReactionsStep(args: Parameters<typeof listIssueReactionsCore>[0]) {
  "use step"
  return listIssueReactionsCore(args)
}

/** List reactions on an issue or pull request conversation. */
export const listIssueReactions = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listIssueReactionsDescription,
    inputSchema: listIssueReactionsInputSchema,
    execute: async args => listIssueReactionsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function addIssueReactionStep(args: Parameters<typeof addIssueReactionCore>[0]) {
  "use step"
  return addIssueReactionCore(args)
}

/** React to an issue or pull request with an emoji. Requires approval by default. */
export const addIssueReaction = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addIssueReactionDescription,
    needsApproval,
    inputSchema: addIssueReactionInputSchema,
    execute: async args => addIssueReactionStep({ token: await resolveGithubToken(token), ...args }),
  })

async function listCommentReactionsStep(args: Parameters<typeof listCommentReactionsCore>[0]) {
  "use step"
  return listCommentReactionsCore(args)
}

/** List reactions on an issue or pull request comment. */
export const listCommentReactions = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listCommentReactionsDescription,
    inputSchema: listCommentReactionsInputSchema,
    execute: async args => listCommentReactionsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function addCommentReactionStep(args: Parameters<typeof addCommentReactionCore>[0]) {
  "use step"
  return addCommentReactionCore(args)
}

/** React to an issue or pull request comment with an emoji. Requires approval by default. */
export const addCommentReaction = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: addCommentReactionDescription,
    needsApproval,
    inputSchema: addCommentReactionInputSchema,
    execute: async args => addCommentReactionStep({ token: await resolveGithubToken(token), ...args }),
  })
