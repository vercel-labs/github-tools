import { tool } from 'ai'
import {
  getRepositoryInputSchema,
  getRepositoryDescription,
  getRepositoryCore,
  listBranchesInputSchema,
  listBranchesDescription,
  listBranchesCore,
  getFileContentInputSchema,
  getFileContentDescription,
  getFileContentCore,
  createBranchInputSchema,
  createBranchDescription,
  createBranchCore,
  forkRepositoryInputSchema,
  forkRepositoryDescription,
  forkRepositoryCore,
  createRepositoryInputSchema,
  createRepositoryDescription,
  createRepositoryCore,
  createOrUpdateFileInputSchema,
  createOrUpdateFileDescription,
  createOrUpdateFileCore,
  composeCommitMessage,
} from '../core/repository'
import { getFileContentToModelOutput } from '../core/model-output'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { CommitToolOptions, ToolOptions, GithubTool } from '../types'

export { composeCommitMessage }

async function getRepositoryStep(args: Parameters<typeof getRepositoryCore>[0]) {
  "use step"
  return getRepositoryCore(args)
}

/** Get information about a GitHub repository including description, stars, forks, language, and default branch. */
export const getRepository = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getRepositoryDescription,
    inputSchema: getRepositoryInputSchema,
    execute: async args => getRepositoryStep({ token: await resolveGithubToken(token), ...args }),
  })

async function listBranchesStep(args: Parameters<typeof listBranchesCore>[0]) {
  "use step"
  return listBranchesCore(args)
}

/** List branches in a GitHub repository. */
export const listBranches = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listBranchesDescription,
    inputSchema: listBranchesInputSchema,
    execute: async args => listBranchesStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getFileContentStep(args: Parameters<typeof getFileContentCore>[0]) {
  "use step"
  return getFileContentCore(args)
}

/** Get the content of a file from a GitHub repository. */
export const getFileContent = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getFileContentDescription,
    inputSchema: getFileContentInputSchema,
    toModelOutput: getFileContentToModelOutput,
    execute: async args => getFileContentStep({ token: await resolveGithubToken(token), ...args }),
  })

async function createBranchStep(args: Parameters<typeof createBranchCore>[0]) {
  "use step"
  return createBranchCore(args)
}

/** Create a new branch in a GitHub repository from an existing branch or commit SHA. Requires approval by default. */
export const createBranch = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createBranchDescription,
    needsApproval,
    inputSchema: createBranchInputSchema,
    execute: async args => createBranchStep({ token: await resolveGithubToken(token), ...args }),
  })

async function forkRepositoryStep(args: Parameters<typeof forkRepositoryCore>[0]) {
  "use step"
  return forkRepositoryCore(args)
}

/** Fork a GitHub repository to the authenticated user account or a specified organization. Requires approval by default. */
export const forkRepository = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: forkRepositoryDescription,
    needsApproval,
    inputSchema: forkRepositoryInputSchema,
    execute: async args => forkRepositoryStep({ token: await resolveGithubToken(token), ...args }),
  })

async function createRepositoryStep(args: Parameters<typeof createRepositoryCore>[0]) {
  "use step"
  return createRepositoryCore(args)
}

/** Create a new GitHub repository for the authenticated user or a specified organization. Requires approval by default. */
export const createRepository = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createRepositoryDescription,
    needsApproval,
    inputSchema: createRepositoryInputSchema,
    execute: async args => createRepositoryStep({ token: await resolveGithubToken(token), ...args }),
  })

async function createOrUpdateFileStep(args: Parameters<typeof createOrUpdateFileCore>[0]) {
  "use step"
  return createOrUpdateFileCore(args)
}

/** Create or update a file in a GitHub repository. Provide the SHA when updating an existing file. Requires approval by default. */
export const createOrUpdateFile = (
  token: GithubTokenInput,
  { needsApproval = true, author, committer, coAuthors }: CommitToolOptions = {},
): GithubTool =>
  tool({
    description: createOrUpdateFileDescription,
    needsApproval,
    inputSchema: createOrUpdateFileInputSchema,
    execute: async args => createOrUpdateFileStep({ token: await resolveGithubToken(token), author, committer, coAuthors, ...args }),
  })
