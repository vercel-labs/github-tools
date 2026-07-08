import { z } from 'zod'
import { createOctokit } from '../client'

export const BLAME_QUERY = `
  query ($owner: String!, $name: String!, $expression: String!, $path: String!) {
    repository(owner: $owner, name: $name) {
      object(expression: $expression) {
        ... on Commit {
          oid
          blame(path: $path) {
            ranges {
              startingLine
              endingLine
              age
              commit {
                oid
                abbreviatedOid
                messageHeadline
                authoredDate
                url
                author {
                  name
                  email
                  user {
                    login
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

type BlameQueryData = {
  repository: {
    object: null | {
      oid?: string
      blame?: {
        ranges: Array<{
          startingLine: number
          endingLine: number
          age: number
          commit: {
            oid: string
            abbreviatedOid: string
            messageHeadline: string
            authoredDate: string
            url: string
            author: null | {
              name: string | null
              email: string | null
              user: null | { login: string }
            }
          }
        }>
      }
    }
  } | null
}

export const listCommitsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  path: z.string().optional().describe('Only commits containing this file path'),
  sha: z.string().optional().describe('Branch name or commit SHA to start listing from'),
  author: z.string().optional().describe('GitHub username or email to filter commits by'),
  since: z.string().optional().describe('Only commits after this date (ISO 8601 format)'),
  until: z.string().optional().describe('Only commits before this date (ISO 8601 format)'),
  perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
})

export const listCommitsDescription =
  'List commits for a GitHub repository. Filter by file path to see commits that touched a file. For line-by-line attribution at a given ref, use getBlame instead.'

export async function listCommitsCore({ token, owner, repo, path, sha, author, since, until, perPage }: { token: string, owner: string, repo: string, path?: string, sha?: string, author?: string, since?: string, until?: string, perPage: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.listCommits({
    owner,
    repo,
    path,
    sha,
    author,
    since,
    until,
    per_page: perPage,
  })
  return data.map(commit => ({
    sha: commit.sha,
    message: commit.commit.message,
    author: commit.commit.author?.name,
    authorLogin: commit.author?.login,
    date: commit.commit.author?.date,
    url: commit.html_url,
  }))
}

export const getCommitInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  ref: z.string().describe('Commit SHA, branch name, or tag'),
})

export const getCommitDescription = 'Get detailed information about a specific commit, including the list of files changed with additions and deletions'

export async function getCommitCore({ token, owner, repo, ref }: { token: string, owner: string, repo: string, ref: string }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.getCommit({ owner, repo, ref })
  return {
    sha: data.sha,
    message: data.commit.message,
    author: data.commit.author?.name,
    authorLogin: data.author?.login,
    date: data.commit.author?.date,
    url: data.html_url,
    stats: data.stats ? {
      additions: data.stats.additions,
      deletions: data.stats.deletions,
      total: data.stats.total,
    } : null,
    files: data.files?.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch,
    })),
  }
}

export const getBlameInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  path: z.string().describe('Path to the file in the repository'),
  ref: z
    .string()
    .optional()
    .describe('Branch name, tag, or commit SHA (defaults to the repository default branch)'),
  line: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('If set, only return blame ranges that include this line number'),
  lineStart: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('When used with lineEnd, only return ranges overlapping this window'),
  lineEnd: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('When used with lineStart, only return ranges overlapping this window'),
})

export const getBlameDescription =
  'Line-level git blame for a file at a commit-like ref (branch, tag, or SHA). Returns contiguous ranges mapping lines to the commits that last modified them — use this to see who introduced a line and when (GitHub GraphQL API).'

export async function getBlameCore({ token, owner, repo, path, ref, line, lineStart, lineEnd }: { token: string, owner: string, repo: string, path: string, ref?: string, line?: number, lineStart?: number, lineEnd?: number }) {
  const octokit = createOctokit(token)
  let expression = ref
  if (!expression) {
    const { data } = await octokit.rest.repos.get({ owner, repo })
    expression = data.default_branch
  }

  const data = (await octokit.graphql(BLAME_QUERY, {
    owner,
    name: repo,
    expression,
    path,
  })) as BlameQueryData

  if (!data.repository) {
    return { error: `Repository not found: ${owner}/${repo}` }
  }

  const obj = data.repository.object
  if (!obj?.oid || !obj?.blame) {
    return {
      error:
        `Ref "${expression}" did not resolve to a commit for this repository (or the path is invalid). Pass a branch name, tag, or full commit SHA.`,
    }
  }

  let ranges = obj.blame.ranges.map(r => ({
    startingLine: r.startingLine,
    endingLine: r.endingLine,
    age: r.age,
    commit: {
      sha: r.commit.oid,
      abbreviatedSha: r.commit.abbreviatedOid,
      messageHeadline: r.commit.messageHeadline,
      authoredDate: r.commit.authoredDate,
      url: r.commit.url,
      authorName: r.commit.author?.name ?? null,
      authorEmail: r.commit.author?.email ?? null,
      authorLogin: r.commit.author?.user?.login ?? null,
    },
  }))

  if (line != null) {
    ranges = ranges.filter(r => line >= r.startingLine && line <= r.endingLine)
  } else if (lineStart != null || lineEnd != null) {
    const start = lineStart ?? 1
    const end = lineEnd ?? Number.MAX_SAFE_INTEGER
    ranges = ranges.filter(r => r.endingLine >= start && r.startingLine <= end)
  }

  return {
    ref: expression,
    tipSha: obj.oid,
    path,
    rangeCount: ranges.length,
    ranges,
  }
}

export const getCommitCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commentId: z.number().describe('Commit comment ID'),
})

export const getCommitCommentDescription =
  'Get a single commit comment by its ID, including the file path and diff position it was left on (if any).'

export async function getCommitCommentCore({ token, owner, repo, commentId }: { token: string, owner: string, repo: string, commentId: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.getCommitComment({ owner, repo, comment_id: commentId })
  return {
    id: data.id,
    body: data.body,
    author: data.user?.login,
    commitId: data.commit_id,
    path: data.path,
    position: data.position,
    line: data.line,
    url: data.html_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export const listCommitCommentsInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commitSha: z.string().describe('Commit SHA to list comments for'),
  perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
  page: z.number().optional().default(1).describe('Page number for pagination'),
})

export const listCommitCommentsDescription =
  'List comments left on a specific commit. Commit comments can be general or anchored to a file path and diff position.'

export async function listCommitCommentsCore({ token, owner, repo, commitSha, perPage, page }: { token: string, owner: string, repo: string, commitSha: string, perPage: number, page: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.listCommentsForCommit({ owner, repo, commit_sha: commitSha, per_page: perPage, page })
  return data.map(comment => ({
    id: comment.id,
    body: comment.body,
    author: comment.user?.login,
    path: comment.path,
    position: comment.position,
    line: comment.line,
    url: comment.html_url,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  }))
}

export const createCommitCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commitSha: z.string().describe('SHA of the commit to comment on'),
  body: z.string().describe('Comment text (supports Markdown)'),
  path: z.string().optional().describe('Relative path of the file to comment on. Omit for a general commit-level comment'),
  position: z.number().optional().describe('Line index in the commit diff to anchor the comment to (requires path)'),
})

export const createCommitCommentDescription =
  'Add a comment to a commit. Omit path/position for a general commit comment, or provide both to anchor it to a line in the commit diff.'

/** Not idempotent — each call adds another comment. */
export async function createCommitCommentCore({ token, owner, repo, commitSha, body, path, position }: { token: string, owner: string, repo: string, commitSha: string, body: string, path?: string, position?: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.createCommitComment({ owner, repo, commit_sha: commitSha, body, path, position })
  return {
    id: data.id,
    body: data.body,
    author: data.user?.login,
    commitId: data.commit_id,
    path: data.path,
    position: data.position,
    url: data.html_url,
    createdAt: data.created_at,
  }
}

export const updateCommitCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commentId: z.number().describe('Commit comment ID to update'),
  body: z.string().describe('New comment text (supports Markdown)'),
})

export const updateCommitCommentDescription = 'Update the body of an existing commit comment.'

export async function updateCommitCommentCore({ token, owner, repo, commentId, body }: { token: string, owner: string, repo: string, commentId: number, body: string }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.updateCommitComment({ owner, repo, comment_id: commentId, body })
  return {
    id: data.id,
    body: data.body,
    author: data.user?.login,
    url: data.html_url,
    updatedAt: data.updated_at,
  }
}

export const deleteCommitCommentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  commentId: z.number().describe('Commit comment ID to delete'),
})

export const deleteCommitCommentDescription = 'Delete a commit comment permanently.'

/** Not idempotent — deleting an already-deleted comment returns 404 from GitHub. */
export async function deleteCommitCommentCore({ token, owner, repo, commentId }: { token: string, owner: string, repo: string, commentId: number }) {
  const octokit = createOctokit(token)
  await octokit.rest.repos.deleteCommitComment({ owner, repo, comment_id: commentId })
  return { deleted: true, commentId }
}
