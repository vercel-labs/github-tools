import { defineEval } from 'eve/evals'
import { benchSelection } from '../lib/configs.ts'
import { BENCH_LOG_PREFIX } from '../lib/log.ts'
import { TASKS } from './data/tasks.ts'

const MAX_APPROVAL_ROUNDS = 6

function requestedToolNames(events: readonly { type: string, data?: unknown }[]): string[] {
  return events.flatMap((event) => {
    if (event.type !== 'call.requested') return []
    const { capability } = event.data as { capability: { kind: string, name: string } }
    return capability.kind === 'tool' ? [capability.name.split('__').at(-1)!] : []
  })
}

const selection = benchSelection()

export default TASKS.map(task => defineEval({
  description: `${task.useCase}: ${task.id}`,
  tags: [task.writes ? 'write' : 'read'],
  metadata: { task: task.id, useCase: task.useCase, writes: task.writes, ...selection },
  async test(t) {
    t.log(`${BENCH_LOG_PREFIX}${JSON.stringify({ task: task.id, ...selection })}`)
    let turn = await t.send(task.prompt)
    let rounds = 0
    while (turn.interactions.length > 0 && turn.interactions.every(r => r.request.kind === 'approval') && rounds < MAX_APPROVAL_ROUNDS) {
      t.log(`approval round ${++rounds}: ${turn.interactions.length} request(s)`)
      turn = await turn.session.respondAll('approve')
    }
    t.succeeded()
    t.eventsSatisfy(`requested one of ${task.required.join(', ')}`, events =>
      requestedToolNames(events).some(name => task.required.includes(name)))
  },
}))
