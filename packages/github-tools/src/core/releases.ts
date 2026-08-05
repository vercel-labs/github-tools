import { z } from 'zod'
import { createOctokit } from '../client'
import { fetchAllPages, maxPagesSchema } from './pagination'

export const listReleasesInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  perPage: z.number().optional().default(30).describe('Number of results to return per page (max 100)'),
  maxPages: maxPagesSchema,
})

export const listReleasesDescription = 'List releases for a GitHub repository, newest first (includes drafts and prereleases)'

export async function listReleasesCore({ token, owner, repo, perPage, maxPages }: { token: string, owner: string, repo: string, perPage: number, maxPages?: number }) {
  const octokit = createOctokit(token)
  const releases = await fetchAllPages(async page => {
    const { data } = await octokit.rest.repos.listReleases({ owner, repo, per_page: perPage, page })
    return data
  }, perPage, maxPages)
  return releases.map(release => ({
    id: release.id,
    tagName: release.tag_name,
    name: release.name,
    body: release.body,
    draft: release.draft,
    prerelease: release.prerelease,
    url: release.html_url,
    author: release.author?.login,
    createdAt: release.created_at,
    publishedAt: release.published_at,
  }))
}

export const getLatestReleaseInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
})

export const getLatestReleaseDescription = 'Get the latest published release for a GitHub repository (excludes drafts and prereleases)'

export async function getLatestReleaseCore({ token, owner, repo }: { token: string, owner: string, repo: string }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.getLatestRelease({ owner, repo })
  return {
    id: data.id,
    tagName: data.tag_name,
    name: data.name,
    body: data.body,
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
}

export const getReleaseInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  releaseId: z.number().describe('Release ID (from listReleases or getLatestRelease)'),
})

export const getReleaseDescription = 'Get a specific release by ID, including its assets'

export async function getReleaseCore({ token, owner, repo, releaseId }: { token: string, owner: string, repo: string, releaseId: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.getRelease({ owner, repo, release_id: releaseId })
  return {
    id: data.id,
    tagName: data.tag_name,
    name: data.name,
    body: data.body,
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
  const octokit = createOctokit(token)
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
}
