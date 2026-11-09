<script setup lang="ts">
type Leg = 'request' | 'call' | 'http' | 'return' | 'answer'
type Node = 'model' | 'sdk' | 'github'

interface Step {
  call?: string
  tool?: string
  http?: string
  result?: string
}

// Inputs and result fields follow searchIssuesCore and getIssueCore in packages/github-tools/src/core.
const STEPS: Step[] = [
  {
    tool: 'searchIssues',
    call: 'searchIssues({ query: \'repo:acme/app is:issue is:open label:bug\', sort: \'created\', order: \'asc\' })',
    http: 'GET /search/issues',
    result: '{ totalCount: 3, items: [{ number: 112, title: \'CLI crashes on an empty config\', labels: [\'bug\'] }, …] }'
  },
  {
    tool: 'getIssue',
    call: 'getIssue({ owner: \'acme\', repo: \'app\', issueNumber: 112 })',
    http: 'GET /repos/acme/app/issues/112',
    result: '{ number: 112, state: \'open\', assignees: [], comments: 4, body: \'Running acme init with an empty acme.config.json…\' }'
  },
  {}
]

const REQUEST = 'What is the oldest open bug in acme/app about?'
const ANSWER = 'The oldest open bug is #112: the CLI crashes when acme.config.json is empty. It has 4 comments and nobody is assigned.'

const LEG_MS: Record<Leg, number> = { request: 500, call: 600, http: 600, return: 1000, answer: 500 }

const step = ref(0)
const leg = ref<Leg>()
const legRun = ref(0)
const active = ref<Node>()
const replied = ref(false)
const logged = ref(0)
const results = ref(0)
const typed = ref(0)
const asked = ref(false)

function go(next: Leg | undefined, node?: Node) {
  leg.value = next
  legRun.value++
  active.value = node
}

const TYPE_MS = 18
const steps: { at: number, run: () => void }[] = [
  { at: 200, run: () => {
    asked.value = true
  } },
  { at: 500, run: () => go('request') }
]

let t = 1000
STEPS.forEach((s, i) => {
  steps.push({ at: t, run: () => {
    step.value = i + 1
    go(undefined, 'model')
  } })
  if (!s.call) {
    steps.push({ at: t + 700, run: () => go('answer') })
    steps.push({ at: t + 1200, run: () => {
      go(undefined)
      replied.value = true
    } })
    for (let c = 1; c <= ANSWER.length; c++) {
      steps.push({ at: t + 1300 + c * TYPE_MS, run: () => { typed.value = c } })
    }
    return
  }
  steps.push({ at: t + 600, run: () => {
    go('call')
    logged.value = i + 1
  } })
  steps.push({ at: t + 1200, run: () => go(undefined, 'sdk') })
  steps.push({ at: t + 1500, run: () => go('http') })
  steps.push({ at: t + 2100, run: () => go(undefined, 'github') })
  steps.push({ at: t + 2400, run: () => go('return') })
  steps.push({ at: t + 3400, run: () => {
    go(undefined)
    results.value = i + 1
  } })
  t += 3500
})

const { root, finished, still, replay } = useFigure({
  steps,
  reset: () => {
    clearTimers()
    step.value = 0
    go(undefined)
    replied.value = false
    logged.value = 0
    results.value = 0
    typed.value = 0
    asked.value = false
  },
  settle: () => {
    step.value = STEPS.length
    go(undefined)
    asked.value = true
    replied.value = true
    logged.value = STEPS.length
    results.value = STEPS.length
    typed.value = ANSWER.length
  }
})

const current = computed<Step>(() => STEPS[step.value - 1] ?? {})

// After the figure has played, a step button reruns that step's legs.
let timers: ReturnType<typeof setTimeout>[] = []
function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}
function after(ms: number, fn: () => void) {
  timers.push(setTimeout(fn, ms))
}
function show(i: number) {
  clearTimers()
  step.value = i + 1
  go(undefined, 'model')
  if (!STEPS[i]!.call) {
    after(400, () => go('answer'))
    after(900, () => go(undefined))
    return
  }
  after(300, () => go('call'))
  after(900, () => go(undefined, 'sdk'))
  after(1100, () => go('http'))
  after(1700, () => go(undefined, 'github'))
  after(1900, () => go('return'))
  after(2900, () => go(undefined))
}
onBeforeUnmount(clearTimers)

// Connector paths are measured from the rendered boxes, so they follow the layout at any width.
const stage = ref<HTMLElement>()
const strip = ref<HTMLElement>()
const nodes = reactive<Record<Node, HTMLElement | undefined>>({ model: undefined, sdk: undefined, github: undefined })
const paths = ref<Record<Leg, string>>()
const laneY = ref(0)

