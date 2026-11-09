<script setup lang="ts">
type CardState = 'idle' | 'working' | 'waiting' | 'done'

// Subagents and presets from the multi-agent guide; tools from PRESET_TOOLS in core/presets.ts.
const AGENTS = [
  {
    name: 'reviewer',
    preset: 'code-review',
    tools: [
      { name: 'getPullRequestContext' },
      { name: 'listPullRequestFiles' }
    ]
  },
  {
    name: 'triager',
    preset: 'issue-triage',
    tools: [
      { name: 'getIssueContext' },
      { name: 'addLabels', note: 'no approval' }
    ]
  },
  {
    name: 'releaser',
    preset: 'release-manager',
    tools: [
      { name: 'getLatestRelease' },
      { name: 'compareCommits' },
      { name: 'createRelease', note: 'asks' }
    ]
  }
]

const REQUESTS = [
  { text: 'review PR 12', result: 'PR 12: parseConfig throws on an empty file. Return the defaults instead.' },
  { text: 'label issue 40', result: 'Issue 40 is a bug, labeled bug.' },
  { text: 'draft v2.1 notes', result: 'Draft release v2.1.0 created from 9 merged pull requests.' }
]

const APPROVAL_CALL = 'createRelease({ tagName: \'v2.1.0\', draft: true, generateReleaseNotes: true })'

const asked = ref(0)
const routed = ref(0)
const answered = ref(0)
const cards = ref<CardState[]>(AGENTS.map(() => 'idle'))
const ticks = ref<number[]>(AGENTS.map(() => 0))
const target = ref(-1)
const inkOn = ref(false)
const inkWarn = ref(false)
const approval = ref<'hidden' | 'waiting' | 'approved'>('hidden')
const pressing = ref(false)
const focused = ref(-1)

function setCard(i: number, s: CardState) {
  cards.value = cards.value.map((c, j) => (j === i ? s : c))
}

function tick(i: number, n: number) {
  ticks.value = ticks.value.map((t, j) => (j === i ? n : t))
}

function send(i: number) {
  target.value = i
  inkWarn.value = false
  inkOn.value = true
}

const TOOL_MS = 520

function request(i: number, base: number) {
  const steps = [
    { at: base, run: () => { asked.value = i + 1 } },
    { at: base + 500, run: () => {
      routed.value = i + 1
      send(i)
    } },
    { at: base + 1050, run: () => {
      setCard(i, 'working')
      tick(i, 1)
    } }
  ]
  const tools = AGENTS[i]!.tools.length
  const reads = i === 2 ? tools - 1 : tools
  for (let n = 2; n <= reads; n++) {
    steps.push({ at: base + 1050 + (n - 1) * TOOL_MS, run: () => tick(i, n) })
  }
  return { steps, end: base + 1050 + reads * TOOL_MS }
}

function finish(i: number, at: number) {
  return [
    { at, run: () => {
      setCard(i, 'done')
      inkOn.value = false
    } },
    { at: at + 550, run: () => { answered.value = i + 1 } }
  ]
}

const r0 = request(0, 200)
const r1 = request(1, r0.end + 1300)
const r2 = request(2, r1.end + 1300)
const ASK = r2.end
const APPROVE = ASK + 2600

const { root, finished, still, replay } = useFigure({
  steps: [
    ...r0.steps,
    ...finish(0, r0.end),
    ...r1.steps,
    ...finish(1, r1.end),
    ...r2.steps,
    { at: ASK, run: () => {
      tick(2, 3)
      setCard(2, 'waiting')
      inkWarn.value = true
      inkOn.value = false
    } },
    { at: ASK + 550, run: () => { approval.value = 'waiting' } },
    { at: APPROVE - 180, run: () => { pressing.value = true } },
    { at: APPROVE, run: () => {
      pressing.value = false
      approval.value = 'approved'
      send(2)
    } },
    { at: APPROVE + 600, run: () => setCard(2, 'working') },
    ...finish(2, APPROVE + 600 + TOOL_MS)
  ],
  reset: () => {
    asked.value = 0
    routed.value = 0
    answered.value = 0
    cards.value = AGENTS.map(() => 'idle')
    ticks.value = AGENTS.map(() => 0)
    target.value = -1
    inkOn.value = false
    inkWarn.value = false
    approval.value = 'hidden'
    pressing.value = false
    focused.value = -1
  },
  settle: () => {
    asked.value = 3
    routed.value = 3
    answered.value = 3
    cards.value = AGENTS.map(() => 'done')
    ticks.value = AGENTS.map(a => a.tools.length)
    approval.value = 'approved'
  }
})

