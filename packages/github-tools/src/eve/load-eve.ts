import * as eveTools from 'eve/tools'
import * as eveApproval from 'eve/tools/approval'

/**
 * Static ESM imports so bundlers (eve/Nitro/Vercel) can resolve `eve` when it is
 * compiled into the output rather than left as `node_modules/eve` at runtime.
 * Runtime `createRequire("eve/tools")` fails in those targets.
 */
export type EveToolsModule = typeof import('eve/tools')
export type EveApprovalModule = typeof import('eve/tools/approval')

/**
 * @deprecated Never thrown since eve moved to static ESM imports — a missing
 * `eve` package now fails at module resolution with the bundler/runtime's own
 * error. Kept only for backward compatibility of the public export; do not
 * match on it. Will be removed in the next major.
 */
export const MISSING_EVE_MESSAGE =
  'The "eve" package is required to use @github-tools/sdk/eve. Install it with: pnpm add eve'

export function getEveTools(): EveToolsModule {
  return eveTools
}

export function getEveApprovalHelpers(): EveApprovalModule {
  return eveApproval
}
