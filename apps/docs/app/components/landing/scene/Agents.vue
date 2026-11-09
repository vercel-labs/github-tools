<script setup lang="ts">
import { PRESET_TOOLS, WRITE_TOOLS, type PresetName } from '~/utils/figure-data/presets'

type Agent = {
  id: string
  name: string
  preset?: PresetName
  hue: string
  task: string
  /** Start and end of the bar, as a share of the run. */
  span: [number, number]
  calls: { tool: string, result: string }[]
  result: string
  approval?: string
}

const AGENTS: Agent[] = [
  {
    id: 'manager',
    name: 'manager',
    hue: 'var(--ui-text-muted)',
    task: 'Splits the request and merges the answers',
    span: [0, 1],
    calls: [],
    result: 'v2.1 needs one more fix: #131 lacks a test. Three issues close with the release.'
  },
  {
    id: 'review',
    name: 'reviewer',
    preset: 'code-review',
    hue: 'var(--d-hue-1)',
    task: 'Check the open PRs in the v2.1 milestone',
    span: [0.06, 0.62],
    calls: [{ tool: 'listPullRequests', result: '2 open' }, { tool: 'getPullRequestContext', result: '#131, #133' }],
    result: '#131 needs a test, #133 is ready.'
  },
  {
    id: 'triage',
    name: 'triager',
    preset: 'issue-triage',
    hue: 'var(--d-hue-2)',
    task: 'Find the issues fixed since v2.0.0',
    span: [0.06, 0.5],
    calls: [{ tool: 'searchIssues', result: '3 fixed' }, { tool: 'listIssues', result: 'milestone v2.1' }],
    result: '#57, #61 and #88 are fixed and can close with the release.'
  },
  {
    id: 'release',
    name: 'releaser',
    preset: 'release-manager',
    hue: 'var(--d-hue-3)',
    task: 'Draft the v2.1.0 notes',
    span: [0.55, 0.95],
    calls: [{ tool: 'getReleaseContext', result: '14 commits' }, { tool: 'createRelease', result: 'draft v2.1.0' }],
    result: '2 features, 3 fixes.',
    approval: 'Create draft release v2.1.0?'
  }
]

const { later, clear } = useSceneTimers()
const DURATION = 5200

const draft = ref('Get v2.1 ready to ship')
const request = ref('')
const progress = ref(0)
const selected = ref('manager')
const approved = ref<boolean | null>(null)
let frame = 0

