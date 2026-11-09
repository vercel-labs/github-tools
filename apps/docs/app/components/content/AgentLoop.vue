<script setup lang="ts">
type Leg = 'call' | 'request' | 'result'

interface Lap {
  tool?: string
  http?: string
  result: string
}

// Inputs and result fields follow searchIssuesCore and getIssueCore in packages/github-tools/src/core.
const LAPS: Lap[] = [
  { tool: 'searchIssues', http: 'GET /search/issues', result: '3 open bugs, the oldest is #112' },
  { tool: 'getIssue', http: 'GET /issues/112', result: '#112 is open, 4 comments, no assignee' },
  { result: 'No tool call: the model answers. The oldest open bug is #112, the CLI crashes on an empty acme.config.json.' }
]
const PROMPT = 'What is the oldest open bug in acme/app about?'

const lap = ref(-1)
const leg = ref<Leg>()
const logged = ref(-1)
const asked = ref(false)

const B = FIGURE_PACE.beat
const RESULT = readFor(LAPS[0]!.result)
const at = timeline([
  B + 500,
  B, B, B, RESULT,
  B, B, B, RESULT,
  B
])

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: at[0]!, run: () => { asked.value = true } },
    ...[0, 1].flatMap(i => [
      { at: at[1 + i * 4]!, run: () => {
        lap.value = i
        leg.value = undefined
      } },
      { at: at[2 + i * 4]!, run: () => { leg.value = 'call' } },
      { at: at[3 + i * 4]!, run: () => { leg.value = 'request' } },
      { at: at[4 + i * 4]!, run: () => {
        leg.value = 'result'
        logged.value = i
      } }
    ]),
    { at: at[9]!, run: () => {
      lap.value = 2
      leg.value = undefined
      logged.value = 2
    } }
  ],
  reset: () => {
    lap.value = -1
    leg.value = undefined
    logged.value = -1
    asked.value = false
  },
  settle: () => {
    lap.value = 2
    leg.value = undefined
    logged.value = 2
    asked.value = true
  }
})

const LEGS: Leg[] = ['call', 'request', 'result']
function lit(l: Leg) {
  return leg.value !== undefined && LEGS.indexOf(leg.value) >= LEGS.indexOf(l)
}
function nodeOn(n: 'model' | 'sdk' | 'github') {
  if (n === 'model') return lap.value >= 0 && !finished.value && (leg.value === undefined || leg.value === 'result')
  if (n === 'sdk') return leg.value === 'call'
  return leg.value === 'request'
}

const toolLap = computed(() => Math.min(Math.max(lap.value, 0), 1))

