<script setup lang="ts">
type Level = 'none' | 'read' | 'write'

// Mirrors PRESET_CONNECT_SCOPES in packages/github-tools/src/connect/scopes.ts, in its scope order.
const PRESET_SCOPES: Record<string, string[]> = {
  'repo-explorer': ['contents:read', 'metadata:read', 'pull_requests:read', 'issues:read', 'discussions:read', 'actions:read', 'checks:read', 'statuses:read'],
  'code-review': ['contents:read', 'metadata:read', 'pull_requests:read', 'pull_requests:write', 'checks:read', 'statuses:read'],
  'issue-triage': ['contents:read', 'metadata:read', 'pull_requests:read', 'issues:read', 'issues:write'],
  'ci-ops': ['contents:read', 'metadata:read', 'pull_requests:read', 'actions:read', 'actions:write', 'checks:read', 'statuses:read'],
  'security-audit': ['contents:read', 'metadata:read', 'pull_requests:read', 'issues:read', 'issues:write', 'actions:read', 'checks:read', 'statuses:read', 'security_events:read', 'vulnerability_alerts:read', 'secret_scanning_alerts:read'],
  'release-manager': ['contents:read', 'contents:write', 'metadata:read', 'pull_requests:read', 'actions:read', 'actions:write', 'checks:read', 'statuses:read'],
  'discussion-moderator': ['contents:read', 'metadata:read', 'pull_requests:read', 'issues:read', 'issues:write', 'discussions:read', 'discussions:write'],
  'notification-inbox': ['contents:read', 'metadata:read', 'pull_requests:read', 'issues:read', 'discussions:read'],
  'pr-author': ['contents:read', 'contents:write', 'metadata:read', 'pull_requests:read', 'pull_requests:write'],
  'maintainer': ['contents:read', 'contents:write', 'metadata:read', 'pull_requests:read', 'pull_requests:write', 'issues:read', 'issues:write', 'discussions:read', 'discussions:write', 'actions:read', 'actions:write', 'checks:read', 'statuses:read', 'administration:read', 'administration:write', 'security_events:read', 'vulnerability_alerts:read', 'secret_scanning_alerts:read']
}

const USER_TOKEN_TOOLS: Record<string, string> = {
  'repo-explorer': 'The gist tools',
  'notification-inbox': 'The notification tools',
  'maintainer': 'The gist and notification tools'
}

const PERMISSIONS = [
  { label: 'Contents', families: ['contents'] },
  { label: 'Pull requests', families: ['pull_requests'] },
  { label: 'Issues', families: ['issues'] },
  { label: 'Discussions', families: ['discussions'] },
  { label: 'Actions', families: ['actions'] },
  { label: 'Checks, statuses', families: ['checks', 'statuses'] },
  { label: 'Administration', families: ['administration'] },
  { label: 'Alerts', families: ['security_events', 'vulnerability_alerts', 'secret_scanning_alerts'] }
]

const presets = Object.keys(PRESET_SCOPES)

function level(preset: string, families: string[]): Level {
  const scopes = PRESET_SCOPES[preset] ?? []
  if (families.some(f => scopes.includes(`${f}:write`))) return 'write'
  if (families.some(f => scopes.includes(`${f}:read`))) return 'read'
  return 'none'
}

const visible = ref(false)
const selected = ref<string>()
const revealed = ref(false)
const userPicked = ref(false)

const scopes = computed(() => (selected.value ? PRESET_SCOPES[selected.value] ?? [] : []))

function select(preset: string) {
  selected.value = preset
  revealed.value = false
  requestAnimationFrame(() => requestAnimationFrame(() => {
    revealed.value = true
  }))
}

function autoSelect(preset: string) {
  if (!userPicked.value) select(preset)
}

