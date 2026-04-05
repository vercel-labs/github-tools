import { tool } from 'ai'
import { z } from 'zod'
import { createOctokit } from '../client'
import type { ToolOptions } from '../types'

async function listGistsStep({ token, username, perPage, page }: { token: string, username?: string, perPage: number, page: number }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = username
    ? await octokit.rest.gists.listForUser({ username, per_page: perPage, page })
    : await octokit.rest.gists.list({ per_page: perPage, page })
  return data.map(gist => ({
    id: gist.id,
    description: gist.description,
    public: gist.public,
    url: gist.html_url,
    files: Object.keys(gist.files ?? {}),
    owner: gist.owner?.login,
    comments: gist.comments,
    createdAt: gist.created_at,
    updatedAt: gist.updated_at,
  }))
}

export const listGists = (token: string) =>
  tool({
    description: 'List gists for the authenticated user or a specific user',
    inputSchema: z.object({
      username: z.string().optional().describe('GitHub username — omit to list your own gists'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
    }),
    execute: async args => listGistsStep({ token, ...args }),
  })

async function getGistStep({ token, gistId }: { token: string, gistId: string }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.gists.get({ gist_id: gistId })
  return {
    id: data.id,
    description: data.description,
    public: data.public,
    url: data.html_url,
    owner: data.owner?.login,
    files: Object.values(data.files ?? {}).map(file => ({
      filename: file?.filename,
      language: file?.language,
      size: file?.size,
      content: file?.content,
    })),
    comments: data.comments,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export const getGist = (token: string) =>
  tool({
    description: 'Get a gist by ID, including file contents',
    inputSchema: z.object({
      gistId: z.string().describe('Gist ID'),
    }),
    execute: async args => getGistStep({ token, ...args }),
  })

async function listGistCommentsStep({ token, gistId, perPage, page }: { token: string, gistId: string, perPage: number, page: number }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.gists.listComments({ gist_id: gistId, per_page: perPage, page })
  return data.map(comment => ({
    id: comment.id,
    body: comment.body,
    author: comment.user?.login,
    url: comment.url,
    createdAt: comment.created_at,
    updatedAt: comment.updated_at,
  }))
}

export const listGistComments = (token: string) =>
  tool({
    description: 'List comments on a gist',
    inputSchema: z.object({
      gistId: z.string().describe('Gist ID'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
    }),
    execute: async args => listGistCommentsStep({ token, ...args }),
  })

async function createGistStep({ token, description, files, isPublic }: { token: string, description?: string, files: Record<string, { content: string }>, isPublic: boolean }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.gists.create({
    description,
    files,
    public: isPublic,
  })
  return {
    id: data.id,
    description: data.description,
    public: data.public,
    url: data.html_url,
    files: Object.keys(data.files ?? {}),
    owner: data.owner?.login,
  }
}

export const createGist = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Create a new gist with one or more files',
    needsApproval,
    inputSchema: z.object({
      description: z.string().optional().describe('Gist description'),
      files: z.record(z.string(), z.object({ content: z.string().describe('File content') }))
        .describe('Files to include, keyed by filename'),
      isPublic: z.boolean().optional().default(false).describe('Whether the gist is public'),
    }),
    execute: async args => createGistStep({ token, ...args }),
  })

async function updateGistStep({ token, gistId, description, files, filesToDelete }: { token: string, gistId: string, description?: string, files?: Record<string, { content: string }>, filesToDelete?: string[] }) {
  "use step"
  const octokit = createOctokit(token)
  const fileUpdates: Record<string, { content: string } | null> = {}
  if (files) Object.assign(fileUpdates, files)
  if (filesToDelete) {
    for (const name of filesToDelete) fileUpdates[name] = null
  }
  const { data } = await octokit.rest.gists.update({
    gist_id: gistId,
    description,
    files: fileUpdates as Record<string, { content: string }>,
  })
  return {
    id: data.id,
    description: data.description,
    url: data.html_url,
    files: Object.keys(data.files ?? {}),
  }
}

export const updateGist = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Update an existing gist — edit description, update files, or remove files',
    needsApproval,
    inputSchema: z.object({
      gistId: z.string().describe('Gist ID'),
      description: z.string().optional().describe('New gist description'),
      files: z.record(z.string(), z.object({ content: z.string().describe('New file content') }))
        .optional().describe('Files to add or update, keyed by filename'),
      filesToDelete: z.array(z.string()).optional().describe('Filenames to remove from the gist'),
    }),
    execute: async args => updateGistStep({ token, ...args }),
  })

async function deleteGistStep({ token, gistId }: { token: string, gistId: string }) {
  "use step"
  const octokit = createOctokit(token)
  await octokit.rest.gists.delete({ gist_id: gistId })
  return { deleted: true, gistId }
}

export const deleteGist = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Delete a gist permanently',
    needsApproval,
    inputSchema: z.object({
      gistId: z.string().describe('Gist ID to delete'),
    }),
    execute: async args => deleteGistStep({ token, ...args }),
  })

async function createGistCommentStep({ token, gistId, body }: { token: string, gistId: string, body: string }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.gists.createComment({ gist_id: gistId, body })
  return {
    id: data.id,
    url: data.url,
    body: data.body,
    author: data.user?.login,
    createdAt: data.created_at,
  }
}

export const createGistComment = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Add a comment to a gist',
    needsApproval,
    inputSchema: z.object({
      gistId: z.string().describe('Gist ID'),
      body: z.string().describe('Comment text (supports Markdown)'),
    }),
    execute: async args => createGistCommentStep({ token, ...args }),
  })
