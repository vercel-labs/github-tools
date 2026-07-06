import { z } from 'zod'
import { createOctokit } from '../client'
import type { CommitIdentity, Octokit } from '../types'
import { gitBlobSha } from './git-blob-sha'

const CREATE_COMMIT_ON_BRANCH_MUTATION = `
  mutation CreateCommitOnBranch($input: CreateCommitOnBranchInput!) {
    createCommitOnBranch(input: $input) { commit { oid url } }
  }
`

type CreateCommitOnBranchErrorReason = 'stale_data' | 'forbidden' | 'unknown'
class CreateCommitOnBranchError extends Error {
  constructor(message: string, public reason: CreateCommitOnBranchErrorReason) {
    super(message)
    this.name = 'CreateCommitOnBranchError'
  }
}

export async function createCommitOnBranch(octokit: Octokit, input: {
  owner: string
  repo: string
  branch: string
  expectedHeadOid: string
  headline: string
  body?: string
  additions?: Array<{ path: string, contents: string }>
  deletions?: Array<{ path: string }>
}): Promise<{ commitSha: string, commitUrl: string }> {
  try {
    const result = await octokit.graphql<{ createCommitOnBranch: { commit: { oid: string, url: string } } }>(CREATE_COMMIT_ON_BRANCH_MUTATION, {
      input: {
        branch: { repositoryNameWithOwner: `${input.owner}/${input.repo}`, branchName: input.branch },
        expectedHeadOid: input.expectedHeadOid,
        message: input.body ? { headline: input.headline, body: input.body } : { headline: input.headline },
        fileChanges: { additions: input.additions, deletions: input.deletions },
      },
    })
    return { commitSha: result.createCommitOnBranch.commit.oid, commitUrl: result.createCommitOnBranch.commit.url }
  } catch (error: unknown) {
    const err = error as { errors?: Array<{ type?: string }>, status?: number, message?: string }
    const types = new Set((err.errors ?? []).map((e) => e.type))
    if (types.has('STALE_DATA')) throw new CreateCommitOnBranchError(err.message ?? 'Stale data', 'stale_data')
    if (types.has('FORBIDDEN') || types.has('INSUFFICIENT_SCOPES') || err.status === 401 || err.status === 403) {
      throw new CreateCommitOnBranchError(err.message ?? 'Forbidden', 'forbidden')
    }
    throw error
  }
}

export function composeCommitMessage(
  message: string,
  coAuthors?: CommitIdentity[]
): string {
  if (!coAuthors?.length) return message
  const trailers = coAuthors
    .map(({ name, email }) => `Co-authored-by: ${name} <${email}>`)
    .join('\n')
  return message ? `${message}\n\n${trailers}` : trailers
}

export const getRepositoryInputSchema = z.object({
  owner: z.string().describe('Repository owner (user or organization)'),
  repo: z.string().describe('Repository name'),
})

export const getRepositoryDescription = 'Get information about a GitHub repository including description, stars, forks, language, and default branch'

export async function getRepositoryCore({ token, owner, repo }: { token: string, owner: string, repo: string }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.get({ owner, repo })
  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    url: data.html_url,
    defaultBranch: data.default_branch,
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count,
    language: data.language,
    private: data.private,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

export const listBranchesInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  perPage: z.number().optional().default(30).describe('Number of branches to return (max 100)'),
})

export const listBranchesDescription = 'List branches in a GitHub repository'

export async function listBranchesCore({ token, owner, repo, perPage }: { token: string, owner: string, repo: string, perPage: number }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.listBranches({ owner, repo, per_page: perPage })
  return data.map(branch => ({
    name: branch.name,
    sha: branch.commit.sha,
    protected: branch.protected,
  }))
}

export const getFileContentInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  path: z.string().describe('Path to the file in the repository'),
  ref: z.string().optional().describe('Branch, tag, or commit SHA (defaults to the default branch)'),
})

