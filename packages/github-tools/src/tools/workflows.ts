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
import type { ToolOptions, GithubTool } from '../types'

async function listWorkflowsStep(args: Parameters<typeof listWorkflowsCore>[0]) {
  "use step"
  return listWorkflowsCore(args)
}

export const listWorkflows = (token: string): GithubTool =>
  tool({
    description: listWorkflowsDescription,
    inputSchema: listWorkflowsInputSchema,
    execute: async args => listWorkflowsStep({ token, ...args }),
  })

async function listWorkflowRunsStep(args: Parameters<typeof listWorkflowRunsCore>[0]) {
  "use step"
  return listWorkflowRunsCore(args)
}

export const listWorkflowRuns = (token: string): GithubTool =>
  tool({
    description: listWorkflowRunsDescription,
    inputSchema: listWorkflowRunsInputSchema,
    execute: async args => listWorkflowRunsStep({ token, ...args }),
  })

async function getWorkflowRunStep(args: Parameters<typeof getWorkflowRunCore>[0]) {
  "use step"
  return getWorkflowRunCore(args)
}

export const getWorkflowRun = (token: string): GithubTool =>
  tool({
    description: getWorkflowRunDescription,
    inputSchema: getWorkflowRunInputSchema,
    execute: async args => getWorkflowRunStep({ token, ...args }),
  })

async function listWorkflowJobsStep(args: Parameters<typeof listWorkflowJobsCore>[0]) {
  "use step"
  return listWorkflowJobsCore(args)
}

export const listWorkflowJobs = (token: string): GithubTool =>
  tool({
    description: listWorkflowJobsDescription,
    inputSchema: listWorkflowJobsInputSchema,
    execute: async args => listWorkflowJobsStep({ token, ...args }),
  })

async function triggerWorkflowStep(args: Parameters<typeof triggerWorkflowCore>[0]) {
  "use step"
  return triggerWorkflowCore(args)
}

export const triggerWorkflow = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: triggerWorkflowDescription,
    needsApproval,
    inputSchema: triggerWorkflowInputSchema,
    execute: async args => triggerWorkflowStep({ token, ...args }),
  })

async function cancelWorkflowRunStep(args: Parameters<typeof cancelWorkflowRunCore>[0]) {
  "use step"
  return cancelWorkflowRunCore(args)
}

export const cancelWorkflowRun = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: cancelWorkflowRunDescription,
    needsApproval,
    inputSchema: cancelWorkflowRunInputSchema,
    execute: async args => cancelWorkflowRunStep({ token, ...args }),
  })

async function rerunWorkflowRunStep(args: Parameters<typeof rerunWorkflowRunCore>[0]) {
  "use step"
  return rerunWorkflowRunCore(args)
}

export const rerunWorkflowRun = (token: string, { needsApproval = true }: ToolOptions = {}): GithubTool =>
  tool({
    description: rerunWorkflowRunDescription,
    needsApproval,
    inputSchema: rerunWorkflowRunInputSchema,
    execute: async args => rerunWorkflowRunStep({ token, ...args }),
  })
