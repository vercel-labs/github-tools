import { defineAgent } from 'eve'

export default defineAgent({
  model: 'anthropic/claude-sonnet-5',
  // TODO(eve-connect-bundle): remove when eve externalizes transitive @vercel/connect
  // imports from workspace-linked packages without build.externalDependencies.
  // See https://github.com/vercel-labs/github-tools/pull/44
  build: {
    externalDependencies: ['@vercel/connect'],
  },
})
