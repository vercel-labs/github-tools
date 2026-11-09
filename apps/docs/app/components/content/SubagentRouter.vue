<script setup lang="ts">
type State = 'idle' | 'working' | 'waiting' | 'done'

// Subagents and presets from the multi-agent guide; tools from PRESET_TOOLS in core/presets.ts.
const AGENTS = [
  {
    name: 'reviewer',
    preset: 'code-review',
    icon: 'i-lucide-git-pull-request',
    message: 'review PR 12',
    tools: [{ name: 'getPullRequestContext' }, { name: 'listPullRequestFiles' }]
  },
  {
    name: 'triager',
    preset: 'issue-triage',
    icon: 'i-lucide-tag',
    message: 'label issue 40',
    tools: [{ name: 'getIssueContext' }, { name: 'addLabels', note: 'no approval' }]
  },
  {
    name: 'releaser',
    preset: 'release-manager',
    icon: 'i-lucide-rocket',
    message: 'draft the v2.1 notes',
    tools: [{ name: 'getLatestRelease' }, { name: 'compareCommits' }, { name: 'createRelease', note: 'asks' }]
  }
]

const states = ref<State[]>(AGENTS.map(() => 'idle'))
const ticks = ref<number[]>(AGENTS.map(() => 0))
const approval = ref<'hidden' | 'waiting' | 'approved'>('hidden')

function set(i: number, state: State, tick?: number) {
  states.value = states.value.map((s, j) => (j === i ? state : s))
  if (tick !== undefined) ticks.value = ticks.value.map((t, j) => (j === i ? tick : t))
}

const at = timeline([
  FIGURE_PACE.beat,
  FIGURE_PACE.beat,
  FIGURE_PACE.beat,
  1200,
  FIGURE_PACE.beat,
  FIGURE_PACE.hold,
  FIGURE_PACE.beat,
  0
])

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: at[0]!, run: () => set(0, 'working') },
    { at: at[1]!, run: () => set(1, 'working') },
    { at: at[2]!, run: () => set(2, 'working') },
    { at: at[3]!, run: () => {
      set(0, 'done', 2)
      set(1, 'done', 2)
      set(2, 'working', 2)
    } },
    { at: at[4]!, run: () => set(2, 'waiting') },
    { at: at[5]!, run: () => { approval.value = 'waiting' } },
    { at: at[6]!, run: () => {
      approval.value = 'approved'
      set(2, 'working')
    } },
    { at: at[7]!, run: () => set(2, 'done', 3) }
  ],
  reset: () => {
    states.value = AGENTS.map(() => 'idle')
    ticks.value = AGENTS.map(() => 0)
    approval.value = 'hidden'
  },
  settle: () => {
    states.value = AGENTS.map(() => 'done')
    ticks.value = AGENTS.map(a => a.tools.length)
    approval.value = 'approved'
  }
})

const waiting = computed(() => states.value.includes('waiting') || approval.value === 'waiting')

function toolState(i: number, j: number): 'idle' | 'ok' | 'waiting' {
  if (ticks.value[i]! > j) return 'ok'
  if (states.value[i] === 'waiting' && j === ticks.value[i]) return 'waiting'
  return 'idle'
}

const STATUS = {
  idle: { label: 'idle', dot: 'bg-(--d-line-strong)', text: 'text-muted' },
  working: { label: 'running', dot: 'bg-(--d-ok) animate-pulse', text: 'text-toned' },
  waiting: { label: 'waiting', dot: 'bg-(--d-warn)', text: 'text-(--d-warn)' },
  done: { label: 'done', dot: 'bg-(--d-ok)', text: 'text-(--d-ok)' }
} as const

