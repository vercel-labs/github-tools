<script setup lang="ts">
type Kind = 'read' | 'write' | 'blocked'
type Step = { kind: Kind, tool: string, target: string, result: string, wouldBe?: string, time: string }

const STEPS: Step[] = [
  { kind: 'read', tool: 'searchCode', target: 'resets.insert', result: 'Found in src/auth/reset.ts', time: '0.6s' },
  { kind: 'read', tool: 'getFileContent', target: 'src/auth/reset.ts', result: 'Tokens are stored without an expiry', time: '0.4s' },
  { kind: 'blocked', tool: 'createBranch', target: 'fix-reset-expiry', result: 'Writes are limited to branches matching agent/*', time: '0s' },
  { kind: 'write', tool: 'createBranch', target: 'agent/reset-expiry', result: 'Created from main', wouldBe: 'Would create branch agent/reset-expiry', time: '0.5s' },
  { kind: 'write', tool: 'editFiles', target: 'agent/reset-expiry', result: '2 files, +14 −2, 1 commit', wouldBe: 'Would commit 2 files to agent/reset-expiry', time: '1.1s' },
  { kind: 'write', tool: 'createPullRequest', target: 'agent/reset-expiry → main', result: 'Opened #134', wouldBe: 'Would open a pull request into main', time: '0.7s' }
]

const { later, clear } = useSceneTimers()
const list = ref<HTMLElement | null>(null)
const dryRun = ref(false)
const started = ref(false)
const shown = ref(0)

const done = computed(() => shown.value === STEPS.length)

function run() {
  clear()
  started.value = true
  shown.value = 0
  STEPS.forEach((_, index) => later(500 + index * 850, () => { shown.value = index + 1 }))
}

function toggleDryRun() {
  dryRun.value = !dryRun.value
  if (started.value) run()
}

useScrollToEnd(list, () => shown)

const DOT: Record<Kind, string> = {
  read: 'bg-(--ui-text-dimmed)',
  write: 'bg-(--d-ok)',
  blocked: 'bg-(--d-fail)'
}

const hint = computed(() => {
  if (!started.value) return 'Run the agent. Nobody approves its writes, so guardrails decide where it may write.'
  if (!done.value) return 'The agent works alone: reads, then writes inside agent/* branches.'
  return dryRun.value ? 'Dry run: every write was checked and recorded, none reached GitHub.' : 'Turn on dry run and run it again to see what it would do without writing.'
})

defineExpose({ hint })
</script>

