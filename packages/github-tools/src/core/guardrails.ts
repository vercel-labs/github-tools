import { findSecret } from './secrets'
import type { GithubToolName } from './tool-names'
import type { GithubTokenCall } from './token'

/**
 * Limits on where GitHub tools can act, checked on every call before it reaches GitHub.
 * Unlike approval, they hold whoever approves a call and whatever the model asks for.
 */
export type GithubGuardrails = {
  /**
   * Repositories the tools may act on, as `owner/repo` or `owner/*`, matched case-insensitively.
   * A call to any other repository fails. Tools without a repository target (search, gists,
   * notifications) are not restricted. `createRepository` and `forkRepository` run only when the
   * new repository's full name matches, so they need `org` or `organization`.
   */
  repositories?: string[]
  /**
   * Branches the tools may write to, as names or patterns where `*` matches any characters,
   * such as `agent/*`. Covers creating, deleting and committing to a branch, and merging or
   * enabling auto-merge into a pull request's base branch. A commit that doesn't name its branch fails.
   */
  branches?: string[]
  /**
   * `'block'` (default) fails any call whose input contains what looks like a credential, such as a
   * GitHub token, a private key or a cloud API key, so the agent can't post one to GitHub. `'allow'`
   * turns the check off, for example when a repository's fixtures contain fake keys.
   */
  secrets?: 'block' | 'allow'
}

const BRANCH_INPUTS = {
  createBranch: 'branch',
  deleteBranch: 'branch',
  createOrUpdateFile: 'branch',
  editFiles: 'branch',
} as const satisfies Partial<Record<GithubToolName, string>>

function patternsMatch(patterns: readonly string[], value: string, flags = '') {
  return patterns.some(pattern => new RegExp(`^${pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, flags).test(value))
}

const list = (patterns: readonly string[]) => patterns.map(pattern => `\`${pattern}\``).join(', ')

/** Why `branches` block merging into `base`, or `undefined` when they allow it. */
export function mergeGuardrailViolation(branches: readonly string[] | undefined, pullNumber: number, base: string): string | undefined {
  if (!branches || patternsMatch(branches, base)) return undefined
  return `Merges are limited to base branches matching ${list(branches)}, and pull request #${pullNumber} targets \`${base}\`.`
}

function newRepository(call: GithubTokenCall): string | null | undefined {
  const input = call.input as Record<string, unknown>
  if (call.toolName === 'createRepository') return typeof input.org === 'string' ? `${input.org}/${String(input.name)}` : null
  if (call.toolName === 'forkRepository') return typeof input.organization === 'string' ? `${input.organization}/${String(input.name ?? call.repo)}` : null
  return undefined
}

/**
 * Why `guardrails` block a call, or `undefined` when they allow it. Checks the input for credentials
 * (even without `guardrails`), the target repository and the branch a write names; a merge's base
 * branch is checked when the call runs.
 */
export function guardrailViolation(call: GithubTokenCall, guardrails: GithubGuardrails | undefined): string | undefined {
  const { repositories, branches, secrets = 'block' } = guardrails ?? {}
  if (secrets === 'block') {
    const secret = findSecret(call.input)
    if (secret) return `The input contains what looks like ${secret}. Never send credentials to GitHub; remove it and try again.`
  }
  if (repositories) {
    const created = newRepository(call)
    if (created === null) return `\`${call.toolName}\` needs \`${call.toolName === 'createRepository' ? 'org' : 'organization'}\` so the new repository can be checked against the allowed repositories: ${list(repositories)}.`
    for (const target of [call.owner && call.repo && `${call.owner}/${call.repo}`, created]) {
      if (target && !patternsMatch(repositories, target, 'i')) return `\`${target}\` is outside the repositories these tools may act on: ${list(repositories)}.`
    }
  }
  if (branches && Object.hasOwn(BRANCH_INPUTS, call.toolName)) {
    const branch = (call.input as Record<string, unknown>)[BRANCH_INPUTS[call.toolName as keyof typeof BRANCH_INPUTS]]
    if (typeof branch !== 'string') return `Name a branch matching ${list(branches)}; without one, the commit goes to the default branch.`
    if (!patternsMatch(branches, branch)) return `Writes are limited to branches matching ${list(branches)}, and \`${branch}\` doesn't match.`
  }
  return undefined
}
