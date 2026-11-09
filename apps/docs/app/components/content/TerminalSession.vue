<script setup lang="ts">
type Choice = 'y' | 'n'
type State = 'running' | 'ok' | 'waiting' | 'denied'

// Prompts match agent.ts on the "Your first agent" page: `\nYou: `, `Allow ${toolName} ${JSON.stringify(input)}? (y/n) ` and `\nAgent: ${result.text}`.
const COMMAND = 'pnpm agent your-name/your-repo'
const REQUEST = 'Add the bug label to issue 12'
const APPROVAL = 'Allow addLabels {"owner":"your-name","repo":"your-repo","issueNumber":12,"labels":["bug"]}? (y/n) '
const ANSWERS: Record<Choice, string> = {
  y: 'Added the bug label to issue 12.',
  n: 'I didn\'t add the label, since you declined. Issue 12 is unchanged.'
}
const CHOICES = [{ value: 'y', label: 'y' }, { value: 'n', label: 'n' }] as const

const choice = ref<Choice>('y')
const command = ref(0)
const request = ref(0)
const prompted = ref(false)
const asked = ref(false)
const replied = ref(false)
const answered = ref(false)
const idle = ref(false)
// 0 nothing yet, 1 read runs, 2 read done, 3 write returned an approval request, 4 response sent, 5 answer.
const inside = ref(0)

const B = FIGURE_PACE.beat
const C = FIGURE_PACE.perChar
const [typeCommand, prompt, typeRequest, enter, readDone, ask, reply, respond, answer, next] = timeline([
  COMMAND.length * C + B,
  600,
  REQUEST.length * C + 400,
  B,
  B,
  Math.max(FIGURE_PACE.hold, readFor('Allow addLabels issue 12 labels bug yes or no')),
  B,
  B,
  B,
  0
])

const { root, finished, still, replay } = useFigure({
  steps: [
    ...Array.from(COMMAND, (_, i) => ({ at: typeCommand! + i * C, run: () => { command.value = i + 1 } })),
    { at: prompt!, run: () => { prompted.value = true } },
    ...Array.from(REQUEST, (_, i) => ({ at: typeRequest! + i * C, run: () => { request.value = i + 1 } })),
    { at: enter!, run: () => { inside.value = 1 } },
    { at: readDone!, run: () => { inside.value = 2 } },
    { at: ask!, run: () => {
      inside.value = 3
      asked.value = true
    } },
    { at: reply!, run: () => { replied.value = true } },
    { at: respond!, run: () => { inside.value = 4 } },
    { at: answer!, run: () => {
      inside.value = 5
      answered.value = true
    } },
    { at: next!, run: () => { idle.value = true } }
  ],
  reset: () => {
    command.value = 0
    request.value = 0
    prompted.value = false
    asked.value = false
    replied.value = false
    answered.value = false
    idle.value = false
    inside.value = 0
  },
  settle: () => {
    command.value = COMMAND.length
    request.value = REQUEST.length
    prompted.value = true
    asked.value = true
    replied.value = true
    answered.value = true
    idle.value = true
    inside.value = 5
  }
})

watch(choice, () => {
  if (!still.value) replay()
})

const caret = computed(() => {
  if (!prompted.value) return 'command'
  if (!asked.value) return 'request'
  if (!replied.value) return 'approval'
  if (idle.value) return 'next'
  return undefined
})

const approved = computed(() => choice.value === 'y')

const DOT: Record<State, string> = {
  running: 'bg-(--d-line-strong)',
  ok: 'bg-(--d-ok)',
  waiting: 'bg-(--d-warn)',
  denied: 'bg-(--d-fail)'
}

