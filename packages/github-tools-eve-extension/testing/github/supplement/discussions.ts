import type { Entity, Store } from '@emulators/core'
import type { GitHubRepo, GitHubUser } from '@emulators/github'

export interface Discussion extends Entity {
  repo_id: number
  number: number
  title: string
  body: string
  category: string
  user_id: number
  answered: boolean
}

export interface DiscussionComment extends Entity {
  discussion_id: number
  user_id: number
  body: string
}

/** The categories GitHub gives a repository when discussions are turned on. */
export const DISCUSSION_CATEGORIES = ['Announcements', 'General', 'Ideas', 'Polls', 'Q&A', 'Show and tell']

export const categoryId = (name: string) => `DIC_${Buffer.from(name).toString('base64url')}`
export const discussionId = (discussion: Discussion) => `D_${discussion.id}`

/** Discussions and their comments. GitHub has no REST API for them, so they are created here and read through GraphQL. */
export function discussionStore(store: Store) {
  const discussions = store.collection<Discussion>('supplement.discussions', ['repo_id'])
  const comments = store.collection<DiscussionComment>('supplement.discussion_comments', ['discussion_id'])
  return {
    discussions,
    comments,
    create(repo: GitHubRepo, author: GitHubUser, input: { title: string, body?: string, category?: string }): Discussion {
      const category = input.category ?? 'General'
      if (!DISCUSSION_CATEGORIES.includes(category)) throw new Error(`Unknown discussion category "${category}". Use one of: ${DISCUSSION_CATEGORIES.join(', ')}.`)
      return discussions.insert({
        repo_id: repo.id,
        number: discussions.findBy('repo_id', repo.id).length + 1,
        title: input.title,
        body: input.body ?? '',
        category,
        user_id: author.id,
        answered: false,
      })
    },
  }
}