function start(text: string) {
  clear()
  cancelAnimationFrame(frame)
  request.value = text
  draft.value = ''
  approved.value = null
  progress.value = 0
  const begin = performance.now()
  const tick = (now: number) => {
    progress.value = Math.min(1, (now - begin) / DURATION)
    if (progress.value < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  later(DURATION * 0.97, () => { selected.value = 'release' })
}

onBeforeUnmount(() => cancelAnimationFrame(frame))

function width(agent: Agent) {
  const [from, to] = agent.span
  const end = agent.approval && approved.value === null ? Math.min(to, 0.9) : to
  return Math.max(0, Math.min(progress.value, end) - from)
}

function state(agent: Agent) {
  if (progress.value < agent.span[0]) return 'queued'
  if (agent.approval && progress.value >= 0.9 && approved.value === null) return 'waiting'
  return progress.value >= agent.span[1] ? 'done' : 'running'
}

function tools(agent: Agent) {
  if (!agent.preset) return { count: 0, writes: 0 }
  const list = PRESET_TOOLS[agent.preset]
  return { count: list.length, writes: list.filter(tool => WRITE_TOOLS.has(tool)).length }
}

const current = computed(() => AGENTS.find(agent => agent.id === selected.value)!)

const hint = computed(() => {
  if (!request.value) return 'Send the request. The manager hands each part to an agent scoped to one preset.'
  if (state(AGENTS[3]!) === 'waiting') return 'The release agent waits for you. Approve the draft in its panel.'
  if (progress.value < 1) return 'Click a row to see what that agent can do and what it did.'
  return 'Each agent only had the tools its job needs. Click the rows to compare.'
})

defineExpose({ hint })
</script>

<template>
  <LandingSceneWindow
    app="vercel"
    title="vercel.com/acme/agents/runs/run_2kq9"
    class="h-full"
  >
    <div class="shrink-0 border-b border-(--d-line) px-4 py-3">
      <p class="truncate text-[15px] text-highlighted">
        {{ request || 'New run' }}
      </p>
      <p class="mt-0.5 text-[12px] text-muted">
        1 manager, 3 agents · {{ request ? `${(progress * 5.2).toFixed(1)}s` : 'not started' }}
      </p>
    </div>

    <ul
      class="shrink-0 px-2 py-2"
      aria-label="Agents in this run"
    >
      <li
        v-for="agent in AGENTS"
        :key="agent.id"
      >
        <button
          type="button"
          class="grid w-full grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-3 rounded-md px-2 py-1.5 text-start sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]"
          :class="selected === agent.id ? 'bg-(--d-raised-strong)' : 'hover:bg-(--d-raised)'"
          :aria-pressed="selected === agent.id"
          @click="selected = agent.id"
        >
          <span class="flex min-w-0 items-center gap-2 text-[13px]">
            <span
              class="size-2 shrink-0 rounded-sm"
              :style="{ background: agent.hue }"
            />
            <span
              class="truncate"
              :class="agent.id === 'manager' ? 'text-highlighted' : 'ps-2 text-toned'"
            >{{ agent.name }}</span>
            <code
              v-if="agent.preset"
              class="hidden truncate font-mono text-[12px] text-dimmed sm:inline"
            >{{ agent.preset }}</code>
          </span>
          <span class="relative h-4">
            <span class="absolute inset-y-[7px] inset-x-0 rounded-full bg-(--d-line)" />
            <span
              class="absolute inset-y-0.5 rounded-sm"
              :class="state(agent) === 'waiting' ? 'animate-pulse' : ''"
              :style="{ left: `${agent.span[0] * 100}%`, width: `${width(agent) * 100}%`, background: agent.hue }"
            />
          </span>
        </button>
      </li>
    </ul>

    <div class="scene-scroll min-h-0 flex-1 overflow-y-auto border-t border-(--d-line) px-4 py-3">
      <div class="flex items-center gap-2">
        <span
          class="size-2 rounded-sm"
          :style="{ background: current.hue }"
        />
        <p class="text-[13px] text-highlighted">
          {{ current.name }}
        </p>
        <span class="text-[12px] text-dimmed">{{ request ? state(current) : 'queued' }}</span>
      </div>
      <p class="mt-1 text-[13px]/5 text-toned">
        {{ current.task }}
      </p>
      <p
        v-if="current.preset"
        class="mt-1 text-[12.5px] text-muted"
      >
        <code class="font-mono text-[12px] text-toned">{{ current.preset }}</code> preset: {{ tools(current).count }} tools, {{ tools(current).writes }} of them writes
      </p>
      <p
        v-else
        class="mt-1 text-[12.5px] text-muted"
      >
        No GitHub tools. It only delegates.
      </p>

      <template v-if="request && state(current) !== 'queued'">
        <ul
          v-if="current.calls.length"
          class="mt-2 flex flex-col gap-1 font-mono text-[12px]"
        >
          <li
            v-for="call in current.calls"
            :key="call.tool"
            class="flex gap-2"
          >
            <span :class="WRITE_TOOLS.has(call.tool) ? 'text-highlighted' : 'text-toned'">{{ call.tool }}</span>
            <span class="text-dimmed">→ {{ call.result }}</span>
          </li>
        </ul>
        <div
          v-if="current.approval && state(current) === 'waiting'"
          class="mt-2.5 flex flex-wrap items-center gap-2 rounded-md border border-(--d-line-strong) px-3 py-2"
        >
          <span class="me-auto text-[13px] text-highlighted">{{ current.approval }}</span>
          <button
            type="button"
            class="relative h-7 rounded-md bg-(--d-ok) px-3 text-[12.5px] font-medium text-white"
            @click="approved = true"
          >
            <span
              class="scene-ping pointer-events-none absolute inset-0 rounded-md"
              aria-hidden="true"
            />
            Approve
          </button>
          <button
            type="button"
            class="h-7 rounded-md border border-(--d-line-strong) px-3 text-[12.5px] text-highlighted"
            @click="approved = false"
          >
            Deny
          </button>
        </div>
        <p
          v-else-if="state(current) === 'done'"
          class="mt-2 text-[13px]/5 text-highlighted"
        >
          {{ current.approval && approved === false ? 'Denied: no release was created.' : current.result }}
          <template v-if="current.id === 'manager' && approved !== null">
            {{ approved ? 'The v2.1.0 draft release is on GitHub.' : 'You denied the draft release.' }}
          </template>
        </p>
      </template>
    </div>

    <LandingSceneComposer
      v-model="draft"
      placeholder="Ask the manager"
      action="Run"
      :disabled="!!request && progress < 1"
      @submit="start"
    />
  </LandingSceneWindow>
</template>
