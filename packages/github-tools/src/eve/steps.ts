import { EvlogError, toModelErrorPayload } from '../core/errors'
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
  try {
    // Resolve the token before entering the step so only a serializable string crosses the boundary.
    const token = await resolveGithubToken(ctx.token)
    return await executeGithubToolStep(name, input, { ...ctx, token })
  } catch (error) {
    // Eve's tool-loop logs thrown execute errors but does not always append a
    // tool_result. Returning a payload keeps the Anthropic tool_use/tool_result pairing intact.
    // Catalog errors keep their { code, why, fix } structure so the model can recover.
    if (EvlogError.isEvlogError(error)) {
      return { error: toModelErrorPayload(error) }
    }
    return { error: error instanceof Error ? error.message : String(error) }
  }
}