function pick(preset: string) {
  userPicked.value = true
  visible.value = true
  select(preset)
}

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 200, run: () => { visible.value = true } },
    { at: 900, run: () => autoSelect('code-review') },
    { at: 3300, run: () => autoSelect('issue-triage') },
    { at: 5700, run: () => autoSelect('maintainer') }
  ],
  reset: () => {
    visible.value = false
    selected.value = undefined
    revealed.value = false
    userPicked.value = false
  },
  settle: () => {
    visible.value = true
    selected.value = 'issue-triage'
    revealed.value = true
  }
})
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Pick a preset to see the GitHub App permissions its tools need, and the scopes a Connect token requests for it."
    :finished
    :still
    @replay="replay"
  >
    <div
      class="d-step p-3 sm:p-6"
      :data-on="visible"
    >
      <div
        class="grid grid-cols-[8.25rem_repeat(8,minmax(0,1fr))] items-end gap-x-0.5 pb-2 text-[11px]/4 text-dimmed sm:grid-cols-[10rem_repeat(8,minmax(0,1fr))] sm:gap-x-1 sm:text-[11.5px]/4"
        aria-hidden="true"
      >
        <span class="pb-0.5 pl-2">Preset</span>
        <span
          v-for="permission in PERMISSIONS"
          :key="permission.label"
          class="justify-self-center text-center max-sm:rotate-180 max-sm:[writing-mode:vertical-rl] max-sm:py-0.5 sm:text-balance"
        >{{ permission.label }}</span>
      </div>

      <ul class="flex flex-col gap-px">
        <li
          v-for="preset in presets"
          :key="preset"
        >
          <button
            type="button"
            class="grid w-full grid-cols-[8.25rem_repeat(8,minmax(0,1fr))] items-center gap-x-0.5 rounded-md py-1.5 text-left transition-colors duration-200 outline-none hover:bg-(--d-raised-strong) focus-visible:ring-2 focus-visible:ring-(--d-signal) sm:grid-cols-[10rem_repeat(8,minmax(0,1fr))] sm:gap-x-1"
            :class="selected === preset ? 'bg-(--d-raised-strong)' : ''"
            :aria-pressed="selected === preset"
            @click="pick(preset)"
          >
            <span
              class="truncate pl-2 text-[11.5px] transition-colors duration-200 sm:font-mono sm:text-[12.5px]"
              :class="selected === preset ? 'text-highlighted' : 'text-muted'"
            >{{ preset }}</span>
            <span
              v-for="permission in PERMISSIONS"
              :key="permission.label"
              class="flex h-4 items-center justify-center transition-colors duration-200"
              :class="selected === preset ? 'text-(--d-signal)' : 'text-toned'"
            >
              <span
                v-if="level(preset, permission.families) === 'write'"
                class="size-2.5 rounded-full bg-current"
              />
              <span
                v-else-if="level(preset, permission.families) === 'read'"
                class="size-2.5 rounded-full border-[1.5px] border-current"
              />
              <span
                v-else
                class="size-1 rounded-full bg-(--d-line-strong)"
              />
              <span class="sr-only">{{ permission.label }}: {{ level(preset, permission.families) }}</span>
            </span>
          </button>
        </li>
      </ul>

      <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pl-2 text-[12px] text-dimmed">
        <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-full border-[1.5px] border-current" />read</span>
        <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-full bg-current" />write</span>
        <span>Every token also gets <code class="font-mono text-[11.5px]">metadata:read</code>.</span>
      </div>

      <div class="mt-5 min-h-36 border-t border-(--d-line) pt-4 pl-2 sm:min-h-28">
        <p class="font-mono text-[12.5px] [overflow-wrap:anywhere] text-muted">
          <span class="text-dimmed">connectGithubScopesForPreset(</span><span class="text-highlighted">'{{ selected ?? '…' }}'</span><span class="text-dimmed">)</span>
          <span
            v-if="selected"
            class="block font-sans text-[12px] text-dimmed sm:ml-2 sm:inline"
          >{{ scopes.length }} scopes</span>
        </p>
        <ul
          v-if="selected"
          :key="selected"
          class="mt-2.5 flex flex-wrap gap-1.5"
        >
          <li
            v-for="(scope, i) in scopes"
            :key="scope"
            class="d-step rounded-md border border-(--d-line) bg-(--d-raised-strong) px-1.5 py-0.5 font-mono text-[11.5px]"
            :class="scope.endsWith(':write') ? 'text-highlighted' : 'text-muted'"
            :style="{ transitionDelay: revealed ? `${i * 35}ms` : '0ms' }"
            :data-on="revealed"
          >
            {{ scope }}
          </li>
        </ul>
        <p
          v-if="selected && USER_TOKEN_TOOLS[selected]"
          class="mt-2.5 text-[12px] text-dimmed"
        >
          {{ USER_TOKEN_TOOLS[selected] }} need a user token, so Connect requests no scope for them.
        </p>
      </div>
    </div>
  </DocsFigure>
</template>