export const getFileContentDescription = 'Get the content of a file from a GitHub repository'

export async function getFileContentCore({ token, owner, repo, path, ref }: { token: string, owner: string, repo: string, path: string, ref?: string }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref })
  if (Array.isArray(data)) {
    return { type: 'directory' as const, entries: data.map(e => ({ name: e.name, type: e.type, path: e.path })) }
  }
  if (data.type !== 'file') {
    return { type: data.type, path: data.path }
  }
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return {
    type: 'file' as const,
    path: data.path,
    sha: data.sha,
    size: data.size,
    content,
  }
}

export const createBranchInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  branch: z.string().describe('Name for the new branch'),
  from: z.string().optional().describe('Source branch name or commit SHA to branch from (defaults to the default branch)'),
})

export const createBranchDescription = 'Create a new branch in a GitHub repository from an existing branch or commit SHA'

/** Idempotent when the branch already exists at the target SHA. Not idempotent otherwise. */
export async function createBranchCore({ token, owner, repo, branch, from }: { token: string, owner: string, repo: string, branch: string, from?: string }) {
  const octokit = createOctokit(token)
  let sha = from
  if (!sha || !sha.match(/^[0-9a-f]{40}$/i)) {
    const { data: ref } = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${from || (await octokit.rest.repos.get({ owner, repo })).data.default_branch}`,
    })
    sha = ref.object.sha
  }

  try {
    const { data: existingRef } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` })
    if (existingRef.object.sha === sha) {
      return {
        ref: existingRef.ref,
        sha: existingRef.object.sha,
        url: existingRef.url,
      }
    }
  } catch {
    // Branch does not exist yet — create below.
  }

  const { data } = await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha,
  })
  return {
    ref: data.ref,
    sha: data.object.sha,
    url: data.url,
  }
}

export const forkRepositoryInputSchema = z.object({
  owner: z.string().describe('Repository owner to fork from'),
  repo: z.string().describe('Repository name to fork'),
  organization: z.string().optional().describe('Organization to fork into (omit to fork to your personal account)'),
  name: z.string().optional().describe('Name for the forked repository (defaults to the original name)'),
})

export const forkRepositoryDescription = 'Fork a GitHub repository to the authenticated user account or a specified organization'

/** Not idempotent — each call may create another fork attempt. */
export async function forkRepositoryCore({ token, owner, repo, organization, name }: { token: string, owner: string, repo: string, organization?: string, name?: string }) {
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.repos.createFork({
    owner,
    repo,
    organization,
    name,
  })
  return {
    name: data.name,
    fullName: data.full_name,
    url: data.html_url,
    cloneUrl: data.clone_url,
    sshUrl: data.ssh_url,
    defaultBranch: data.default_branch,
    private: data.private,
    parent: data.parent ? { fullName: data.parent.full_name, url: data.parent.html_url } : null,
  }
}

export const createRepositoryInputSchema = z.object({
  name: z.string().describe('Repository name'),
  description: z.string().optional().describe('A short description of the repository'),
  isPrivate: z.boolean().optional().default(false).describe('Whether the repository is private'),
  autoInit: z.boolean().optional().default(false).describe('Create an initial commit with a README'),
  gitignoreTemplate: z.string().optional().describe('Gitignore template to use (e.g. "Node", "Python")'),
  licenseTemplate: z.string().optional().describe('License keyword (e.g. "mit", "apache-2.0")'),
  org: z.string().optional().describe('Organization to create the repository in (omit for personal repo)'),
})

export const createRepositoryDescription = 'Create a new GitHub repository for the authenticated user or a specified organization'

