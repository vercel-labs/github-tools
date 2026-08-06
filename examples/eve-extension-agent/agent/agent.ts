import { defineAgent } from 'eve'

export default defineAgent({
  model: 'anthropic/claude-sonnet-5',
  // Do not set build.externalDependencies: ['@vercel/connect'] here. The GitHub
  // channel imports `@vercel/connect/eve`, and NFT drops `#public` subpath files
  // under eve/connections when Connect is externalized (runtime
  // ERR_MODULE_NOT_FOUND on connections/errors.js).
})
