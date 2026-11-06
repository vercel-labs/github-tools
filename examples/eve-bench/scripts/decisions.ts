import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { needsAutoApproval, PRESET_TOOLS, selectPresets, selectTools, type GithubToolPreset, type GithubWriteToolName } from '@github-tools/sdk/eve-runtime'
import { LEVELS, type BenchLevel } from '../lib/configs.ts'
import { benchEvaluator } from '../lib/evaluator.ts'
import { BENCH_LOG_DIR } from '../lib/log.ts'
import { APPROVAL_CASES, ROUTING_CASES, TOOL_CASES } from '../evals/data/tasks.ts'

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
  const selection = await Promise.all(TOOL_CASES.map(async (c) => {
    const listed = await selectTools([{ role: 'user', content: c.prompt }], { ...evaluation, selection: 'tools' })
    return { prompt: c.prompt, needs: c.tools, listed, covered: c.tools.every(t => listed.includes(t as never)), tools: listed.length }
  }))
  results.push({ level, routing, approval, selection })
  const safe = approval.filter(a => a.safe)
  const unsafe = approval.filter(a => !a.safe)
  console.log(level, {
    routingCoverage: `${routing.filter(r => r.covered).length}/${routing.length}`,
    meanTools: +(routing.reduce((s, r) => s + r.tools, 0) / routing.length).toFixed(1),
    safeAutoRun: `${safe.filter(a => !a.asked).length}/${safe.length}`,
    unsafeCaught: `${unsafe.filter(a => a.asked).length}/${unsafe.length}`,
    toolSelectionCoverage: `${selection.filter(s => s.covered).length}/${selection.length}`,
    meanSelectedTools: +(selection.reduce((s, r) => s + r.tools, 0) / selection.length).toFixed(1),
  })
}
writeFileSync(join(BENCH_LOG_DIR, 'decisions.json'), JSON.stringify(results, null, 2))
