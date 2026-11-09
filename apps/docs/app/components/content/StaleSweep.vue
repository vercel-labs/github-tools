<script setup lang="ts">
type Outcome = 'none' | 'skipped' | 'replied' | 'commented' | 'pending' | 'approved' | 'denied'
type Sweep = 0 | 1

interface Issue {
  number: number
  title: string
  label: string
  /** Last activity as each sweep sees it. */
  activity: [string, string]
  outcome: [Outcome, Outcome]
}

// Sweep 2 runs five weeks after sweep 1, so the stale comments are older than the 30-day cutoff again.
const ISSUES: Issue[] = [
  { number: 241, title: 'Dark mode toggle resets on reload', label: 'bug', activity: ['41 days ago', '35 days ago'], outcome: ['commented', 'approved'] },
  { number: 236, title: 'Allow a custom webhook secret', label: 'enhancement', activity: ['3 days ago', '6 days ago'], outcome: ['skipped', 'skipped'] },
  { number: 219, title: 'CLI crashes when the config file is empty', label: 'bug', activity: ['52 days ago', '9 days ago'], outcome: ['commented', 'replied'] },
  { number: 250, title: 'Flaky upload test on Node 22', label: 'tests', activity: ['12 days ago', '47 days ago'], outcome: ['skipped', 'commented'] },
  { number: 204, title: 'Document the proxy options', label: 'docs', activity: ['67 days ago', '35 days ago'], outcome: ['commented', 'denied'] },
  { number: 188, title: 'Add a retry option to the fetch helper', label: 'enhancement', activity: ['94 days ago', '35 days ago'], outcome: ['commented', 'approved'] }
]

const SWEEPS = [
  { label: 'Sweep 1', when: 'Nov 9', cutoff: '2026-10-10' },
  { label: 'Sweep 2', when: 'Dec 14, five weeks later', cutoff: '2026-11-14' }
]

const SUMMARY = [
  'Commented on and labelled 4 issues. Skipped 2 that changed in the last 30 days.',
  'Closed 2 issues, you kept #204 open. Commented on and labelled #250. Skipped 2 with recent activity.'
]

const ROW_GAP = 620
const SCAN_ONE = 1500
const SCAN_TWO = SCAN_ONE + ISSUES.length * ROW_GAP + 1500
const DECIDE = SCAN_TWO + ISSUES.length * ROW_GAP + 500
const PENDING = ISSUES.flatMap((issue, i) => (issue.outcome[1] === 'approved' || issue.outcome[1] === 'denied' ? [i] : []))

const sweep = ref<Sweep>(0)
const shown = ref(0)
const scanned = ref(0)
const scanAt = ref(-1)
const scanY = ref(0)
const outcome = ref<Outcome[]>(ISSUES.map(() => 'none'))
const stale = ref<boolean[]>(ISSUES.map(() => false))
const pressing = ref<{ row: number, approve: boolean }>()
const summary = ref(false)

const list = ref<HTMLElement>()
const rowEls: HTMLElement[] = []

function setOutcome(i: number, value: Outcome) {
  outcome.value = outcome.value.map((o, j) => (j === i ? value : o))
  if (value === 'commented') stale.value = stale.value.map((s, j) => s || j === i)
}

function scanTo(i: number) {
  scanAt.value = i
  scanY.value = i < ISSUES.length ? (rowEls[i]?.offsetTop ?? 0) : (list.value?.offsetHeight ?? 0)
  scanned.value = Math.min(i, ISSUES.length) + (i < ISSUES.length ? 1 : 0)
}

function startSweep(s: Sweep) {
  sweep.value = s
  scanned.value = 0
  summary.value = false
  outcome.value = ISSUES.map(() => 'none')
}

function showSweep(s: Sweep) {
  sweep.value = s
  shown.value = 2
  scanAt.value = -1
  scanned.value = ISSUES.length
  outcome.value = ISSUES.map(issue => issue.outcome[s])
  stale.value = ISSUES.map(issue => issue.outcome[0] === 'commented' || (s === 1 && issue.outcome[1] === 'commented'))
  pressing.value = undefined
  summary.value = true
}

function scanSteps(start: number, s: Sweep) {
  return [
    ...ISSUES.flatMap((issue, i) => [
      { at: start + i * ROW_GAP, run: () => scanTo(i) },
      { at: start + i * ROW_GAP + 300, run: () => setOutcome(i, issue.outcome[s] === 'approved' || issue.outcome[s] === 'denied' ? 'pending' : issue.outcome[s]) }
    ]),
    { at: start + ISSUES.length * ROW_GAP, run: () => scanTo(ISSUES.length) },
    { at: start + ISSUES.length * ROW_GAP + 450, run: () => { scanAt.value = -1 } }
  ]
}

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 200, run: () => { shown.value = 1 } },
    { at: 800, run: () => { shown.value = 2 } },
    ...scanSteps(SCAN_ONE, 0),
    { at: SCAN_TWO - 1100, run: () => { summary.value = true } },
    { at: SCAN_TWO - 500, run: () => startSweep(1) },
    ...scanSteps(SCAN_TWO, 1),
    ...PENDING.flatMap((row, k) => {
      const approve = ISSUES[row]?.outcome[1] === 'approved'
      return [
        { at: DECIDE + k * 1100, run: () => { pressing.value = { row, approve } } },
        { at: DECIDE + k * 1100 + 180, run: () => {
          pressing.value = undefined
          setOutcome(row, approve ? 'approved' : 'denied')
        } }
      ]
    }),
    { at: DECIDE + PENDING.length * 1100 + 300, run: () => { summary.value = true } }
  ],
  reset: () => {
    sweep.value = 0
    shown.value = 0
    scanned.value = 0
    scanAt.value = -1
    scanY.value = 0
    outcome.value = ISSUES.map(() => 'none')
    stale.value = ISSUES.map(() => false)
    pressing.value = undefined
    summary.value = false
  },
  settle: () => showSweep(1)
})

