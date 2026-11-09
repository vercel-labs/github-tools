<script setup lang="ts">
import { PRESET_TOOLS, type PresetName } from '~/utils/figure-data/presets'

type Token = [string, string?]
type Station = { preset: PresetName, label: string, hue: string, done: string, dry: string }
type State = 'queued' | 'running' | 'done' | 'skipped'

const STATIONS: Station[] = [
  { preset: 'issue-triage', label: 'Triage', hue: 'var(--d-hue-1)', done: 'Labeled #92 bug and priority: high', dry: 'Would label #92 bug and priority: high' },
  { preset: 'pr-author', label: 'Fix', hue: 'var(--d-hue-2)', done: 'Opened #134 from agent/reset-expiry', dry: 'Would open a pull request from agent/reset-expiry' },
  { preset: 'code-review', label: 'Review', hue: 'var(--d-hue-3)', done: 'Reviewed #134: approved, one note on tests', dry: 'Would approve #134 with one note' },
  { preset: 'ci-ops', label: 'Verify', hue: 'var(--d-hue-4)', done: 'Checks green, set status agent/ready on #134', dry: 'Would set status agent/ready on #134' }
]

const { later, clear } = useSceneTimers()
const enabled = ref(STATIONS.map(() => true))
const dryRun = ref(false)
const states = ref<State[]>(STATIONS.map(() => 'queued'))
const ran = ref(false)
const running = ref(false)
const pane = ref<'code' | 'run'>('code')

function toggle(index: number) {
  if (running.value) return
  enabled.value = enabled.value.map((on, i) => i === index ? !on : on)
  ran.value = false
  states.value = STATIONS.map(() => 'queued')
}

function toggleDryRun() {
  if (running.value) return
  dryRun.value = !dryRun.value
  ran.value = false
  states.value = STATIONS.map(() => 'queued')
}

function run() {
  clear()
  pane.value = 'run'
  running.value = true
  ran.value = true
  states.value = STATIONS.map(() => 'queued')
  let at = 300
  STATIONS.forEach((_, index) => {
    if (!enabled.value[index] || (index > 1 && !enabled.value[1] && !dryRun.value)) {
      later(at, () => { states.value[index] = 'skipped' })
      return
    }
    later(at, () => { states.value[index] = 'running' })
    at += 1100
    later(at, () => { states.value[index] = 'done' })
  })
  later(at + 100, () => { running.value = false })
}

function output(index: number) {
  const station = STATIONS[index]!
  if (states.value[index] === 'skipped') return enabled.value[index] ? 'Skipped: no pull request to work on' : 'Off in factory.ts'
  if (states.value[index] === 'running') return 'Working…'
  if (states.value[index] === 'done') return dryRun.value ? station.dry : station.done
  return enabled.value[index] ? `${PRESET_TOOLS[station.preset].length} tools` : 'Off in factory.ts'
}

const finished = computed(() => ran.value && !running.value)
const summary = computed(() => {
  if (dryRun.value) return 'Dry run: every write was checked and recorded, nothing reached GitHub.'
  if (!enabled.value[1]) return 'No fix station, so issue #92 was triaged and left for a person.'
  if (!enabled.value[2]) return '#134 is open without a review. Add the station back, or review it yourself.'
  return '#134 is reviewed and green, ready for you to merge.'
})

const line = (tokens: Token[]) => tokens
const head: Token[][] = [
  line([['import', 'kw'], [' { createGithubAgent } '], ['from', 'kw'], [' '], ['\'@github-tools/sdk\'', 'str']]),
  [],
  line([['const', 'kw'], [' station = (preset) =>']]),
  line([['  '], ['createGithubAgent', 'fn'], ['({']]),
  line([['    model', 'pr'], [': '], ['\'anthropic/claude-opus-5.5\'', 'str'], [',']]),
  line([['    preset', 'pr'], [',']]),
  line([['    requireApproval', 'pr'], [': '], ['false', 'kw'], [',']]),
  line([['    guardrails', 'pr'], [': { '], ['branches', 'pr'], [': ['], ['\'agent/*\'', 'str'], ['] },']])
]
const middle: Token[][] = [
  line([['  })']]),
  [],
  line([['export', 'kw'], [' '], ['const', 'kw'], [' factory = [']])
]
const tail: Token[][] = [
  line([[']']]),
  [],
  line([['for', 'kw'], [' ('], ['const', 'kw'], [' agent '], ['of', 'kw'], [' factory)']]),
  line([['  '], ['await', 'kw'], [' agent.'], ['generate', 'fn'], ['({ '], ['prompt', 'pr'], [': issue.url })']])
]

