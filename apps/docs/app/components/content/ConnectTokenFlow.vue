<script setup lang="ts">
type Mode = 'preset' | 'auto'

// Scope lists from connectGithubScopesForPreset('issue-triage') and connectGithubScopesForTools([tool]).
const PRESET_SCOPES = ['contents:read', 'metadata:read', 'pull_requests:read', 'issues:read', 'issues:write']
const LIST_ISSUES_SCOPES = ['contents:read', 'metadata:read', 'issues:read']
const ADD_LABELS_SCOPES = ['contents:read', 'metadata:read', 'issues:read', 'issues:write']

const MODES: { value: Mode, label: string }[] = [
  { value: 'preset', label: 'preset: \'issue-triage\'' },
  { value: 'auto', label: 'eve, preset: \'auto\'' }
]

const mode = ref<Mode>('preset')
const shown = ref(0)
const expired = ref(false)
const userPicked = ref(false)

const firstScopes = computed(() => (mode.value === 'preset' ? PRESET_SCOPES : LIST_ISSUES_SCOPES))
const secondScopes = computed(() => (mode.value === 'preset' ? PRESET_SCOPES : ADD_LABELS_SCOPES))
const reuses = computed(() => mode.value === 'preset')

const STEP = 700
const PHASE = 10 * STEP + 3200

function phase(start: number, phaseMode: Mode, auto: boolean) {
  const guard = (run: () => void) => () => {
    if (auto && userPicked.value) return
    run()
  }
  return [
    { at: start, run: guard(() => {
      if (!userPicked.value) mode.value = phaseMode
      shown.value = 0
      expired.value = false
    }) },
    ...Array.from({ length: 8 }, (_, i) => ({ at: start + 300 + i * STEP, run: guard(() => { shown.value = i + 1 }) })),
    { at: start + 300 + 8 * STEP + 600, run: guard(() => { shown.value = 9 }) },
    { at: start + 300 + 8 * STEP + 900, run: guard(() => { expired.value = true }) }
  ]
}

const { root, finished, still, replay } = useFigure({
  steps: [
    ...phase(0, 'preset', false),
    ...phase(PHASE, 'auto', true)
  ],
  reset: () => {
    shown.value = 0
    expired.value = false
  },
  settle: () => {
    shown.value = 9
    expired.value = true
  }
})

function pick(value: Mode) {
  userPicked.value = true
  mode.value = value
  if (still.value) return
  replay()
}

