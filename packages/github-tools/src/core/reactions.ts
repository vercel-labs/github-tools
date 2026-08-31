import { z } from 'zod'
import { withOctokit } from '../client'
import { pageSchema, pagingFields } from './pagination'

const REACTION_CONTENTS = ['+1', '-1', 'laugh', 'confused', 'heart', 'hooray', 'rocket', 'eyes'] as const

export type ReactionContent = typeof REACTION_CONTENTS[number]

const reactionContentSchema = z.enum(REACTION_CONTENTS)

type ReactionListItem = { content: string, user?: { login: string } | null }

function shapeReactions(reactions: ReactionListItem[], perPage: number, page: number) {
  const counts: Record<string, number> = {}
  for (const reaction of reactions) counts[reaction.content] = (counts[reaction.content] ?? 0) + 1
  return {
    total: reactions.length,
    counts,
    reactions: reactions.map(reaction => ({ content: reaction.content, user: reaction.user?.login })),
    ...pagingFields(page, perPage, reactions.length, reactions.length >= perPage),
  }
}

export const listIssueReactionsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue or pull request number — pull request conversations share the issue numbering'),
  content: reactionContentSchema.optional().describe('Only return reactions of this type'),
  perPage: z.number().optional().default(30).describe('Number of reactions to return (max 100)'),
  page: pageSchema,
})

export const listIssueReactionsDescription = 'List reactions on an issue or pull request conversation, with per-emoji counts for the returned page. When hasMore, pass nextPage — do not repeat the same call.'

export async function listIssueReactionsCore({ token, owner, repo, issueNumber, content, perPage, page }: { token: string, owner: string, repo: string, issueNumber: number, content?: ReactionContent, perPage: number, page: number }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.reactions.listForIssue({
    owner,
    repo,
    issue_number: issueNumber,
    content,
    per_page: perPage,
    page,
  })
  return shapeReactions(data, perPage, page)
  })
}

export const addIssueReactionInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  issueNumber: z.number().describe('Issue or pull request number — pull request conversations share the issue numbering'),
  content: reactionContentSchema.describe('Reaction to add'),
})

export const addIssueReactionDescription = 'React to an issue or pull request with an emoji. Prefer this over posting a comment to acknowledge a report without adding noise to the thread'

/** Idempotent — GitHub returns the existing reaction when the user already reacted with the same content. */
export async function addIssueReactionCore({ token, owner, repo, issueNumber, content }: { token: string, owner: string, repo: string, issueNumber: number, content: ReactionContent }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.reactions.createForIssue({
    owner,
    repo,
    issue_number: issueNumber,
    content,
  })
  return {
    id: data.id,
    content: data.content,
    user: data.user?.login,
    issueNumber,
  }
  })
}

export const listCommentReactionsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commentId: z.number().describe('Issue or pull request comment ID (from getIssueContext or addIssueComment)'),
  content: reactionContentSchema.optional().describe('Only return reactions of this type'),
  perPage: z.number().optional().default(30).describe('Number of reactions to return (max 100)'),
  page: pageSchema,
})

export const listCommentReactionsDescription = 'List reactions on an issue or pull request comment, with per-emoji counts for the returned page. When hasMore, pass nextPage — do not repeat the same call.'

export async function listCommentReactionsCore({ token, owner, repo, commentId, content, perPage, page }: { token: string, owner: string, repo: string, commentId: number, content?: ReactionContent, perPage: number, page: number }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.reactions.listForIssueComment({
    owner,
    repo,
    comment_id: commentId,
    content,
    per_page: perPage,
    page,
  })
  return shapeReactions(data, perPage, page)
  })
}

export const addCommentReactionInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commentId: z.number().describe('Issue or pull request comment ID to react to'),
  content: reactionContentSchema.describe('Reaction to add'),
})

export const addCommentReactionDescription = 'React to an issue or pull request comment with an emoji. Prefer this over a reply when acknowledging a comment'

/** Idempotent — GitHub returns the existing reaction when the user already reacted with the same content. */
export async function addCommentReactionCore({ token, owner, repo, commentId, content }: { token: string, owner: string, repo: string, commentId: number, content: ReactionContent }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.reactions.createForIssueComment({
    owner,
    repo,
    comment_id: commentId,
    content,
  })
  return {
    id: data.id,
    content: data.content,
    user: data.user?.login,
    commentId,
  }
  })
}
