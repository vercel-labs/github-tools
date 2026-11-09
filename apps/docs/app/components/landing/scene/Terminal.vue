<script setup lang="ts">
type Answer = {
  question: string
  keywords: string[]
  calls: { tool: string, args: string, result: string }[]
  rows?: [string, string, string][]
  summary: string
  write?: { tool: string, label: string, done: string }
}

const ANSWERS: Answer[] = [
  {
    question: 'which PRs are waiting on my review?',
    keywords: ['review', 'pr', 'pull'],
    calls: [
      { tool: 'searchIssues', args: 'is:pr is:open review-requested:@me', result: '3 results' },
      { tool: 'getPullRequestContext', args: '#128', result: '4 files, CI green' }
    ],
    rows: [['#128', 'Retry failed uploads', '2 days'], ['#131', 'Stream tool results', '5 hours'], ['#133', 'Bump zod to 4.1', '1 day']],
    summary: 'Start with #128: it is the oldest and touches the upload path.'
  },
  {
    question: 'what changed since v2.0.0?',
    keywords: ['change', 'release', 'since', 'version'],
    calls: [
      { tool: 'getLatestRelease', args: 'acme/app', result: 'v2.0.0' },
      { tool: 'compareCommits', args: 'v2.0.0...main', result: '14 commits' }
    ],
    rows: [['feat', 'Auto-approval reasons', '#119'], ['feat', 'Security alert tools', '#124'], ['fix', 'Retry on 502', '#126']],
    summary: '2 features and 2 fixes, enough for a minor release.'
  },
  {
    question: 'any open security alerts?',
    keywords: ['security', 'alert', 'vulnerab', 'secret'],
    calls: [
      { tool: 'listDependabotAlerts', args: 'state:open', result: '1 alert' },
      { tool: 'listSecretScanningAlerts', args: 'state:open', result: 'none' }
    ],
    rows: [['high', 'undici < 6.21.1', 'package.json']],
    summary: 'One high alert: bump undici to 6.21.1. No leaked secrets.'
  },
  {
    question: 'label #57 as a duplicate of #40',
    keywords: ['label', 'duplicate', 'triage', '#57'],
    calls: [
      { tool: 'getIssueContext', args: '#57', result: '413 on uploads over 2 GB' }
    ],
    summary: 'Same 413 as #40, which tracks the 2 GB limit.',
    write: { tool: 'addLabels', label: 'Add the duplicate label to acme/app#57', done: '#57 now has the duplicate label on GitHub. Closing it would be another write, so ask if you want that.' }
  }
]

const OPTIONS = [{ value: 'y', label: 'Yes' }, { value: 'n', label: 'No' }] as const

type Turn = { question: string, answer?: Answer, steps: number, decision?: 'y' | 'n' }

const { later } = useSceneTimers()
const output = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)

const turns = ref<Turn[]>([])
const prompt = ref(ANSWERS[0]!.question)
const running = ref(false)
const choice = ref(0)

const pending = computed(() => {
  const turn = turns.value.at(-1)
  return turn?.answer?.write && turn.steps > turn.answer.calls.length && !turn.decision ? turn : undefined
})

function match(question: string) {
  const text = question.toLowerCase()
  return ANSWERS.find(answer => answer.question === text) ?? ANSWERS.find(answer => answer.keywords.some(word => text.includes(word)))
}

function ask(question: string) {
  if (running.value || pending.value) return
  const answer = match(question)
  const turn = reactive<Turn>({ question, answer, steps: 0 })
  turns.value.push(turn)
  prompt.value = ''
  if (!answer) return
  running.value = true
  let at = 0
  for (let step = 1; step <= answer.calls.length + 1; step++) {
    at += step === 1 ? 500 : 800
    later(at, () => { turn.steps = step })
  }
  later(at, () => {
    running.value = false
    const next = ANSWERS.find(entry => !turns.value.some(done => done.answer?.question === entry.question))
    if (!answer.write) prompt.value = next?.question ?? ''
  })
}

function decide(decision: 'y' | 'n') {
  if (!pending.value) return
  pending.value.decision = decision
  choice.value = 0
  const next = ANSWERS.find(entry => !turns.value.some(done => done.answer?.question === entry.question))
  prompt.value = next?.question ?? ''
  nextTick(() => input.value?.focus({ preventScroll: true }))
}

function submit() {
  if (pending.value) {
    decide(OPTIONS[choice.value]!.value)
    return
  }
  if (prompt.value.trim()) ask(prompt.value.trim())
}

function move(step: number) {
  if (pending.value) choice.value = (choice.value + step + OPTIONS.length) % OPTIONS.length
}

const hint = computed(() => {
  if (pending.value) return 'Labeling is a write, so the agent asks first. Pick Yes or No.'
  if (!turns.value.length) return 'Press enter to ask, or type your own question.'
  return 'Ask the next question, or pick one below.'
})

useScrollToEnd(output, () => turns)

defineExpose({ hint })
</script>

