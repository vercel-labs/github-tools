<script setup lang="ts">
type Level = 'yes' | 'partial' | 'no'

interface Route {
  name: string
  picks: string
  writer: string
  text: string
  stages: string[]
  output: string
  /** Typed input, approval and output, worded as in the comparison table on the page. */
  props: [Level, string, string?][]
}

// Octokit's addLabels response and the shaped result of addLabelsCore in packages/github-tools/src/core/issues.ts.
const ROUTES: Route[] = [
  {
    name: 'Octokit',
    picks: 'Your code',
    writer: 'Your code writes',
    text: 'await octokit.rest.issues.addLabels({ owner: \'acme\', repo: \'app\', issue_number: 42, labels: [\'bug\'] })',
    stages: ['Your code', 'Octokit', 'GitHub API'],
    output: '{ status: 200, headers: {…}, data: [{ id, node_id, url, name: \'bug\', color, default, description }] }',
    props: [
      ['yes', 'TypeScript types at build time'],
      ['no', 'None: your code runs what it calls'],
      ['no', 'GitHub\'s full response']
    ]
  },
  {
    name: 'gh CLI',
    picks: 'The model, as a command string',
    writer: 'The model writes',
    text: 'gh issue edit 42 --add-label bug -R acme/app',
    stages: ['Model', 'Shell tool', 'gh', 'GitHub API'],
    output: 'https://github.com/acme/app/issues/42',
    props: [
      ['partial', 'The CLI\'s flag parsing at run time'],
      ['partial', 'Whatever your shell tool asks, per command string'],
      ['partial', 'Text, or the fields the model lists in', '--json']
    ]
  },
  {
    name: 'GitHub tools',
    picks: 'The model, from tool descriptions',
    writer: 'The model fills',
    text: 'addLabels({ owner: \'acme\', repo: \'app\', issueNumber: 42, labels: [\'bug\'] })',
    stages: ['Model', 'Zod schema', 'Approval', 'Octokit', 'GitHub API'],
    output: '[{ name: \'bug\', color: \'d73a4a\', description: "Something isn\'t working" }]',
    props: [
      ['yes', 'A Zod schema per tool, checked before the call'],
      ['yes', 'Per write tool, on by default'],
      ['yes', 'Shaped results with paging, bodies cut to about 500 characters']
    ]
  }
]

const PROPS = ['Input checking', 'Approval', 'Output']
const ICONS: Record<Level, string> = { yes: 'i-lucide-check', partial: 'i-lucide-circle-dashed', no: 'i-lucide-minus' }

const TYPE_MS = 16
const STAGE_MS = 380

const focus = ref(-1)
const typed = ref(ROUTES.map(() => 0))
const stage = ref(ROUTES.map(() => 0))
const out = ref(ROUTES.map(() => false))
const lit = ref(ROUTES.map(() => 0))

function setAt<T>(r: Ref<T[]>, i: number, v: T) {
  r.value = r.value.map((x, j) => (j === i ? v : x))
}

function clear(i: number) {
  setAt(typed, i, 0)
  setAt(stage, i, 0)
  setAt(out, i, false)
  setAt(lit, i, 0)
}

function routeSteps(i: number) {
  const r = ROUTES[i]!
  const s: { at: number, run: () => void }[] = [{ at: 0, run: () => {
    focus.value = i
    clear(i)
  } }]
  let t = 250
  for (let c = 1; c <= r.text.length; c++) s.push({ at: t + c * TYPE_MS, run: () => setAt(typed, i, c) })
  t += r.text.length * TYPE_MS + 300
  r.stages.forEach((name, k) => {
    s.push({ at: t, run: () => setAt(stage, i, k + 1) })
    t += STAGE_MS + (name === 'Approval' ? 900 : 0)
  })
  s.push({ at: t, run: () => setAt(out, i, true) })
  t += 350
  PROPS.forEach((_, k) => s.push({ at: t + k * 260, run: () => setAt(lit, i, k + 1) }))
  return { steps: s, length: t + PROPS.length * 260 + 500 }
}

const all: { at: number, run: () => void }[] = []
let offset = 200
ROUTES.forEach((_, i) => {
  const { steps, length } = routeSteps(i)
  all.push(...steps.map(e => ({ at: e.at + offset, run: e.run })))
  offset += length
})

let timers: ReturnType<typeof setTimeout>[] = []
function stopTimers() {
  timers.forEach(clearTimeout)
  timers = []
}
onBeforeUnmount(stopTimers)

const { root, finished, still, replay } = useFigure({
  steps: all,
  reset: () => {
    stopTimers()
    focus.value = -1
    ROUTES.forEach((_, i) => clear(i))
  },
  settle: () => {
    focus.value = ROUTES.length - 1
    typed.value = ROUTES.map(r => r.text.length)
    stage.value = ROUTES.map(r => r.stages.length)
    out.value = ROUTES.map(() => true)
    lit.value = ROUTES.map(() => PROPS.length)
  }
})

function show(i: number) {
  stopTimers()
  routeSteps(i).steps.forEach(e => timers.push(setTimeout(e.run, e.at)))
}

