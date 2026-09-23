export { resolveGithubConnector } from './connector'
export type { GithubConnectorInput } from './connector'
export {
  PRESET_CONNECT_SCOPES,
  TOOL_CONNECT_SCOPES,
  connectGithubScopesForPreset,
  connectGithubScopesForSelection,
  connectGithubScopesForTools,
} from './scopes'
export type { ConnectScopeSelection } from './scopes'
export { connectGithubToken } from './token'
export { connectGithubTools } from './tools'
export { perRepository } from './per-repository'
export type { PerRepositoryConnectResolver } from './per-repository'
export type {
  ConnectGithubEveToolsOptions,
  ConnectGithubTokenOptions,
  ConnectGithubToolsOptions,
  GithubConnectParams,
  GithubConnectParamsInput,
  GithubConnectParamsResolver,
} from './types'
export type { GithubTokenCall } from '../core/token'
export type { ConnectTokenSubject } from '@vercel/connect'