function measure() {
  const box = stage.value?.getBoundingClientRect()
  const top = strip.value?.getBoundingClientRect()
  const m = nodes.model?.getBoundingClientRect()
  const s = nodes.sdk?.getBoundingClientRect()
  const g = nodes.github?.getBoundingClientRect()
  if (!box || !top || !m || !s || !g) return
  const x = (r: DOMRect, f = 0.5) => r.left - box.left + r.width * f
  const y = (r: DOMRect, f = 0.5) => r.top - box.top + r.height * f
  const lane = y(g, 1) + 24
  laneY.value = lane
  paths.value = {
    request: `M ${x(m)} ${y(top, 1)} V ${y(m, 0)}`,
    call: `M ${x(m, 1)} ${y(m)} H ${x(s, 0)}`,
    http: `M ${x(s, 1)} ${y(s)} H ${x(g, 0)}`,
    return: `M ${x(g)} ${y(g, 1)} V ${lane} H ${x(m)} V ${y(m, 1)}`,
    answer: `M ${x(m)} ${y(m, 0)} V ${y(top, 1)}`
  }
}

let observer: ResizeObserver | undefined
onMounted(() => {
  measure()
  observer = new ResizeObserver(measure)
  if (stage.value) observer.observe(stage.value)
})
onBeforeUnmount(() => observer?.disconnect())

const NODES: { id: Node, title: string, sub: string, icon: string }[] = [
  { id: 'model', title: 'Model', sub: 'picks a tool', icon: 'i-lucide-sparkles' },
  { id: 'sdk', title: 'SDK', sub: 'in your process', icon: 'i-lucide-wrench' },
  { id: 'github', title: 'GitHub', sub: 'REST API', icon: 'i-lucide-github' }
]