const hint = computed(() => {
  if (running.value) return 'Each station is one agent with one preset. The issue moves down the line.'
  if (finished.value) return 'Click a station line to take it out, or flip dryRun, then run it again.'
  return 'This file is the whole factory. Run it, or click a station line to change it first.'
})

defineExpose({ hint })
</script>

<template>
  <LandingSceneWindow
    app="editor"
    title="acme-factory — factory.ts"
    class="h-full"
  >
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-(--d-line) px-2">
      <button
        v-for="[id, label] in ([['code', 'factory.ts'], ['run', 'Run']] as const)"
        :key="id"
        type="button"
        class="h-7 rounded-md px-2.5 text-[12.5px] sm:pointer-events-none"
        :class="[pane === id ? 'bg-(--d-raised-strong) text-highlighted' : 'text-muted hover:text-highlighted', id === 'run' ? 'sm:hidden' : 'sm:bg-(--d-raised-strong) sm:text-highlighted']"
        @click="pane = id"
      >
        {{ label }}
      </button>
      <button
        type="button"
        class="relative ms-auto flex h-7 items-center gap-1.5 rounded-md bg-(--d-signal) px-3 text-[12.5px] font-medium text-(--d-signal-fg) transition-transform active:scale-[0.97] disabled:opacity-40"
        :disabled="running"
        @click="run"
      >
        <span
          v-if="!ran"
          class="scene-ping pointer-events-none absolute inset-0 rounded-md"
          aria-hidden="true"
        />
        <UIcon
          name="i-lucide-play"
          class="size-3.5"
        />
        Run
      </button>
    </div>

    <div class="grid min-h-0 flex-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div
        class="scene-scroll min-h-0 overflow-y-auto py-2.5 font-mono text-[12px]/5 sm:block sm:border-e sm:border-(--d-line)"
        :class="pane === 'code' ? 'block' : 'hidden'"
      >
        <p
          v-for="(tokens, index) in head"
          :key="`h${index}`"
          class="flex"
        >
          <span class="w-9 shrink-0 pe-3 text-end text-dimmed select-none">{{ index + 1 }}</span>
          <span class="truncate whitespace-pre text-toned"><span
            v-for="([text, kind], t) in tokens"
            :key="t"
            :class="kind ? `code-${kind}` : ''"
          >{{ text }}</span></span>
        </p>
        <button
          type="button"
          class="flex w-full text-start hover:bg-(--d-raised)"
          :disabled="running"
          @click="toggleDryRun"
        >
          <span class="w-9 shrink-0 pe-3 text-end text-dimmed select-none">{{ head.length + 1 }}</span>
          <span class="whitespace-pre text-toned">{{ '    ' }}<span class="code-pr">dryRun</span>: <span
            class="rounded-sm px-0.5"
            :class="dryRun ? 'bg-(--d-warn)/20 text-(--d-warn)' : 'code-kw'"
          >{{ dryRun }}</span>,</span>
          <span class="ms-auto pe-3 font-sans text-[12px] text-dimmed">click to flip</span>
        </button>
        <p
          v-for="(tokens, index) in middle"
          :key="`m${index}`"
          class="flex"
        >
          <span class="w-9 shrink-0 pe-3 text-end text-dimmed select-none">{{ head.length + 2 + index }}</span>
          <span class="whitespace-pre text-toned"><span
            v-for="([text, kind], t) in tokens"
            :key="t"
            :class="kind ? `code-${kind}` : ''"
          >{{ text }}</span></span>
        </p>
        <button
          v-for="(station, index) in STATIONS"
          :key="station.preset"
          type="button"
          class="flex w-full items-center text-start hover:bg-(--d-raised)"
          :disabled="running"
          :aria-pressed="enabled[index]"
          @click="toggle(index)"
        >
          <span class="w-9 shrink-0 pe-3 text-end text-dimmed select-none">{{ head.length + 2 + middle.length + index }}</span>
          <span
            class="whitespace-pre"
            :class="enabled[index] ? 'text-toned' : 'text-dimmed line-through decoration-(--d-line-strong)'"
          >{{ enabled[index] ? '  ' : '//' }}<span :class="enabled[index] ? 'code-fn' : ''">station</span>(<span :class="enabled[index] ? 'code-str' : ''">'{{ station.preset }}'</span>),</span>
          <span
            class="ms-auto me-3 size-2 shrink-0 rounded-full"
            :style="{ background: enabled[index] ? station.hue : 'var(--d-line-strong)' }"
          />
        </button>
        <p
          v-for="(tokens, index) in tail"
          :key="`t${index}`"
          class="flex"
        >
          <span class="w-9 shrink-0 pe-3 text-end text-dimmed select-none">{{ head.length + 2 + middle.length + STATIONS.length + index }}</span>
          <span class="whitespace-pre text-toned"><span
            v-for="([text, kind], t) in tokens"
            :key="t"
            :class="kind ? `code-${kind}` : ''"
          >{{ text }}</span></span>
        </p>
      </div>

      <div
        class="scene-scroll min-h-0 flex-col overflow-y-auto px-4 py-3 sm:flex"
        :class="pane === 'run' ? 'flex' : 'hidden'"
      >
        <p class="flex items-center gap-2 text-[12.5px] text-muted">
          <UIcon
            name="i-simple-icons-github"
            class="size-3.5 text-highlighted"
          />
          <span class="truncate"><span class="text-highlighted">acme/app#92</span> Reset links never expire</span>
        </p>
        <ol class="relative mt-3 flex flex-col gap-2">
          <span
            class="absolute top-3 bottom-3 left-[7px] w-px bg-(--d-line)"
            aria-hidden="true"
          />
          <li
            v-for="(station, index) in STATIONS"
            :key="station.preset"
            class="relative flex gap-3"
          >
            <span
              class="relative z-10 mt-1.5 flex size-[15px] shrink-0 items-center justify-center rounded-full border-2 bg-default"
              :style="{ borderColor: enabled[index] ? station.hue : 'var(--d-line-strong)' }"
            >
              <span
                v-if="states[index] === 'done' || states[index] === 'running'"
                class="size-1.5 rounded-full"
                :class="states[index] === 'running' ? 'animate-pulse' : ''"
                :style="{ background: station.hue }"
              />
            </span>
            <div
              class="min-w-0 flex-1 rounded-md border px-2.5 py-1.5"
              :class="states[index] === 'running' ? 'border-(--d-line-strong) bg-(--d-raised)' : 'border-(--d-line)'"
            >
              <p class="flex items-baseline gap-2 text-[13px]">
                <span :class="enabled[index] ? 'text-highlighted' : 'text-dimmed'">{{ station.label }}</span>
                <code class="truncate font-mono text-[12px] text-dimmed">{{ station.preset }}</code>
              </p>
              <p
                class="truncate text-[12.5px]"
                :class="states[index] === 'done' ? (dryRun ? 'text-(--d-warn)' : 'text-toned') : 'text-dimmed'"
              >
                {{ output(index) }}
              </p>
            </div>
          </li>
        </ol>
        <p
          v-if="finished"
          class="scene-row mt-3 rounded-md border border-(--d-line) bg-(--d-raised) px-3 py-2 text-[12.5px]/5 text-highlighted"
        >
          {{ summary }}
        </p>
      </div>
    </div>
  </LandingSceneWindow>
</template>