const ROWS = computed(() => [
  {
    on: inside.value > 0,
    label: 'generate()',
    call: 'getIssueContext({ issueNumber: 12 })',
    state: (inside.value > 1 ? 'ok' : 'running') as State,
    notes: [{ text: 'read, runs without asking', on: true }]
  },
  {
    on: inside.value > 2,
    label: 'generate()',
    call: 'addLabels({ issueNumber: 12, labels: [\'bug\'] })',
    state: (inside.value === 3 ? 'waiting' : approved.value ? 'ok' : 'denied') as State,
    notes: [
      { text: 'write, returns a tool-approval-request', on: inside.value <= 3 },
      { text: 'write, approved', on: inside.value > 3 && approved.value },
      { text: 'write, denied', on: inside.value > 3 && !approved.value }
    ]
  },
  {
    on: inside.value > 3,
    label: 'generate()',
    call: `tool-approval-response, approved: ${approved.value}`,
    state: (approved.value ? 'ok' : 'denied') as State,
    notes: [
      { text: 'POST /repos/your-name/your-repo/issues/12/labels 200', on: approved.value },
      { text: 'addLabels doesn\'t run, the model reads the denial', on: !approved.value }
    ]
  },
  {
    on: inside.value > 4,
    label: 'result.text',
    call: 'the agent answers without a tool call',
    state: 'ok' as State,
    notes: []
  }
])
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Writes stop at a y/n question. The read runs without a prompt, the write waits for your answer, and the agent replies once you give it."
    :finished
    :still
    @replay="replay"
  >
    <template #controls>
      <FigureTabs
        v-model="choice"
        label="Answer"
        :options="CHOICES"
        show-label
        mono
      />
    </template>

    <div class="px-3 py-8 sm:px-8 sm:py-10">
      <div class="mx-auto max-w-[40rem]">
        <div class="overflow-hidden rounded-lg border border-(--d-line-strong) bg-(--d-raised)">
          <div class="relative flex h-9 items-center border-b border-(--d-line) px-3">
            <span
              class="flex gap-1.5"
              aria-hidden="true"
            >
              <span class="size-2.5 rounded-full bg-(--d-fail)" />
              <span class="size-2.5 rounded-full bg-(--d-warn)" />
              <span class="size-2.5 rounded-full bg-(--d-ok)" />
            </span>
            <span class="absolute inset-x-20 text-center font-mono text-[12px] text-muted">triage-agent</span>
          </div>

          <div
            class="px-3 py-3 font-mono text-[12.5px]/5 whitespace-pre-wrap text-muted sm:px-4"
            role="img"
            :aria-label="`Terminal: ${COMMAND}, You: ${REQUEST}, ${APPROVAL}${choice}, Agent: ${ANSWERS[choice]}`"
          >
            <p class="[overflow-wrap:anywhere]">
              <span class="text-dimmed">$ </span><span class="text-highlighted">{{ COMMAND.slice(0, command) }}</span><span class="relative"><span
                v-if="caret === 'command'"
                class="caret"
              /></span><span class="invisible">{{ COMMAND.slice(command) }}</span>
            </p>

            <div
              class="d-step"
              :data-on="prompted"
            >
              <p>&nbsp;</p>
              <p class="[overflow-wrap:anywhere]">You: <span class="text-highlighted">{{ REQUEST.slice(0, request) }}</span><span class="relative"><span
                  v-if="caret === 'request'"
                  class="caret"
                /></span><span class="invisible">{{ REQUEST.slice(request) }}</span>
              </p>
            </div>

            <p
              class="d-step -mx-1.5 rounded-[4px] px-1.5 [overflow-wrap:anywhere] transition-colors duration-500"
              :class="asked && !replied ? 'bg-(--d-warn-bg) text-(--d-warn)' : ''"
              :data-on="asked"
            >
              {{ APPROVAL }}<span
                class="text-highlighted"
                :class="replied ? '' : 'invisible'"
              >{{ choice }}</span><span class="relative"><span
                v-if="caret === 'approval'"
                class="caret"
              /></span>
            </p>

            <div
              class="d-step"
              :data-on="answered"
            >
              <p>&nbsp;</p>
              <p class="d-stack [overflow-wrap:anywhere]">
                <span
                  v-for="c in (['y', 'n'] as const)"
                  :key="c"
                  :class="choice === c ? '' : 'invisible'"
                >Agent: <span class="text-highlighted">{{ ANSWERS[c] }}</span></span>
              </p>
            </div>

            <div
              class="d-step"
              :data-on="idle"
            >
              <p>&nbsp;</p>
              <p>You: <span class="relative"><span
                  v-if="caret === 'next'"
                  class="caret"
                /></span>
              </p>
            </div>
          </div>
        </div>

        <p class="mt-5 mb-2 text-[12px] text-muted">
          Inside agent.ts
        </p>
        <ol class="overflow-hidden rounded-lg border border-(--d-line-strong) bg-(--d-raised) p-1.5">
          <li
            v-for="(row, i) in ROWS"
            :key="i"
            class="grid grid-cols-[0.5rem_minmax(0,1fr)] items-start gap-x-3 rounded-md px-2.5 py-1.5 transition-colors duration-500"
            :class="row.on && row.state === 'waiting' ? 'bg-(--d-warn-bg)' : row.on && row.state === 'denied' ? 'bg-(--d-fail-bg)' : ''"
          >
            <span
              class="mt-1.5 size-2 rounded-full transition-colors duration-500"
              :class="row.on ? DOT[row.state] : 'bg-(--d-line-strong)'"
            />
            <span class="d-stack min-w-0">
              <span
                class="flex flex-col justify-center gap-2 py-1 transition-opacity duration-300"
                :class="row.on ? 'opacity-0' : ''"
                aria-hidden="true"
              >
                <span
                  class="h-1.5 rounded-full bg-(--d-line-strong)"
                  :style="{ width: `${[70, 85, 60, 45][i]}%` }"
                />
                <span
                  class="h-1.5 rounded-full bg-(--d-line-strong)"
                  :style="{ width: `${[40, 55, 75, 0][i]}%` }"
                />
              </span>
              <span
                class="flex min-w-0 flex-col transition-opacity duration-300"
                :class="row.on ? '' : 'opacity-0'"
              >
                <code class="flex flex-wrap gap-x-2 font-mono text-[12.5px]/5">
                  <span class="text-dimmed">{{ row.label }}</span>
                  <span class="min-w-0 [overflow-wrap:anywhere] text-highlighted">{{ row.call }}</span>
                </code>
                <span
                  v-if="row.notes.length"
                  class="d-stack text-[12.5px]/5"
                >
                  <span
                    v-for="n in row.notes"
                    :key="n.text"
                    class="[overflow-wrap:anywhere] transition-opacity duration-300"
                    :class="[n.on ? '' : 'opacity-0', row.state === 'waiting' ? 'text-(--d-warn)' : row.state === 'denied' ? 'text-(--d-fail)' : 'text-muted']"
                    :aria-hidden="!n.on"
                  >{{ n.text }}</span>
                </span>
              </span>
            </span>
          </li>
        </ol>
      </div>
    </div>
  </DocsFigure>
</template>

<style scoped>
.caret {
  position: absolute;
  left: 1px;
  bottom: -2px;
  width: 0.6em;
  height: 1.15em;
  background: var(--d-signal);
  animation: caret-blink 1s steps(1) infinite;
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .caret {
    animation: none;
  }
}
</style>
