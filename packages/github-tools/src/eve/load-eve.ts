import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const MISSING_EVE_MESSAGE =
  'The "eve" package is required to use @github-tools/sdk/eve. Install it with: pnpm add eve'

export type EveToolsModule = typeof import('eve/tools')
export type EveApprovalModule = typeof import('eve/tools/approval')

let eveToolsModule: EveToolsModule | undefined
let eveApprovalModule: EveApprovalModule | undefined

export function getEveTools(): EveToolsModule {
  if (eveToolsModule) return eveToolsModule
  try {
    eveToolsModule = require('eve/tools') as EveToolsModule
    return eveToolsModule
  } catch {
    throw new Error(MISSING_EVE_MESSAGE)
  }
}

export function getEveApprovalHelpers(): EveApprovalModule {
  if (eveApprovalModule) return eveApprovalModule
  try {
    eveApprovalModule = require('eve/tools/approval') as EveApprovalModule
    return eveApprovalModule
  } catch {
    throw new Error(MISSING_EVE_MESSAGE)
  }
}

export { MISSING_EVE_MESSAGE }
