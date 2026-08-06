import type { GithubConnectorInput } from '@github-tools/sdk/connect'
import { GITHUB_TOOL_NAMES, type GithubToolName } from '@github-tools/sdk/eve-runtime'
import { defineExtension } from 'eve/extension'
import { z } from 'zod'

const presetNameSchema = z.enum(['code-review', 'issue-triage', 'ci-ops', 'repo-explorer', 'security-audit', 'release-manager', 'maintainer'])
const toolNameSchema = z.enum(Object.values(GITHUB_TOOL_NAMES) as [GithubToolName, ...GithubToolName[]])

const commitIdentitySchema = z.object({
  name: z.string(),
  email: z.string(),
})

export default defineExtension({
  config: z.object({
    /** GitHub PAT. Falls back to `GITHUB_TOKEN` when omitted and `connector` is not set. */
    token: z.string().optional(),
    /**
     * Vercel Connect connector name (e.g. `github/my-connector`), or a
     * `() => string | Promise<string>` resolver for picking one dynamically
     * (e.g. per environment or tenant). Takes priority over `token`.
     */
    connector: z.custom<GithubConnectorInput>(
      value => typeof value === 'string' || typeof value === 'function',
    ).optional(),
    /** Vercel Connect token params passed through to `getToken` when `connector` is set. */
    connect: z.record(z.string(), z.unknown()).optional(),
    /** Restrict tools to a preset (or array of presets). Omit for all 57 tools. */
    preset: z.union([presetNameSchema, z.array(presetNameSchema)]).optional(),
    /**
     * Hand-pick tool names to add on top of `preset` (or standalone, without `preset`).
     * When combined with `preset`, the effective set is the union of both.
     */
    include: z.array(toolNameSchema).optional(),
    /** Remove specific tool names from the resolved set, applied after `preset` + `include`. */
    exclude: z.array(toolNameSchema).optional(),
    /**
     * Default owner / repo / pullNumber / issueNumber / ref for tool inputs
     * (matching fields become optional and fill from context when omitted).
     */
    context: z.object({
      owner: z.string().optional(),
      repo: z.string().optional(),
      pullNumber: z.number().optional(),
      issueNumber: z.number().optional(),
      ref: z.string().optional(),
    }).optional(),
    /** Global boolean or per-tool approval config — may hold predicate functions. */
    requireApproval: z.union([z.boolean(), z.record(z.string(), z.unknown())]).optional(),
    /** Per-tool overrides (description, approval, toModelOutput, outputSchema). */
    overrides: z.record(z.string(), z.unknown()).optional(),
    author: commitIdentitySchema.optional(),
    committer: commitIdentitySchema.optional(),
    coAuthors: z.array(commitIdentitySchema).optional(),
  }),
})
