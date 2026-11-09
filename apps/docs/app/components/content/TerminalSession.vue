<script setup lang="ts">
type Choice = 'y' | 'n'

// Prompts match agent.ts on the "Your first agent" page: `\nYou: `, `Allow ${toolName} ${JSON.stringify(input)}? (y/n) ` and `\nAgent: ${result.text}`.
const COMMAND = 'pnpm agent your-name/your-repo'
const REQUEST = 'Add the bug label to issue 12'
const APPROVAL = 'Allow addLabels {"owner":"your-name","repo":"your-repo","issueNumber":12,"labels":["bug"]}? (y/n) '
const ANSWERS: Record<Choice, string> = {
  y: 'Added the bug label to issue 12.',
  n: 'I didn\'t add the label, since you declined. Issue 12 is unchanged.'
}

const choice = ref<Choice>('y')
const command = ref(0)
const request = ref(0)
const prompted = ref(false)
const asked = ref(false)
const typedAnswer = ref(false)
const answered = ref(false)
const idle = ref(false)
// 0 nothing yet, 1 read runs, 2 read done, 3 write returned an approval request, 4 response sent, 5 answer.
const inside = ref(0)

const CMD_MS = 38
const REQ_MS = 48
const REQ_AT = 2100
const ENTER_AT = REQ_AT + REQUEST.length * REQ_MS + 350

const steps = [
  ...Array.from(COMMAND, (_, i) => ({ at: 300 + i * CMD_MS, run: () => { command.value = i + 1 } })),
  { at: 1700, run: () => { prompted.value = true } },
  ...Array.from(REQUEST, (_, i) => ({ at: REQ_AT + i * REQ_MS, run: () => { request.value = i + 1 } })),
  { at: ENTER_AT, run: () => { inside.value = 1 } },
  { at: ENTER_AT + 900, run: () => { inside.value = 2 } },
  { at: ENTER_AT + 1500, run: () => {
    inside.value = 3
    asked.value = true
  } },
  { at: ENTER_AT + 3000, run: () => { typedAnswer.value = true } },
  { at: ENTER_AT + 3400, run: () => { inside.value = 4 } },
  { at: ENTER_AT + 4600, run: () => {
    inside.value = 5
    answered.value = true
  } },
  { at: ENTER_AT + 5000, run: () => { idle.value = true } }
]

const { root, finished, still, replay } = useFigure({
  steps,
  reset: () => {
    command.value = 0
    request.value = 0
    prompted.value = false
    asked.value = false
    typedAnswer.value = false
    answered.value = false
    idle.value = false
    inside.value = 0
  },
  settle: () => {
    command.value = COMMAND.length
    request.value = REQUEST.length
    prompted.value = true
    asked.value = true
    typedAnswer.value = true
    answered.value = true
    idle.value = true
    inside.value = 5
  }
})

function answer(c: Choice) {
  choice.value = c
  replay()
}

const caret = computed(() => {
  if (!prompted.value) return 'command'
  if (!asked.value) return 'request'
  if (!typedAnswer.value) return 'approval'
  if (idle.value) return 'next'
  return undefined
})

const approved = computed(() => choice.value === 'y')

