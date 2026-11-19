export { as, ConnectClient, emulateGithub, type EmulateGithubOptions, type GithubEmulation } from './emulate.js'
export {
  GithubClient,
  RepositoryClient,
  ThreadHandle,
  type EmulatedComment,
  type EmulatedIssue,
  type EmulatedPullRequest,
  type EvalTarget,
  type WaitForCommentOptions,
} from './client.js'
export type { ConnectRequest } from './connect/emulator.js'
export type {
  CodeScanningAlertSeed,
  DependabotAlertSeed,
  GithubRequest,
  PersonSeed,
  RepositorySeed,
  Role,
  SecretScanningAlertSeed,
  SecurityAlertSeeds,
} from './github/emulator.js'
