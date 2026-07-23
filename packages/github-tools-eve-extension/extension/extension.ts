import { defineExtension } from 'eve/extension'
import { z } from 'zod'

const presetNameSchema = z.enum(['code-review', 'issue-triage', 'ci-ops', 'repo-explorer', 'maintainer'])

const commitIdentitySchema = z.object({
  name: z.string(),
  email: z.string(),
})

export default defineExtension({
  config: z.object({
    /** GitHub PAT. Falls back to `GITHUB_TOKEN` when omitted and `connector` is not set. */
    token: z.string().optional(),
    /** Vercel Connect connector name (e.g. `github/my-connector`). Takes priority over `token`. */
    connector: z.string().optional(),
    /** Vercel Connect token params passed through to `getToken` when `connector` is set. */
    connect: z.record(z.string(), z.unknown()).optional(),
    /** Restrict tools to a preset (or array of presets). Omit for all 42 tools. */
    preset: z.union([presetNameSchema, z.array(presetNameSchema)]).optional(),
    /** Global boolean or per-tool approval config — may hold predicate functions. */
    requireApproval: z.union([z.boolean(), z.record(z.string(), z.unknown())]).optional(),
    /** Per-tool overrides (description, approval, toModelOutput, outputSchema). */
    overrides: z.record(z.string(), z.unknown()).optional(),
    author: commitIdentitySchema.optional(),
    committer: commitIdentitySchema.optional(),
    coAuthors: z.array(commitIdentitySchema).optional(),
  }),
})
