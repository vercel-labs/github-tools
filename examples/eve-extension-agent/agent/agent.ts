import { defineAgent } from 'eve'

export default defineAgent({
  model: 'anthropic/claude-sonnet-5',
  // Keep Connect out of the eve authored-module bundle when the extension
  // resolves it through the workspace-linked SDK (same as examples/eve-agent).
  build: {
    externalDependencies: ['@vercel/connect'],
  },
})
