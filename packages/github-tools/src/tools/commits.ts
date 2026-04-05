import { tool } from 'ai'
import { z } from 'zod'
import { createOctokit } from '../client'

const BLAME_QUERY = `
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

async function listCommitsStep({ token, owner, repo, path, sha, author, since, until, perPage }: { token: string, owner: string, repo: string, path?: string, sha?: string, author?: string, since?: string, until?: string, perPage: number }) {
  "use step"
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

export const listCommits = (token: string) =>
  tool({
    description:
      'List commits for a GitHub repository. Filter by file path to see commits that touched a file. For line-by-line attribution at a given ref, use getBlame instead.',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      path: z.string().optional().describe('Only commits containing this file path'),
      sha: z.string().optional().describe('Branch name or commit SHA to start listing from'),
      author: z.string().optional().describe('GitHub username or email to filter commits by'),
      since: z.string().optional().describe('Only commits after this date (ISO 8601 format)'),
      until: z.string().optional().describe('Only commits before this date (ISO 8601 format)'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
    }),
    execute: async args => listCommitsStep({ token, ...args }),
  })

async function getCommitStep({ token, owner, repo, ref }: { token: string, owner: string, repo: string, ref: string }) {
  "use step"
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

export const getCommit = (token: string) =>
  tool({
    description: 'Get detailed information about a specific commit, including the list of files changed with additions and deletions',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      ref: z.string().describe('Commit SHA, branch name, or tag'),
    }),
    execute: async args => getCommitStep({ token, ...args }),
  })

async function getBlameStep({ token, owner, repo, path, ref, line, lineStart, lineEnd }: { token: string, owner: string, repo: string, path: string, ref?: string, line?: number, lineStart?: number, lineEnd?: number }) {
  "use step"
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

export const getBlame = (token: string) =>
  tool({
    description:
      'Line-level git blame for a file at a commit-like ref (branch, tag, or SHA). Returns contiguous ranges mapping lines to the commits that last modified them — use this to see who introduced a line and when (GitHub GraphQL API).',
    inputSchema: z.object({
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
    }),
    execute: async args => getBlameStep({ token, ...args }),
  })
