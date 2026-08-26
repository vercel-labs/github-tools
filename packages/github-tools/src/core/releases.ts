import { z } from 'zod'
import { withOctokit } from '../client'
import { applyDetailBody, detailSchema, type DetailLevel } from './detail'
import { fetchAllPages, maxPagesSchema } from './pagination'

export const listReleasesInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  perPage: z.number().optional().default(30).describe('Number of results to return per page (max 100)'),
  maxPages: maxPagesSchema,
  detail: detailSchema,
})

export const listReleasesDescription = 'List releases for a GitHub repository, newest first (includes drafts and prereleases). Bodies truncated by default (detail: summary)'

export async function listReleasesCore({ token, owner, repo, perPage, maxPages, detail = 'summary' }: { token: string, owner: string, repo: string, perPage: number, maxPages?: number, detail?: DetailLevel }) {
  return withOctokit(token, async (octokit) => {
  const releases = await fetchAllPages(async page => {
    const { data } = await octokit.rest.repos.listReleases({ owner, repo, per_page: perPage, page })
    return data
  }, perPage, maxPages)
  return releases.map(release => ({
    id: release.id,
    tagName: release.tag_name,
    name: release.name,
    body: applyDetailBody(release.body, detail),
    draft: release.draft,
    prerelease: release.prerelease,
    url: release.html_url,
    author: release.author?.login,
    createdAt: release.created_at,
    publishedAt: release.published_at,
  }))
  })
}

export const getLatestReleaseInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  detail: detailSchema,
})

export const getLatestReleaseDescription = 'Get the latest published release for a GitHub repository (excludes drafts and prereleases). Body truncated by default (detail: summary)'

export async function getLatestReleaseCore({ token, owner, repo, detail = 'summary' }: { token: string, owner: string, repo: string, detail?: DetailLevel }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.repos.getLatestRelease({ owner, repo })
  return {
    id: data.id,
    tagName: data.tag_name,
    name: data.name,
    body: applyDetailBody(data.body, detail),
    url: data.html_url,
    author: data.author?.login,
    createdAt: data.created_at,
    publishedAt: data.published_at,
    assets: data.assets.map(asset => ({
      name: asset.name,
      downloadUrl: asset.browser_download_url,
      size: asset.size,
      downloadCount: asset.download_count,
    })),
  }
  })
}

export const getReleaseInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  releaseId: z.number().describe('Release ID (from listReleases or getLatestRelease)'),
  detail: detailSchema,
})

export const getReleaseDescription = 'Get a specific release by ID, including its assets. Body truncated by default (detail: summary)'

export async function getReleaseCore({ token, owner, repo, releaseId, detail = 'summary' }: { token: string, owner: string, repo: string, releaseId: number, detail?: DetailLevel }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.repos.getRelease({ owner, repo, release_id: releaseId })
  return {
    id: data.id,
    tagName: data.tag_name,
    name: data.name,
    body: applyDetailBody(data.body, detail),
    draft: data.draft,
    prerelease: data.prerelease,
    url: data.html_url,
    author: data.author?.login,
    createdAt: data.created_at,
    publishedAt: data.published_at,
    assets: data.assets.map(asset => ({
      name: asset.name,
      downloadUrl: asset.browser_download_url,
      size: asset.size,
      downloadCount: asset.download_count,
    })),
  }
  })
}

export const createReleaseInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  tagName: z.string().describe('Tag name for the release (created from target if it does not exist)'),
  target: z.string().optional().describe('Branch name or commit SHA to tag (defaults to the default branch)'),
  name: z.string().optional().describe('Release title (defaults to the tag name)'),
  body: z.string().optional().describe('Release notes (supports Markdown)'),
  draft: z.boolean().optional().default(false).describe('Create as a draft release'),
  prerelease: z.boolean().optional().default(false).describe('Mark as a prerelease'),
  generateReleaseNotes: z.boolean().optional().default(false).describe('Auto-generate release notes from merged pull requests since the last release'),
})

export const createReleaseDescription = 'Create a new release (and its tag if needed) in a GitHub repository'

/** Not idempotent — creating a release with an existing tag name returns an error from GitHub. */
export async function createReleaseCore({ token, owner, repo, tagName, target, name, body, draft, prerelease, generateReleaseNotes }: { token: string, owner: string, repo: string, tagName: string, target?: string, name?: string, body?: string, draft: boolean, prerelease: boolean, generateReleaseNotes: boolean }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: tagName,
    target_commitish: target,
    name,
    body,
    draft,
    prerelease,
    generate_release_notes: generateReleaseNotes,
  })
  return {
    id: data.id,
    tagName: data.tag_name,
    name: data.name,
    body: data.body,
    url: data.html_url,
    draft: data.draft,
    prerelease: data.prerelease,
    createdAt: data.created_at,
  }
  })
}

export const updateReleaseInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  releaseId: z.number().describe('Release ID (from listReleases or getLatestRelease)'),
  tagName: z.string().optional().describe('New tag name for the release'),
  target: z.string().optional().describe('Branch name or commit SHA to tag'),
  name: z.string().optional().describe('New release title'),
  body: z.string().optional().describe('New release notes (supports Markdown)'),
  draft: z.boolean().optional().describe('Mark as a draft release'),
  prerelease: z.boolean().optional().describe('Mark as a prerelease'),
})

export const updateReleaseDescription = 'Update an existing release — tag, target, title, notes, draft, or prerelease status'

/** Not idempotent — each call applies a new revision. */
export async function updateReleaseCore({ token, owner, repo, releaseId, tagName, target, name, body, draft, prerelease }: { token: string, owner: string, repo: string, releaseId: number, tagName?: string, target?: string, name?: string, body?: string, draft?: boolean, prerelease?: boolean }) {
  return withOctokit(token, async (octokit) => {
  const { data } = await octokit.rest.repos.updateRelease({
    owner,
    repo,
    release_id: releaseId,
    tag_name: tagName,
    target_commitish: target,
    name,
    body,
    draft,
    prerelease,
  })
  return {
    id: data.id,
    tagName: data.tag_name,
    name: data.name,
    body: data.body,
    url: data.html_url,
    draft: data.draft,
    prerelease: data.prerelease,
    publishedAt: data.published_at,
  }
  })
}

export const deleteReleaseInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  releaseId: z.number().describe('Release ID to delete'),
})

export const deleteReleaseDescription = 'Delete a release permanently (does not delete the underlying git tag)'

/** Not idempotent — deleting an already-deleted release returns 404 from GitHub. */
export async function deleteReleaseCore({ token, owner, repo, releaseId }: { token: string, owner: string, repo: string, releaseId: number }) {
  return withOctokit(token, async (octokit) => {
  await octokit.rest.repos.deleteRelease({ owner, repo, release_id: releaseId })
  return { deleted: true, releaseId }
  })
}
