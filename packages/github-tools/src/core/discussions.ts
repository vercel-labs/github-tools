import { z } from 'zod'
import { withOctokit } from '../client'
import { applyDetailBody, detailSchema, type DetailLevel } from './detail'
import type { Octokit } from '../types'

export const DISCUSSION_CATEGORIES_QUERY = `
  query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      discussionCategories(first: 100) {
        nodes {
          id
          name
        }
      }
    }
  }
`

export const LIST_DISCUSSIONS_QUERY = `
  query ($owner: String!, $name: String!, $first: Int!, $after: String, $categoryId: ID) {
    repository(owner: $owner, name: $name) {
      discussions(first: $first, after: $after, categoryId: $categoryId, orderBy: { field: UPDATED_AT, direction: DESC }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          number
          title
          url
          createdAt
          updatedAt
          isAnswered
          author {
            login
          }
          category {
            name
          }
        }
      }
    }
  }
`

export const GET_DISCUSSION_QUERY = `
  query ($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      discussion(number: $number) {
        id
        number
        title
        body
        url
        createdAt
        updatedAt
        isAnswered
        author {
          login
        }
        category {
          name
        }
        comments {
          totalCount
        }
      }
    }
  }
`

export const DISCUSSION_ID_QUERY = `
  query ($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      discussion(number: $number) {
        id
      }
    }
  }
`

export const ADD_DISCUSSION_COMMENT_MUTATION = `
  mutation ($discussionId: ID!, $body: String!) {
    addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
      comment {
        id
        url
        body
        createdAt
        author {
          login
        }
      }
    }
  }
`

type DiscussionNode = {
  id: string
  number: number
  title: string
  url: string
  createdAt: string
  updatedAt: string
  isAnswered: boolean | null
  author: null | { login: string }
  category: null | { name: string }
}

type CategoriesQueryData = {
  repository: null | {
    discussionCategories: { nodes: Array<{ id: string, name: string }> }
  }
}

type ListDiscussionsQueryData = {
  repository: null | {
    discussions: {
      pageInfo: { hasNextPage: boolean, endCursor: string | null }
      nodes: DiscussionNode[]
    }
  }
}

type GetDiscussionQueryData = {
  repository: null | {
    discussion: null | (DiscussionNode & { body: string, comments: { totalCount: number } })
  }
}

type DiscussionIdQueryData = {
  repository: null | { discussion: null | { id: string } }
}

type AddDiscussionCommentMutationData = {
  addDiscussionComment: {
    comment: {
      id: string
      url: string
      body: string
      createdAt: string
      author: null | { login: string }
    }
  }
}

async function resolveCategoryId(octokit: Octokit, owner: string, repo: string, category: string) {
  const data = (await octokit.graphql(DISCUSSION_CATEGORIES_QUERY, { owner, name: repo })) as CategoriesQueryData
  const nodes = data.repository?.discussionCategories.nodes ?? []
  const match = nodes.find(node => node.name.toLowerCase() === category.toLowerCase())
  return { id: match?.id, available: nodes.map(node => node.name) }
}

export const listDiscussionsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  category: z.string().optional().describe('Discussion category name (for example "Q&A" or "Ideas") — omit for all categories'),
  perPage: z.number().optional().default(20).describe('Number of discussions to return (max 100)'),
  after: z.string().optional().describe('Cursor from a previous call (endCursor) to fetch the next page'),
})

export const listDiscussionsDescription = 'List discussions in a GitHub repository, most recently updated first, optionally filtered by category (GitHub GraphQL API)'

export async function listDiscussionsCore({ token, owner, repo, category, perPage, after }: { token: string, owner: string, repo: string, category?: string, perPage: number, after?: string }) {
  return withOctokit(token, async (octokit) => {

  let categoryId: string | undefined
  if (category) {
    const { id, available } = await resolveCategoryId(octokit, owner, repo, category)
    if (!id) return { error: `Unknown discussion category "${category}". Available categories: ${available.join(', ')}` }
    categoryId = id
  }

  const data = (await octokit.graphql(LIST_DISCUSSIONS_QUERY, {
    owner,
    name: repo,
    first: perPage,
    after,
    categoryId,
  })) as ListDiscussionsQueryData

  if (!data.repository) return { error: `Repository not found, or discussions are disabled on ${owner}/${repo}` }

  const { pageInfo, nodes } = data.repository.discussions
  return {
    hasNextPage: pageInfo.hasNextPage,
    endCursor: pageInfo.endCursor,
    discussions: nodes.map(node => ({
      id: node.id,
      number: node.number,
      title: node.title,
      url: node.url,
      author: node.author?.login ?? null,
      category: node.category?.name ?? null,
      answerChosen: node.isAnswered,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    })),
  }
  })
}

export const getDiscussionInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  discussionNumber: z.number().describe('Discussion number'),
  detail: detailSchema,
})

export const getDiscussionDescription = 'Get a GitHub discussion by number. Body is truncated by default (detail: summary) — set detail full for the complete text (GitHub GraphQL API)'

export async function getDiscussionCore({ token, owner, repo, discussionNumber, detail = 'summary' }: { token: string, owner: string, repo: string, discussionNumber: number, detail?: DetailLevel }) {
  return withOctokit(token, async (octokit) => {
  const data = (await octokit.graphql(GET_DISCUSSION_QUERY, {
    owner,
    name: repo,
    number: discussionNumber,
  })) as GetDiscussionQueryData

  const discussion = data.repository?.discussion
  if (!discussion) return { error: `Discussion #${discussionNumber} not found on ${owner}/${repo}` }

  return {
    id: discussion.id,
    number: discussion.number,
    title: discussion.title,
    body: applyDetailBody(discussion.body, detail),
    url: discussion.url,
    author: discussion.author?.login ?? null,
    category: discussion.category?.name ?? null,
    answerChosen: discussion.isAnswered,
    commentsCount: discussion.comments.totalCount,
    createdAt: discussion.createdAt,
    updatedAt: discussion.updatedAt,
  }
  })
}

export const addDiscussionCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  discussionNumber: z.number().describe('Discussion number'),
  body: z.string().describe('Comment text (supports Markdown)'),
})

export const addDiscussionCommentDescription = 'Add a comment to a GitHub discussion (GitHub GraphQL API)'

/** Not idempotent — each call adds another comment. */
export async function addDiscussionCommentCore({ token, owner, repo, discussionNumber, body }: { token: string, owner: string, repo: string, discussionNumber: number, body: string }) {
  return withOctokit(token, async (octokit) => {
  const lookup = (await octokit.graphql(DISCUSSION_ID_QUERY, {
    owner,
    name: repo,
    number: discussionNumber,
  })) as DiscussionIdQueryData

  const discussionId = lookup.repository?.discussion?.id
  if (!discussionId) return { error: `Discussion #${discussionNumber} not found on ${owner}/${repo}` }

  const data = (await octokit.graphql(ADD_DISCUSSION_COMMENT_MUTATION, {
    discussionId,
    body,
  })) as AddDiscussionCommentMutationData

  const comment = data.addDiscussionComment.comment
  return {
    id: comment.id,
    url: comment.url,
    body: comment.body,
    author: comment.author?.login ?? null,
    createdAt: comment.createdAt,
  }
  })
}
