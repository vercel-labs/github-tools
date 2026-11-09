<script setup lang="ts">
const CHAIN = ['getCombinedStatus', 'listCheckRuns', 'listWorkflowRuns', 'listWorkflowJobs', 'getWorkflowJobLogs']

// The requests getCiFailureContextCore makes for a `ref`, grouped by what runs in parallel (core/bundles.ts).
const WAVES = [
  ['getCombinedStatus', 'listCheckRuns', 'listWorkflowRuns'],
  ['listWorkflowJobs'],
  ['getWorkflowJobLogs']
]
const REQUESTS = WAVES.flatMap((wave, w) => wave.map(name => ({ name, wave: w })))

// One shared time axis, in model round trips: the model plans for MODEL, then the tool runs for TOOL.
const MODEL = 0.62
const TOOL = 0.38
const WAVE = 0.2
const AXIS = CHAIN.length

const pct = (v: number) => `${(v / AXIS) * 100}%`

const chain = ref(0)
const bundle = ref(0)

// Both traces advance one step per beat: the context tool is done after five, the separate reads after six.
const AT = timeline(Array.from({ length: CHAIN.length + 1 }, () => FIGURE_PACE.beat))

const { root, finished, still, replay } = useFigure({
  steps: AT.map((at, i) => ({ at, run: () => {
    chain.value = i + 1
    bundle.value = Math.min(i + 1, WAVES.length + 2)
  } })),
  reset: () => {
    chain.value = 0
    bundle.value = 0
  },
  settle: () => {
    chain.value = CHAIN.length + 1
    bundle.value = WAVES.length + 2
  }
})

// chain = n: the first n - 1 calls are done and call n - 1 is in flight.
const chainCalls = computed(() => Math.min(chain.value, CHAIN.length))
const chainDone = computed(() => Math.max(0, Math.min(chain.value - 1, CHAIN.length)))
// bundle = 1: the model calls the tool; 2 to 4: each wave of requests; 5: one result.
const bundleDone = computed(() => bundle.value > WAVES.length + 1)
const waveOn = (w: number) => bundle.value >= w + 2
const waveDone = (w: number) => bundle.value >= w + 3

function tone(done: boolean, running: boolean) {
  return done ? 'bg-(--d-ok)' : running ? 'bg-(--d-warn)' : 'bg-(--d-raised-strong)'
}
</script>

<template>
  <DocsFigure
    ref="root"
    caption="One call instead of five. Both sides make the same GitHub requests, but the context tool makes them inside one call, so the model reads one result instead of planning five reads."
    :finished
    :still
    @replay="replay"
  >
    <div class="px-4 py-8 sm:px-8 sm:py-10">
      <div class="mx-auto flex max-w-2xl flex-col gap-4">
        <p class="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[12px]/5 text-muted">
          <span class="flex items-center gap-1.5"><span class="h-1.5 w-3 rounded-full bg-(--d-line-strong)" />model</span>
          <span class="flex items-center gap-1.5"><span class="h-1.5 w-3 rounded-full bg-(--d-warn)" />running</span>
          <span class="flex items-center gap-1.5"><span class="h-1.5 w-3 rounded-full bg-(--d-ok)" />done</span>
        </p>

        <section
          class="card"
          aria-label="Separate reads"
        >
          <header class="card-head">
            <span class="text-[13px]/5 font-medium text-highlighted">Separate reads</span>
            <span class="font-mono text-[12px]/5 text-muted tabular-nums">
              <span class="text-highlighted">{{ chainCalls }}</span> {{ chainCalls === 1 ? 'call' : 'calls' }} · <span class="text-highlighted">{{ chainDone }}</span> {{ chainDone === 1 ? 'round trip' : 'round trips' }}
            </span>
          </header>
          <ol class="py-2">
            <li
              v-for="(name, i) in CHAIN"
              :key="name"
              class="row"
            >
              <span
                class="font-mono text-[12.5px]/5 [overflow-wrap:anywhere] transition-colors duration-300"
                :class="chain > i ? 'text-highlighted' : 'text-dimmed'"
              >{{ name }}</span>
              <span
                class="track"
                aria-hidden="true"
              >
                <span
                  class="seg h-1.5 bg-(--d-line-strong)"
                  :style="{ left: pct(i), width: chain > i ? pct(MODEL) : '0' }"
                />
                <span
                  class="seg h-1.5"
                  :class="tone(chainDone > i, chain > i)"
                  :style="{ left: pct(i + MODEL), width: chain > i ? pct(TOOL) : '0' }"
                />
              </span>
            </li>
          </ol>
        </section>

        <section
          class="card"
          aria-label="One context tool"
        >
          <header class="card-head">
            <span class="text-[13px]/5 font-medium text-highlighted">One context tool</span>
            <span class="font-mono text-[12px]/5 text-muted tabular-nums">
              <span class="text-highlighted">{{ bundle > 0 ? 1 : 0 }}</span> {{ bundle > 0 ? 'call' : 'calls' }} · <span class="text-highlighted">{{ bundleDone ? 1 : 0 }}</span> {{ bundleDone ? 'round trip' : 'round trips' }}
            </span>
          </header>
          <ol class="py-2">
            <li class="row">
              <span
                class="font-mono text-[12.5px]/5 [overflow-wrap:anywhere] transition-colors duration-300"
                :class="bundle > 0 ? 'text-highlighted' : 'text-dimmed'"
              >getCiFailureContext</span>
              <span
                class="track"
                aria-hidden="true"
              >
                <span
                  class="seg h-1.5 bg-(--d-line-strong)"
                  :style="{ left: '0', width: bundle > 0 ? pct(MODEL) : '0' }"
                />
                <span
                  class="seg h-1.5"
                  :class="tone(bundleDone, bundle > 1)"
                  :style="{ left: pct(MODEL), width: bundle > 1 ? pct(WAVE * WAVES.length + 0.04) : '0' }"
                />
              </span>
            </li>
            <li
              v-for="r in REQUESTS"
              :key="r.name"
              class="row"
            >
              <span
                class="ps-3 font-mono text-[12px]/5 [overflow-wrap:anywhere] transition-colors duration-300"
                :class="waveOn(r.wave) ? 'text-toned' : 'text-dimmed'"
              >{{ r.name }}</span>
              <span
                class="track"
                aria-hidden="true"
              >
                <span
                  class="seg h-1"
                  :class="tone(waveDone(r.wave), waveOn(r.wave))"
                  :style="{ left: pct(MODEL + 0.02 + r.wave * WAVE), width: waveOn(r.wave) ? pct(WAVE - 0.02) : '0' }"
                />
              </span>
            </li>
          </ol>
        </section>
      </div>
    </div>
  </DocsFigure>
</template>

<style scoped>
.card {
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--d-line-strong);
  background: var(--d-raised);
}

.card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
  border-bottom: 1px solid var(--d-line);
  padding: 0.5rem 0.75rem;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 9.75rem) minmax(0, 1fr);
  align-items: center;
  column-gap: 0.75rem;
  min-height: 1.75rem;
  padding: 0.125rem 0.75rem;
}

.track {
  position: relative;
  height: 0.5rem;
}

.seg {
  position: absolute;
  top: 50%;
  translate: 0 -50%;
  border-radius: 9999px;
  transition: width 600ms var(--d-ease), background-color 300ms ease;
}

@media (prefers-reduced-motion: reduce) {
  .seg {
    transition: none;
  }
}
</style>
