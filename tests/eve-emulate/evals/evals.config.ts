import { defineEvalConfig } from 'eve/evals'
import { emulateGithub } from '@github-tools/eve-extension/testing'

export default defineEvalConfig({
  async setup() {
    const emulation = await emulateGithub({
      repositories: { 'acme/web': { labels: ['bug'] } },
      people: {
        alice: { role: 'write' },
        bob: { role: 'read' },
        carol: { role: 'write', authorized: false },
        dave: { role: 'write' },
      },
    })
    // `scripts/probe.mjs` sets this to check that a run whose agent has no redirect stops before the first eval.
    if (process.env.EVAL_WITHOUT_REDIRECT) process.env.NODE_OPTIONS = ''
    return emulation
  },
  teardown: context => context?.close(),
})
