import { randomBytes } from 'node:crypto'
import type { Entity } from '@emulators/core'
import { ApiError } from '../../emulators.js'
import { briefUser, paginate, requireUser, type Ctx } from '../access.js'
import type { SupplementContext } from './context.js'

interface Gist extends Entity {
  gist_id: string
  user_id: number
  description: string | null
  public: boolean
  files: Record<string, string>
}

interface GistComment extends Entity {
  gist_id: string
  user_id: number
  body: string
}

type FileChanges = Record<string, { content?: string, filename?: string | null } | null>

/** Gists belong to a user, so every route needs a personal token. A secret gist is unlisted, not private. */
export function registerGists({ app, store, gh, baseUrl }: SupplementContext): void {
  const gists = store.collection<Gist>('supplement.gists', ['gist_id', 'user_id'])
  const comments = store.collection<GistComment>('supplement.gist_comments', ['gist_id'])

  const format = (gist: Gist, withContent: boolean) => ({
    id: gist.gist_id,
    node_id: `G_${gist.gist_id}`,
    url: `${baseUrl}/gists/${gist.gist_id}`,
    html_url: `${baseUrl}/gist/${gist.gist_id}`,
    description: gist.description,
    public: gist.public,
    owner: briefUser(gh.users.get(gist.user_id)),
    comments: comments.findBy('gist_id', gist.gist_id).length,
    files: Object.fromEntries(Object.entries(gist.files).map(([filename, content]) => [filename, {
      filename,
      type: 'text/plain',
      language: null,
      raw_url: `${baseUrl}/gist/${gist.gist_id}/raw/${encodeURIComponent(filename)}`,
      size: Buffer.byteLength(content),
      ...withContent ? { content, truncated: false } : {},
    }])),
    created_at: gist.created_at,
    updated_at: gist.updated_at,
  })

  const formatComment = (comment: GistComment) => ({
    id: comment.id,
    node_id: `GC_${comment.id}`,
    url: `${baseUrl}/gists/${comment.gist_id}/comments/${comment.id}`,
    body: comment.body,
    user: briefUser(gh.users.get(comment.user_id)),
    created_at: comment.created_at,
    updated_at: comment.updated_at,
  })

  function find(c: Ctx): Gist {
    const gist = gists.findOneBy('gist_id', c.req.param('gist_id'))
    if (!gist) throw new ApiError(404, 'Not Found')
    return gist
  }

  // GitHub answers 404, not 403, to a change on someone else's gist.
  function findOwn(c: Ctx): Gist {
    const user = requireUser(c, gh)
    const gist = find(c)
    if (gist.user_id !== user.id) throw new ApiError(404, 'Not Found')
    return gist
  }

  function applyFiles(current: Record<string, string>, changes: FileChanges): Record<string, string> {
    const files = { ...current }
    for (const [filename, change] of Object.entries(changes)) {
      if (change === null) {
        delete files[filename]
        continue
      }
      const content = change.content ?? files[filename]
      if (content === undefined || content === '') throw new ApiError(422, 'Validation Failed')
      delete files[filename]
      files[change.filename ?? filename] = content
    }
    if (Object.keys(files).length === 0) throw new ApiError(422, 'Validation Failed')
    return files
  }

  app.get('/gists', (c: Ctx) => {
    const user = requireUser(c, gh)
    return c.json(paginate(c, gists.findBy('user_id', user.id)).map(gist => format(gist, false)))
  })

  app.get('/users/:username/gists', (c: Ctx) => {
    const owner = gh.users.findOneBy('login', c.req.param('username'))
    if (!owner) throw new ApiError(404, 'Not Found')
    const viewer = c.get('authUser')
    const own = viewer && !viewer.installation && viewer.login === owner.login
    return c.json(paginate(c, gists.findBy('user_id', owner.id).filter(gist => own || gist.public)).map(gist => format(gist, false)))
  })

  app.post('/gists', async (c: Ctx) => {
    const user = requireUser(c, gh)
    const body = await c.req.json<{ description?: string, public?: boolean, files?: FileChanges }>()
    const gist = gists.insert({
      gist_id: randomBytes(16).toString('hex'),
      user_id: user.id,
      description: body.description ?? null,
      public: body.public ?? false,
      files: applyFiles({}, body.files ?? {}),
    })
    return c.json(format(gist, true), 201)
  })

  app.get('/gists/:gist_id', (c: Ctx) => c.json(format(find(c), true)))

  app.patch('/gists/:gist_id', async (c: Ctx) => {
    const gist = findOwn(c)
    const body = await c.req.json<{ description?: string, files?: FileChanges }>()
    const updated = gists.update(gist.id, {
      description: body.description ?? gist.description,
      files: body.files ? applyFiles(gist.files, body.files) : gist.files,
    })!
    return c.json(format(updated, true))
  })

  app.delete('/gists/:gist_id', (c: Ctx) => {
    const gist = findOwn(c)
    for (const comment of comments.findBy('gist_id', gist.gist_id)) comments.delete(comment.id)
    gists.delete(gist.id)
    return c.body(null, 204)
  })

  app.get('/gists/:gist_id/comments', (c: Ctx) => c.json(paginate(c, comments.findBy('gist_id', find(c).gist_id)).map(formatComment)))

  app.post('/gists/:gist_id/comments', async (c: Ctx) => {
    const user = requireUser(c, gh)
    const gist = find(c)
    const { body } = await c.req.json<{ body?: string }>()
    if (!body?.trim()) throw new ApiError(422, 'Validation Failed')
    return c.json(formatComment(comments.insert({ gist_id: gist.gist_id, user_id: user.id, body })), 201)
  })
}
