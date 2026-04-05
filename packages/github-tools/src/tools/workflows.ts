import { tool } from 'ai'
import { z } from 'zod'
import { createOctokit } from '../client'
import type { ToolOptions } from '../types'

async function listWorkflowsStep({ token, owner, repo, perPage, page }: { token: string, owner: string, repo: string, perPage: number, page: number }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.actions.listRepoWorkflows({ owner, repo, per_page: perPage, page })
  return {
    totalCount: data.total_count,
    workflows: data.workflows.map(wf => ({
      id: wf.id,
      name: wf.name,
      path: wf.path,
      state: wf.state,
      url: wf.html_url,
      createdAt: wf.created_at,
      updatedAt: wf.updated_at,
    })),
  }
}

export const listWorkflows = (token: string) =>
  tool({
    description: 'List GitHub Actions workflows in a repository',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
    }),
    execute: async args => listWorkflowsStep({ token, ...args }),
  })

async function listWorkflowRunsStep({ token, owner, repo, workflowId, branch, event, status, perPage, page }: { token: string, owner: string, repo: string, workflowId?: string | number, branch?: string, event?: string, status?: string, perPage: number, page: number }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = workflowId
    ? await octokit.rest.actions.listWorkflowRuns({ owner, repo, workflow_id: workflowId, per_page: perPage, page, ...branch && { branch }, ...event && { event }, ...status && { status } })
    : await octokit.rest.actions.listWorkflowRunsForRepo({ owner, repo, per_page: perPage, page, ...branch && { branch }, ...event && { event }, ...status && { status } })

  return {
    totalCount: data.total_count,
    runs: data.workflow_runs.map(run => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      event: run.event,
      url: run.html_url,
      actor: run.actor?.login,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      runNumber: run.run_number,
      runAttempt: run.run_attempt,
    })),
  }
}

export const listWorkflowRuns = (token: string) =>
  tool({
    description: 'List workflow runs for a repository, optionally filtered by workflow, branch, status, or event',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      workflowId: z.union([z.string(), z.number()]).optional().describe('Workflow ID or filename (e.g. "ci.yml") to filter by'),
      branch: z.string().optional().describe('Branch name to filter by'),
      event: z.string().optional().describe('Event type to filter by (e.g. "push", "pull_request")'),
      status: z.enum(['completed', 'action_required', 'cancelled', 'failure', 'neutral', 'skipped', 'stale', 'success', 'timed_out', 'in_progress', 'queued', 'requested', 'waiting', 'pending']).optional().describe('Status to filter by'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
    }),
    execute: async args => listWorkflowRunsStep({ token, ...args }),
  })

async function getWorkflowRunStep({ token, owner, repo, runId }: { token: string, owner: string, repo: string, runId: number }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.actions.getWorkflowRun({ owner, repo, run_id: runId })
  return {
    id: data.id,
    name: data.name,
    status: data.status,
    conclusion: data.conclusion,
    branch: data.head_branch,
    sha: data.head_sha,
    event: data.event,
    url: data.html_url,
    actor: data.actor?.login,
    runNumber: data.run_number,
    runAttempt: data.run_attempt,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    runStartedAt: data.run_started_at,
  }
}

export const getWorkflowRun = (token: string) =>
  tool({
    description: 'Get details of a specific workflow run including status, timing, and trigger info',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      runId: z.number().describe('Workflow run ID'),
    }),
    execute: async args => getWorkflowRunStep({ token, ...args }),
  })

async function listWorkflowJobsStep({ token, owner, repo, runId, filter, perPage, page }: { token: string, owner: string, repo: string, runId: number, filter: 'latest' | 'all', perPage: number, page: number }) {
  "use step"
  const octokit = createOctokit(token)
  const { data } = await octokit.rest.actions.listJobsForWorkflowRun({ owner, repo, run_id: runId, filter, per_page: perPage, page })
  return {
    totalCount: data.total_count,
    jobs: data.jobs.map(job => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      url: job.html_url,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      runnerName: job.runner_name,
      steps: job.steps?.map(step => ({
        name: step.name,
        status: step.status,
        conclusion: step.conclusion,
        number: step.number,
        startedAt: step.started_at,
        completedAt: step.completed_at,
      })),
    })),
  }
}

export const listWorkflowJobs = (token: string) =>
  tool({
    description: 'List jobs for a workflow run, including step-level status and timing',
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      runId: z.number().describe('Workflow run ID'),
      filter: z.enum(['latest', 'all']).optional().default('latest').describe('Filter by the latest attempt or all attempts'),
      perPage: z.number().optional().default(30).describe('Number of results to return (max 100)'),
      page: z.number().optional().default(1).describe('Page number for pagination'),
    }),
    execute: async args => listWorkflowJobsStep({ token, ...args }),
  })

async function triggerWorkflowStep({ token, owner, repo, workflowId, ref, inputs }: { token: string, owner: string, repo: string, workflowId: string | number, ref: string, inputs?: Record<string, string> }) {
  "use step"
  const octokit = createOctokit(token)
  await octokit.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref,
    inputs,
  })
  return { triggered: true, workflowId, ref }
}

export const triggerWorkflow = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Trigger a workflow via workflow_dispatch event',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      workflowId: z.union([z.string(), z.number()]).describe('Workflow ID or filename (e.g. "deploy.yml")'),
      ref: z.string().describe('Git ref (branch or tag) to run the workflow on'),
      inputs: z.record(z.string(), z.string()).optional().describe('Input parameters defined in the workflow_dispatch trigger'),
    }),
    execute: async args => triggerWorkflowStep({ token, ...args }),
  })

async function cancelWorkflowRunStep({ token, owner, repo, runId }: { token: string, owner: string, repo: string, runId: number }) {
  "use step"
  const octokit = createOctokit(token)
  await octokit.rest.actions.cancelWorkflowRun({ owner, repo, run_id: runId })
  return { cancelled: true, runId }
}

export const cancelWorkflowRun = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Cancel an in-progress workflow run',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      runId: z.number().describe('Workflow run ID to cancel'),
    }),
    execute: async args => cancelWorkflowRunStep({ token, ...args }),
  })

async function rerunWorkflowRunStep({ token, owner, repo, runId, onlyFailedJobs }: { token: string, owner: string, repo: string, runId: number, onlyFailedJobs: boolean }) {
  "use step"
  const octokit = createOctokit(token)
  if (onlyFailedJobs) {
    await octokit.rest.actions.reRunWorkflowFailedJobs({ owner, repo, run_id: runId })
  } else {
    await octokit.rest.actions.reRunWorkflow({ owner, repo, run_id: runId })
  }
  return { rerun: true, runId, onlyFailedJobs }
}

export const rerunWorkflowRun = (token: string, { needsApproval = true }: ToolOptions = {}) =>
  tool({
    description: 'Re-run a workflow run, optionally only the failed jobs',
    needsApproval,
    inputSchema: z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      runId: z.number().describe('Workflow run ID to re-run'),
      onlyFailedJobs: z.boolean().optional().default(false).describe('Only re-run failed jobs instead of the entire workflow'),
    }),
    execute: async args => rerunWorkflowRunStep({ token, ...args }),
  })