function started(i: number) {
  return typed.value[i]! > 0 || stage.value[i]! > 0
}
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The same label reaches GitHub three ways, and only the GitHub tools route checks a typed input, asks before the write, and returns a shaped result."
    :finished
    :still
    @replay="replay"
  >
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-(--d-line) px-4 py-2.5 sm:px-6">
      <p class="text-[12.5px] text-muted">
        Intent: <span class="text-highlighted">label issue 42 as bug</span>
      </p>
      <div
        class="flex gap-1 transition-opacity duration-300"
        :class="finished ? 'opacity-100' : 'pointer-events-none opacity-0'"
      >
        <button
          v-for="(r, i) in ROUTES"
          :key="r.name"
          type="button"
          :tabindex="finished ? 0 : -1"
          :aria-pressed="focus === i"
          class="rounded-md px-2 py-0.5 text-[12px] ring-1 transition-[color,background-color,box-shadow,transform] duration-150 ring-inset focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) active:scale-[0.97]"
          :class="focus === i ? 'bg-(--d-raised-strong) text-highlighted ring-(--d-line-strong)' : 'text-muted ring-transparent hover:text-highlighted'"
          @click="show(i)"
        >
          {{ r.name }}
        </button>
      </div>
    </div>

    <ol class="flex flex-col">
      <li
        v-for="(r, i) in ROUTES"
        :key="r.name"
        class="flex flex-col gap-2.5 px-4 py-4 transition-opacity duration-300 sm:px-6"
        :class="[
          i > 0 ? 'border-t border-(--d-line)' : '',
          !finished && focus !== i && started(i) ? 'opacity-60' : 'opacity-100'
        ]"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <h4 class="text-[13px] text-highlighted">
            {{ r.name }}
          </h4>
          <span class="text-[12px] text-dimmed">Who picks the call: <span class="text-muted">{{ r.picks }}</span></span>
        </div>

        <div class="rounded-lg border border-(--d-line) bg-(--d-raised-strong) px-3 py-2">
          <p class="mb-0.5 text-[11px] text-dimmed">
            {{ r.writer }}
          </p>
          <code class="block min-h-5 font-mono text-[12px]/5 [overflow-wrap:anywhere] text-highlighted">{{ r.text.slice(0, typed[i]) }}<span
            v-if="focus === i && typed[i]! < r.text.length"
            class="caret"
          /></code>
        </div>

        <div class="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-[12px]">
          <template
            v-for="(s, k) in r.stages"
            :key="s"
          >
            <UIcon
              v-if="k > 0"
              name="i-lucide-arrow-right"
              class="size-3.5 transition-colors duration-300"
              :class="stage[i]! > k ? 'text-highlighted' : 'text-dimmed'"
            />
            <span
              class="relative inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 transition-[border-color,color,background-color] duration-300"
              :class="[
                stage[i]! > k ? 'border-(--d-line-strong) text-highlighted' : 'border-(--d-line) text-dimmed',
                stage[i] === k + 1 && !out[i] ? 'border-(--d-signal)' : '',
                s === 'Approval' && stage[i] === k + 1 && !out[i] ? 'border-(--d-warn)/60' : ''
              ]"
            >
              <span
                v-if="stage[i] === k + 1 && !out[i]"
                class="size-1.5 rounded-full"
                :class="s === 'Approval' ? 'animate-pulse bg-(--d-warn)' : 'bg-(--d-signal)'"
              />
              {{ s }}
            </span>
          </template>
        </div>

        <p
          class="d-step flex gap-1.5 font-mono text-[11.5px]/5 text-muted"
          :data-on="out[i]"
        >
          <span class="shrink-0 text-dimmed">→</span>
          <span class="min-w-0 [overflow-wrap:anywhere]">{{ r.output }}</span>
        </p>

        <ul class="grid gap-1.5 sm:grid-cols-3">
          <li
            v-for="(p, k) in r.props"
            :key="k"
            class="flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-[12px]/4 transition-[border-color,opacity] duration-300"
            :class="lit[i]! > k ? 'border-(--d-line-strong) opacity-100' : 'border-(--d-line) opacity-40'"
          >
            <span
              class="mt-px inline-flex size-4 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
              :class="lit[i]! > k && p[0] === 'yes' ? 'bg-(--d-signal) text-(--d-signal-fg)' : 'border border-(--d-line-strong) text-muted'"
            >
              <UIcon
                :name="ICONS[p[0]]"
                class="size-3"
              />
            </span>
            <span class="min-w-0">
              <span class="block text-dimmed">{{ PROPS[k] }}</span>
              <span :class="lit[i]! > k ? 'text-highlighted' : 'text-muted'">{{ p[2] ? `${p[1]} ` : p[1] }}<code
                v-if="p[2]"
                class="font-mono whitespace-nowrap"
              >{{ p[2] }}</code></span>
            </span>
          </li>
        </ul>
      </li>
    </ol>
  </DocsFigure>
</template>

<style scoped>
.caret {
  display: inline-block;
  width: 0.55em;
  height: 1.1em;
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