const ROWS = computed(() => [
  {
    on: inside.value > 0,
    label: 'generate()',
    call: 'getIssueContext({ issueNumber: 12 })',
    note: inside.value > 1 ? 'Read, ran straight away' : 'Read, running',
    state: inside.value > 1 ? 'done' : 'busy'
  },
  {
    on: inside.value > 2,
    label: 'generate()',
    call: 'addLabels({ issueNumber: 12, labels: [\'bug\'] })',
    note: inside.value > 3 ? (approved.value ? 'Write, approved' : 'Write, denied') : 'Write, returned a tool-approval-request',
    state: inside.value > 3 ? 'done' : 'wait'
  },
  {
    on: inside.value > 3,
    label: 'generate()',
    call: `tool-approval-response, approved: ${approved.value}`,
    note: approved.value ? 'POST /repos/your-name/your-repo/issues/12/labels, 200' : 'addLabels doesn\'t run, the model reads the denial',
    state: 'done'
  },
  {
    on: inside.value > 4,
    label: 'result.text',
    call: 'The agent answers without a tool call',
    note: '',
    state: 'done'
  }
])
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The read runs without a prompt, the write stops at a y/n question, and the agent answers once you reply."
    :finished
    :still
    @replay="replay"
  >
    <div class="p-3 sm:p-5">
      <div class="overflow-hidden rounded-lg border border-(--d-line-strong) bg-default">
        <div class="flex items-center gap-3 border-b border-(--d-line) px-3 py-2">
          <span class="flex gap-1.5">
            <span class="size-2.5 rounded-full border border-(--d-line-strong) bg-(--d-raised-strong)" />
            <span class="size-2.5 rounded-full border border-(--d-line-strong) bg-(--d-raised-strong)" />
            <span class="size-2.5 rounded-full border border-(--d-line-strong) bg-(--d-raised-strong)" />
          </span>
          <span class="flex-1 text-center font-mono text-[11.5px] text-dimmed">triage-agent</span>
          <span class="w-12" />
        </div>

        <div
          class="px-3 py-3 font-mono text-[12px]/5 whitespace-pre-wrap text-default sm:px-4 sm:text-[12.5px]/[1.35rem]"
          role="img"
          :aria-label="`Terminal: ${COMMAND}, You: ${REQUEST}, ${APPROVAL}${choice}, Agent: ${ANSWERS[choice]}`"
        >
          <p><span class="text-dimmed">$ </span><span class="text-highlighted">{{ COMMAND.slice(0, command) }}</span><span
            v-if="caret === 'command'"
            class="caret"
          /></p>

          <div
            class="d-step"
            :data-on="prompted"
          >
            <p>&nbsp;</p>
            <p>You: <span class="text-highlighted">{{ REQUEST.slice(0, request) }}</span><span
              v-if="caret === 'request'"
              class="caret"
            /></p>
          </div>

          <p
            class="d-step relative [overflow-wrap:anywhere]"
            :data-on="asked"
          >
            <span
              class="absolute top-1 -left-2 h-[calc(100%-0.5rem)] w-0.5 rounded-full transition-colors duration-300 sm:-left-2.5"
              :class="typedAnswer ? 'bg-transparent' : 'bg-(--d-warn)'"
            />{{ APPROVAL }}<span
              v-if="typedAnswer"
              class="text-highlighted"
            >{{ choice }}</span><span
              v-if="caret === 'approval'"
              class="caret"
            />
          </p>

          <div
            class="d-step"
            :data-on="answered"
          >
            <p>&nbsp;</p>
            <p class="[overflow-wrap:anywhere]">Agent: {{ ANSWERS[choice] }}</p>
          </div>

          <div
            class="d-step"
            :data-on="idle"
          >
            <p>&nbsp;</p>
            <p>You: <span
              v-if="caret === 'next'"
              class="caret"
            /></p>
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p class="text-[12px] text-dimmed">
          Inside agent.ts
        </p>
        <div
          class="flex items-center gap-1 transition-opacity duration-300"
          :class="finished ? 'opacity-100' : 'pointer-events-none opacity-0'"
        >
          <span class="me-1 text-[12px] text-dimmed">Answer</span>
          <button
            v-for="c in (['y', 'n'] as const)"
            :key="c"
            type="button"
            :tabindex="finished ? 0 : -1"
            :aria-pressed="choice === c"
            :aria-label="`Replay, answering ${c}`"
            class="rounded-md px-2.5 py-0.5 font-mono text-[12px] ring-1 transition-[color,background-color,box-shadow,transform] duration-150 ring-inset focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) active:scale-[0.97]"
            :class="choice === c ? 'bg-(--d-raised-strong) text-highlighted ring-(--d-line-strong)' : 'text-muted ring-transparent hover:text-highlighted'"
            @click="answer(c)"
          >
            {{ c }}
          </button>
        </div>
      </div>

      <ol class="mt-2 flex flex-col gap-2">
        <li
          v-for="(row, i) in ROWS"
          :key="i"
          class="d-step grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 text-[12.5px]/5 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center"
          :data-on="row.on"
        >
          <code class="font-mono text-[11.5px] text-dimmed">{{ row.label }}</code>
          <code class="min-w-0 font-mono text-[12px] [overflow-wrap:anywhere] text-highlighted">{{ row.call }}</code>
          <span
            v-if="row.note"
            class="col-start-2 inline-flex items-center gap-1.5 text-[12px] sm:col-start-auto sm:justify-self-end"
          >
            <span
              class="size-1.5 shrink-0 rounded-full transition-colors duration-300"
              :class="{
                'bg-(--d-signal)': row.state === 'done',
                'animate-pulse bg-(--d-line-strong)': row.state === 'busy',
                'animate-pulse bg-(--d-warn)': row.state === 'wait'
              }"
            />
            <span :class="row.state === 'wait' ? 'text-toned' : 'text-muted'">{{ row.note }}</span>
          </span>
        </li>
      </ol>
    </div>
  </DocsFigure>
</template>

<style scoped>
.caret {
  display: inline-block;
  width: 0.6em;
  height: 1.15em;
  vertical-align: text-bottom;
  background: var(--d-signal);
  animation: caret-blink 1s steps(1) infinite;
}

@keyframes caret-blink {
  50% {
    opacity: 0;
  }
}
</style>
