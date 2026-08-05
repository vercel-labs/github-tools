import { connectGithubToken } from '@github-tools/sdk/connect'
import { buildEveToolMap, type EveApprovalConfig, type EveToolOverrides, type GithubToolName } from '@github-tools/sdk/eve'
import { defineDynamic } from 'eve/tools'
import extension from '../extension'

export default defineDynamic({
  events: {
    'session.started': async () => {
      const { token, connector, connect, preset, tools, requireApproval, overrides, author, committer, coAuthors } = extension.config

      const resolvedToken = connector
        ? connectGithubToken(connector, { preset, params: connect })
        : token

      return buildEveToolMap({
        token: resolvedToken,
        preset,
        tools: tools as GithubToolName[] | undefined,
        requireApproval: requireApproval as EveApprovalConfig | undefined,
        overrides: overrides as EveToolOverrides | undefined,
        author,
        committer,
        coAuthors,
      })
    },
  },
})
