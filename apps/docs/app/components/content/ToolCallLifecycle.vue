<script setup lang="ts">
type Kind = 'model' | 'tool' | 'stage' | 'request' | 'approval'

interface Span {
  name: string
  detail: string
  kind: Kind
  /** Start and length on the trace, in ms. */
  start: number
  ms: number
  /** Animation step at which the row appears. */
  step: number
  /** Grows through the approval wait. */
  waits?: boolean
}

const TOTAL = 13100

// Inputs and result shapes follow listIssuesCore and addLabelsCore in packages/github-tools/src/core/issues.ts.
const SPANS: Span[] = [
  { name: 'model', detail: 'step 1, picks listIssues', kind: 'model', start: 0, ms: 1180, step: 0 },
  { name: 'listIssues', detail: 'read tool', kind: 'tool', start: 1180, ms: 240, step: 1 },
  { name: 'approval', detail: 'skipped, read tool', kind: 'stage', start: 1180, ms: 0, step: 1 },
  { name: 'token', detail: 'resolved', kind: 'stage', start: 1180, ms: 2, step: 2 },
  { name: 'GET /issues', detail: '200', kind: 'request', start: 1182, ms: 226, step: 2 },
  { name: 'shape result', detail: '{ items, hasMore }', kind: 'stage', start: 1408, ms: 12, step: 3 },
  { name: 'model', detail: 'step 2, picks addLabels', kind: 'model', start: 1420, ms: 1230, step: 4 },
  { name: 'addLabels', detail: 'write tool', kind: 'tool', start: 2650, ms: 9350, step: 5, waits: true },
  { name: 'approval', detail: 'approved by a person', kind: 'approval', start: 2650, ms: 9000, step: 5, waits: true },
  { name: 'token', detail: 'resolved', kind: 'stage', start: 11650, ms: 3, step: 6 },
  { name: 'POST /labels', detail: '200', kind: 'request', start: 11653, ms: 335, step: 7 },
  { name: 'shape result', detail: '[{ name, color, description }]', kind: 'stage', start: 11988, ms: 12, step: 8 },
  { name: 'model', detail: 'step 3, answers', kind: 'model', start: 12000, ms: 1100, step: 9 }
]

const NOTES = [
  'listIssues is a read tool, so it runs straight through.',
  'addLabels is a write tool. It stops at approval and waits for a person.',
  'A person approves, and the write takes the same path to GitHub.',
  'Reads run straight through. Writes wait for approval, then take the same path.'
]

const B = FIGURE_PACE.beat
const WAIT = Math.max(readFor(NOTES[1]!), FIGURE_PACE.hold)
const at = timeline([B, B, B, B, B, WAIT, B, B, B, B])

const step = ref(-1)
const note = ref(-1)
const waiting = computed(() => step.value === 5)

const { root, finished, still, replay } = useFigure({
  steps: at.map((t, i) => ({ at: t, run: () => {
    step.value = i
    note.value = i === 9 ? 3 : i >= 6 ? 2 : i === 5 ? 1 : 0
  } })),
  reset: () => {
    step.value = -1
    note.value = -1
  },
  settle: () => {
    step.value = SPANS.length
    note.value = 3
  }
})

