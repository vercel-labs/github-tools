<script setup lang="ts">
type Status = 'idle' | 'running' | 'done' | 'interrupted' | 'waiting' | 'replayed'

interface Step {
  name: string
  detail: string
  mono?: boolean
  /** Bar position on the run's timeline, in percent. */
  from: number
  to: number
  ms: string
}

const STEPS: Step[] = [
  { name: 'model call', detail: 'calls getPullRequestContext', from: 0, to: 11, ms: '1.4s' },
  { name: 'getPullRequestContext', detail: 'PR #128, 4 files', mono: true, from: 11, to: 20, ms: '0.6s' },
  { name: 'model call', detail: 'calls createPullRequestReview', from: 41, to: 52, ms: '1.5s' },
  { name: 'approval', detail: 'createPullRequestReview', from: 52, to: 80, ms: '3h 02m' },
  { name: 'createPullRequestReview', detail: 'review posted', mono: true, from: 80, to: 88, ms: '0.8s' },
  { name: 'model call', detail: 'final answer', from: 88, to: 100, ms: '1.1s' }
]
const CRASH = 31
const RESUME = 41
const FIRST_TRY = 20

const status = ref<Status[]>(STEPS.map(() => 'idle'))
const crashed = ref(false)
const resumed = ref(false)

function set(i: number, value: Status) {
  status.value = status.value.map((s, j) => (j === i ? value : s))
}

const B = FIGURE_PACE.beat
const at = timeline([B, B, B, readFor('Process crashed during step 3'), B, B, B, FIGURE_PACE.hold + 400, B, B, B])

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: at[0]!, run: () => set(0, 'running') },
    { at: at[1]!, run: () => {
      set(0, 'done')
      set(1, 'running')
    } },
    { at: at[2]!, run: () => {
      set(1, 'done')
      set(2, 'running')
    } },
    { at: at[3]!, run: () => {
      set(2, 'interrupted')
      crashed.value = true
    } },
    { at: at[4]!, run: () => {
      resumed.value = true
      set(0, 'replayed')
      set(1, 'replayed')
    } },
    { at: at[5]!, run: () => set(2, 'running') },
    { at: at[6]!, run: () => {
      set(2, 'done')
      set(3, 'waiting')
    } },
    { at: at[8]!, run: () => {
      set(3, 'done')
      set(4, 'running')
    } },
    { at: at[9]!, run: () => {
      set(4, 'done')
      set(5, 'running')
    } },
    { at: at[10]!, run: () => set(5, 'done') }
  ],
  reset: () => {
    status.value = STEPS.map(() => 'idle')
    crashed.value = false
    resumed.value = false
  },
  settle: () => {
    status.value = STEPS.map((_, i) => (i < 2 ? 'replayed' : 'done'))
    crashed.value = true
    resumed.value = true
  }
})

const LABEL: Record<Status, string> = {
  idle: '',
  running: 'running',
  done: 'recorded',
  interrupted: 'interrupted',
  waiting: 'waiting',
  replayed: 'from the record'
}

const DOT: Record<Status, string> = {
  idle: 'bg-(--d-line-strong)',
  running: 'bg-(--d-line-strong)',
  done: 'bg-(--d-ok)',
  interrupted: 'bg-(--d-fail)',
  waiting: 'bg-(--d-warn)',
  replayed: 'bg-(--d-ok)'
}

function label(i: number) {
  if (i === 3 && status.value[3] === 'done') return 'approved'
  if (i === 2 && status.value[2] === 'done') return 'recorded on retry'
  return LABEL[status.value[i]!]
}

const LABELS = ['running', 'recorded', 'interrupted', 'waiting', 'from the record', 'approved', 'recorded on retry']

function barClass(i: number) {
  const s = status.value[i]
  if (i === 3) return 'bg-(--d-warn)'
  if (s === 'running') return 'bg-(--d-signal)/45'
  return 'bg-(--d-ok)'
}

const COLS = 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 @xl:gap-x-4 @xl:grid-cols-[12rem_minmax(0,1fr)_12.5rem]'
const done = computed(() => status.value[5] === 'done')
</script>

