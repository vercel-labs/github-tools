<script setup lang="ts">
type Job = 'success' | 'failure' | 'running'
type Decision = 'approve' | 'deny'

const JOBS = ['lint', 'typecheck', 'test (node 22)', 'test (node 24)', 'build']
const FAILED = 2

const LOG = [
  ' ✓ src/core/pagination.test.ts (12 tests) 41ms',
  ' ✓ src/core/bundles.test.ts (9 tests) 88ms',
  ' ❯ src/client.test.ts (6 tests | 1 failed) 30012ms',
  '   × retries after a secondary rate limit 30008ms',
  '     → Test timed out in 30000ms.',
  ' Test Files  1 failed | 41 passed (42)',
  '      Tests  1 failed | 412 passed (413)',
  ' ELIFECYCLE  Test failed.',
  'Error: Process completed with exit code 1.'
]
const MARKED = 4
const LOG_LINES = 40

const ANSWER = 'The test (node 22) job failed in Run tests. One test in client.test.ts, "retries after a secondary rate limit", timed out after 30 seconds, and the other 412 passed. That looks like a flaky timeout rather than a bug in the last commit. Rerunning the failed job would confirm it; if it times out again, mock the retry delay.'.split(' ')

const LOG_AT = 1900
const LINE_GAP = 150
const ANSWER_AT = LOG_AT + LOG.length * LINE_GAP + 1300
const WORD_GAP = 45
const ASK_AT = ANSWER_AT + ANSWER.length * WORD_GAP + 700
const RERUN_MS = 2400

const shown = ref(0)
const bundle = ref<'idle' | 'running' | 'done'>('idle')
const lines = ref(0)
const marked = ref(false)
const words = ref(0)
const decision = ref<Decision>()
const pressing = ref<Decision>()
const job = ref<Job>('failure')
const progress = ref(false)

function decide(answer: Decision, animate: boolean) {
  decision.value = answer
  pressing.value = undefined
  job.value = answer === 'approve' && animate ? 'running' : answer === 'approve' ? 'success' : 'failure'
  progress.value = answer === 'approve'
  if (!animate) shown.value = 7
}

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 200, run: () => { shown.value = 1 } },
    { at: 900, run: () => {
      shown.value = 2
      bundle.value = 'running'
    } },
    ...LOG.map((_, i) => ({ at: LOG_AT + i * LINE_GAP, run: () => { lines.value = i + 1 } })),
    { at: LOG_AT + LOG.length * LINE_GAP + 400, run: () => { marked.value = true } },
    { at: LOG_AT + LOG.length * LINE_GAP + 900, run: () => { bundle.value = 'done' } },
    { at: ANSWER_AT, run: () => { shown.value = 3 } },
    ...ANSWER.map((_, i) => ({ at: ANSWER_AT + 200 + i * WORD_GAP, run: () => { words.value = i + 1 } })),
    { at: ASK_AT, run: () => { shown.value = 4 } },
    { at: ASK_AT + 700, run: () => { shown.value = 5 } },
    { at: ASK_AT + 2100, run: () => { pressing.value = 'approve' } },
    { at: ASK_AT + 2280, run: () => decide('approve', true) },
    { at: ASK_AT + 2600, run: () => { shown.value = 6 } },
    { at: ASK_AT + 2700 + RERUN_MS, run: () => { job.value = 'success' } },
    { at: ASK_AT + 3300 + RERUN_MS, run: () => { shown.value = 7 } }
  ],
  reset: () => {
    shown.value = 0
    bundle.value = 'idle'
    lines.value = 0
    marked.value = false
    words.value = 0
    decision.value = undefined
    pressing.value = undefined
    job.value = 'failure'
    progress.value = false
  },
  settle: () => {
    bundle.value = 'done'
    lines.value = LOG.length
    marked.value = true
    words.value = ANSWER.length
    decide('approve', false)
  }
})

const runLabel = computed(() => {
  if (job.value === 'running') return 'In progress, attempt 2'
  if (job.value === 'success') return 'Success, attempt 2'
  return 'Failure'
})