function legLit(l: Leg) {
  return leg.value === l || (l === 'request' && leg.value === 'answer') || (l === 'answer' && leg.value === 'request')
}
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Each step, the model picks a tool, the SDK makes the request, and the shaped result goes back to the model, until the model answers instead of calling a tool."
    :finished
    :still
    @replay="replay"
  >
    <div class="flex items-center justify-between gap-3 border-b border-(--d-line) px-4 py-2.5 text-[12px] sm:px-6">
      <span class="inline-flex items-baseline gap-2 text-dimmed">
        Step
        <span class="font-mono text-[15px] text-highlighted tabular-nums">{{ step }}</span>
      </span>
      <div
        class="flex gap-1 transition-opacity duration-300"
        :class="finished ? 'opacity-100' : 'pointer-events-none opacity-0'"
      >
        <button
          v-for="(s, i) in STEPS"
          :key="i"
          type="button"
          :tabindex="finished ? 0 : -1"
          :aria-pressed="step === i + 1"
          :aria-label="`Show step ${i + 1}`"
          class="rounded-md px-2 py-0.5 font-mono text-[12px] ring-1 transition-[color,background-color,box-shadow,transform] duration-150 ring-inset focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) active:scale-[0.97]"
          :class="step === i + 1 ? 'bg-(--d-raised-strong) text-highlighted ring-(--d-line-strong)' : 'text-muted ring-transparent hover:text-highlighted'"
          @click="show(i)"
        >
          {{ i + 1 }}
        </button>
      </div>
    </div>

    <div
      ref="stage"
      class="relative px-4 pt-4 pb-12 sm:px-6 sm:pt-5"
    >
      <svg
        v-if="paths"
        class="pointer-events-none absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
      >
        <path
          v-for="l in (['request', 'call', 'http', 'return'] as const)"
          :key="l"
          :d="paths[l]"
          fill="none"
          stroke-width="1"
          class="transition-[stroke] duration-300"
          :class="legLit(l) ? 'stroke-(--d-signal)' : 'stroke-(--d-line-strong)'"
        />
      </svg>
      <span
        v-if="paths && leg"
        :key="legRun"
        class="loop-dot"
        :style="{ offsetPath: `path('${paths[leg]}')`, animationDuration: `${LEG_MS[leg]}ms` }"
        aria-hidden="true"
      />

      <div
        ref="strip"
        class="relative flex flex-col gap-1.5 rounded-lg border border-(--d-line) bg-(--d-raised-strong) px-3 py-2.5 text-[13px]/5 sm:px-4"
      >
        <p
          class="d-step flex gap-3"
          :data-on="asked"
        >
          <span class="w-11 shrink-0 text-dimmed">You</span>
          <span class="min-w-0 text-highlighted">{{ REQUEST }}</span>
        </p>
        <p
          class="d-step flex gap-3"
          :data-on="replied"
        >
          <span class="w-11 shrink-0 text-dimmed">Agent</span>
          <span class="relative min-w-0">
            <span
              class="invisible"
              aria-hidden="true"
            >{{ ANSWER }}</span>
            <span class="absolute inset-0 text-highlighted">{{ ANSWER.slice(0, typed) }}<span
              v-if="replied && typed < ANSWER.length"
              class="caret"
            /></span>
          </span>
        </p>
      </div>

      <div class="relative mt-9 grid grid-cols-[minmax(0,1fr)_minmax(1.5rem,0.7fr)_minmax(0,1fr)_minmax(1.5rem,0.7fr)_minmax(0,1fr)] items-center">
        <template
          v-for="(n, i) in NODES"
          :key="n.id"
        >
          <div
            :ref="el => { nodes[n.id] = el as HTMLElement }"
            class="relative z-10 flex flex-col items-center gap-1 rounded-lg border bg-(--d-raised) px-1.5 py-2.5 text-center transition-[border-color,box-shadow] duration-300"
            :class="active === n.id ? 'border-(--d-signal) shadow-[0_0_0_3px_var(--d-raised-strong)]' : 'border-(--d-line-strong)'"
          >
            <UIcon
              :name="n.icon"
              class="size-4 transition-colors duration-300"
              :class="active === n.id ? 'text-highlighted' : 'text-dimmed'"
            />
            <span class="text-[12.5px] text-highlighted">{{ n.title }}</span>
            <span class="text-[11px]/4 text-dimmed">{{ n.id === 'model' && step === STEPS.length ? 'answers' : n.sub }}</span>
          </div>
          <div
            v-if="i < NODES.length - 1"
            class="relative h-full"
          >
            <span class="absolute inset-x-0 bottom-1/2 mb-1.5 hidden truncate px-1 text-center font-mono text-[11px] text-muted sm:block">
              {{ i === 0 ? current.tool : current.http && 'request' }}
            </span>
          </div>
        </template>
      </div>

      <span
        v-if="paths"
        class="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-(--d-raised) px-2 text-[11.5px] text-muted"
        :style="{ top: `${laneY}px` }"
      >shaped result</span>
    </div>

    <ol class="flex flex-col gap-3 border-t border-(--d-line) px-4 py-4 text-[12.5px]/5 sm:px-6">
      <li
        v-for="(s, i) in STEPS"
        :key="i"
        class="d-step grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2 transition-opacity"
        :data-on="s.call ? logged > i : replied"
        :class="finished && step !== i + 1 ? 'opacity-55' : ''"
      >
        <span class="font-mono text-[12px] text-dimmed tabular-nums">Step {{ i + 1 }}</span>
        <div
          v-if="s.call"
          class="min-w-0"
        >
          <code class="block font-mono text-[12px]/5 [overflow-wrap:anywhere] text-highlighted">{{ s.call }}</code>
          <p class="mt-0.5 font-mono text-[11.5px]/5 [overflow-wrap:anywhere] text-dimmed">
            <span class="text-dimmed">{{ s.http }}</span>
          </p>
          <p
            class="d-step mt-0.5 flex gap-1.5 font-mono text-[11.5px]/5 text-muted"
            :data-on="results > i"
          >
            <span class="shrink-0 text-dimmed">→</span>
            <span class="min-w-0 [overflow-wrap:anywhere]">{{ s.result }}</span>
          </p>
        </div>
        <p
          v-else
          class="inline-flex items-center gap-1.5 text-muted"
        >
          <span class="size-1.5 shrink-0 rounded-full bg-(--d-signal)" />
          No tool call: the model answers, and the loop ends.
        </p>
      </li>
    </ol>
  </DocsFigure>
</template>

<style scoped>
.loop-dot {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  background: var(--d-signal);
  box-shadow: 0 0 0 3px var(--d-raised);
  offset-anchor: 50% 50%;
  offset-rotate: 0deg;
  animation-name: loop-run;
  animation-timing-function: cubic-bezier(0.45, 0, 0.55, 1);
  animation-fill-mode: forwards;
}

@keyframes loop-run {
  from {
    offset-distance: 0%;
    opacity: 0;
  }

  12% {
    opacity: 1;
  }

  88% {
    opacity: 1;
  }

  to {
    offset-distance: 100%;
    opacity: 0;
  }
}

.caret {
  display: inline-block;
  width: 0.5em;
  height: 1.1em;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: var(--d-signal);
  animation: caret-blink 1s steps(1) infinite;
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}
</style>
