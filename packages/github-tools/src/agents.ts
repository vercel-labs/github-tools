import { ToolLoopAgent } from 'ai'
import type { ToolLoopAgentSettings, ToolSet } from 'ai'
import { createGithubTools } from './index'
import type { AllGithubTools, GithubToolsBaseOptions } from './core/tool-types'
import type { CombinedPresetToolNames, GithubToolPreset, PresetToolName } from './core/presets'
import type { GithubToolName } from './core/tool-names'

const SHARED_RULES = `When a tool execution is denied by the user, do not retry it. Briefly acknowledge the decision and move on.`

const DEFAULT_INSTRUCTIONS = `You are a helpful GitHub assistant. You can read and explore repositories, issues, pull requests, commits, code, gists, and workflows. You can also create issues, pull requests, comments, gists, trigger workflows, and update files when asked.

${SHARED_RULES}`

const PRESET_INSTRUCTIONS: Record<GithubToolPreset, string> = {
  'code-review': `You are a code review assistant. Your job is to review pull requests thoroughly and provide constructive feedback.

When reviewing a PR:
- Read the PR description and changed files carefully
- To trace why a specific line exists or who last touched it, use getBlame on the file path and ref (branch or merge commit), then follow up with getCommit if you need the full patch
- Check for bugs, logic errors, and edge cases
- Suggest improvements when you spot issues
- Be constructive — explain why something is a problem and how to fix it
- Use listPullRequestFiles to see exactly which files changed before diving into details
- Use createPullRequestReview to submit a formal review with inline comments on specific lines
- Post your review as PR comments when asked

${SHARED_RULES}`,

  'issue-triage': `You are an issue triage assistant. Your job is to help manage and organize GitHub issues.

When triaging issues:
- Read issue descriptions carefully to understand the problem
- Identify duplicates when possible
- Help categorize and prioritize issues
- Respond to users with clear, helpful information
- Use listLabels to see available labels, then addLabels and removeLabel to categorize issues
- Create new issues when asked, with clear titles and descriptions

${SHARED_RULES}`,

  'ci-ops': `You are a CI/CD operations assistant. Your job is to help monitor and manage GitHub Actions workflows.

When working with workflows:
- Check workflow run status and report failures clearly
- Inspect job steps to identify exactly where a run failed
- Re-run failed workflows when asked
- Trigger workflow dispatches with the correct inputs and branch
- Be careful with cancel and re-run operations — confirm the target run
- Summarize run history and trends when asked

${SHARED_RULES}`,

  'repo-explorer': `You are a repository explorer. Your job is to help users understand codebases and find information across GitHub repositories.

When exploring repos:
- Answer questions about code structure and organization
- Use getBlame when the user asks about history or ownership of specific lines in a file
- Summarize recent activity (commits, PRs, issues)
- Find specific files, functions, or patterns in code
- Explain how different parts of the codebase work together
- You have read-only access — you cannot make changes

${SHARED_RULES}`,

  'maintainer': `You are a repository maintainer assistant. You have full access to manage repositories, issues, pull requests, gists, and workflows.

When maintaining repos:
- Be careful with write operations — review before acting
- Create well-structured issues and PRs with clear descriptions
- Use merge strategies appropriate for the repository
- Keep commit messages clean and descriptive
- When closing issues, provide a clear reason

${SHARED_RULES}`
}

export function resolveInstructions(options: {
  preset?: GithubToolPreset | GithubToolPreset[]
  instructions?: string
  additionalInstructions?: string
}): string {
  const defaultPrompt = options.preset && !Array.isArray(options.preset)
    ? PRESET_INSTRUCTIONS[options.preset]
    : DEFAULT_INSTRUCTIONS

  if (options.instructions) return options.instructions
  if (options.additionalInstructions) return `${defaultPrompt}\n\n${options.additionalInstructions}`
  return defaultPrompt
}

type AgentOptions = Omit<ToolLoopAgentSettings<ToolSet>, 'model' | 'tools' | 'instructions'>

export type CreateGithubAgentOptions = AgentOptions & GithubToolsBaseOptions & {
  model: ToolLoopAgentSettings<ToolSet>['model']
  /**
   * Restrict tools and system prompt to a predefined preset.
   *
   * Selects a subset of tools and, when a single preset is passed,
   * sets a matching system prompt. Combine presets with an array to merge tool sets.
   *
   * @see {@link GithubToolPreset} for available presets and included tools.
   */
  preset?: GithubToolPreset | GithubToolPreset[]
  /**
   * Fully replace the default system prompt.
   * When set, `preset` system prompts and `additionalInstructions` are ignored.
   */
  instructions?: string
  /**
   * Append text to the preset-specific (or default) system prompt.
   * Ignored when `instructions` is set.
   */
  additionalInstructions?: string
}

export function createGithubAgent(options: CreateGithubAgentOptions & { preset?: undefined }): ToolLoopAgent<never, AllGithubTools>
export function createGithubAgent<P extends GithubToolPreset>(
  options: CreateGithubAgentOptions & { preset: P },
): ToolLoopAgent<never, Pick<AllGithubTools, PresetToolName<P>>>
export function createGithubAgent<P extends readonly GithubToolPreset[]>(
  options: CreateGithubAgentOptions & { preset: P },
): ToolLoopAgent<never, Pick<AllGithubTools, CombinedPresetToolNames<P>>>

/**
 * Create a pre-configured GitHub agent powered by the AI SDK's `ToolLoopAgent`.
 *
 * Returns a `ToolLoopAgent` instance with `.generate()` and `.stream()` methods.
 *
 * @example
 * ```ts
 * import { createGithubAgent } from '@github-tools/sdk'
 *
 * const agent = createGithubAgent({
 *   model: 'anthropic/claude-sonnet-4.6',
 *   token: process.env.GITHUB_TOKEN!,
 *   preset: 'code-review',
 * })
 *
 * const result = await agent.generate({ prompt: 'Review PR #42 on vercel/ai' })
 * ```
 */
export function createGithubAgent({
  token,
  preset,
  requireApproval,
  instructions,
  additionalInstructions,
  author,
  committer,
  coAuthors,
  ...agentOptions
}: CreateGithubAgentOptions): ToolLoopAgent<never, AllGithubTools | Pick<AllGithubTools, GithubToolName>> {
  const tools = createGithubTools({ token, requireApproval, preset, author, committer, coAuthors })

  return new ToolLoopAgent({
    ...agentOptions,
    tools,
    instructions: resolveInstructions({ preset, instructions, additionalInstructions }),
  } as ToolLoopAgentSettings<never, typeof tools>) as ToolLoopAgent<never, typeof tools>
}