const tool = 'block w-fit max-w-full min-w-0 rounded-md border border-(--d-line) bg-(--d-raised-strong) px-2 py-0.5 font-mono text-[12px]/5 [overflow-wrap:anywhere] text-highlighted'
const answerButton = 'inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) disabled:cursor-default'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The agent reads the failed run in one workflow step, explains the cause, and pauses the workflow before it reruns anything."
    :finished
    :still
    @replay="replay"
  >
    <div class="grid sm:grid-cols-[12rem_minmax(0,1fr)]">
      <aside class="border-b border-(--d-line) p-4 sm:border-r sm:border-b-0 sm:p-5">
        <p class="flex items-center gap-2 text-[13px] text-highlighted">
          <UIcon
            name="i-lucide-workflow"
            class="size-4 text-muted"
          />
          CI
        </p>
        <p class="mt-1 font-mono text-[11.5px]/5 text-dimmed">
          run 9182 · main · 3f2a91c
        </p>
        <p
          class="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 text-[12px]/5 transition-colors duration-300"
          :class="job === 'failure' ? 'border-(--d-warn)/50 text-(--d-warn)' : 'border-(--d-line-strong) text-highlighted'"
        >
          <UIcon
            :name="job === 'failure' ? 'i-lucide-circle-alert' : job === 'running' ? 'i-lucide-loader-circle' : 'i-lucide-circle-check'"
            class="size-3.5"
            :class="job === 'running' ? 'animate-spin' : ''"
          />
          {{ runLabel }}
        </p>

        <ul class="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]/5 sm:grid-cols-1">
          <li
            v-for="(name, i) in JOBS"
            :key="name"
            class="relative min-w-0"
          >
            <span
              class="flex items-center gap-2"
              :class="i === FAILED && job === 'failure' ? 'text-(--d-warn)' : i === FAILED ? 'text-highlighted' : 'text-muted'"
            >
              <UIcon
                :name="i !== FAILED || job === 'success' ? 'i-lucide-circle-check' : job === 'running' ? 'i-lucide-loader-circle' : 'i-lucide-circle-alert'"
                class="size-3.5 shrink-0"
                :class="i === FAILED && job === 'running' ? 'animate-spin' : ''"
              />
              <span class="truncate font-mono text-[12px]">{{ name }}</span>
            </span>
            <span
              v-if="i === FAILED"
              class="absolute inset-x-0 -bottom-1 ms-5.5 h-0.5 overflow-hidden rounded-full bg-(--d-line) transition-opacity duration-300"
              :class="progress ? 'opacity-100' : 'opacity-0'"
            >
              <span
                class="block h-full origin-left bg-(--d-signal) transition-transform ease-linear"
                :style="{ transform: `scaleX(${progress ? 1 : 0})`, transitionDuration: progress && !still ? `${RERUN_MS}ms` : '0ms' }"
              />
            </span>
          </li>
        </ul>
      </aside>

      <ol class="flex min-w-0 flex-col gap-3 p-4 text-[13.5px]/6 sm:p-5">
        <li
          class="d-step flex gap-4"
          :data-on="shown > 0"
        >
          <span class="w-12 shrink-0 text-dimmed">You</span>
          <span class="min-w-0 text-highlighted">Why did the last run on main fail in vercel-labs/github-tools?</span>
        </li>

        <li
          class="d-step flex flex-col gap-2 sm:flex-row sm:gap-4"
          :data-on="shown > 1"
        >
          <span class="w-12 shrink-0 text-dimmed">Step</span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <code :class="tool">getCiFailureContext({ owner: 'vercel-labs', repo: 'github-tools', ref: 'main' })</code>
              <span class="inline-flex items-center gap-1.5 text-[12px] text-dimmed">
                <span
                  class="size-1.5 rounded-full"
                  :class="bundle === 'done' ? 'bg-(--d-signal)' : 'animate-pulse bg-(--d-line-strong)'"
                />
                {{ bundle === 'done' ? 'one step, recorded' : 'running' }}
              </span>
            </div>

            <div class="mt-2 overflow-hidden rounded-lg border border-(--d-line) bg-(--d-raised-strong)">
              <p class="flex flex-wrap items-center gap-x-2 border-b border-(--d-line) px-3 py-1.5 text-[11.5px]/5 text-dimmed">
                <span class="font-mono text-toned">latestFailure.jobs[0]</span>
                <span>test (node 22), failed at Run tests</span>
              </p>
              <div class="px-3 py-2 font-mono text-[11px]/[18px] sm:text-[11.5px]/[19px]">
                <p class="text-dimmed">
                  log, last {{ LOG_LINES }} lines, {{ LOG_LINES - LOG.length }} earlier lines not shown
                </p>
                <p
                  v-for="(line, i) in LOG"
                  :key="i"
                  class="-mx-3 grid grid-cols-[2.25rem_minmax(0,1fr)] border-l-2 pe-3 transition-[opacity,background-color,border-color] duration-300"
                  :class="[
                    lines > i ? 'opacity-100' : 'opacity-0',
                    marked && i === MARKED ? 'border-(--d-warn) bg-(--d-warn)/10' : 'border-transparent'
                  ]"
                >
                  <span class="ps-2.5 text-dimmed tabular-nums select-none">{{ LOG_LINES - LOG.length + i + 1 }}</span>
                  <span
                    class="whitespace-pre-wrap"
                    :class="marked && i === MARKED ? 'text-highlighted' : 'text-muted'"
                  >{{ line }}</span>
                </p>
              </div>
            </div>
          </div>
        </li>

        <li
          class="d-step flex flex-col gap-1 sm:flex-row sm:gap-4"
          :data-on="shown > 2"
        >
          <span class="w-12 shrink-0 text-dimmed">Agent</span>
          <p class="min-w-0 text-highlighted">
            {{ ANSWER.slice(0, words).join(' ') }}<span
              v-if="words > 0 && words < ANSWER.length"
              class="ms-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-(--d-signal) align-[-2px]"
            />
          </p>
        </li>

        <li
          class="d-step flex gap-4"
          :data-on="shown > 3"
        >
          <span class="w-12 shrink-0 text-dimmed">You</span>
          <span class="min-w-0 text-highlighted">Rerun the failed job.</span>
        </li>

        <li
          class="d-step flex flex-col gap-2 sm:flex-row sm:gap-4"
          :data-on="shown > 4"
        >
          <span class="w-12 shrink-0 text-dimmed">Step</span>
          <div class="min-w-0 flex-1">
            <code :class="tool">rerunWorkflowRun({ owner: 'vercel-labs', repo: 'github-tools', runId: 9182, onlyFailedJobs: true })</code>
            <div
              class="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-(--d-raised-strong) px-3 py-2.5 transition-colors duration-300"
              :class="decision ? 'border-(--d-line)' : 'border-(--d-warn)/50'"
            >
              <div class="text-[12.5px]/5">
                <p class="text-highlighted">
                  Rerun the failed jobs of run 9182?
                </p>
                <p class="mt-0.5 text-muted">
                  <span v-if="decision === 'approve'">Approved by you, the workflow resumes</span>
                  <span v-else-if="decision === 'deny'">Denied by you, nothing reruns</span>
                  <span
                    v-else
                    class="inline-flex items-center gap-1.5"
                  >
                    <span class="size-1.5 animate-pulse rounded-full bg-(--d-warn)" />
                    Workflow suspended, waiting for a person
                  </span>
                </p>
              </div>
              <div
                role="group"
                aria-label="Answer the approval"
                class="flex gap-2 text-[12.5px]"
              >
                <button
                  type="button"
                  :disabled="!finished"
                  :aria-pressed="decision === 'deny'"
                  :class="[
                    answerButton,
                    'border',
                    decision === 'deny' ? 'border-(--d-line-strong) bg-default text-highlighted' : 'border-(--d-line) text-muted enabled:hover:text-highlighted',
                    decision === 'approve' ? 'opacity-50' : ''
                  ]"
                  @click="decide('deny', false)"
                >
                  <UIcon
                    v-if="decision === 'deny'"
                    name="i-lucide-x"
                    class="size-3.5"
                  />
                  Deny
                </button>
                <button
                  type="button"
                  :disabled="!finished"
                  :aria-pressed="decision === 'approve'"
                  :class="[
                    answerButton,
                    decision === 'approve' ? 'bg-(--d-signal) text-(--d-signal-fg)' : 'bg-inverted text-inverted',
                    decision === 'deny' ? 'opacity-50' : '',
                    pressing === 'approve' ? 'scale-95' : ''
                  ]"
                  @click="decide('approve', false)"
                >
                  <UIcon
                    v-if="decision === 'approve'"
                    name="i-lucide-check"
                    class="size-3.5"
                  />
                  Approve
                </button>
              </div>
            </div>
          </div>
        </li>

        <li
          v-if="decision !== 'deny'"
          class="d-step flex flex-col gap-1 sm:flex-row sm:gap-4"
          :data-on="shown > 5"
        >
          <span class="w-12 shrink-0 text-dimmed">GitHub</span>
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="flex flex-wrap items-center gap-x-3 font-mono text-[12px]/5 text-muted">
              <span>test (node 22), attempt 2</span>
              <span :class="job === 'success' ? 'text-highlighted' : 'text-dimmed'">{{ job === 'success' ? 'passed' : 'running' }}</span>
            </span>
            <span class="h-1 max-w-64 overflow-hidden rounded-full bg-(--d-line)">
              <span
                class="block h-full origin-left bg-(--d-signal) transition-transform ease-linear"
                :style="{ transform: `scaleX(${progress ? 1 : 0})`, transitionDuration: progress && !still ? `${RERUN_MS}ms` : '0ms' }"
              />
            </span>
          </div>
        </li>

        <li
          class="d-step flex flex-col gap-1 sm:flex-row sm:gap-4"
          :data-on="shown > 6"
        >
          <span class="w-12 shrink-0 text-dimmed">Agent</span>
          <span class="min-w-0 text-highlighted">{{ decision === 'deny' ? 'Understood. Run 9182 stays as it is.' : 'test (node 22) passed on attempt 2, so the timeout was flaky.' }}</span>
        </li>
      </ol>
    </div>
  </DocsFigure>
</template>
