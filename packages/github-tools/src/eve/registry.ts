import type { ToolModelOutput } from 'eve/tools'
import type { z } from 'zod'
import type { CommitIdentity } from '../types'
import { GITHUB_TOOL_CATALOG, isGithubWriteToolName } from '../core/catalog'
import { mergeContextArgs, softenContextSchema, type GithubToolsContext } from '../core/context'
import {
  compareCommitsToModelOutput,
  getCommitToModelOutput,
  getFileContentToModelOutput,
  getPullRequestContextToModelOutput,
  getRepositoryTreeToModelOutput,
  listPullRequestFilesToModelOutput,
} from '../core/model-output'
import { stripRateLimit } from '../core/rate-limit'
import { resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { GithubWriteToolName } from '../core/write-tools'
import { ALL_GITHUB_TOOL_NAMES, type GithubToolName } from '../core/tool-names'
export type { GithubToolName } from '../core/tool-names'
export { ALL_GITHUB_TOOL_NAMES } from '../core/tool-names'

export type ToolBuildContext = {
  token: GithubTokenInput
  context?: GithubToolsContext
  author?: CommitIdentity
  committer?: CommitIdentity
  coAuthors?: CommitIdentity[]
}

type ToolRegistryEntry = {
  name: GithubToolName
  writeTool?: GithubWriteToolName
  description: string
  inputSchema: z.ZodType
  execute: (args: Record<string, unknown>) => Promise<unknown>
  toModelOutput?: (output: unknown) => ToolModelOutput
}

function withToken<T extends Record<string, unknown>>(
  core: (args: T & { token: string }) => Promise<unknown>,
  ctx: ToolBuildContext,
  extra?: Record<string, unknown>,
) {
  return async (input: Record<string, unknown>) =>
    core({
      token: await resolveGithubToken(ctx.token),
      ...extra,
      ...mergeContextArgs(input, ctx.context ?? {}),
    } as T & { token: string })
}

function modelOutputAdapter(
  fn: (options: { toolCallId: string, input: unknown, output: unknown }) => { type: 'json' | 'text', value: unknown },
) {
  return (output: unknown) => fn({ toolCallId: '', input: {}, output }) as ToolModelOutput
}

const GITHUB_EVE_TOOL_MODEL_OUTPUT = {
  getFileContent: modelOutputAdapter(getFileContentToModelOutput),
  getRepositoryTree: modelOutputAdapter(getRepositoryTreeToModelOutput),
  listPullRequestFiles: modelOutputAdapter(listPullRequestFilesToModelOutput),
  getPullRequestContext: modelOutputAdapter(getPullRequestContextToModelOutput),
  getCommit: modelOutputAdapter(getCommitToModelOutput),
  compareCommits: modelOutputAdapter(compareCommitsToModelOutput),
} satisfies Partial<Record<GithubToolName, (output: unknown) => ToolModelOutput>>

const EVE_TOOL_MODEL_OUTPUTS: Partial<Record<GithubToolName, (output: unknown) => ToolModelOutput>> = GITHUB_EVE_TOOL_MODEL_OUTPUT

/** Whether a GitHub tool has a built-in eve `toModelOutput` projection. */
export function hasGithubEveToolModelOutput(name: GithubToolName): boolean {
  return Object.hasOwn(GITHUB_EVE_TOOL_MODEL_OUTPUT, name)
}

/**
 * Apply the built-in eve `toModelOutput` projection for a tool.
 * Strips `rateLimit` so it never reaches the model. Tools without a dedicated
 * formatter get `{ type: 'json', value }` of the remaining payload.
 * Used by `@github-tools/eve-extension` so the callback only closes over a serializable tool name.
 */
export function formatGithubEveToolOutput(name: GithubToolName, output: unknown): ToolModelOutput {
  const stripped = stripRateLimit(output)
  // `runGithubToolStep` returns `{ error }` when execute throws. The per-tool
  // formatters assume the success shape (e.g. `listPullRequestFilesToModelOutput`
  // calls `.map` on the payload), so dispatching an error payload would throw a
  // second time inside model-output formatting and re-break the tool loop.
  if (isErrorPayload(stripped)) {
    return { type: 'json', value: stripped }
  }
  const format = GITHUB_EVE_TOOL_MODEL_OUTPUT[name as keyof typeof GITHUB_EVE_TOOL_MODEL_OUTPUT]
  if (!format) {
    return { type: 'json', value: stripped }
  }
  return format(stripped)
}

function isErrorPayload(output: unknown): output is { error: string } {
  return (
    output != null
    && typeof output === 'object'
    && !Array.isArray(output)
    && typeof (output as { error?: unknown }).error === 'string'
  )
}

export function createToolRegistry(ctx: ToolBuildContext): ToolRegistryEntry[] {
  // Commit-identity options are session-level, not model inputs, so they ride
  // alongside the token instead of living in the tool's input schema.
  const commitExtras: Partial<Record<GithubToolName, Record<string, unknown>>> = {
    createOrUpdateFile: { author: ctx.author, committer: ctx.committer, coAuthors: ctx.coAuthors },
    mergePullRequest: { coAuthors: ctx.coAuthors },
  }

  const entries = ALL_GITHUB_TOOL_NAMES.map((name): ToolRegistryEntry => {
    const descriptor = GITHUB_TOOL_CATALOG[name]
    // Argument types vary per tool; `withToken` re-narrows at the dispatch boundary.
    const core = descriptor.core as (args: Record<string, unknown> & { token: string }) => Promise<unknown>
    const toModelOutput = EVE_TOOL_MODEL_OUTPUTS[name]
    return {
      name,
      ...(isGithubWriteToolName(name) && { writeTool: name }),
      description: descriptor.description,
      inputSchema: descriptor.inputSchema,
      execute: withToken(core, ctx, commitExtras[name]),
      ...(toModelOutput && { toModelOutput }),
    }
  })

  if (!ctx.context) return entries

  return entries.map(entry => ({
    ...entry,
    inputSchema: softenContextSchema(entry.inputSchema, ctx.context!),
  }))
}