function focus(i: number) {
  if (focused.value === i) {
    focused.value = -1
    inkOn.value = false
    return
  }
  focused.value = i
  target.value = i
  inkWarn.value = false
  inkOn.value = true
}

function toolDone(i: number, j: number) {
  return cards.value[i] === 'done' || j < ticks.value[i]! - 1
}

function toolRunning(i: number, j: number) {
  return cards.value[i] === 'working' && j === ticks.value[i]! - 1
}

function toolWaiting(i: number, j: number) {
  return cards.value[i] === 'waiting' && j === ticks.value[i]! - 1
}

const ink = computed(() => (inkWarn.value ? 'bg-(--d-warn)' : 'bg-(--d-signal)'))
const STAGE = 170

function delay(order: number) {
  const out = inkOn.value ? order : 2 - order
  return { transitionDelay: `${out * STAGE}ms` }
}

function words(name: string) {
  return name.split(/(?=[A-Z])/)
}

const DROP_LEFT = ['left-[16.667%]', 'left-1/2', 'left-[83.333%]']
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The manager has no GitHub tools and sends each request to the subagent whose preset fits, and a subagent's approval request comes back to the manager's session."
    :finished
    :still
    @replay="replay"
  >
    <div class="p-3 text-[13px]/6 sm:p-6">
      <section class="rounded-lg border border-(--d-line-strong) bg-default">
        <header class="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-(--d-line) px-3 py-2 sm:px-4">
          <UIcon
            name="i-lucide-network"
            class="size-3.5 text-toned"
          />
          <span class="font-mono text-[12.5px] text-highlighted">manager</span>
          <span class="rounded-full border border-(--d-line-strong) px-2 text-[11px]/5 text-muted">no GitHub tools</span>
          <span class="ml-auto text-[11.5px] text-dimmed">session</span>
        </header>

        <ol class="flex flex-col gap-2 px-3 py-3 sm:px-4">
          <li
            v-for="(req, i) in REQUESTS"
            :key="req.text"
            class="d-step"
            :data-on="asked > i"
          >
            <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span class="w-16 shrink-0 text-[12px] text-dimmed">You</span>
              <button
                type="button"
                :aria-pressed="focused === i"
                :disabled="!finished"
                class="-mx-1.5 rounded-md px-1.5 text-start text-highlighted transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) disabled:cursor-default enabled:hover:bg-(--d-raised-strong)"
                :class="focused === i ? 'bg-(--d-raised-strong) ring-1 ring-(--d-line-strong)' : ''"
                @click="focus(i)"
              >
                {{ req.text }}
              </button>
              <span
                class="d-step inline-flex items-center gap-1 font-mono text-[11.5px] text-muted"
                :data-on="routed > i"
              >
                <UIcon
                  name="i-lucide-arrow-right"
                  class="size-3"
                />
                {{ AGENTS[i]!.name }}({ message })
              </span>
            </div>

            <div
              v-if="i === 2"
              class="d-step ms-0 mt-2 sm:ms-[4.625rem]"
              :data-on="approval !== 'hidden'"
            >
              <div
                class="flex flex-col gap-2.5 rounded-lg border px-3 py-2.5 transition-colors duration-300"
                :class="approval === 'approved' ? 'border-(--d-line)' : 'border-(--d-warn)/50'"
              >
                <div class="min-w-0">
                  <p class="text-[12px] text-muted">
                    From <span class="font-mono text-toned">releaser</span>
                  </p>
                  <code class="block font-mono text-[11.5px]/5 [overflow-wrap:anywhere] text-highlighted">{{ APPROVAL_CALL }}</code>
                  <p class="mt-1 inline-flex items-center gap-1.5 text-[12px] text-muted">
                    <span
                      class="size-1.5 rounded-full"
                      :class="approval === 'approved' ? 'bg-(--d-signal)' : 'animate-pulse bg-(--d-warn)'"
                    />
                    {{ approval === 'approved' ? 'Approved by you' : 'Waiting for you' }}
                  </p>
                </div>
                <div class="flex gap-2 text-[12px]">
                  <span
                    class="rounded-md border border-(--d-line) px-2.5 py-1 text-muted transition-opacity duration-300"
                    :class="approval === 'approved' ? 'opacity-40' : ''"
                  >Deny</span>
                  <span
                    class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-all duration-150"
                    :class="[
                      approval === 'approved' ? 'bg-(--d-signal) text-(--d-signal-fg)' : 'bg-inverted text-inverted',
                      pressing ? 'scale-95' : ''
                    ]"
                  >
                    <UIcon
                      v-if="approval === 'approved'"
                      name="i-lucide-check"
                      class="size-3.5"
                    />
                    {{ approval === 'approved' ? 'Approved' : 'Approve' }}
                  </span>
                </div>
              </div>
            </div>

            <p
              class="d-step mt-1 flex gap-2.5"
              :data-on="answered > i"
            >
              <span class="w-16 shrink-0 font-mono text-[11.5px]/6 text-dimmed">{{ AGENTS[i]!.name }}</span>
              <span class="min-w-0 text-muted">{{ req.result }}</span>
            </p>
          </li>
        </ol>
      </section>

      <div
        aria-hidden="true"
        class="relative h-10"
      >
        <span class="absolute top-0 left-1/2 h-1/2 w-px bg-(--d-line-strong)" />
        <span class="absolute top-1/2 right-[16.667%] left-[16.667%] h-px bg-(--d-line-strong)" />
        <span
          v-for="pos in DROP_LEFT"
          :key="pos"
          class="absolute top-1/2 h-1/2 w-px bg-(--d-line-strong)"
          :class="pos"
        />

        <span
          class="absolute top-0 left-1/2 z-1 h-1/2 w-px origin-top transition-transform duration-200 ease-linear"
          :class="[ink, inkOn ? 'scale-y-100' : 'scale-y-0']"
          :style="delay(0)"
        />
        <span
          class="absolute top-1/2 left-[16.667%] z-1 h-px w-[33.333%] origin-right transition-transform duration-200 ease-linear"
          :class="[ink, inkOn && target === 0 ? 'scale-x-100' : 'scale-x-0']"
          :style="delay(1)"
        />
        <span
          class="absolute top-1/2 left-1/2 z-1 h-px w-[33.333%] origin-left transition-transform duration-200 ease-linear"
          :class="[ink, inkOn && target === 2 ? 'scale-x-100' : 'scale-x-0']"
          :style="delay(1)"
        />
        <span
          v-for="(pos, k) in DROP_LEFT"
          :key="`ink-${pos}`"
          class="absolute top-1/2 z-1 h-1/2 w-px origin-top transition-transform duration-200 ease-linear"
          :class="[pos, ink, inkOn && target === k ? 'scale-y-100' : 'scale-y-0']"
          :style="delay(2)"
        />
      </div>

      <ul class="grid grid-cols-3">
        <li
          v-for="(agent, i) in AGENTS"
          :key="agent.name"
          class="min-w-0 px-0.5 sm:px-1.5"
        >
          <div
            class="h-full rounded-lg border bg-default p-1.5 transition-[border-color,opacity] duration-300 sm:p-3"
            :class="[
              cards[i] === 'waiting' ? 'border-(--d-warn)/50' : cards[i] === 'working' || focused === i ? 'border-(--d-signal)' : 'border-(--d-line)',
              focused >= 0 && focused !== i ? 'opacity-45' : ''
            ]"
          >
            <p class="flex items-center gap-1.5">
              <UIcon
                :name="cards[i] === 'done' ? 'i-lucide-check' : 'i-lucide-bot'"
                class="size-3.5 shrink-0 text-toned"
              />
              <span class="truncate font-mono text-[12px] text-highlighted">{{ agent.name }}</span>
            </p>
            <span
              class="mt-1.5 inline-block max-w-full rounded-md border px-1.5 font-mono text-[10.5px]/5 transition-colors duration-300 sm:rounded-full sm:px-2 sm:text-[11px]/5"
              :class="cards[i] === 'idle' ? 'border-(--d-line-strong) text-muted' : 'border-(--d-signal) bg-(--d-signal) text-(--d-signal-fg)'"
            >{{ agent.preset }}</span>

            <ul class="mt-2 flex flex-col gap-1">
              <li
                v-for="(tool, j) in agent.tools"
                :key="tool.name"
                class="d-step flex items-start gap-1"
                :data-on="ticks[i]! > j"
              >
                <UIcon
                  :name="toolDone(i, j) ? 'i-lucide-check' : toolWaiting(i, j) ? 'i-lucide-hand' : 'i-lucide-loader'"
                  class="mt-0.5 size-3 shrink-0"
                  :class="[toolRunning(i, j) ? 'animate-spin text-muted' : toolWaiting(i, j) ? 'text-(--d-warn)' : 'text-muted']"
                />
                <span class="min-w-0">
                  <code class="block font-mono text-[10.5px]/4 [overflow-wrap:anywhere] text-toned sm:text-[11px]/4"><template
                    v-for="part in words(tool.name)"
                    :key="part"
                  >{{ part }}<wbr></template></code>
                  <span
                    v-if="tool.note"
                    class="text-[10.5px]/4 text-dimmed"
                  >{{ tool.note }}</span>
                </span>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </div>
  </DocsFigure>
</template>
