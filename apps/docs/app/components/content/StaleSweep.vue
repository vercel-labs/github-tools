<script setup lang="ts">
type Sweep = '1' | '2'
type Action = 'none' | 'labelled' | 'waiting' | 'approved' | 'denied'

interface Issue {
  number: number
  title: string
  label: string
}

// Real rows are the ones the sweeps touch; skeleton rows changed in the last 30 days and are left alone.
const ROWS: (Issue | null)[] = [
  { number: 241, title: 'Dark mode toggle resets on reload', label: 'bug' },
  null,
  { number: 250, title: 'Flaky upload test on Node 22', label: 'tests' },
  null,
  { number: 204, title: 'Document the proxy options', label: 'docs' }
]

// Sweep 2 runs five weeks later, so its cutoff (30 days before the sweep) moves too.
const CUTOFF = { 1: '2026-10-10', 2: '2026-11-14' } as const

const FINAL: Record<Sweep, Record<number, Action>> = {
  1: { 241: 'labelled', 250: 'none', 204: 'labelled' },
  2: { 241: 'approved', 250: 'labelled', 204: 'denied' }
}

const ACTIONS = {
  labelled: { tool: '', text: 'commented and labelled, no approval', tone: 'text-(--d-ok)', icon: 'i-lucide-check' },
  waiting: { tool: 'closeIssue', text: 'waiting for you', tone: 'text-(--d-warn)', icon: '' },
  approved: { tool: 'closeIssue', text: 'approved, closed', tone: 'text-(--d-ok)', icon: 'i-lucide-check' },
  denied: { tool: 'closeIssue', text: 'denied, stays open', tone: 'text-(--d-fail)', icon: 'i-lucide-x' }
} as const

const SWEEP_OPTIONS = [
  { value: '1', label: 'Nov 9' },
  { value: '2', label: 'Dec 14' }
] as const

const sweep = ref<Sweep>('1')
const searched = ref(false)
const actions = ref<Record<number, Action>>({ 241: 'none', 250: 'none', 204: 'none' })

function act(issue: number, action: Action) {
  actions.value = { ...actions.value, [issue]: action }
}

function show(s: Sweep) {
  sweep.value = s
  searched.value = true
  actions.value = { ...FINAL[s] }
}

const at = timeline([
  1200,
  FIGURE_PACE.beat,
  1500,
  1200,
  FIGURE_PACE.beat,
  FIGURE_PACE.beat,
  FIGURE_PACE.hold,
  FIGURE_PACE.beat,
  0
])

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: at[0]!, run: () => { searched.value = true } },
    { at: at[1]!, run: () => act(241, 'labelled') },
    { at: at[2]!, run: () => act(204, 'labelled') },
    { at: at[3]!, run: () => {
      sweep.value = '2'
      actions.value = { 241: 'none', 250: 'none', 204: 'none' }
    } },
    { at: at[4]!, run: () => act(250, 'labelled') },
    { at: at[5]!, run: () => act(241, 'waiting') },
    { at: at[6]!, run: () => act(204, 'waiting') },
    { at: at[7]!, run: () => act(241, 'approved') },
    { at: at[8]!, run: () => act(204, 'denied') }
  ],
  reset: () => {
    sweep.value = '1'
    searched.value = false
    actions.value = { 241: 'none', 250: 'none', 204: 'none' }
  },
  settle: () => show('2')
})

const picked = computed({
  get: () => sweep.value,
  set: (s: Sweep) => show(s)
})

function stale(issue: Issue) {
  if (actions.value[issue.number] === 'labelled') return true
  return sweep.value === '2' && FINAL[1][issue.number] === 'labelled'
}