<template>
  <DocsFigure
    ref="root"
    caption="A crash doesn't restart the run. Each model call and tool call is a recorded step: after a crash the run resumes at the step that was cut off, and an approval can wait for hours."
    :finished
    :still
    @replay="replay"
  >
    <div class="@container px-3 py-8 sm:px-8 sm:py-10">
      <div class="mx-auto max-w-[46rem] overflow-hidden rounded-lg border border-(--d-line-strong) bg-(--d-raised) text-[13px]/5">
        <div class="flex items-center gap-3 border-b border-(--d-line) px-3 py-2">
          <code class="font-mono text-[12.5px] text-highlighted">reviewPullRequest</code>
          <span class="font-mono text-[12px] text-muted">PR #128</span>
          <span class="d-stack ms-auto justify-items-end text-[12px]">
            <span
              class="inline-flex items-center gap-1.5 text-muted transition-opacity duration-300"
              :class="done ? 'opacity-0' : ''"
            >
              <span class="size-2 rounded-full bg-(--d-line-strong)" />
              Running
            </span>
            <span
              class="inline-flex items-center gap-1.5 text-highlighted transition-opacity duration-300"
              :class="done ? '' : 'opacity-0'"
            >
              <span class="size-2 rounded-full bg-(--d-ok)" />
              Completed
            </span>
          </span>
        </div>

        <div class="relative px-3 pt-8 pb-8">
          <div
            class="pointer-events-none absolute inset-0 px-3"
            :class="COLS"
            aria-hidden="true"
          >
            <span class="@max-xl:hidden" />
            <div class="relative @max-xl:col-span-2">
              <div
                class="d-step absolute inset-y-0"
                :style="{ left: `${CRASH}%` }"
                :data-on="crashed"
              >
                <span class="absolute inset-y-0 left-0 border-l border-dashed border-(--d-fail)" />
                <span class="absolute top-1.5 left-0 -translate-x-1/2 rounded-[4px] border border-(--d-fail)/60 bg-default px-1.5 font-mono text-[12px]/5 text-(--d-fail)">CRASH</span>
              </div>
              <div
                class="d-step absolute inset-y-0"
                :style="{ left: `${RESUME}%` }"
                :data-on="resumed"
              >
                <span class="absolute inset-y-0 left-0 border-l border-dashed border-(--d-line-strong)" />
                <span class="absolute bottom-1.5 left-0 -translate-x-1/2 rounded-[4px] border border-(--d-line-strong) bg-default px-1.5 font-mono text-[12px]/5 whitespace-nowrap text-muted">RESUMED</span>
              </div>
            </div>
          </div>

          <ol class="relative flex flex-col">
            <li
              v-for="(step, i) in STEPS"
              :key="i"
              class="items-center gap-y-1.5 py-1.5"
              :class="COLS"
            >
              <span class="col-start-1 row-start-1 min-w-0">
                <span
                  class="me-2 text-highlighted"
                  :class="step.mono ? 'font-mono text-[12px] [overflow-wrap:anywhere] @xl:text-[12.5px]' : ''"
                >{{ step.name }}</span>
                <span
                  class="block text-[12px] [overflow-wrap:anywhere] text-muted @max-xl:hidden"
                  :class="i === 3 ? 'font-mono' : ''"
                >{{ step.detail }}</span>
              </span>

              <span
                class="relative col-span-2 col-start-1 row-start-2 h-2 rounded-full bg-(--d-line) @xl:col-span-1 @xl:col-start-2 @xl:row-start-1"
                aria-hidden="true"
              >
                <span
                  v-if="i === 2"
                  class="absolute inset-y-0 rounded-full bg-(--d-fail) transition-[opacity,transform] duration-500 ease-(--d-ease)"
                  :style="{ left: `${FIRST_TRY}%`, width: `${CRASH - FIRST_TRY}%`, transformOrigin: 'left' }"
                  :class="status[2] === 'idle' ? 'scale-x-0' : status[2] === 'running' && !crashed ? 'scale-x-100 bg-(--d-signal)/45!' : 'scale-x-100'"
                />
                <span
                  class="absolute inset-y-0 origin-left rounded-full transition-transform ease-(--d-ease)"
                  :class="[barClass(i), i === 3 ? 'ease-linear' : '']"
                  :style="{
                    left: `${step.from}%`,
                    width: `${step.to - step.from}%`,
                    transform: `scaleX(${(i === 2 ? resumed && status[2] !== 'idle' && status[2] !== 'interrupted' : status[i] !== 'idle') ? 1 : 0})`,
                    transitionDuration: i === 3 ? `${FIGURE_PACE.hold + 400 + B}ms` : '500ms'
                  }"
                />
              </span>

              <span class="col-start-2 row-start-1 flex items-center justify-end gap-3 justify-self-end text-[12px] @xl:col-start-3">
                <span class="d-stack justify-items-end">
                  <span
                    v-for="l in LABELS"
                    :key="l"
                    class="inline-flex items-center gap-1.5 whitespace-nowrap transition-opacity duration-300"
                    :class="[label(i) === l ? '' : 'opacity-0', l === 'interrupted' ? 'text-(--d-fail)' : l === 'waiting' ? 'text-(--d-warn)' : 'text-muted']"
                    :aria-hidden="label(i) !== l"
                  >
                    <span
                      class="size-2 rounded-full"
                      :class="DOT[status[i]!]"
                    />
                    {{ l }}
                  </span>
                </span>
                <span
                  class="w-12 text-right font-mono text-muted tabular-nums transition-opacity duration-300 @max-xl:hidden"
                  :class="status[i] === 'done' || status[i] === 'replayed' ? '' : 'opacity-0'"
                >{{ step.ms }}</span>
              </span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </DocsFigure>
</template>
