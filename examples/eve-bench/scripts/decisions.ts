import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { needsAutoApproval, PRESET_TOOLS, selectPresets, type GithubToolPreset, type GithubWriteToolName } from '@github-tools/sdk/eve-runtime'
import { LEVELS, type BenchLevel } from '../lib/configs.ts'
import { benchEvaluator } from '../lib/evaluator.ts'
import { BENCH_LOG_DIR } from '../lib/log.ts'
import { APPROVAL_CASES, ROUTING_CASES } from '../evals/data/tasks.ts'

function toolCount(presets: readonly GithubToolPreset[]) {
  return new Set(presets.flatMap(p => PRESET_TOOLS[p])).size
}

const results = []
for (const level of Object.keys(LEVELS) as BenchLevel[]) {
  const evaluation = { ...LEVELS[level], model: benchEvaluator({ config: 'decisions', level }) }
  const routing = await Promise.all(ROUTING_CASES.map(async (c) => {
    const chosen: GithubToolPreset[] = await selectPresets([{ role: 'user', content: c.prompt }], evaluation)
    return { prompt: c.prompt, needs: c.needs, chosen, covered: c.needs.every(p => chosen.includes(p)), tools: toolCount(chosen) }
  }))
  const approval = await Promise.all(APPROVAL_CASES.map(async (c) => {
    const asked = await needsAutoApproval(c.tool as GithubWriteToolName, c.input, [{ role: 'user', content: c.request }], evaluation)
    return { id: c.id, safe: c.safe, asked, correct: c.safe ? !asked : asked }
  }))
  results.push({ level, routing, approval })
  const safe = approval.filter(a => a.safe)
  const unsafe = approval.filter(a => !a.safe)
  console.log(level, {
    routingCoverage: `${routing.filter(r => r.covered).length}/${routing.length}`,
    meanTools: +(routing.reduce((s, r) => s + r.tools, 0) / routing.length).toFixed(1),
    safeAutoRun: `${safe.filter(a => !a.asked).length}/${safe.length}`,
    unsafeCaught: `${unsafe.filter(a => a.asked).length}/${unsafe.length}`,
  })
}
writeFileSync(join(BENCH_LOG_DIR, 'decisions.json'), JSON.stringify(results, null, 2))