/** Not idempotent — each call creates a new repository. */
export async function createRepositoryCore({ token, name, description, isPrivate, autoInit, gitignoreTemplate, licenseTemplate, org }: { token: string, name: string, description?: string, isPrivate: boolean, autoInit: boolean, gitignoreTemplate?: string, licenseTemplate?: string, org?: string }) {
  const octokit = createOctokit(token)
  const params = {
    name,
    description,
    private: isPrivate,
    auto_init: autoInit,
    gitignore_template: gitignoreTemplate,
    license_template: licenseTemplate,
  }

  const { data } = org
    ? await octokit.rest.repos.createInOrg({ org, ...params })
    : await octokit.rest.repos.createForAuthenticatedUser(params)

  return {
    name: data.name,
    fullName: data.full_name,
    description: data.description,
    url: data.html_url,
    cloneUrl: data.clone_url,
    sshUrl: data.ssh_url,
    defaultBranch: data.default_branch,
    private: data.private,
    createdAt: data.created_at,
  }
}

export const createOrUpdateFileInputSchema = z.object({
  owner: z.string().describe('Repository owner'),
  repo: z.string().describe('Repository name'),
  path: z.string().describe('Path to the file in the repository'),
  message: z.string().describe('Commit message'),
  content: z.string().describe('File content (plain text, will be base64-encoded automatically)'),
  branch: z.string().optional().describe('Branch to commit to (defaults to the default branch)'),
  sha: z.string().optional().describe('SHA of the file being replaced (required when updating an existing file)'),
})

export const createOrUpdateFileDescription = 'Create or update a file in a GitHub repository. Provide the SHA when updating an existing file.'

/** Idempotent when updating with sha and content is unchanged. Not idempotent for new commits. */
export async function createOrUpdateFileCore({
  token,
  owner,
  repo,
  path,
  message,
  content,
  branch,
  sha,
  author,
  committer,
  coAuthors,
}: {
  token: string
  owner: string
  repo: string
  path: string
  message: string
  content: string
  branch?: string
  sha?: string
  author?: CommitIdentity
  committer?: CommitIdentity
  coAuthors?: CommitIdentity[]
}) {
  const octokit = createOctokit(token)

  if (sha) {
    const branchName = branch || (await octokit.rest.repos.get({ owner, repo })).data.default_branch
    try {
      const { data: fileData } = await octokit.rest.repos.getContent({ owner, repo, path, ref: branchName })
      if (!Array.isArray(fileData) && fileData.type === 'file') {
        const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8')
        if (currentContent === content) {
          return {
            path: fileData.path,
            sha: fileData.sha,
            skipped: true as const,
            message: 'Content unchanged; no commit created',
          }
        }
      }
    } catch {
      // File may not exist yet or ref unavailable — proceed with write.
    }
  }

  // optimistically try to create a signed commit via GraphQL API
  if (!author && !committer) {
    try {
      const branchName = branch || (await octokit.rest.repos.get({ owner, repo })).data.default_branch
      const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branchName}` })

      const fullMessage = composeCommitMessage(message, coAuthors)
      const [headline, ...rest] = fullMessage.split('\n')
      const body = rest.join('\n').replace(/^\n+/, '') || undefined

      const result = await createCommitOnBranch(octokit, {
        owner, repo, branch: branchName,
        expectedHeadOid: ref.object.sha,
        headline, body,
        additions: [{ path, contents: Buffer.from(content).toString('base64') }],
      })
      return { path, sha: gitBlobSha(content), commitSha: result.commitSha, commitUrl: result.commitUrl }
    } catch (error) {
      if (error instanceof CreateCommitOnBranchError && error.reason === 'stale_data') {
        throw error
      }
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(`[github-tools] Signed commit failed, using REST API: ${msg}`)
    }
  }

  // fallback to REST API
  const encoded = Buffer.from(content).toString('base64')
  const finalMessage = composeCommitMessage(message, coAuthors)
  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: finalMessage,
    content: encoded,
    branch,
    sha,
    author,
    committer,
  })
  return {
    path: data.content?.path,
    sha: data.content?.sha,
    commitSha: data.commit.sha,
    commitUrl: data.commit.html_url,
  }
}