const chip = 'inline-flex h-5 items-center gap-1.5 rounded-full border border-(--d-line-strong) px-2 text-[12px] text-toned'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Comments and labels run, closes wait. The first sweep labels inactive issues without asking; the next one asks before closing each stale issue nobody answered."
    :finished
    :still
    @replay="replay"
  >
    <template #controls>
      <FigureTabs
        v-model="picked"
        label="Sweep"
        :options="SWEEP_OPTIONS"
        show-label
        :inert="!finished"
      />
    </template>

    <div class="px-4 py-8 sm:px-10 sm:py-12">
      <div class="mx-auto flex max-w-[30rem] flex-col items-center">
        <div class="flex items-center gap-2.5 rounded-lg border border-(--d-line-strong) bg-(--d-raised) py-2 ps-2 pe-4">
          <span class="grid size-8 place-items-center rounded-md border border-(--d-line) bg-default">
            <UIcon
              name="i-custom:eve"
              class="size-4 text-highlighted"
            />
          </span>
          <span>
            <span class="block text-[13px]/5 font-medium text-highlighted">triage-agent</span>
            <span class="block font-mono text-[12px]/4 text-muted">issue-triage</span>
          </span>
        </div>

        <div class="relative grid h-16 w-full place-items-center">
          <span
            aria-hidden="true"
            class="absolute inset-y-0 left-1/2 w-px bg-(--d-line-strong)"
          />
          <span
            aria-hidden="true"
            class="absolute inset-y-0 left-1/2 w-px origin-top bg-(--d-signal) transition-transform duration-700 ease-(--d-ease)"
            :class="searched ? 'scale-y-100' : 'scale-y-0'"
          />
          <span
            class="d-step d-stack relative rounded border border-(--d-line-strong) bg-default px-1.5 font-mono text-[12px]/5 text-toned"
            :data-on="searched"
          >
            <span
              v-for="(cutoff, s) in CUTOFF"
              :key="s"
              class="transition-opacity duration-300"
              :class="sweep === String(s) ? '' : 'invisible opacity-0'"
            >searchIssues updated:&lt;{{ cutoff }}</span>
          </span>
        </div>

        <div class="w-full overflow-hidden rounded-lg border border-(--d-line-strong) bg-(--d-raised)">
          <p class="flex items-center gap-2 border-b border-(--d-line) px-3 py-2.5 text-[13px]">
            <UIcon
              name="i-simple-icons-github"
              class="size-4 text-highlighted"
            />
            <span class="font-medium text-highlighted">my-org/my-repo</span>
            <span class="text-muted">open issues</span>
          </p>

          <ol>
            <li
              v-for="(issue, i) in ROWS"
              :key="i"
              class="flex gap-2.5 border-b border-(--d-line) px-3 py-2.5 transition-colors duration-500 last:border-b-0"
              :class="issue && actions[issue.number] === 'waiting' ? 'bg-(--d-warn-bg)' : ''"
            >
              <template v-if="issue">
                <span class="d-stack mt-0.5 size-4 shrink-0">
                  <UIcon
                    name="i-lucide-circle-dot"
                    class="size-4 text-(--d-ok) transition-opacity duration-300"
                    :class="actions[issue.number] === 'approved' ? 'opacity-0' : ''"
                  />
                  <UIcon
                    name="i-lucide-circle-check"
                    class="size-4 text-muted transition-opacity duration-300"
                    :class="actions[issue.number] === 'approved' ? '' : 'opacity-0'"
                  />
                </span>
                <div class="min-w-0 flex-1">
                  <p
                    class="text-[13px]/5 font-medium transition-colors duration-300"
                    :class="actions[issue.number] === 'approved' ? 'text-muted' : 'text-highlighted'"
                  >
                    {{ issue.title }} <span class="font-mono text-[12px] font-normal text-muted">#{{ issue.number }}</span>
                  </p>
                  <div class="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
                    <span :class="chip">
                      <span class="size-2 rounded-full bg-(--d-line-strong)" />
                      {{ issue.label }}
                    </span>
                    <span
                      class="d-step"
                      :class="chip"
                      :data-on="stale(issue)"
                    >
                      <span class="size-2 rounded-full bg-(--d-warn)" />
                      stale
                    </span>
                    <span class="d-stack ms-1 text-[12px]">
                      <span
                        v-for="(a, key) in ACTIONS"
                        :key="key"
                        class="inline-flex items-center gap-1 transition-opacity duration-300"
                        :class="[a.tone, actions[issue.number] === key ? '' : 'invisible opacity-0']"
                        :aria-hidden="actions[issue.number] !== key"
                      >
                        <UIcon
                          v-if="a.icon"
                          :name="a.icon"
                          class="size-3.5"
                        />
                        <span
                          v-else
                          class="mx-0.5 size-1.5 animate-pulse rounded-full bg-(--d-warn)"
                        />
                        <code
                          v-if="a.tool"
                          class="font-mono"
                        >{{ a.tool }}</code>
                        {{ a.text }}
                      </span>
                    </span>
                  </div>
                </div>
              </template>

              <template v-else>
                <UIcon
                  name="i-lucide-circle-dot"
                  class="mt-0.5 size-4 shrink-0 text-dimmed"
                />
                <div
                  aria-hidden="true"
                  class="flex flex-1 flex-col gap-2.5 pt-1.5"
                >
                  <span class="h-1.5 w-3/5 rounded-full bg-(--d-raised-strong)" />
                  <span class="h-1.5 w-1/4 rounded-full bg-(--d-raised-strong)" />
                </div>
              </template>
            </li>
          </ol>
        </div>
      </div>
    </div>
  </DocsFigure>
</template>
