import { defineTool } from 'eve/tools'
import { always } from 'eve/tools/approval'
import type { NeedsApprovalContext, ToolDefinition } from 'eve/tools'
import type { Tool } from 'ai'

/**
 * Approval predicate evaluated by Eve before each tool call.
 * Use the helpers from `eve/tools/approval` (`always()`, `once()`, `never()`)
 * or a custom predicate over `{ toolName, toolInput, approvedTools }`.
 */
export type EveNeedsApproval = (ctx: NeedsApprovalContext) => boolean

/** The Standard Schema branch of Eve's input schema parameter. */
type EveInputSchema<INPUT> = Extract<ToolDefinition<INPUT, unknown>['inputSchema'], { '~standard': unknown }>

export type ToEveToolOptions = {
  /**
   * Override the approval behavior carried over from the AI SDK tool.
   * When omitted, tools created with `needsApproval: true` map to `always()`
   * and tools without approval map to Eve's default (no approval).
   *
   * @example
   * ```ts
   * import { once } from 'eve/tools/approval'
   * toEveTool(mergePullRequest(githubToken()), { needsApproval: once() })
   * ```
   */
  needsApproval?: EveNeedsApproval
}

/**
 * Resolve the GitHub token for Eve tool files.
 * Eve tools execute in the app runtime with full `process.env`, so this
 * falls back to `GITHUB_TOKEN` the same way `createGithubTools` does.
 *
 * @param token - An explicit token. When omitted, `process.env.GITHUB_TOKEN` is used.
 * @returns The resolved token.
 * @throws {Error} If neither an argument nor `GITHUB_TOKEN` is set.
 *
 * @example
 * ```ts
 * // agent/tools/getRepository.ts
 * export default toEveTool(getRepository(githubToken()))
 * ```
 */
export function githubToken(token?: string): string {
  const resolved = token || process.env.GITHUB_TOKEN
  if (!resolved) {
    throw new Error('GitHub token is required. Pass it as an argument or set the GITHUB_TOKEN environment variable.')
  }
  return resolved
}

/**
 * Wrap a tool from `@github-tools/sdk` as an Eve tool definition, ready to
 * default-export from an `agent/tools/<name>.ts` file. The filename becomes
 * the model-facing tool name, so name the file after the tool.
 *
 * The AI SDK `needsApproval` boolean maps onto Eve's approval predicates:
 * `true` becomes `always()`, unset/`false` becomes Eve's default (never).
 * Pass `options.needsApproval` to choose a different gate such as `once()`.
 *
 * Note: this adapter is scoped to tools from this package — it stubs the
 * AI SDK tool-call options (`toolCallId`, `messages`), which no tool in
 * this package reads.
 *
 * @typeParam INPUT - The tool's input shape (its Zod schema's inferred type).
 * @typeParam OUTPUT - The tool's resolved execution result.
 * @param aiTool - A tool created by an `@github-tools/sdk` factory.
 * @param options - Adapter options.
 * @param options.needsApproval - Override the approval gate (e.g. `once()`).
 *   Defaults to `always()` for write tools and no approval for read tools.
 * @returns An Eve `ToolDefinition` to default-export from a tool file.
 * @throws {Error} If `aiTool` has no `execute` function.
 * @see {@link githubToken} for resolving the token passed to the tool factory.
 *
 * @example
 * ```ts
 * // agent/tools/getRepository.ts
 * import { getRepository } from '@github-tools/sdk'
 * import { githubToken, toEveTool } from '@github-tools/sdk/eve'
 *
 * export default toEveTool(getRepository(githubToken()))
 * ```
 */
export function toEveTool<INPUT extends Record<string, unknown>, OUTPUT>(
  aiTool: Tool<INPUT, OUTPUT>,
  { needsApproval }: ToEveToolOptions = {}
): ToolDefinition<INPUT, OUTPUT> {
  const { description, inputSchema, execute } = aiTool
  if (!execute) {
    throw new Error('toEveTool requires a tool with an execute function')
  }

  // The AI SDK allows `needsApproval` to be an async function; Eve predicates
  // are synchronous, so anything other than an explicit false maps to always().
  const approval = needsApproval ?? (aiTool.needsApproval ? always() : undefined)

  return defineTool({
    description: description ?? '',
    // Zod v4 schemas implement Standard Schema, which Eve accepts; the cast
    // bridges the AI SDK's FlexibleSchema to Eve's schema parameter.
    inputSchema: inputSchema as unknown as EveInputSchema<INPUT>,
    needsApproval: approval,
    execute: async (input: INPUT) =>
      await (execute(input, { toolCallId: 'eve', messages: [] }) as Promise<OUTPUT>),
  })
}
