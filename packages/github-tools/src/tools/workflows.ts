import { tool } from 'ai'
import {
  listWorkflowsInputSchema,
  listWorkflowsDescription,
  listWorkflowsCore,
  listWorkflowRunsInputSchema,
  listWorkflowRunsDescription,
  listWorkflowRunsCore,
  getWorkflowRunInputSchema,
  getWorkflowRunDescription,
  getWorkflowRunCore,
  listWorkflowJobsInputSchema,
  listWorkflowJobsDescription,
  listWorkflowJobsCore,
  triggerWorkflowInputSchema,
  triggerWorkflowDescription,
  triggerWorkflowCore,
  cancelWorkflowRunInputSchema,
  cancelWorkflowRunDescription,
  cancelWorkflowRunCore,
  rerunWorkflowRunInputSchema,
  rerunWorkflowRunDescription,
  rerunWorkflowRunCore,
} from '../core/workflows'
import { createGithubTokenStepResolver, type GithubTokenResolver, type GithubTokenStepArgs } from '../core/token'
import type { GithubTool, ToolOptions } from '../types'

async function listWorkflowsStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listWorkflowsCore>[0]>) {
  "use step"
  return listWorkflowsCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List GitHub Actions workflows in a repository. */
export const listWorkflows = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listWorkflowsDescription,
    inputSchema: listWorkflowsInputSchema,
    execute: async args => listWorkflowsStep({ token: await resolveToken(), ...args }),
  })

async function listWorkflowRunsStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listWorkflowRunsCore>[0]>) {
  "use step"
  return listWorkflowRunsCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List workflow runs for a repository, optionally filtered by workflow, branch, status, or event. */
export const listWorkflowRuns = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listWorkflowRunsDescription,
    inputSchema: listWorkflowRunsInputSchema,
    execute: async args => listWorkflowRunsStep({ token: await resolveToken(), ...args }),
  })

async function getWorkflowRunStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof getWorkflowRunCore>[0]>) {
  "use step"
  return getWorkflowRunCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Get details of a specific workflow run including status, timing, and trigger info. */
export const getWorkflowRun = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: getWorkflowRunDescription,
    inputSchema: getWorkflowRunInputSchema,
    execute: async args => getWorkflowRunStep({ token: await resolveToken(), ...args }),
  })

async function listWorkflowJobsStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof listWorkflowJobsCore>[0]>) {
  "use step"
  return listWorkflowJobsCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** List jobs for a workflow run, including step-level status and timing. */
export const listWorkflowJobs = (resolveToken: GithubTokenResolver): GithubTool =>
  tool({
    description: listWorkflowJobsDescription,
    inputSchema: listWorkflowJobsInputSchema,
    execute: async args => listWorkflowJobsStep({ token: await resolveToken(), ...args }),
  })

async function triggerWorkflowStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof triggerWorkflowCore>[0]>) {
  "use step"
  return triggerWorkflowCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Trigger a workflow via workflow_dispatch event. Requires approval by default. */
export const triggerWorkflow = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: triggerWorkflowDescription,
    needsApproval,
    inputSchema: triggerWorkflowInputSchema,
    execute: async args => triggerWorkflowStep({ token: await resolveToken(), ...args }),
  })

async function cancelWorkflowRunStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof cancelWorkflowRunCore>[0]>) {
  "use step"
  return cancelWorkflowRunCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Cancel an in-progress workflow run. Requires approval by default. */
export const cancelWorkflowRun = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: cancelWorkflowRunDescription,
    needsApproval,
    inputSchema: cancelWorkflowRunInputSchema,
    execute: async args => cancelWorkflowRunStep({ token: await resolveToken(), ...args }),
  })

async function rerunWorkflowRunStep({ token, ...args }: GithubTokenStepArgs<Parameters<typeof rerunWorkflowRunCore>[0]>) {
  "use step"
  return rerunWorkflowRunCore({ resolveToken: createGithubTokenStepResolver(token), ...args })
}

/** Re-run a workflow run, optionally only the failed jobs. Requires approval by default. */
export const rerunWorkflowRun = (resolveToken: GithubTokenResolver, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: rerunWorkflowRunDescription,
    needsApproval,
    inputSchema: rerunWorkflowRunInputSchema,
    execute: async args => rerunWorkflowRunStep({ token: await resolveToken(), ...args }),
  })
