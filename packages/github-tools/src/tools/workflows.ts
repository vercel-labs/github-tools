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
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { ToolOptions, GithubTool } from '../types'

async function listWorkflowsStep(args: Parameters<typeof listWorkflowsCore>[0]) {
  "use step"
  return listWorkflowsCore(args)
}

/** List GitHub Actions workflows in a repository. */
export const listWorkflows = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listWorkflowsDescription,
    inputSchema: listWorkflowsInputSchema,
    execute: async args => listWorkflowsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function listWorkflowRunsStep(args: Parameters<typeof listWorkflowRunsCore>[0]) {
  "use step"
  return listWorkflowRunsCore(args)
}

/** List workflow runs for a repository, optionally filtered by workflow, branch, status, or event. */
export const listWorkflowRuns = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listWorkflowRunsDescription,
    inputSchema: listWorkflowRunsInputSchema,
    execute: async args => listWorkflowRunsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function getWorkflowRunStep(args: Parameters<typeof getWorkflowRunCore>[0]) {
  "use step"
  return getWorkflowRunCore(args)
}

/** Get details of a specific workflow run including status, timing, and trigger info. */
export const getWorkflowRun = (token: GithubTokenInput): GithubTool =>
  tool({
    description: getWorkflowRunDescription,
    inputSchema: getWorkflowRunInputSchema,
    execute: async args => getWorkflowRunStep({ token: await resolveGithubToken(token), ...args }),
  })

async function listWorkflowJobsStep(args: Parameters<typeof listWorkflowJobsCore>[0]) {
  "use step"
  return listWorkflowJobsCore(args)
}

/** List jobs for a workflow run, including step-level status and timing. */
export const listWorkflowJobs = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listWorkflowJobsDescription,
    inputSchema: listWorkflowJobsInputSchema,
    execute: async args => listWorkflowJobsStep({ token: await resolveGithubToken(token), ...args }),
  })

async function triggerWorkflowStep(args: Parameters<typeof triggerWorkflowCore>[0]) {
  "use step"
  return triggerWorkflowCore(args)
}

/** Trigger a workflow via workflow_dispatch event. Requires approval by default. */
export const triggerWorkflow = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: triggerWorkflowDescription,
    needsApproval,
    inputSchema: triggerWorkflowInputSchema,
    execute: async args => triggerWorkflowStep({ token: await resolveGithubToken(token), ...args }),
  })

async function cancelWorkflowRunStep(args: Parameters<typeof cancelWorkflowRunCore>[0]) {
  "use step"
  return cancelWorkflowRunCore(args)
}

/** Cancel an in-progress workflow run. Requires approval by default. */
export const cancelWorkflowRun = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: cancelWorkflowRunDescription,
    needsApproval,
    inputSchema: cancelWorkflowRunInputSchema,
    execute: async args => cancelWorkflowRunStep({ token: await resolveGithubToken(token), ...args }),
  })

async function rerunWorkflowRunStep(args: Parameters<typeof rerunWorkflowRunCore>[0]) {
  "use step"
  return rerunWorkflowRunCore(args)
}

/** Re-run a workflow run, optionally only the failed jobs. Requires approval by default. */
export const rerunWorkflowRun = (token: GithubTokenInput, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: rerunWorkflowRunDescription,
    needsApproval,
    inputSchema: rerunWorkflowRunInputSchema,
    execute: async args => rerunWorkflowRunStep({ token: await resolveGithubToken(token), ...args }),
  })
