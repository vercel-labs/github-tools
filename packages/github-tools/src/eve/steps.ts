import { resolveGithubToken } from '../core/token'
import { createToolRegistry, type GithubToolName, type ToolBuildContext } from './registry'

async function executeGithubToolStep(
  name: GithubToolName,
  input: Record<string, unknown>,
  ctx: ToolBuildContext,
) {
  'use step'
  const entry = createToolRegistry(ctx).find(tool => tool.name === name)
  if (!entry) {
    throw new Error(`Unknown GitHub tool: ${name}`)
  }
  return entry.execute(input)
}

export async function runGithubToolStep(
  name: GithubToolName,
  input: Record<string, unknown>,
  ctx: ToolBuildContext,
) {
  // Resolve the token before entering the step so only a serializable string crosses the boundary.
  const token = await resolveGithubToken(ctx.token)
  return executeGithubToolStep(name, input, { ...ctx, token })
}
