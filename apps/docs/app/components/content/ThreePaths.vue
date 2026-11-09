<script setup lang="ts">
type RouteId = 'octokit' | 'gh' | 'tools'

interface Step {
  /** Tag on the connector into this node. */
  tag?: string
  icon: string
  title: string
  sub: string
  tone?: 'warn' | 'ok'
}

interface Route {
  id: RouteId
  name: string
  steps: Step[]
  result: { tag: string, label: string, code?: string }
}

const API: Step = { icon: 'i-simple-icons-github', title: 'GitHub API', sub: 'POST /issues/42/labels', tone: 'ok' }

// Octokit's addLabels response and the shaped result of addLabelsCore in packages/github-tools/src/core/issues.ts.
const ROUTES: Route[] = [
  {
    id: 'octokit',
    name: 'Octokit',
    steps: [
      { icon: 'i-lucide-file-code', title: 'Your code', sub: 'octokit.rest.issues.addLabels(…)' },
      { ...API, tag: 'typescript types' }
    ],
    result: { tag: 'full response', label: 'GitHub\'s full response, headers included' }
  },
  {
    id: 'gh',
    name: 'gh CLI',
    steps: [
      { icon: 'i-lucide-cpu', title: 'Model', sub: 'gh issue edit 42 --add-label bug' },
      { tag: 'command string', icon: 'i-lucide-terminal', title: 'Shell tool', sub: 'asks per command, if you set it' },
      { ...API, tag: 'flag parsing' }
    ],
    result: { tag: 'stdout', label: 'Text, or the fields the model lists in --json', code: 'https://github.com/acme/app/issues/42' }
  },
  {
    id: 'tools',
    name: 'GitHub tools',
    steps: [
      { icon: 'i-lucide-cpu', title: 'Model', sub: 'addLabels({ issueNumber: 42, … })' },
      { tag: 'zod schema', icon: 'i-lucide-hand', title: 'Approval', sub: 'a write waits for a person', tone: 'warn' },
      { ...API, tag: 'approved' }
    ],
    result: { tag: 'shaped', label: 'Shaped result', code: '[{ name: \'bug\', color: \'d73a4a\', description: "Something isn\'t working" }]' }
  }
]

const OPTIONS = ROUTES.map(r => ({ value: r.id, label: r.name }))
const SKELETON = ['92%', '64%', '80%', '48%']

const route = ref<RouteId>('tools')

const { root, still } = useFigure({ steps: [], reset: () => {}, settle: () => {}, autoplay: false })
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Three ways to label an issue. Only the GitHub tools route checks a typed input, asks a person before the write, and returns a shaped result."
    finished
    :still
  >
    <template #controls>
      <FigureTabs
        v-model="route"
        label="Route"
        :options="OPTIONS"
        show-label
      />
    </template>

    <div class="px-4 py-8 sm:px-8 sm:py-10">
      <div class="d-stack mx-auto max-w-sm">
        <div
          v-for="r in ROUTES"
          :key="r.id"
          class="flex flex-col items-center"
          :class="route === r.id ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'"
          :aria-hidden="route !== r.id"
        >
          <span class="rounded-full border border-(--d-line-strong) bg-(--d-raised) px-3 py-1 text-[13px] text-highlighted">
            Label issue 42 as bug
          </span>

          <template
            v-for="s in r.steps"
            :key="s.title"
          >
            <div class="wire">
              <span
                v-if="s.tag"
                class="tag"
              >{{ s.tag }}</span>
            </div>
            <div
              class="node"
              :class="s.tone === 'warn' ? 'node-warn' : ''"
            >
              <span class="tile">
                <UIcon
                  :name="s.icon"
                  class="size-4"
                  :class="s.tone === 'warn' ? 'text-(--d-warn)' : 'text-toned'"
                />
              </span>
              <span class="flex min-w-0 flex-col">
                <span class="flex items-center gap-2 text-[13px]/5 font-medium text-highlighted">
                  {{ s.title }}
                  <span
                    v-if="s.tone === 'ok'"
                    class="font-mono text-[12px] font-normal text-(--d-ok)"
                  >200</span>
                </span>
                <span
                  class="font-mono text-[12px]/4 [overflow-wrap:anywhere]"
                  :class="s.tone === 'warn' ? 'text-(--d-warn)' : 'text-muted'"
                >{{ s.sub }}</span>
              </span>
            </div>
          </template>

          <div class="wire">
            <span class="tag">{{ r.result.tag }}</span>
          </div>
          <div class="w-full rounded-lg border border-(--d-line) bg-(--d-raised) px-3 py-2.5">
            <p class="mb-2 text-[12px]/4 text-muted">
              {{ r.result.label }}
            </p>
            <code
              v-if="r.result.code"
              class="d-code block text-[12px]!"
            >{{ r.result.code }}</code>
            <div
              v-else
              class="flex flex-col gap-2 py-1"
            >
              <span
                v-for="(w, k) in SKELETON"
                :key="k"
                class="h-1.5 rounded-full bg-(--d-raised-strong)"
                :style="{ width: w }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </DocsFigure>
</template>

<style scoped>
.wire {
  position: relative;
  display: grid;
  place-items: center;
  height: 2.75rem;
  width: 100%;
}

.wire::before {
  content: '';
  position: absolute;
  inset-block: 0;
  left: 50%;
  border-left: 1px dashed var(--d-line-strong);
}

.tag {
  position: relative;
  border-radius: 4px;
  padding: 0 0.375rem;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 18px;
  color: var(--ui-text-toned);
  background: var(--ui-bg);
  box-shadow: inset 0 0 0 1px var(--d-line-strong);
}

.node {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--d-line-strong);
  background: var(--d-raised);
  padding: 0.5rem 0.75rem 0.5rem 0.5rem;
}

.node-warn {
  border-color: color-mix(in oklab, var(--d-warn) 50%, transparent);
  background: var(--d-warn-bg);
}

.tile {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  border: 1px solid var(--d-line);
  background: var(--ui-bg);
}
</style>
