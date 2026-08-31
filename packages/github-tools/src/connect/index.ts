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
export type {
  ConnectGithubEveToolsOptions,
  ConnectGithubTokenOptions,
  ConnectGithubToolsOptions,
  GithubConnectParams,
} from './types'
export type { ConnectTokenSubject } from '@vercel/connect'
