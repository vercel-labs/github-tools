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

export function runGithubToolStep(
  name: GithubToolName,
  input: Record<string, unknown>,
  ctx: ToolBuildContext,
) {
  return executeGithubToolStep(name, input, ctx)
}
