import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { BENCH_LOG_DIR, BENCH_LOG_PREFIX } from '../lib/log.ts'
import { TASKS } from '../evals/data/tasks.ts'

type Usage = { costUsd?: number, inputTokens: number, outputTokens: number, cacheReadTokens: number, cacheWriteTokens: number }
type Event = { type: string, data: { usage?: Usage }, meta: { at: string } }
type Tag = { task: string, config: string, level: string }

type Run = Tag & {
  passed: boolean
  costUsd: number
  steps: number
  firstStepInput: number
  inputTokens: number
  cacheReadTokens: number
  outputTokens: number
  approvals: number
  seconds: number
}

const evalsDir = join(process.cwd(), '.eve', 'evals')

function readJsonl<T>(file: string): T[] {
  const path = join(BENCH_LOG_DIR, file)
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as T)
}

function loadRuns(): Run[] {
  return readdirSync(evalsDir).flatMap((stamp) => {
    const dir = join(evalsDir, stamp, 'evals', 'tasks')
    if (!existsSync(dir)) return []
    return readdirSync(dir).filter(f => f.endsWith('.json')).flatMap((file) => {
      const artifact = JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
        verdict: string
        result: { logs: string[], derived: { inputRequests: unknown[] } }
      }
      const tagLine = artifact.result.logs.find(l => l.startsWith(BENCH_LOG_PREFIX))
      if (!tagLine) return []
      const tag = JSON.parse(tagLine.slice(BENCH_LOG_PREFIX.length)) as Tag
      const events = readFileSync(join(dir, file.replace('.json', '.events.ndjson')), 'utf8')
        .trim().split('\n').map(line => JSON.parse(line) as Event)
      const usages = events.filter(e => e.type === 'step.completed').map(e => e.data.usage!)
      const times = events.map(e => Date.parse(e.meta.at))
      return [{
        ...tag,
        passed: artifact.verdict === 'passed',
        costUsd: usages.reduce((s, u) => s + (u.costUsd ?? 0), 0),
        steps: usages.length,
        firstStepInput: usages[0]?.inputTokens ?? 0,
        inputTokens: usages.reduce((s, u) => s + u.inputTokens, 0),
        cacheReadTokens: usages.reduce((s, u) => s + u.cacheReadTokens, 0),
        outputTokens: usages.reduce((s, u) => s + u.outputTokens, 0),
        approvals: artifact.result.derived.inputRequests.length,
        seconds: (Math.max(...times) - Math.min(...times)) / 1000,
      }]
    })
  })
}

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
const mean = (xs: number[]) => xs.length ? sum(xs) / xs.length : 0
const usd = (x: number) => `$${x.toFixed(x < 0.1 ? 4 : 3)}`
const k = (x: number) => `${(x / 1000).toFixed(1)}k`
const pct = (x: number) => `${Math.round(x * 100)}%`

const runs = loadRuns()
const evaluatorCalls = readJsonl<{ config: string, level: string, ms: number }>('evaluator.jsonl')
const writes = readJsonl<{ config: string, level: string }>('writes.jsonl')

const variants = [...new Set(runs.map(r => `${r.config}|${r.level}`))]
const commonTasks = new Set(TASKS.map(t => t.id).filter(id => variants.every(v => runs.some(r => `${r.config}|${r.level}` === v && r.task === id))))
const common = runs.filter(r => commonTasks.has(r.task))
const label = (v: string) => {
  const [config, level] = v.split('|')
  return config === 'all' || config === 'fixed' ? config! : `${config} (${level})`
}
const baselineCost = mean(common.filter(r => r.config === 'all').map(r => r.costUsd))

const lines: string[] = [`Averages over the ${commonTasks.size} tasks completed by every configuration.`, '']
lines.push('| Configuration | Runs | Passed | Cost / task | vs all tools | First-step input | Input tokens / task | Cache read | Approvals asked | Stubbed writes | Jev calls / task | Time / task |')
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for (const v of variants) {
  const [config, level] = v.split('|')
  const rs = common.filter(r => r.config === config && r.level === level)
  const cost = mean(rs.map(r => r.costUsd))
  const jevCalls = evaluatorCalls.filter(c => c.config === config && c.level === level).length / rs.length
  lines.push(`| ${label(v)} | ${rs.length} | ${pct(mean(rs.map(r => Number(r.passed))))} | ${usd(cost)} | ${config === 'all' ? '-' : `${Math.round((cost / baselineCost - 1) * 100)}%`} | ${k(mean(rs.map(r => r.firstStepInput)))} | ${k(mean(rs.map(r => r.inputTokens)))} | ${pct(sum(rs.map(r => r.cacheReadTokens)) / Math.max(1, sum(rs.map(r => r.inputTokens))))} | ${sum(rs.map(r => r.approvals))} | ${writes.filter(w => w.config === config && w.level === level).length} | ${jevCalls.toFixed(1)} | ${mean(rs.map(r => r.seconds)).toFixed(0)}s |`)
}

lines.push('', '### Cost per task', '')
lines.push(`| Task | Use case | ${variants.map(label).join(' | ')} |`)
lines.push(`| --- | --- | ${variants.map(() => '---').join(' | ')} |`)
for (const task of TASKS) {
  const cells = variants.map((v) => {
    const [config, level] = v.split('|')
    const rs = runs.filter(r => r.task === task.id && r.config === config && r.level === level)
    if (!rs.length) return '-'
    return `${usd(mean(rs.map(r => r.costUsd)))}${rs.every(r => r.passed) ? '' : ' ✗'}`
  })
  lines.push(`| ${task.id} | ${task.useCase} | ${cells.join(' | ')} |`)
}

const decisionsPath = join(BENCH_LOG_DIR, 'decisions.json')
if (existsSync(decisionsPath)) {
  type Decisions = { level: string, routing: { covered: boolean, tools: number, chosen: string[] }[], approval: { safe: boolean, asked: boolean }[] }[]
  const decisions = JSON.parse(readFileSync(decisionsPath, 'utf8')) as Decisions
  lines.push('', '### Decision accuracy by confidence level', '')
  lines.push('| Level | Routing covers needed presets | Mean presets | Mean tools exposed | Safe writes run without a human | Unsafe writes sent to a human |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  for (const d of decisions) {
    const safe = d.approval.filter(a => a.safe)
    const unsafe = d.approval.filter(a => !a.safe)
    lines.push(`| ${d.level} | ${d.routing.filter(r => r.covered).length}/${d.routing.length} | ${mean(d.routing.map(r => r.chosen.length)).toFixed(2)} | ${mean(d.routing.map(r => r.tools)).toFixed(0)} | ${safe.filter(a => !a.asked).length}/${safe.length} | ${unsafe.filter(a => a.asked).length}/${unsafe.length} |`)
  }
}

const out = join(BENCH_LOG_DIR, 'report.md')
writeFileSync(out, `${lines.join('\n')}\n`)
console.log(lines.join('\n'))
console.log(`\nWrote ${out}`)
