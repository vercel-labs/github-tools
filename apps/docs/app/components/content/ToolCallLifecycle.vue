<script setup lang="ts">
const stages = ['Model', 'Approval', 'Token', 'GitHub API', 'Shaped result', 'Model reads']

interface Row {
  tool: string
  kind: 'read' | 'write'
  cells: string[]
  mono: boolean[]
}

const rows: Row[] = [
  {
    tool: 'listIssues',
    kind: 'read',
    cells: ['state: \'open\'', 'Read, skipped', 'Resolved', 'GET /issues', '{ items, hasMore }', '3 open issues'],
    mono: [true, false, false, true, true, false]
  },
  {
    tool: 'addLabels',
    kind: 'write',
    cells: ['issueNumber: 42\nlabels: [\'bug\']', 'Approved', 'Resolved', 'POST /labels', '[{ name, color, description }]', '#42 is labeled bug'],
    mono: [true, false, false, true, true, false]
  }
]

interface Frame {
  row: number
  stage: number
  note: string
}

const frames: Frame[] = [
  { row: 0, stage: 0, note: 'The model picks listIssues and writes its input. The tool\'s Zod schema checks it.' },
  { row: 0, stage: 1, note: 'listIssues is a read tool, so it skips approval.' },
  { row: 0, stage: 2, note: 'The SDK resolves the token: your string, or the function you passed, called now.' },
  { row: 0, stage: 3, note: 'The tool calls GitHub\'s REST API with that token.' },
  { row: 0, stage: 4, note: 'The SDK keeps only the fields the model needs, plus paging: a paged list.' },
  { row: 0, stage: 5, note: 'The model reads the result and decides what to do next.' },
  { row: 1, stage: 0, note: 'The model picks addLabels, a write tool, and writes its input.' },
  { row: 1, stage: 1, note: 'A write tool pauses here. The agent returns an approval request and waits for a person.' },
  { row: 1, stage: 1, note: 'A person approves, and the call continues.' },
  { row: 1, stage: 2, note: 'The SDK resolves the token for this call.' },
  { row: 1, stage: 3, note: 'The tool calls GitHub\'s REST API.' },
  { row: 1, stage: 4, note: 'The SDK keeps the name, color and description of each label.' },
  { row: 1, stage: 5, note: 'The model reads the result and tells you #42 is labeled.' }
]
const PAUSED = 7
const DONE_NOTE = 'Reads run straight through. Writes wait for approval, then take the same path to GitHub.'

const step = ref(-1)

function reached(row: number, stage: number) {
  const first = frames.findIndex(f => f.row === row && f.stage === stage)
  return step.value >= first
}

function active(row: number, stage: number) {
  const frame = frames[step.value]
  return frame?.row === row && frame.stage === stage
}

function cellText(row: number, stage: number) {
  if (row === 1 && stage === 1 && step.value <= PAUSED) return 'Write, paused'
  return rows[row]!.cells[stage]
}

const waiting = computed(() => step.value === PAUSED)
const note = computed(() => frames[step.value]?.note ?? (step.value >= frames.length ? DONE_NOTE : ''))

const STEP = 700
const HOLD = 1900

const { root, finished, still, replay } = useFigure({
  steps: [
    ...frames.map((_, i) => ({
      at: 300 + i * STEP + (i > PAUSED ? HOLD : 0) + (i >= 6 ? 500 : 0),
      run: () => {
        step.value = i
      }
    })),
    { at: 300 + frames.length * STEP + HOLD + 500, run: () => {
      step.value = frames.length
    } }
  ],
  reset: () => {
    step.value = -1
  },
  settle: () => {
    step.value = frames.length
  }
})
</script>

<template>
  <DocsFigure
    ref="root"
    caption="One read call and one write call on their way from the model to GitHub and back. Only the write stops, at approval."
    :finished
    :still
    @replay="replay"
  >
    <div class="p-4 sm:p-6">
      <div class="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-1.5 text-[12.5px]/5 lg:grid-flow-col lg:grid-cols-[auto_repeat(6,minmax(0,1fr))] lg:grid-rows-[auto_auto_auto]">
        <span aria-hidden="true" />
        <div
          v-for="row in rows"
          :key="row.tool"
          class="flex flex-col justify-center px-1 pb-1 lg:pr-3 lg:pb-0"
        >
          <code class="truncate font-mono text-highlighted">{{ row.tool }}</code>
          <span class="text-[11.5px] text-dimmed">{{ row.kind }} tool</span>
        </div>

        <template
          v-for="(stage, s) in stages"
          :key="stage"
        >
          <div class="flex items-center gap-2 pr-2 text-muted lg:items-end lg:pr-0 lg:pb-1">
            <span class="font-mono text-[11px] text-dimmed tabular-nums">{{ s + 1 }}</span>
            <span>{{ stage }}</span>
          </div>
          <div
            v-for="(row, r) in rows"
            :key="row.tool"
            class="relative flex min-h-14 items-center overflow-hidden rounded-md border px-2 py-2 transition-[border-color,background-color] duration-300"
            :class="active(r, s)
              ? (waiting && r === 1 && s === 1 ? 'border-(--d-warn)/60 bg-(--d-raised-strong)' : 'border-(--d-signal)/60 bg-(--d-raised-strong)')
              : reached(r, s) ? 'border-(--d-line) bg-(--d-raised-strong)' : 'border-dashed border-(--d-line)'"
          >
            <span
              class="d-step inline-flex min-w-0 items-center gap-1.5 break-words"
              :data-on="reached(r, s)"
              :class="row.mono[s] ? 'font-mono text-[11.5px] text-highlighted' : 'text-highlighted'"
            >
              <span
                v-if="s === 1"
                class="size-1.5 shrink-0 rounded-full transition-colors duration-300"
                :class="[
                  r === 1 && step <= PAUSED ? 'bg-(--d-warn)' : 'bg-(--d-signal)',
                  waiting && r === 1 ? 'animate-pulse' : ''
                ]"
              />
              <span class="min-w-0 whitespace-pre-line">{{ cellText(r, s) }}</span>
            </span>
            <span
              v-if="active(r, s)"
              :key="step"
              aria-hidden="true"
              class="absolute bottom-0 left-0 h-0.5"
              :class="waiting ? 'd-wait w-1/3 bg-(--d-warn)' : 'd-progress w-full bg-(--d-signal)'"
              :style="{ animationDuration: waiting ? '1200ms' : `${STEP}ms` }"
            />
          </div>
        </template>
      </div>
    </div>

    <p
      class="min-h-14 border-t border-(--d-line) px-4 py-3.5 pr-20 text-[13px]/5 text-muted sm:px-6"
      aria-live="polite"
    >
      {{ note }}
    </p>
  </DocsFigure>
</template>

<style scoped>
.d-progress {
  transform-origin: left;
  animation: d-progress linear both;
}

@keyframes d-progress {
  from {
    transform: scaleX(0);
  }
}

.d-wait {
  animation: d-wait ease-in-out infinite alternate;
}

@keyframes d-wait {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(200%);
  }
}
</style>
