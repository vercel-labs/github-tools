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

// GitHub App repository permissions, in the order and with the names of the App settings page.
const PERMISSIONS = [
  { label: 'Actions', family: 'actions' },
  { label: 'Administration', family: 'administration' },
  { label: 'Checks', family: 'checks' },
  { label: 'Code scanning alerts', family: 'security_events' },
  { label: 'Commit statuses', family: 'statuses' },
  { label: 'Contents', family: 'contents' },
  { label: 'Dependabot alerts', family: 'vulnerability_alerts' },
  { label: 'Discussions', family: 'discussions' },
  { label: 'Issues', family: 'issues' },
  { label: 'Metadata', family: 'metadata' },
  { label: 'Pull requests', family: 'pull_requests' },
  { label: 'Secret scanning alerts', family: 'secret_scanning_alerts' }
]

const ACCESS: Record<Level, string> = { none: 'No access', read: 'Read-only', write: 'Read and write' }

const presets = Object.keys(PRESET_SCOPES).map(value => ({ value, label: value }))

function level(preset: string, family: string): Level {
  const scopes = PRESET_SCOPES[preset]!
  if (scopes.includes(`${family}:write`)) return 'write'
  if (scopes.includes(`${family}:read`)) return 'read'
  return 'none'
}

function example(preset: string) {
  const scopes = PRESET_SCOPES[preset]!
  return scopes.find(scope => scope.endsWith(':write')) ?? scopes.at(-1)!
}

function scopesFor(preset: string, family: string) {
  return PRESET_SCOPES[preset]!.filter(scope => scope.startsWith(`${family}:`))
}

const selected = ref('issue-triage')
const granted = computed(() => PERMISSIONS.filter(p => level(selected.value, p.family) !== 'none').length)

const { root, finished, still } = useFigure({ steps: [], reset: () => {}, settle: () => {}, autoplay: false })

</script>

<template>
  <DocsFigure
    ref="root"
    caption="Each preset needs only some permissions. Pick one to see the GitHub App access its tools use, and the scopes a Connect token requests for it."
    :finished
    :still
  >
    <template #controls>
      <FigureTabs
        v-model="selected"
        label="Preset"
        :options="presets"
        show-label
        mono
      />
    </template>

    <div class="flex justify-center px-4 py-8 sm:px-10 sm:py-10">
      <div class="flex w-full max-w-[40rem] flex-col gap-4">
        <section class="@container rounded-lg border border-(--d-line) bg-(--d-raised)">
          <header class="flex items-center gap-2.5 border-b border-(--d-line) px-3 py-2.5">
            <span class="grid size-7 shrink-0 place-items-center rounded-md border border-(--d-line) bg-default text-highlighted">
              <UIcon
                name="i-simple-icons-github"
                class="size-4"
              />
            </span>
            <div class="min-w-0">
              <p class="text-[13px]/5 font-medium text-highlighted">
                Repository permissions
              </p>
              <p
                class="font-mono text-[12px]/4 text-muted tabular-nums"
                aria-live="polite"
              >
                {{ granted }} of {{ PERMISSIONS.length }} granted, {{ PRESET_SCOPES[selected]!.length }} scopes
              </p>
            </div>
          </header>
          <ul class="flex flex-col py-1">
            <li
              v-for="permission in PERMISSIONS"
              :key="permission.label"
              class="flex h-8 items-center gap-3 px-3"
              :aria-label="`${permission.label}: ${ACCESS[level(selected, permission.family)]}`"
            >
              <span
                class="min-w-0 flex-1 text-[13px] @min-[38rem]:w-40 @min-[38rem]:flex-none"
                :class="level(selected, permission.family) === 'none' ? 'text-dimmed' : 'text-highlighted'"
              >{{ permission.label }}</span>
              <span class="hidden min-w-0 flex-1 gap-x-3 font-mono text-[12px] whitespace-nowrap text-muted @min-[38rem]:flex">
                <span
                  v-for="scope in scopesFor(selected, permission.family)"
                  :key="scope"
                  :class="scope.endsWith(':write') ? 'text-highlighted' : ''"
                >{{ scope }}</span>
              </span>
              <span class="d-stack w-28 shrink-0 justify-items-end">
                <span
                  v-for="value in (['none', 'read', 'write'] as const)"
                  :key="value"
                  class="inline-flex items-center gap-1.5 text-[12.5px]"
                  :class="[level(selected, permission.family) === value ? '' : 'invisible opacity-0', value === 'write' ? 'font-medium text-highlighted' : 'text-default']"
                  :aria-hidden="level(selected, permission.family) !== value"
                >
                  <span
                    v-if="value === 'none'"
                    class="h-1.5 w-12 rounded-full bg-(--d-raised-strong)"
                  />
                  <span
                    v-else
                    class="size-1.5 rounded-full"
                    :class="value === 'write' ? 'bg-(--d-signal)' : 'border border-(--d-signal)'"
                  />
                  <template v-if="value !== 'none'">{{ ACCESS[value] }}</template>
                </span>
              </span>
            </li>
          </ul>
        </section>

        <div class="d-stack">
          <p
            v-for="preset in presets"
            :key="preset.value"
            class="text-[13px]/5 text-muted"
            :class="[selected === preset.value ? '' : 'invisible opacity-0']"
            :aria-hidden="selected !== preset.value"
          >
            A Connect token requests the matching scopes, such as <span class="font-mono text-[12.5px] text-highlighted">{{ example(preset.value) }}</span>.
            <template v-if="USER_TOKEN_TOOLS[preset.value]">
              {{ USER_TOKEN_TOOLS[preset.value] }} need a user token, so Connect requests no scope for them.
            </template>
          </p>
        </div>
      </div>
    </div>
  </DocsFigure>
</template>
