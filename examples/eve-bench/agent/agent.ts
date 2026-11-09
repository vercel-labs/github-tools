import { defineAgent } from 'eve'

export default defineAgent({
  // Only the `cli` config gets eve's built-in bash and file tools; the others use GitHub tools alone.
  defaultTools: process.env.BENCH_CONFIG === 'cli',
  model: 'anthropic/claude-opus-5.5',
})
