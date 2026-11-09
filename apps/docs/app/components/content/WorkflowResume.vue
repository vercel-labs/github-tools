<script setup lang="ts">
type Status = 'idle' | 'running' | 'recorded' | 'interrupted' | 'waiting'

const STEPS = [
  { kind: 'Model', name: 'model call', detail: 'calls getPullRequestContext' },
  { kind: 'Tool', name: 'getPullRequestContext', detail: 'PR #128, 4 files' },
  { kind: 'Model', name: 'model call', detail: 'calls createPullRequestReview' },
  { kind: 'Write', name: 'createPullRequestReview', detail: 'needs approval', gate: true },
  { kind: 'Tool', name: 'createPullRequestReview', detail: 'review posted' },
  { kind: 'Model', name: 'model call', detail: 'final answer' }
]

const NUMBERS = STEPS.map((step, i) => (step.gate ? '' : String(STEPS.slice(0, i + 1).filter(s => !s.gate).length)))

const status = ref<Status[]>(STEPS.map(() => 'idle'))
const replayed = ref(false)
const crashed = ref(false)
const resumed = ref(false)
const skipped = ref(false)

function set(i: number, value: Status) {
  status.value = status.value.map((s, j) => (j === i ? value : s))
}

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 200, run: () => set(0, 'running') },
    { at: 900, run: () => set(0, 'recorded') },
    { at: 1100, run: () => set(1, 'running') },
    { at: 1800, run: () => set(1, 'recorded') },
    { at: 2000, run: () => set(2, 'running') },
    { at: 2700, run: () => {
      set(2, 'interrupted')
      crashed.value = true
    } },
    { at: 3700, run: () => {
      resumed.value = true
      replayed.value = true
    } },
    { at: 4300, run: () => set(2, 'running') },
    { at: 5000, run: () => set(2, 'recorded') },
    { at: 5200, run: () => set(3, 'waiting') },
    { at: 6400, run: () => { skipped.value = true } },
    { at: 7200, run: () => set(3, 'recorded') },
    { at: 7500, run: () => set(4, 'running') },
    { at: 8100, run: () => set(4, 'recorded') },
    { at: 8300, run: () => set(5, 'running') },
    { at: 9000, run: () => set(5, 'recorded') }
  ],
  reset: () => {
    status.value = STEPS.map(() => 'idle')
    replayed.value = false
    crashed.value = false
    resumed.value = false
    skipped.value = false
  },
  settle: () => {
    status.value = STEPS.map(() => 'recorded')
    replayed.value = true
    crashed.value = true
    resumed.value = true
    skipped.value = true
  }
})

function label(i: number) {
  const s = status.value[i]
  if (s === 'running') return i === 2 && resumed.value ? 'retrying' : 'running'
  if (s === 'interrupted') return 'interrupted, not recorded'
  if (s === 'waiting') return 'suspended, waiting for approval'
  if (s === 'recorded') {
    if (i < 2 && replayed.value) return 'recorded, not re-run'
    if (STEPS[i]?.gate) return 'approved'
    if (i === 2 && resumed.value) return 'recorded on retry'
    return 'recorded'
  }
  return ''
}
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Each model call and tool call is a recorded step, so after a crash the run picks up at the step that was cut off, and an approval can wait for hours."
    :finished
    :still
    @replay="replay"
  >
    <ol class="flex flex-col p-4 text-[13px]/6 sm:p-6">
      <template
        v-for="(step, i) in STEPS"
        :key="i"
      >
        <li
          class="d-step grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2 py-1.5 sm:grid-cols-[1.5rem_3.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-x-3"
          :data-on="status[i] !== 'idle'"
        >
          <span class="font-mono text-[12px] text-dimmed tabular-nums">{{ NUMBERS[i] }}</span>
          <span class="hidden text-dimmed sm:block">{{ step.kind }}</span>
          <span class="min-w-0">
            <span
              class="font-mono text-[12.5px]"
              :class="step.kind !== 'Model' ? 'text-highlighted' : 'text-muted'"
            >{{ step.name }}</span>
            <span
              v-if="status[i] === 'recorded'"
              class="ml-2 text-[12px] text-dimmed"
            >{{ step.detail }}</span>
          </span>
          <span class="col-start-2 inline-flex items-center gap-1.5 text-[12px] sm:col-start-auto sm:justify-self-end">
            <span
              class="size-1.5 shrink-0 rounded-full transition-colors duration-300"
              :class="{
                'bg-(--d-signal)': status[i] === 'recorded',
                'animate-pulse bg-(--d-line-strong)': status[i] === 'running',
                'bg-(--d-warn)': status[i] === 'interrupted',
                'animate-pulse bg-(--d-warn)': status[i] === 'waiting'
              }"
            />
            <span
              class="transition-colors duration-300"
              :class="status[i] === 'interrupted' || status[i] === 'waiting' ? 'text-toned' : 'text-dimmed'"
            >{{ label(i) }}</span>
          </span>
        </li>

        <li
          v-if="i === 2"
          class="d-step my-2 flex flex-col gap-1.5"
          :data-on="crashed"
        >
          <div class="flex items-center gap-3 text-[12px]">
            <span class="h-px flex-1 border-t border-dashed border-(--d-warn)/60" />
            <span class="text-toned">Process crashed during step 3</span>
            <span class="h-px flex-1 border-t border-dashed border-(--d-warn)/60" />
          </div>
          <p
            class="d-step text-center text-[12px] text-dimmed"
            :data-on="resumed"
          >
            Run resumes on a new worker. Steps 1 and 2 come from the record.
          </p>
        </li>

        <li
          v-if="i === 3"
          class="d-step my-2 flex items-center gap-3 text-[12px]"
          :data-on="skipped"
        >
          <span class="h-px flex-1 border-t border-dashed border-(--d-line-strong)" />
          <span class="inline-flex items-center gap-2 text-dimmed">
            <svg
              viewBox="0 0 12 12"
              class="size-3"
              aria-hidden="true"
            ><path
              d="M3 10 6 2M6 10 9 2"
              stroke="currentColor"
              stroke-width="1.2"
              fill="none"
            /></svg>
            3 hours later, a person approves
          </span>
          <span class="h-px flex-1 border-t border-dashed border-(--d-line-strong)" />
        </li>
      </template>
    </ol>
  </DocsFigure>
</template>