function duration(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`
}

function growMs(span: Span) {
  if (span.kind === 'approval') return WAIT
  if (span.waits) return WAIT + 3 * B
  return span.kind === 'tool' ? 2 * B : 600
}

const BAR: Record<Kind, string> = {
  model: 'bg-(--d-line-strong)',
  tool: 'bg-(--d-signal)/45',
  stage: 'bg-(--d-signal)/30',
  request: 'bg-(--d-ok)',
  approval: 'bg-(--d-warn)'
}

const TICKS = [0, 5000, 10000]
const COLS = 'grid grid-cols-[minmax(0,1fr)_4rem] gap-x-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_4rem]'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Only the write stops. A trace of one read call and one write call: both take the same path to GitHub, but addLabels waits at approval for a person."
    :finished
    :still
    @replay="replay"
  >
    <div class="px-3 py-8 sm:px-8 sm:py-10">
      <div class="mx-auto max-w-[44rem] overflow-hidden rounded-lg border border-(--d-line-strong) bg-(--d-raised)">
        <div
          class="items-center border-b border-(--d-line) px-3 py-2 text-[12px] text-muted"
          :class="COLS"
        >
          <span class="font-mono text-[12.5px] text-highlighted">agent.generate()</span>
          <span
            class="relative h-5 font-mono tabular-nums max-sm:hidden"
            aria-hidden="true"
          >
            <span
              v-for="t in TICKS"
              :key="t"
              class="absolute top-0 text-dimmed"
              :style="{ left: `${(t / TOTAL) * 100}%` }"
            >{{ t / 1000 }}s</span>
          </span>
          <span
            class="d-step text-right font-mono text-[12.5px] tabular-nums"
            :data-on="step >= 9"
          >{{ duration(TOTAL) }}</span>
        </div>

        <ol class="py-1">
          <li
            v-for="(span, i) in SPANS"
            :key="i"
            class="d-step min-h-8 items-center px-3 py-1"
            :class="[COLS, span.kind === 'approval' && waiting ? 'bg-(--d-warn-bg)' : '']"
            :data-on="step >= span.step"
          >
            <div
              class="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[13px]/5"
              :class="span.kind === 'model' || span.kind === 'tool' ? '' : 'ps-4'"
            >
              <span
                :class="[
                  span.kind === 'tool' || span.kind === 'request' ? 'font-mono text-[12.5px]' : '',
                  span.kind === 'model' ? 'text-muted' : 'text-highlighted',
                  span.kind === 'tool' ? 'font-medium' : ''
                ]"
              >{{ span.name }}</span>
              <span
                v-if="span.kind === 'approval'"
                class="d-stack text-[12px]"
              >
                <span
                  class="text-(--d-warn) transition-opacity duration-300"
                  :class="waiting ? '' : 'opacity-0'"
                >waiting for a person</span>
                <span
                  class="text-(--d-ok) transition-opacity duration-300"
                  :class="waiting ? 'opacity-0' : ''"
                >{{ span.detail }}</span>
              </span>
              <span
                v-else
                class="min-w-0 text-[12px] [overflow-wrap:anywhere]"
                :class="[span.kind === 'request' ? 'text-(--d-ok)' : 'text-muted', /^[{[]/.test(span.detail) ? 'font-mono' : '']"
              >{{ span.detail }}</span>
            </div>

            <div
              class="relative h-2 max-sm:hidden"
              aria-hidden="true"
            >
              <span
                class="absolute inset-y-0 min-w-1 origin-left rounded-full transition-transform"
                :class="[BAR[span.kind], span.waits ? 'ease-linear' : 'ease-(--d-ease)']"
                :style="{
                  left: `${(span.start / TOTAL) * 100}%`,
                  width: `${(span.ms / TOTAL) * 100}%`,
                  transform: `scaleX(${step >= span.step ? 1 : 0})`,
                  transitionDuration: step >= span.step ? `${growMs(span)}ms` : '0ms'
                }"
              />
            </div>

            <span class="d-stack justify-items-end font-mono text-[12.5px] text-muted tabular-nums">
              <span
                v-if="span.waits"
                class="text-(--d-warn) transition-opacity duration-300"
                :class="waiting ? '' : 'opacity-0'"
              >waiting</span>
              <span
                class="transition-opacity duration-300"
                :class="span.waits && waiting ? 'opacity-0' : ''"
              >{{ duration(span.ms) }}</span>
            </span>
          </li>
        </ol>
      </div>

      <div
        class="d-stack mx-auto mt-4 max-w-[44rem] px-1 text-[13px]/5 text-muted"
        aria-live="polite"
      >
        <p
          v-for="(n, i) in NOTES"
          :key="i"
          class="transition-opacity duration-300"
          :class="note === i ? '' : 'opacity-0'"
          :aria-hidden="note !== i"
        >
          {{ n }}
        </p>
      </div>
    </div>
  </DocsFigure>
</template>