const trunk = computed(() => (waiting.value ? 'bg-(--d-warn)' : 'bg-(--d-line-strong)'))
const tile = 'grid size-8 shrink-0 place-items-center rounded-md border border-(--d-line) bg-default'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The manager delegates; subagents hold the tools. Each request goes to the subagent whose preset fits, and a subagent's approval request comes back to the manager's session."
    :finished
    :still
    @replay="replay"
  >
    <div class="px-4 py-8 sm:px-10 sm:py-12">
      <div class="mx-auto max-w-[30rem]">
        <div
          class="overflow-hidden rounded-lg border bg-(--d-raised) transition-colors duration-500"
          :class="approval === 'waiting' ? 'border-(--d-warn)' : 'border-(--d-line-strong)'"
        >
          <p class="flex items-center gap-2.5 p-2.5">
            <span :class="tile">
              <UIcon
                name="i-custom:eve"
                class="size-4 text-highlighted"
              />
            </span>
            <span>
              <span class="block text-[13px]/5 font-medium text-highlighted">manager</span>
              <span class="block font-mono text-[12px]/4 text-muted">no GitHub tools</span>
            </span>
          </p>
          <div
            class="d-step flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-(--d-line) px-3 py-2 text-[12px]/5 transition-colors duration-500"
            :class="approval === 'waiting' ? 'bg-(--d-warn-bg)' : ''"
            :data-on="approval !== 'hidden'"
          >
            <code class="font-mono text-highlighted">createRelease</code>
            <span class="text-muted">from releaser</span>
            <span class="d-stack ms-auto">
              <span
                class="inline-flex items-center gap-1.5 text-(--d-warn) transition-opacity duration-300"
                :class="approval === 'approved' ? 'invisible opacity-0' : ''"
              >
                <span class="size-1.5 animate-pulse rounded-full bg-(--d-warn)" />
                waiting for you
              </span>
              <span
                class="inline-flex items-center gap-1 text-(--d-ok) transition-opacity duration-300"
                :class="approval === 'approved' ? '' : 'invisible opacity-0'"
              >
                <UIcon
                  name="i-lucide-check"
                  class="size-3.5"
                />
                approved by you
              </span>
            </span>
          </div>
        </div>

        <div
          aria-hidden="true"
          class="relative h-5"
        >
          <span
            class="absolute inset-y-0 left-4 w-px transition-colors duration-500"
            :class="trunk"
          />
        </div>

        <ol>
          <li
            v-for="(agent, i) in AGENTS"
            :key="agent.name"
            class="relative ps-10"
            :class="i < AGENTS.length - 1 ? 'pb-4' : ''"
          >
            <span
              aria-hidden="true"
              class="absolute top-0 left-4 h-[27px] w-px transition-colors duration-500"
              :class="trunk"
            />
            <span
              v-if="i < AGENTS.length - 1"
              aria-hidden="true"
              class="absolute top-[27px] bottom-0 left-4 w-px transition-colors duration-500"
              :class="trunk"
            />
            <span
              aria-hidden="true"
              class="absolute top-[27px] left-4 h-px w-6 transition-colors duration-500"
              :class="states[i] === 'waiting' ? 'bg-(--d-warn)' : states[i] === 'working' ? 'bg-(--d-signal)' : 'bg-(--d-line-strong)'"
            />

            <div
              class="overflow-hidden rounded-lg border bg-(--d-raised) transition-colors duration-500"
              :class="states[i] === 'waiting' ? 'border-(--d-warn)' : states[i] === 'working' ? 'border-(--d-signal)' : 'border-(--d-line-strong)'"
            >
              <p class="flex items-center gap-2.5 p-2.5">
                <span :class="tile">
                  <UIcon
                    :name="agent.icon"
                    class="size-4 text-highlighted"
                  />
                </span>
                <span class="min-w-0">
                  <span class="block text-[13px]/5 font-medium text-highlighted">{{ agent.name }}</span>
                  <span class="block font-mono text-[12px]/4 text-muted">{{ agent.preset }}</span>
                </span>
                <span class="d-stack ms-auto shrink-0 text-[12px]">
                  <span
                    v-for="(s, key) in STATUS"
                    :key="key"
                    class="inline-flex items-center justify-end gap-1.5 transition-opacity duration-300"
                    :class="[s.text, states[i] === key ? '' : 'invisible opacity-0']"
                    :aria-hidden="states[i] !== key"
                  >
                    <span
                      class="size-1.5 rounded-full"
                      :class="s.dot"
                    />
                    {{ s.label }}
                  </span>
                </span>
              </p>

              <div class="border-t border-(--d-line) px-3 py-2">
                <p class="font-mono text-[12px]/5 [overflow-wrap:anywhere] text-muted">
                  {{ agent.name }}({ message: '{{ agent.message }}' })
                </p>
                <ul class="mt-1 flex flex-col">
                  <li
                    v-for="(tool, j) in agent.tools"
                    :key="tool.name"
                    class="flex flex-wrap items-center gap-x-2 font-mono text-[12px]/5"
                  >
                    <span
                      class="size-1.5 shrink-0 rounded-full transition-colors duration-300"
                      :class="toolState(i, j) === 'ok' ? 'bg-(--d-ok)' : toolState(i, j) === 'waiting' ? 'bg-(--d-warn)' : 'bg-(--d-line-strong)'"
                    />
                    <span :class="toolState(i, j) === 'idle' ? 'text-muted' : 'text-toned'">{{ tool.name }}</span>
                    <span
                      v-if="tool.note"
                      class="font-sans"
                      :class="toolState(i, j) === 'waiting' ? 'text-(--d-warn)' : 'text-muted'"
                    >{{ tool.note }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  </DocsFigure>
</template>
