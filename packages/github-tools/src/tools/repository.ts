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
import { createGithubTokenStepResolver, type GithubTokenResolver, type GithubTokenStepArgs } from '../core/token'
import type { CommitToolOptions, GithubTool, ToolOptions } from '../types'

export { composeCommitMessage }

async function getRepositoryStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof getRepositoryCore>[0]>) {
  "use step"
  return getRepositoryCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Get information about a GitHub repository including description, stars, forks, language, and default branch. */
export const getRepository = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: getRepositoryDescription,
    inputSchema: getRepositoryInputSchema,
    execute: async args => getRepositoryStep({ token: await resolveToken(), ...args }),
  })

async function listBranchesStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listBranchesCore>[0]>) {
  "use step"
  return listBranchesCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List branches in a GitHub repository. */
export const listBranches = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listBranchesDescription,
    inputSchema: listBranchesInputSchema,
    execute: async args => listBranchesStep({ token: await resolveToken(), ...args }),
  })

async function getFileContentStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof getFileContentCore>[0]>) {
  "use step"
  return getFileContentCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Get the content of a file from a GitHub repository. */
export const getFileContent = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: getFileContentDescription,
    inputSchema: getFileContentInputSchema,
    toModelOutput: getFileContentToModelOutput,
    execute: async args => getFileContentStep({ token: await resolveToken(), ...args }),
  })

async function createBranchStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof createBranchCore>[0]>) {
  "use step"
  return createBranchCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Create a new branch in a GitHub repository from an existing branch or commit SHA. Requires approval by default. */
export const createBranch = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createBranchDescription,
    needsApproval,
    inputSchema: createBranchInputSchema,
    execute: async args => createBranchStep({ token: await resolveToken(), ...args }),
  })

async function forkRepositoryStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof forkRepositoryCore>[0]>) {
  "use step"
  return forkRepositoryCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Fork a GitHub repository to the authenticated user account or a specified organization. Requires approval by default. */
export const forkRepository = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: forkRepositoryDescription,
    needsApproval,
    inputSchema: forkRepositoryInputSchema,
    execute: async args => forkRepositoryStep({ token: await resolveToken(), ...args }),
  })

async function createRepositoryStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof createRepositoryCore>[0]>) {
  "use step"
  return createRepositoryCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Create a new GitHub repository for the authenticated user or a specified organization. Requires approval by default. */
export const createRepository = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: createRepositoryDescription,
    needsApproval,
    inputSchema: createRepositoryInputSchema,
    execute: async args => createRepositoryStep({ token: await resolveToken(), ...args }),
  })

async function createOrUpdateFileStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof createOrUpdateFileCore>[0]>) {
  "use step"
  return createOrUpdateFileCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Create or update a file in a GitHub repository. Provide the SHA when updating an existing file. Requires approval by default. */
export const createOrUpdateFile = (
  resolveToken: GithubTokenResolver,
  { needsApproval = true, author, committer, coAuthors }: CommitToolOptions = {},
): GithubTool =>
  tool({
    description: createOrUpdateFileDescription,
    needsApproval,
    inputSchema: createOrUpdateFileInputSchema,
    execute: async args => createOrUpdateFileStep({ token: await resolveToken(), author, committer, coAuthors, ...args }),
  })
