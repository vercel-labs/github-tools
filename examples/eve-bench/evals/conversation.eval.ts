import { defineEval } from 'eve/evals'
import { benchSelection } from '../lib/configs.ts'
import { BENCH_LOG_PREFIX } from '../lib/log.ts'
import { TASKS } from './data/tasks.ts'

const MAX_APPROVAL_ROUNDS = 6
// Six back-to-back requests in one session, each needing different tools, to measure how the
// tool list affects prompt caching across turns.
const TURNS = ['explore', 'review-read', 'label', 'ci-diagnose', 'release-notes', 'notifications']

const selection = benchSelection()

export default defineEval({
  description: 'Six different requests in one session',
  tags: ['conversation'],
  metadata: { task: 'conversation', ...selection },
  timeoutMs: 1_200_000,
  async test(t) {
    t.log(`${BENCH_LOG_PREFIX}${JSON.stringify({ task: 'conversation', ...selection })}`)
    let session
    for (const id of TURNS) {
      const { prompt } = TASKS.find(task => task.id === id)!
      let turn = session ? await session.send(prompt) : await t.send(prompt)
      let rounds = 0
      while (turn.interactions.length > 0 && turn.interactions.every(r => r.request.kind === 'approval') && rounds < MAX_APPROVAL_ROUNDS) {
        rounds++
        turn = await turn.session.respondAll('approve')
      }
      session = turn.session
    }
    t.succeeded()
  },
})
