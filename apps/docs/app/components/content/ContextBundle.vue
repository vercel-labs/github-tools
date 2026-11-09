<script setup lang="ts">
const CHAIN = [
  { call: 'getCombinedStatus({ ref: \'fix/parser\' })', result: 'state: failure' },
  { call: 'listCheckRuns({ ref: \'fix/parser\' })', result: '6 check runs, 1 failed' },
  { call: 'listWorkflowRuns({ branch: \'fix/parser\', status: \'failure\' })', result: 'latest failed run 9182' },
  { call: 'listWorkflowJobs({ runId: 9182 })', result: 'test (node 22) failed at Run tests' },
  { call: 'getWorkflowJobLogs({ jobId: 4410 })', result: 'last 200 lines of the log' }
]

// The requests getCiFailureContextCore makes for a `ref`, grouped by what runs in parallel (core/bundles.ts).
const WAVES = [
  ['getCombinedStatus', 'listCheckRuns', 'listWorkflowRuns'],
  ['listWorkflowJobs'],
  ['getWorkflowJobLogs']
]

const RESULT = ['combinedStatus', 'failedCheckRuns', 'recentFailedRuns', 'latestFailure.jobs[].steps', 'latestFailure.jobs[].log']

const ROUND_TRIP = 1150

const chainSent = ref(0)
const chainDone = ref(0)
const bundleSent = ref(false)
const waves = ref(0)
const bundleDone = ref(false)

const steps = [
  ...CHAIN.flatMap((_, i) => [
    { at: 300 + i * ROUND_TRIP, run: () => { chainSent.value = i + 1 } },
    { at: 300 + i * ROUND_TRIP + 700, run: () => { chainDone.value = i + 1 } }
  ]),
  { at: 300, run: () => { bundleSent.value = true } },
  ...WAVES.map((_, i) => ({ at: 650 + i * 350, run: () => { waves.value = i + 1 } })),
  { at: 1850, run: () => { bundleDone.value = true } }
]

const { root, finished, still, replay } = useFigure({
  steps,
  reset: () => {
    chainSent.value = 0
    chainDone.value = 0
    bundleSent.value = false
    waves.value = 0
    bundleDone.value = false
  },
  settle: () => {
    chainSent.value = CHAIN.length
    chainDone.value = CHAIN.length
    bundleSent.value = true
    waves.value = WAVES.length
    bundleDone.value = true
  }
})
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Both sides make the same GitHub requests, but the context tool makes them inside one call, so the model reads one result instead of planning five reads."
    :finished
    :still
    @replay="replay"
  >
    <div class="grid sm:grid-cols-2">
      <section class="flex flex-col border-b border-(--d-line) p-4 sm:border-r sm:border-b-0 sm:p-5">
        <h4 class="text-[12px] text-dimmed">
          Separate reads
        </h4>
        <ol class="mt-3 flex flex-1 flex-col gap-2">
          <li
            v-for="(item, i) in CHAIN"
            :key="item.call"
            class="d-step"
            :data-on="chainSent > i"
          >
            <code class="block font-mono text-[11.5px]/5 [overflow-wrap:anywhere] text-highlighted">{{ item.call }}</code>
            <p class="flex items-center gap-1.5 text-[12px]/5">
              <span
                class="size-1.5 shrink-0 rounded-full"
                :class="chainDone > i ? 'bg-(--d-signal)' : 'animate-pulse bg-(--d-line-strong)'"
              />
              <span :class="chainDone > i ? 'text-muted' : 'text-dimmed'">
                {{ chainDone > i ? item.result : 'back to the model' }}
              </span>
            </p>
          </li>
        </ol>
        <dl class="mt-4 grid grid-cols-2 gap-2 border-t border-(--d-line) pt-3 text-[12px]">
          <div>
            <dt class="text-dimmed">
              Tool calls
            </dt>
            <dd class="font-mono text-[15px] text-highlighted tabular-nums">
              {{ chainSent }}
            </dd>
          </div>
          <div>
            <dt class="text-dimmed">
              Model round trips
            </dt>
            <dd class="font-mono text-[15px] text-highlighted tabular-nums">
              {{ chainDone }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="flex flex-col p-4 sm:p-5">
        <h4 class="text-[12px] text-dimmed">
          One context tool
        </h4>
        <div
          class="d-step mt-3"
          :data-on="bundleSent"
        >
          <code class="block font-mono text-[11.5px]/5 [overflow-wrap:anywhere] text-highlighted">getCiFailureContext({ ref: 'fix/parser' })</code>
          <div class="mt-2 rounded-lg border border-(--d-line) bg-(--d-raised-strong) p-2.5">
            <p class="text-[11.5px] text-dimmed">
              Inside the call
            </p>
            <ol class="mt-1.5 flex flex-col gap-1">
              <li
                v-for="(wave, i) in WAVES"
                :key="i"
                class="d-step flex flex-wrap gap-1"
                :data-on="waves > i"
              >
                <span
                  v-for="name in wave"
                  :key="name"
                  class="rounded border border-(--d-line) bg-(--d-raised) px-1.5 font-mono text-[11px]/5 text-muted"
                >{{ name }}</span>
              </li>
            </ol>
          </div>
          <div
            class="d-step mt-2"
            :data-on="bundleDone"
          >
            <p class="flex items-center gap-1.5 text-[12px]/5 text-muted">
              <span class="size-1.5 shrink-0 rounded-full bg-(--d-signal)" />
              One result, logs cut to the last 40 lines
            </p>
            <ul class="mt-1 flex flex-wrap gap-x-3 font-mono text-[11px]/5 text-dimmed">
              <li
                v-for="key in RESULT"
                :key="key"
              >
                {{ key }}
              </li>
            </ul>
          </div>
        </div>
        <dl class="mt-auto grid grid-cols-2 gap-2 border-t border-(--d-line) pt-3 text-[12px] max-sm:mt-4">
          <div>
            <dt class="text-dimmed">
              Tool calls
            </dt>
            <dd class="font-mono text-[15px] text-highlighted tabular-nums">
              {{ bundleSent ? 1 : 0 }}
            </dd>
          </div>
          <div>
            <dt class="text-dimmed">
              Model round trips
            </dt>
            <dd class="font-mono text-[15px] text-highlighted tabular-nums">
              {{ bundleDone ? 1 : 0 }}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </DocsFigure>
</template>
