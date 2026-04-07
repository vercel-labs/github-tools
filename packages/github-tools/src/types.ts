import type { Tool } from 'ai'

export type { Octokit } from 'octokit'

export type ToolOptions = { needsApproval?: boolean }

/**
 * Per-tool overrides for customizing tool behavior without changing the underlying implementation.
 * Properties like `execute`, `inputSchema`, and `outputSchema` are intentionally excluded.
 */
export type ToolOverrides = Partial<
  Pick<
    Tool,
    | 'description'
    | 'needsApproval'
    | 'onInputAvailable'
    | 'onInputDelta'
    | 'onInputStart'
    | 'providerOptions'
    | 'strict'
    | 'title'
    | 'toModelOutput'
  >
>
