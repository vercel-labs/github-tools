import { defineAgent } from 'eve'

export default defineAgent({
  defaultTools: false,
  model: 'anthropic/claude-opus-5.5',
})