<template>
  <LandingSceneWindow
    app="vercel"
    title="vercel.com/acme/agents/issue-to-pr"
    class="h-full"
  >
    <div class="shrink-0 border-b border-(--d-line) px-4 py-3.5">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p class="text-[15px] text-highlighted">
          issue-to-pr
        </p>
        <span class="inline-flex h-6 items-center gap-1.5 rounded-full border border-(--d-line) px-2 text-[12px] text-muted">
          <span
            class="size-1.5 rounded-full"
            :class="started && !done ? 'animate-pulse bg-(--d-warn)' : 'bg-(--d-ok)'"
          />
          {{ started && !done ? 'Running' : 'Ready' }}
        </span>
        <div class="ms-auto flex items-center gap-2">
          <button
            type="button"
            role="switch"
            :aria-checked="dryRun"
            class="flex h-7 items-center gap-2 rounded-md px-1.5 text-[12.5px] text-toned hover:text-highlighted"
            @click="toggleDryRun"
          >
            <span
              class="relative h-4 w-7 rounded-full transition-colors duration-150"
              :class="dryRun ? 'bg-(--d-warn)' : 'bg-(--d-raised-strong) ring-1 ring-(--d-line-strong) ring-inset'"
            >
              <span
                class="absolute top-0.5 left-0.5 size-3 rounded-full bg-white transition-transform duration-150"
                :class="dryRun ? 'translate-x-3' : ''"
              />
            </span>
            Dry run
          </button>
          <button
            type="button"
            class="relative h-7 rounded-md bg-(--d-signal) px-3 text-[12.5px] font-medium text-(--d-signal-fg) transition-[opacity,transform] active:scale-[0.97] disabled:opacity-40"
            :disabled="started && !done"
            @click="run"
          >
            <span
              v-if="!started"
              class="scene-ping pointer-events-none absolute inset-0 rounded-md"
              aria-hidden="true"
            />
            {{ started ? 'Run again' : 'Run' }}
          </button>
        </div>
      </div>
      <p class="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
        On
        <span class="inline-flex items-center gap-1 text-toned">
          <UIcon
            name="i-simple-icons-github"
            class="size-3"
          />acme/app#92
        </span>
        <span class="rounded-full bg-(--d-hue-2)/20 px-2 text-(--d-hue-2) ring-1 ring-(--d-hue-2)/40 ring-inset">agent</span>
        <span class="text-dimmed">·</span>
        <code class="font-mono text-toned">pr-author</code>
        <span class="text-dimmed">·</span>
        <span class="inline-flex items-center gap-1 text-toned">
          <UIcon
            name="i-lucide-shield"
            class="size-3"
          />branches: agent/*</span>
        <span class="text-dimmed">·</span>
        <code class="font-mono text-toned">requireApproval: false</code>
      </p>
    </div>

    <div class="relative min-h-0 flex-1">
      <div
        ref="list"
        class="scene-scroll absolute inset-0 overflow-y-auto"
      >
        <ol class="flex flex-col px-4 py-3">
          <li
            v-if="!started"
            class="py-8 text-center text-[13px] text-dimmed"
          >
            Waiting for an issue labeled <span class="text-(--d-hue-2)">agent</span>. Press Run to start one.
          </li>
          <li
            v-for="(step, index) in STEPS.slice(0, shown)"
            :key="`${dryRun}-${index}`"
            class="scene-row grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-start gap-x-2.5 border-b border-(--d-line) py-2 last:border-b-0"
          >
            <span
              class="mt-1.5 size-2 rounded-full"
              :class="step.kind === 'write' && dryRun ? 'bg-(--d-warn)' : DOT[step.kind]"
            />
            <div class="min-w-0">
              <p class="flex min-w-0 items-baseline gap-2 text-[13px]">
                <code class="shrink-0 font-mono text-[12.5px] text-highlighted">{{ step.tool }}</code>
                <span class="truncate font-mono text-[12px] text-muted">{{ step.target }}</span>
              </p>
              <p
                class="truncate text-[12.5px]"
                :class="step.kind === 'blocked' ? 'text-(--d-fail)' : step.kind === 'write' && dryRun ? 'text-(--d-warn)' : 'text-toned'"
              >
                {{ step.kind === 'write' && dryRun ? step.wouldBe : step.result }}
              </p>
            </div>
            <span class="pt-px text-[12px] text-dimmed tabular-nums">{{ step.kind === 'write' && dryRun ? 'skipped' : step.kind === 'blocked' ? 'blocked' : step.time }}</span>
          </li>
          <li
            v-if="done"
            class="scene-row mt-2 flex items-center gap-2 rounded-md border border-(--d-line) bg-(--d-raised) px-3 py-2.5 text-[13px]"
          >
            <UIcon
              :name="dryRun ? 'i-lucide-eye' : 'i-lucide-git-pull-request'"
              class="size-4 shrink-0"
              :class="dryRun ? 'text-(--d-warn)' : 'text-(--d-ok)'"
            />
            <span
              v-if="dryRun"
              class="text-toned"
            >3 writes recorded, nothing reached GitHub.</span>
            <span
              v-else
              class="min-w-0 truncate text-highlighted"
            >Expire reset links after one hour <span class="text-dimmed">acme/app#134</span></span>
          </li>
        </ol>
      </div>
    </div>
  </LandingSceneWindow>
</template>