const labelled = computed(() => outcome.value.filter(o => o === 'commented').length)
const awaiting = computed(() => outcome.value.filter(o => o === 'pending').length)
const closed = computed(() => outcome.value.filter(o => o === 'approved').length)

const counters = computed(() => [
  { label: 'Scanned', value: scanned.value },
  { label: 'Labelled stale', value: labelled.value },
  { label: 'Awaiting approval', value: awaiting.value, warn: awaiting.value > 0 },
  { label: 'Closed', value: closed.value }
])

const segment = 'rounded-md px-2 py-1 transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) disabled:cursor-default sm:px-2.5'
const segmentOn = 'bg-default text-highlighted shadow-xs ring-1 ring-(--d-line-strong)'
const segmentOff = 'text-muted enabled:hover:text-highlighted'
const chip = 'inline-flex items-center gap-1 rounded-full border px-2 font-mono text-[11px]/[18px]'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The first sweep comments on and labels inactive issues without asking, and the next one proposes closing the stale issues nobody answered, each close waiting for a person."
    :finished
    :still
    @replay="replay"
  >
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-(--d-line) px-4 py-3 text-[12.5px] sm:px-6">
      <div
        role="group"
        aria-label="Show a sweep"
        class="inline-flex w-fit rounded-lg border border-(--d-line) bg-(--d-raised-strong) p-0.5"
      >
        <button
          v-for="(s, i) in SWEEPS"
          :key="s.label"
          type="button"
          :aria-pressed="sweep === i"
          :disabled="!finished"
          :class="[segment, sweep === i ? segmentOn : segmentOff]"
          @click="showSweep(i as Sweep)"
        >
          {{ s.label }}
        </button>
      </div>
      <span class="text-dimmed">{{ SWEEPS[sweep]?.when }}</span>
    </div>

    <div class="flex flex-col gap-2 px-4 pt-4 text-[13.5px]/6 sm:px-6">
      <p
        class="d-step flex gap-4"
        :data-on="shown > 0"
      >
        <span class="w-14 shrink-0 text-dimmed">You</span>
        <span class="text-highlighted">Sweep stale issues on my-org/my-repo.</span>
      </p>
      <p
        class="d-step flex flex-col gap-1 sm:flex-row sm:gap-4"
        :data-on="shown > 1"
      >
        <span class="w-14 shrink-0 text-dimmed">Agent</span>
        <code class="min-w-0 font-mono text-[12px]/5 [overflow-wrap:anywhere] text-muted">searchIssues({ query: 'repo:my-org/my-repo is:issue is:open updated:&lt;<span class="text-highlighted">{{ SWEEPS[sweep]?.cutoff }}</span>' })</code>
      </p>
    </div>

    <div
      ref="list"
      class="relative mx-4 mt-4 overflow-hidden rounded-lg border border-(--d-line) bg-default/40 sm:mx-6"
    >
      <ol>
      <li
        v-for="(issue, i) in ISSUES"
        :key="issue.number"
        :ref="el => { if (el) rowEls[i] = el as HTMLElement }"
        class="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-3 border-b border-(--d-line) px-3 py-2.5 transition-[background-color,opacity] duration-300 last:border-b-0 sm:px-4"
        :class="scanAt === i ? 'bg-(--d-raised-strong)' : ''"
      >
        <UIcon
          :name="outcome[i] === 'approved' ? 'i-lucide-circle-check' : 'i-lucide-circle-dot'"
          class="mt-1 size-4"
          :class="outcome[i] === 'approved' ? 'text-dimmed' : 'text-muted'"
        />
        <div class="min-w-0">
          <p
            class="text-[13.5px]/6 transition-colors duration-300"
            :class="outcome[i] === 'approved' ? 'text-muted line-through decoration-(--d-line-strong)' : 'text-highlighted'"
          >
            {{ issue.title }}
          </p>
          <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]/5 text-dimmed">
            <span class="font-mono">#{{ issue.number }}</span>
            <Transition
              mode="out-in"
              enter-from-class="opacity-0"
              leave-to-class="opacity-0"
              enter-active-class="transition-opacity duration-200"
              leave-active-class="transition-opacity duration-200"
            >
              <span :key="sweep">updated {{ issue.activity[sweep] }}</span>
            </Transition>
            <span :class="[chip, 'border-(--d-line) text-muted']">{{ issue.label }}</span>
            <Transition
              enter-from-class="scale-75 opacity-0"
              enter-active-class="transition-[opacity,transform] duration-300 ease-(--d-ease)"
            >
              <span
                v-if="stale[i]"
                :class="[chip, 'origin-left border-(--d-line-strong) bg-(--d-raised-strong) text-highlighted']"
              >
                <UIcon
                  name="i-lucide-clock"
                  class="size-3"
                />
                stale
              </span>
            </Transition>
            <span
              v-if="outcome[i] === 'approved'"
              class="text-muted"
            >closed</span>
          </div>

          <div
            class="d-step"
            :data-on="outcome[i] !== 'none'"
          >
            <p
              v-if="outcome[i] === 'commented'"
              class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]/5"
            >
              <span class="inline-flex items-center gap-1.5 font-mono text-muted">
                <UIcon
                  name="i-lucide-message-square"
                  class="size-3.5"
                />
                addIssueComment
              </span>
              <span class="inline-flex items-center gap-1.5 font-mono text-muted">
                <UIcon
                  name="i-lucide-tag"
                  class="size-3.5"
                />
                addLabels
              </span>
              <span class="inline-flex items-center gap-1.5 text-dimmed">
                <span class="size-1.5 rounded-full bg-(--d-signal)" />
                ran without asking
              </span>
            </p>

            <p
              v-else-if="outcome[i] === 'skipped' || outcome[i] === 'replied'"
              class="mt-1.5 text-[12px]/5 text-dimmed"
            >
              {{ outcome[i] === 'replied' ? 'The author replied 9 days ago, skipped' : 'Changed in the last 30 days, skipped' }}
            </p>

            <div
              v-else-if="outcome[i] === 'pending' || outcome[i] === 'approved' || outcome[i] === 'denied'"
              class="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-(--d-raised-strong) px-3 py-2 text-[12px]/5 transition-colors duration-300"
              :class="outcome[i] === 'pending' ? 'border-(--d-warn)/50' : 'border-(--d-line)'"
            >
              <span class="inline-flex min-w-0 flex-wrap items-center gap-x-2">
                <code class="font-mono text-highlighted">closeIssue #{{ issue.number }}</code>
                <span
                  v-if="outcome[i] === 'pending'"
                  class="inline-flex items-center gap-1.5 text-toned"
                >
                  <span class="size-1.5 animate-pulse rounded-full bg-(--d-warn)" />
                  Close? Waiting for you
                </span>
                <span
                  v-else
                  class="text-muted"
                >{{ outcome[i] === 'approved' ? 'Approved by you' : 'Denied, stays open' }}</span>
              </span>
              <span class="flex gap-1.5">
                <span
                  class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 transition-all duration-150"
                  :class="[
                    outcome[i] === 'denied' ? 'border-(--d-line-strong) bg-default text-highlighted' : 'border-(--d-line) text-muted',
                    outcome[i] === 'approved' ? 'opacity-40' : '',
                    pressing?.row === i && !pressing.approve ? 'scale-95' : ''
                  ]"
                >
                  <UIcon
                    v-if="outcome[i] === 'denied'"
                    name="i-lucide-x"
                    class="size-3"
                  />
                  Deny
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 transition-all duration-150"
                  :class="[
                    outcome[i] === 'approved' ? 'bg-(--d-signal) text-(--d-signal-fg)' : 'bg-inverted text-inverted',
                    outcome[i] === 'denied' ? 'opacity-40' : '',
                    pressing?.row === i && pressing.approve ? 'scale-95' : ''
                  ]"
                >
                  <UIcon
                    v-if="outcome[i] === 'approved'"
                    name="i-lucide-check"
                    class="size-3"
                  />
                  Approve
                </span>
              </span>
            </div>
          </div>
        </div>
      </li>
      </ol>

      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-x-0 top-0 h-px bg-(--d-signal) transition-[transform,opacity] duration-300 ease-(--d-ease)"
        :class="scanAt >= 0 ? 'opacity-70' : 'opacity-0'"
        :style="{ transform: `translateY(${scanY}px)` }"
      />
    </div>

    <p
      class="d-step flex flex-col gap-1 px-4 pt-4 text-[13.5px]/6 sm:flex-row sm:gap-4 sm:px-6"
      :data-on="summary"
    >
      <span class="w-14 shrink-0 text-dimmed">Agent</span>
      <span class="text-highlighted">{{ SUMMARY[sweep] }}</span>
    </p>

    <dl class="mt-4 grid grid-cols-2 gap-3 border-t border-(--d-line) px-4 py-3 text-[12px] sm:grid-cols-4 sm:px-6">
      <div
        v-for="c in counters"
        :key="c.label"
      >
        <dt class="text-dimmed">
          {{ c.label }}
        </dt>
        <dd
          class="font-mono text-[15px] tabular-nums transition-colors duration-300"
          :class="c.warn ? 'text-(--d-warn)' : 'text-highlighted'"
        >
          {{ c.value }}
        </dd>
      </div>
    </dl>
  </DocsFigure>
</template>
