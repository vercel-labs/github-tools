import { tool } from 'ai'
import {
  listCodeScanningAlertsInputSchema,
  listCodeScanningAlertsDescription,
  listCodeScanningAlertsCore,
  listDependabotAlertsInputSchema,
  listDependabotAlertsDescription,
  listDependabotAlertsCore,
  listSecretScanningAlertsInputSchema,
  listSecretScanningAlertsDescription,
  listSecretScanningAlertsCore,
} from '../core/security'
import { githubTokenCall, resolveGithubToken, type GithubTokenInput } from '../core/token'
import type { GithubTool } from '../types'

async function listCodeScanningAlertsStep(args: Parameters<typeof listCodeScanningAlertsCore>[0]) {
  "use step"
  return listCodeScanningAlertsCore(args)
}

/** List code scanning alerts for a repository, with the rule, severity and location. */
export const listCodeScanningAlerts = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listCodeScanningAlertsDescription,
    inputSchema: listCodeScanningAlertsInputSchema,
    execute: async args => listCodeScanningAlertsStep({ token: await resolveGithubToken(token, githubTokenCall('listCodeScanningAlerts', args)), ...args }),
  })

async function listDependabotAlertsStep(args: Parameters<typeof listDependabotAlertsCore>[0]) {
  "use step"
  return listDependabotAlertsCore(args)
}

/** List Dependabot alerts for vulnerable dependencies, with the advisory and the first patched version. */
export const listDependabotAlerts = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listDependabotAlertsDescription,
    inputSchema: listDependabotAlertsInputSchema,
    execute: async args => listDependabotAlertsStep({ token: await resolveGithubToken(token, githubTokenCall('listDependabotAlerts', args)), ...args }),
  })

async function listSecretScanningAlertsStep(args: Parameters<typeof listSecretScanningAlertsCore>[0]) {
  "use step"
  return listSecretScanningAlertsCore(args)
}

/** List secret scanning alerts for a repository. The secret itself is never returned. */
export const listSecretScanningAlerts = (token: GithubTokenInput): GithubTool =>
  tool({
    description: listSecretScanningAlertsDescription,
    inputSchema: listSecretScanningAlertsInputSchema,
    execute: async args => listSecretScanningAlertsStep({ token: await resolveGithubToken(token, githubTokenCall('listSecretScanningAlerts', args)), ...args }),
  })
