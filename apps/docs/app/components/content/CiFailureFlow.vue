<script setup lang="ts">
type Decision = 'approve' | 'deny'

// Skeleton widths for the log lines that aren't the point; the failing line is real.
const LOG = ['w-[90%]', 'w-[62%]', 'w-[80%]', null, 'w-[52%]', 'w-[72%]']

const ANSWER = 'One test, "retries after a secondary rate limit", timed out after 30 seconds. The other 412 passed, so it looks flaky.'

const CHUNK = 3
const typingMs = Math.ceil(ANSWER.length / CHUNK) * CHUNK * FIGURE_PACE.perChar

const read = ref(false)
const typed = ref(0)
const asked = ref(false)
const decision = ref<Decision>()
const rerun = ref<'idle' | 'running' | 'passed'>('idle')

const at = timeline([
  1200,
  typingMs + 600,
  FIGURE_PACE.beat,
  FIGURE_PACE.hold,
  FIGURE_PACE.beat,
  1800,
  0
])

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: at[0]!, run: () => { read.value = true } },
    ...Array.from({ length: Math.ceil(ANSWER.length / CHUNK) }, (_, i) => ({
      at: at[1]! + i * CHUNK * FIGURE_PACE.perChar,
      run: () => { typed.value = Math.min(ANSWER.length, (i + 1) * CHUNK) }
    })),
    { at: at[2]!, run: () => { asked.value = true } },
    { at: at[3]!, run: () => { decision.value = 'approve' } },
    { at: at[4]!, run: () => { rerun.value = 'running' } },
    { at: at[5]!, run: () => { rerun.value = 'passed' } }
  ],
  reset: () => {
    read.value = false
    typed.value = 0
    asked.value = false
    decision.value = undefined
    rerun.value = 'idle'
  },
  settle: () => decide('approve')
})

function decide(answer: Decision) {
  read.value = true
  typed.value = ANSWER.length
  asked.value = true
  decision.value = answer
  rerun.value = answer === 'approve' ? 'passed' : 'idle'
}

const RESULT = {
  idle: { text: 'not rerun', tone: 'text-muted' },
  running: { text: 'running', tone: 'text-toned' },
  passed: { text: 'passed', tone: 'text-(--d-ok)' }
} as const