const NODE = 'flex h-14 flex-col justify-center rounded-lg border bg-(--d-raised) px-3 transition-colors duration-500'
const TAG = 'relative z-10 rounded-[4px] border bg-default px-1.5 font-mono text-[12px]/5 whitespace-nowrap transition-colors duration-500'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The loop runs until the model answers. Each step, the model picks a tool, the SDK makes the request, and the shaped result goes back to the model."
    :finished
    :still
    @replay="replay"
  >
    <div class="@container px-3 py-8 sm:px-8 sm:py-10">
      <div class="mx-auto grid max-w-[46rem] gap-6 @xl:grid-cols-2 @xl:items-center">
        <div
          class="relative pe-20 text-[13px]"
          aria-hidden="true"
        >
          <div
            :class="NODE"
            :style="{ borderColor: nodeOn('model') ? 'var(--d-signal)' : 'var(--d-line-strong)' }"
          >
            <span class="font-medium text-highlighted">Model</span>
            <span class="d-stack font-mono text-[12px] text-muted">
              <span
                v-for="(_, i) in LAPS"
                :key="i"
                class="transition-opacity duration-300"
                :class="Math.max(lap, 0) === i ? '' : 'opacity-0'"
              >{{ i < 2 ? `step ${i + 1}, picks a tool` : 'step 3, answers' }}</span>
            </span>
          </div>

          <div class="relative flex h-10 items-center justify-center">
            <span class="absolute inset-y-0 left-1/2 w-px bg-(--d-line-strong)" />
            <span
              class="absolute inset-y-0 left-1/2 w-px origin-top bg-(--d-signal) transition-transform duration-500 ease-(--d-ease)"
              :class="lit('call') ? 'scale-y-100' : 'scale-y-0'"
            />
            <span
              :class="TAG"
              :style="{ borderColor: lit('call') ? 'var(--d-line-strong)' : 'var(--d-line)' }"
              class="text-muted"
            >TOOL CALL</span>
          </div>

          <div
            :class="NODE"
            :style="{ borderColor: nodeOn('sdk') ? 'var(--d-signal)' : 'var(--d-line-strong)' }"
          >
            <span class="font-medium text-highlighted">SDK</span>
            <span class="d-stack font-mono text-[12px] text-muted">
              <span
                v-for="(l, i) in LAPS.slice(0, 2)"
                :key="i"
                class="transition-opacity duration-300"
                :class="toolLap === i ? '' : 'opacity-0'"
              >{{ l.tool }}</span>
            </span>
          </div>

          <div class="relative flex h-10 items-center justify-center">
            <span class="absolute inset-y-0 left-1/2 w-px bg-(--d-line-strong)" />
            <span
              class="absolute inset-y-0 left-1/2 w-px origin-top bg-(--d-signal) transition-transform duration-500 ease-(--d-ease)"
              :class="lit('request') ? 'scale-y-100' : 'scale-y-0'"
            />
            <span
              :class="TAG"
              :style="{ borderColor: lit('request') ? 'var(--d-line-strong)' : 'var(--d-line)' }"
              class="text-muted"
            >REQUEST</span>
          </div>

          <div
            :class="NODE"
            :style="{ borderColor: nodeOn('github') ? 'var(--d-signal)' : 'var(--d-line-strong)' }"
          >
            <span class="flex items-center gap-2 font-medium text-highlighted">
              <UIcon
                name="i-simple-icons-github"
                class="size-3.5"
              />
              GitHub
            </span>
            <span class="d-stack font-mono text-[12px] text-muted">
              <span
                v-for="(l, i) in LAPS.slice(0, 2)"
                :key="i"
                class="transition-opacity duration-300"
                :class="toolLap === i ? '' : 'opacity-0'"
              >{{ l.http }}</span>
            </span>
          </div>

          <span
            class="absolute top-7 right-10 h-48 w-10 rounded-r-md border-y border-r transition-colors duration-500"
            :class="lit('result') ? 'border-(--d-ok)' : 'border-(--d-line-strong)'"
          />
          <svg
            viewBox="0 0 6 8"
            class="absolute top-[calc(1.75rem-4px)] right-[74px] h-2 w-1.5 transition-colors duration-500"
            :class="lit('result') ? 'fill-(--d-ok)' : 'fill-(--d-line-strong)'"
          ><path d="M0 4 6 0v8z" /></svg>
          <span class="absolute top-[7.75rem] right-10 flex translate-x-1/2 -translate-y-1/2">
            <span
              :class="TAG"
              :style="{ borderColor: lit('result') ? 'color-mix(in oklab, var(--d-ok) 60%, transparent)' : 'var(--d-line)' }"
            ><span :class="lit('result') ? 'text-(--d-ok)' : 'text-muted'">RESULT</span></span>
          </span>
        </div>

        <ol class="overflow-hidden rounded-lg border border-(--d-line-strong) bg-(--d-raised) text-[13px]/5">
          <li class="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 border-b border-(--d-line) px-3 py-2.5">
            <span class="text-[12px]/5 text-muted">Prompt</span>
            <span class="d-stack">
              <span
                class="flex flex-col justify-center gap-1.5 transition-opacity duration-300"
                :class="asked ? 'opacity-0' : ''"
                aria-hidden="true"
              >
                <span class="h-1.5 w-11/12 rounded-full bg-(--d-line-strong)" />
                <span class="h-1.5 w-1/2 rounded-full bg-(--d-line-strong)" />
              </span>
              <span
                class="text-highlighted transition-opacity duration-300"
                :class="asked ? '' : 'opacity-0'"
              >{{ PROMPT }}</span>
            </span>
          </li>
          <li
            v-for="(l, i) in LAPS"
            :key="i"
            class="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 border-b border-(--d-line) px-3 py-2.5 transition-colors duration-500 last:border-b-0"
            :class="lap === i && !finished ? 'bg-(--d-raised-strong)' : ''"
          >
            <span class="text-[12px]/5 text-muted tabular-nums">Step {{ i + 1 }}</span>
            <span class="d-stack">
              <span
                class="flex flex-col justify-center gap-1.5 transition-opacity duration-300"
                :class="logged >= i ? 'opacity-0' : ''"
                aria-hidden="true"
              >
                <span class="h-1.5 w-2/3 rounded-full bg-(--d-line-strong)" />
                <span class="h-1.5 w-5/6 rounded-full bg-(--d-line-strong)" />
              </span>
              <span
                class="flex flex-col transition-opacity duration-300"
                :class="logged >= i ? '' : 'opacity-0'"
              >
                <code
                  v-if="l.tool"
                  class="font-mono text-[12.5px] text-highlighted"
                >{{ l.tool }}</code>
                <span :class="l.tool ? 'text-muted' : 'text-highlighted'">{{ l.result }}</span>
              </span>
            </span>
          </li>
        </ol>
      </div>
    </div>
  </DocsFigure>
</template>