const rows = computed(() => [
  { key: 'call1', at: 0, actor: 'Agent', kind: 'call', text: 'listIssues({ owner: \'vercel\', repo: \'ai\' })' },
  { key: 'scopes1', at: 1, actor: 'SDK', kind: 'scopes', text: 'Asks Connect for a token on', scopes: firstScopes.value },
  { key: 'token1', at: 2, actor: 'Connect', kind: 'token', text: 'Mints', token: 'token A', note: 'from the vercel installation, for repository ai' },
  { key: 'http1', at: 3, actor: 'GitHub', kind: 'http', text: 'GET /repos/vercel/ai/issues' },
  { key: 'call2', at: 4, actor: 'Agent', kind: 'call', text: 'addLabels({ issueNumber: 42, labels: [\'bug\'] })', note: 'write, approved' },
  { key: 'scopes2', at: 5, actor: 'SDK', kind: 'scopes', text: reuses.value ? 'Same preset scopes, same repository' : 'Scopes of addLabels, same repository', scopes: secondScopes.value, previous: firstScopes.value },
  { key: 'token2', at: 6, actor: 'Connect', kind: 'token', text: reuses.value ? 'Same parameters, reuses' : 'New scopes, mints', token: reuses.value ? 'token A' : 'token B' },
  { key: 'http2', at: 7, actor: 'GitHub', kind: 'http', text: 'POST /repos/vercel/ai/issues/42/labels' },
  { key: 'expiry', at: 8, actor: '', kind: 'note', text: `${reuses.value ? 'Token A is short-lived and expires on its own.' : 'Both tokens are short-lived and expire on their own.'} A later call gets a new one.` }
])
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Each tool call asks Connect for a token on the repository it targets, scoped to the preset, or to the one tool under eve's auto preset."
    :finished
    :still
    @replay="replay"
  >
    <div class="flex flex-wrap items-center gap-1.5 border-b border-(--d-line) px-4 py-2.5 sm:px-6">
      <span class="mr-1 text-[12px] text-dimmed">Scopes from</span>
      <button
        v-for="option in MODES"
        :key="option.value"
        type="button"
        class="rounded-md px-2 py-0.5 font-mono text-[12px] ring-1 transition-colors duration-200 ring-inset outline-none focus-visible:ring-2 focus-visible:ring-(--d-signal)"
        :class="mode === option.value ? 'bg-(--d-raised-strong) text-highlighted ring-(--d-line-strong)' : 'text-muted ring-transparent hover:text-highlighted'"
        :aria-pressed="mode === option.value"
        @click="pick(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <ol class="flex flex-col gap-3 p-4 text-[13px]/6 sm:p-6">
      <li
        v-for="row in rows"
        :key="row.key"
        class="d-step grid grid-cols-[3.75rem_minmax(0,1fr)] items-baseline gap-x-3 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-x-4"
        :class="row.key === 'call2' ? 'mt-2 border-t border-(--d-line) pt-4' : ''"
        :data-on="shown > row.at"
      >
        <span class="text-dimmed">{{ row.actor }}</span>

        <div
          v-if="row.kind === 'call'"
          class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1"
        >
          <code class="rounded-md border border-(--d-line) bg-(--d-raised-strong) px-2 py-0.5 font-mono text-[12px] [overflow-wrap:anywhere] text-highlighted">{{ row.text }}</code>
          <span
            v-if="row.note"
            class="text-[12.5px] text-dimmed"
          >{{ row.note }}</span>
        </div>

        <div
          v-else-if="row.kind === 'scopes'"
          class="min-w-0"
        >
          <p class="text-muted">
            {{ row.text }} <span class="font-mono text-[12px] text-highlighted">vercel/ai</span>
          </p>
          <ul class="mt-1.5 flex flex-wrap gap-1">
            <li
              v-for="scope in row.scopes"
              :key="scope"
              class="rounded border px-1.5 font-mono text-[11.5px]/5"
              :class="row.previous && !row.previous.includes(scope) ? 'border-(--d-signal)/50 text-(--d-signal-text)' : 'border-(--d-line) text-muted'"
            >
              {{ scope }}
            </li>
          </ul>
        </div>

        <div
          v-else-if="row.kind === 'token'"
          class="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1"
        >
          <span class="text-muted">{{ row.text }}</span>
          <span
            class="inline-flex flex-col rounded-md border border-(--d-line) bg-(--d-raised-strong) px-2 pt-0.5 pb-1 font-mono text-[12px]/5 transition-colors duration-300"
            :class="expired ? 'text-dimmed line-through' : 'text-highlighted'"
          >
            {{ row.token }}
            <span class="mt-0.5 h-0.5 w-full rounded-full bg-(--d-line)">
              <span
                class="block h-full rounded-full bg-(--d-signal) transition-[width] duration-[1600ms] ease-linear"
                :style="{ width: expired ? '0%' : '100%' }"
              />
            </span>
          </span>
          <span
            v-if="row.note"
            class="text-[12.5px] text-dimmed"
          >{{ row.note }}</span>
        </div>

        <div
          v-else-if="row.kind === 'http'"
          class="flex min-w-0 flex-wrap items-center gap-x-3"
        >
          <code class="font-mono text-[12px] [overflow-wrap:anywhere] text-muted">{{ row.text }}</code>
          <span class="font-mono text-[12px] text-(--d-signal-text)">200</span>
        </div>

        <p
          v-else
          class="text-[12.5px] text-dimmed"
        >
          {{ row.text }}
        </p>
      </li>
    </ol>
  </DocsFigure>
</template>