const tag = 'relative rounded border border-(--d-line-strong) bg-default px-1.5 font-mono text-[12px]/5'
const button = 'inline-flex h-7 items-center rounded-md px-3 text-[13px] transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) disabled:cursor-default'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Read the failure, then ask before rerunning. getCiFailureContext returns the end of the failed job's log in one step, and rerunWorkflowRun pauses the workflow until someone approves it."
    :finished
    :still
    @replay="replay"
  >
    <div class="px-4 py-8 sm:px-10 sm:py-12">
      <div class="mx-auto flex max-w-[30rem] flex-col items-center">
        <div class="w-full">
          <p class="mb-2 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
            <UIcon
              name="i-lucide-circle-x"
              class="size-3.5 text-(--d-fail)"
            />
            <code class="font-mono text-toned">test (node 22)</code>
            <span>run 9182 on main, Run tests</span>
          </p>
          <ol class="flex flex-col gap-1 rounded-lg border border-(--d-line-strong) bg-(--d-raised) p-2">
            <li
              v-for="(bars, i) in LOG"
              :key="i"
              class="flex items-center gap-3 rounded-md px-2"
              :class="bars ? 'h-7' : 'bg-(--d-fail-bg) py-1.5'"
            >
              <template v-if="bars">
                <span class="size-1.5 shrink-0 rounded-full bg-(--d-ok)" />
                <span
                  aria-hidden="true"
                  class="h-1.5 w-10 shrink-0 rounded-full bg-(--d-raised-strong)"
                />
                <span
                  aria-hidden="true"
                  class="h-1.5 w-14 shrink-0 rounded-full bg-(--d-raised-strong)"
                />
                <span
                  aria-hidden="true"
                  class="min-w-0 flex-1"
                >
                  <span
                    class="block h-1.5 rounded-full bg-(--d-raised-strong)"
                    :class="bars"
                  />
                </span>
              </template>
              <template v-else>
                <span class="size-1.5 shrink-0 self-start rounded-full bg-(--d-fail) mt-[7px]" />
                <code class="min-w-0 font-mono text-[12px]/5 [overflow-wrap:anywhere] text-(--d-fail)">× retries after a secondary rate limit: Test timed out in 30000ms</code>
              </template>
            </li>
          </ol>
        </div>

        <div class="relative grid h-14 w-full place-items-center">
          <span
            aria-hidden="true"
            class="absolute inset-y-0 left-1/2 w-px transition-colors duration-500"
            :class="read ? 'bg-(--d-signal)' : 'bg-(--d-line-strong)'"
          />
          <span
            :class="[tag, 'text-toned']"
          >getCiFailureContext</span>
        </div>

        <div class="w-full rounded-lg border border-(--d-line-strong) bg-(--d-raised) p-3">
          <p class="flex items-center gap-2.5">
            <span class="grid size-8 shrink-0 place-items-center rounded-md border border-(--d-line) bg-default">
              <UIcon
                name="i-simple-icons-vercel"
                class="size-3.5 text-highlighted"
              />
            </span>
            <span>
              <span class="block text-[13px]/5 font-medium text-highlighted">ci-failure-bot</span>
              <span class="block font-mono text-[12px]/4 text-muted">ci-ops, durable workflow</span>
            </span>
          </p>
          <div class="d-stack mt-2.5 text-[13px]/5">
            <p
              class="invisible"
              aria-hidden="true"
            >
              {{ ANSWER }}
            </p>
            <p class="text-default">
              {{ ANSWER.slice(0, typed) }}
            </p>
          </div>
        </div>

        <div class="relative grid h-14 w-full place-items-center">
          <span
            aria-hidden="true"
            class="absolute inset-y-0 left-1/2 w-px transition-colors duration-500"
            :class="!asked ? 'bg-(--d-line-strong)' : decision ? 'bg-(--d-signal)' : 'bg-(--d-warn)'"
          />
          <span
            class="d-step"
            :class="[tag, decision || !asked ? 'text-toned' : 'border-(--d-warn) text-(--d-warn)']"
            :data-on="asked"
          >rerunWorkflowRun</span>
        </div>

        <div
          class="d-step w-full rounded-lg border p-3 transition-colors duration-500"
          :class="asked && !decision ? 'border-(--d-warn) bg-(--d-warn-bg)' : 'border-(--d-line-strong) bg-(--d-raised)'"
          :data-on="asked"
        >
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div class="min-w-0">
              <p class="text-[13px]/5 text-highlighted">
                Rerun the failed jobs of run 9182?
              </p>
              <span class="d-stack text-[12px]/5">
                <span
                  class="inline-flex items-center gap-1.5 text-(--d-warn) transition-opacity duration-300"
                  :class="decision ? 'invisible opacity-0' : ''"
                >
                  <span class="size-1.5 animate-pulse rounded-full bg-(--d-warn)" />
                  Workflow paused, waiting for you
                </span>
                <span
                  class="text-(--d-ok) transition-opacity duration-300"
                  :class="decision === 'approve' ? '' : 'invisible opacity-0'"
                >Approved, the workflow resumes</span>
                <span
                  class="text-(--d-fail) transition-opacity duration-300"
                  :class="decision === 'deny' ? '' : 'invisible opacity-0'"
                >Denied, nothing reruns</span>
              </span>
            </div>
            <span
              role="group"
              aria-label="Answer the approval"
              class="flex gap-1.5"
            >
              <button
                type="button"
                :disabled="!finished"
                :aria-pressed="decision === 'deny'"
                :class="[button, 'border border-(--d-line-strong) bg-default text-highlighted', decision === 'approve' ? 'opacity-50' : '']"
                @click="decide('deny')"
              >
                Deny
              </button>
              <button
                type="button"
                :disabled="!finished"
                :aria-pressed="decision === 'approve'"
                :class="[button, 'bg-(--d-signal) text-(--d-signal-fg)', decision === 'deny' ? 'opacity-50' : '']"
                @click="decide('approve')"
              >
                Approve
              </button>
            </span>
          </div>

          <div class="mt-3 flex items-center gap-3 border-t border-(--d-line) pt-3">
            <code class="shrink-0 font-mono text-[12px] text-toned">attempt 2</code>
            <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-(--d-raised-strong)">
              <span
                class="block h-full origin-left rounded-full bg-(--d-ok) transition-transform ease-linear"
                :class="rerun === 'idle' ? 'scale-x-0' : 'scale-x-100'"
                :style="{ transitionDuration: rerun === 'running' && !still ? '1700ms' : '0ms' }"
              />
            </span>
            <span class="d-stack shrink-0 text-[12px]">
              <span
                v-for="(r, key) in RESULT"
                :key="key"
                class="text-end transition-opacity duration-300"
                :class="[r.tone, rerun === key ? '' : 'invisible opacity-0']"
                :aria-hidden="rerun !== key"
              >{{ r.text }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </DocsFigure>
</template>