<template>
  <LandingSceneWindow
    app="terminal"
    title="github-agent — ~/acme/app"
    class="h-full"
  >
    <div class="relative min-h-0 flex-1 font-mono text-[12.5px]/5">
      <div
        ref="output"
        class="scene-scroll absolute inset-0 overflow-y-auto"
        @click="input?.focus({ preventScroll: true })"
      >
        <div class="flex flex-col gap-4 px-4 pt-3.5 pb-3">
          <p class="text-dimmed">
            github-agent · preset repo-explorer + issue-triage · acme/app
          </p>
          <div
            v-for="(turn, order) in turns"
            :key="order"
            class="flex flex-col gap-1"
          >
            <p class="text-highlighted">
              <span class="me-2 text-dimmed">›</span>{{ turn.question }}
            </p>
            <p
              v-if="!turn.answer"
              class="font-sans text-[13px]/5 text-muted"
            >
              This demo knows four questions. Try one of the suggestions below.
            </p>
            <template v-else>
              <p
                v-for="(call, index) in turn.answer.calls"
                v-show="turn.steps > index"
                :key="call.tool"
                class="truncate text-muted"
              >
                <span class="me-2 text-dimmed">●</span><span class="text-toned">{{ call.tool }}</span> {{ call.args }} <span class="text-dimmed">→ {{ call.result }}</span>
              </p>
              <div
                v-show="turn.steps > turn.answer.calls.length"
                class="mt-1 flex flex-col gap-1"
              >
                <p
                  v-for="row in turn.answer.rows"
                  :key="row[0] + row[1]"
                  class="grid grid-cols-[3.5rem_1fr_auto] gap-2 text-toned"
                >
                  <span class="text-highlighted">{{ row[0] }}</span>
                  <span class="truncate">{{ row[1] }}</span>
                  <span class="text-dimmed">{{ row[2] }}</span>
                </p>
                <p class="font-sans text-[13px]/5 text-highlighted">
                  {{ turn.answer.summary }}
                </p>
                <div
                  v-if="turn.answer.write"
                  class="mt-2 rounded-md border border-(--d-line-strong) px-3 py-2.5"
                >
                  <p class="text-highlighted">
                    {{ turn.answer.write.tool }}
                  </p>
                  <p class="font-sans text-[13px]/5 text-muted">
                    {{ turn.answer.write.label }}
                  </p>
                  <ul
                    v-if="!turn.decision"
                    class="mt-2 flex flex-col"
                    role="listbox"
                    aria-label="Allow this write?"
                  >
                    <li
                      v-for="(option, index) in OPTIONS"
                      :key="option.value"
                      role="option"
                      :aria-selected="choice === index"
                      class="flex h-6 cursor-pointer items-center gap-2"
                      :class="choice === index ? 'text-highlighted' : 'text-muted'"
                      @mouseenter="choice = index"
                      @click="decide(option.value)"
                    >
                      <span class="w-3 text-highlighted">{{ choice === index ? '❯' : '' }}</span>
                      {{ index + 1 }}. {{ option.label }}
                    </li>
                  </ul>
                  <p
                    v-else
                    class="mt-2 text-muted"
                  >
                    {{ turn.decision === 'y' ? `✓ ${turn.answer.write.tool} ran` : `✕ ${turn.answer.write.tool} denied` }}
                  </p>
                </div>
                <p
                  v-if="turn.answer.write && turn.decision"
                  class="mt-1.5 font-sans text-[13px]/5 text-highlighted"
                >
                  {{ turn.decision === 'y' ? turn.answer.write.done : 'OK, I left #57 as it is. Nothing was written to GitHub.' }}
                </p>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <form
      class="shrink-0 border-t border-(--d-line) px-4 py-3"
      @submit.prevent="submit"
    >
      <label class="flex h-6 items-center gap-2 font-mono text-[12.5px]">
        <span class="text-dimmed">›</span>
        <input
          ref="input"
          v-model="prompt"
          type="text"
          :placeholder="pending ? '↑ ↓ to choose, enter to confirm' : 'Ask about acme/app'"
          :disabled="running"
          aria-label="Ask the agent"
          class="min-w-0 flex-1 bg-transparent text-highlighted caret-(--ui-text-highlighted) outline-none placeholder:text-dimmed"
          @keydown.up.prevent="move(-1)"
          @keydown.down.prevent="move(1)"
        >
        <kbd
          v-if="(prompt.trim() || pending) && !running"
          class="relative shrink-0 rounded-sm border border-(--d-line-strong) px-1.5 text-[12px]/4.5 text-muted"
        >
          <span
            class="scene-ping pointer-events-none absolute inset-0 rounded-sm"
            aria-hidden="true"
          />
          enter
        </kbd>
      </label>
      <div
        v-if="!pending"
        class="mt-2.5 hidden flex-wrap gap-1.5 sm:flex"
      >
        <button
          v-for="answer in ANSWERS"
          :key="answer.question"
          type="button"
          class="h-7 rounded-md border border-(--d-line-strong) px-2.5 text-[12.5px] text-toned transition-colors duration-150 hover:bg-(--d-raised-strong) hover:text-highlighted disabled:opacity-40"
          :disabled="running"
          @click="ask(answer.question)"
        >
          {{ answer.question }}
        </button>
      </div>
    </form>
  </LandingSceneWindow>
</template>
