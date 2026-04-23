import type { Tool } from 'ai'

export type { Octokit } from 'octokit'

export type ToolOptions = { needsApproval?: boolean }

/**
 * Identity for commit author or committer.
 */
export type CommitIdentity = {
  name: string
  email: string
}

/**
 * Options for commit-creating tools (createOrUpdateFile, mergePullRequest).
 */
export type CommitToolOptions = ToolOptions & {
  /**
   * The author of the commit, person who wrote the code patch.
   * Falls back to the authenticated user when omitted.
   */
  author?: CommitIdentity
  /**
   * The committer of the commit, person who applied the commit.
   * Falls back to the authenticated user when omitted.
   */
  committer?: CommitIdentity
  /**
   * Co-authors to attribute on commits.
   * Added as "Co-authored-by" trailers to commit messages.
   */
  coAuthors?: CommitIdentity[]
}

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
