import type { Entity } from '@emulators/core'
import { ApiError } from '../../emulators.js'
import { briefUser, findRepo, paginate, requireActor, requireRead, type Ctx } from '../access.js'
import type { SupplementContext } from './context.js'

type Subject = 'issue' | 'issue_comment' | 'review_comment'

interface Reaction extends Entity {
  repo_id: number
  subject: Subject
  /** The issue number for an issue, the comment ID otherwise. */
  subject_id: number
  user_id: number
  content: string
}

const CONTENTS = ['+1', '-1', 'laugh', 'confused', 'heart', 'hooray', 'rocket', 'eyes']

// GitHub accepts either permission for a reaction on an issue or its comments, because pull requests share them.
const PERMISSIONS: Record<Subject, string[]> = {
  issue: ['issues', 'pull_requests'],
  issue_comment: ['issues', 'pull_requests'],
  review_comment: ['pull_requests'],
}

export function registerReactions({ app, store, gh }: SupplementContext): void {
  const reactions = store.collection<Reaction>('supplement.reactions', ['repo_id'])

  function target(c: Ctx, subject: Subject) {
    const repo = findRepo(gh, c.req.param('owner'), c.req.param('repo'))
    const id = Number(c.req.param(subject === 'issue' ? 'issue_number' : 'comment_id'))
    const comment = subject === 'issue' ? undefined : gh.comments.get(id)
    const exists = subject === 'issue'
      ? [...gh.issues.findBy('repo_id', repo.id), ...gh.pullRequests.findBy('repo_id', repo.id)].some(item => item.number === id)
      : comment?.repo_id === repo.id && comment.comment_type === (subject === 'issue_comment' ? 'issue' : 'review')
    if (!exists) throw new ApiError(404, 'Not Found')
    return { repo, id }
  }

  const format = (reaction: Reaction) => ({
    id: reaction.id,
    node_id: `REA_${reaction.id}`,
    user: briefUser(gh.users.get(reaction.user_id)),
    content: reaction.content,
    created_at: reaction.created_at,
  })

  const create = (subject: Subject) => async (c: Ctx) => {
    const { repo, id } = target(c, subject)
    const actor = requireActor(c, gh, repo, { permission: PERMISSIONS[subject], access: 'write', role: 'read' })
    const { content } = await c.req.json<{ content?: string }>()
    if (!content || !CONTENTS.includes(content)) throw new ApiError(422, 'Validation Failed')
    const existing = reactions.findBy('repo_id', repo.id).find(reaction => reaction.subject === subject && reaction.subject_id === id && reaction.user_id === actor.id && reaction.content === content)
    if (existing) return c.json(format(existing), 200)
    return c.json(format(reactions.insert({ repo_id: repo.id, subject, subject_id: id, user_id: actor.id, content })), 201)
  }

  const list = (subject: Subject) => (c: Ctx) => {
    const { repo, id } = target(c, subject)
    requireRead(c, gh, repo, PERMISSIONS[subject][0]!)
    const content = c.req.query('content')
    const matching = reactions.findBy('repo_id', repo.id).filter(reaction => reaction.subject === subject && reaction.subject_id === id && (!content || reaction.content === content))
    return c.json(paginate(c, matching).map(format))
  }

  app.get('/repos/:owner/:repo/issues/:issue_number/reactions', list('issue'))
  app.post('/repos/:owner/:repo/issues/:issue_number/reactions', create('issue'))
  app.get('/repos/:owner/:repo/issues/comments/:comment_id/reactions', list('issue_comment'))
  app.post('/repos/:owner/:repo/issues/comments/:comment_id/reactions', create('issue_comment'))
  // eve's GitHub channel reacts to a review comment before it replies. No tool lists these.
  app.post('/repos/:owner/:repo/pulls/comments/:comment_id/reactions', create('review_comment'))
}
