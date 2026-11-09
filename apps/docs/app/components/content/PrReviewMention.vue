<script setup lang="ts">
import type { Ref } from 'vue'

type Turn = 1 | 2

const RUN_ID = 'wrun_01JF3K8Q2M'

// Handlers and tools from examples/pr-review-agent and the code-review preset.
const TURNS = {
  1: {
    label: 'Mention',
    chat: 'onNewMention',
    chatNote: 'eyes reaction, thread.subscribe()',
    run: 'start(reviewWorkflow)',
    runNote: 'new run, runId saved on the thread',
    tools: ['getPullRequestContext', 'listPullRequestFiles', 'addPullRequestComment']
  },
  2: {
    label: 'Reply',
    chat: 'onSubscribedMessage',
    chatNote: 'reads runId from thread.state',
    run: 'resumeHook(runId)',
    runNote: 'same run, next turn',
    tools: ['getFileContent', 'addPullRequestComment']
  }
} as const

const REVIEW = 'Checked src/upload.ts and its test. withRetry retries every failed request, including 4xx responses, so an invalid upload is sent three times. Retry only on 5xx and network errors.'
const ANSWER = 'Mostly. Backoff stops after 3 attempts, but putObject is not idempotent: a timeout after the server stored the file uploads it twice. Send an idempotency key with each attempt.'

const NODES = [
  { icon: 'i-lucide-webhook', name: 'Webhook route' },
  { icon: 'i-lucide-message-square', name: 'Chat SDK' },
  { icon: 'i-lucide-workflow', name: 'Workflow' },
  { icon: 'i-lucide-bot', name: 'Step runAgentTurn' }
]

const shown = ref(0)
const reacted = ref(false)
const turn = ref<Turn>(1)
const rail = ref(0)
const tools = ref(0)
const runSeen = ref(false)
const typedReview = ref(0)
const typedAnswer = ref(0)
const picked = ref(false)

const current = computed(() => TURNS[turn.value])

function typing(text: string, start: number, target: Ref<number>) {
  const CHUNK = 4
  const out = []
  for (let i = CHUNK; i < text.length + CHUNK; i += CHUNK) {
    const n = Math.min(i, text.length)
    out.push({ at: start + (i / CHUNK) * 32, run: () => { target.value = n } })
  }
  return out
}

const REVIEW_AT = 3900
const ANSWER_AT = 10400
const reviewEnd = REVIEW_AT + Math.ceil(REVIEW.length / 4) * 32
const answerEnd = ANSWER_AT + Math.ceil(ANSWER.length / 4) * 32

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 200, run: () => { shown.value = 1 } },
    { at: 800, run: () => { rail.value = 1 } },
    { at: 1400, run: () => { rail.value = 2 } },
    { at: 1800, run: () => { reacted.value = true } },
    { at: 2200, run: () => { rail.value = 3 } },
    { at: 2500, run: () => { runSeen.value = true } },
    { at: 2900, run: () => { rail.value = 4 } },
    { at: 3100, run: () => { tools.value = 1 } },
    { at: 3500, run: () => { tools.value = 2 } },
    { at: 3800, run: () => {
      tools.value = 3
      shown.value = 2
    } },
    ...typing(REVIEW, REVIEW_AT, typedReview),
    { at: reviewEnd + 200, run: () => { rail.value = 5 } },
    { at: reviewEnd + 1200, run: () => {
      shown.value = 3
      turn.value = 2
      rail.value = 0
      tools.value = 0
    } },
    { at: reviewEnd + 1700, run: () => { rail.value = 1 } },
    { at: reviewEnd + 2300, run: () => { rail.value = 2 } },
    { at: reviewEnd + 2900, run: () => { rail.value = 3 } },
    { at: reviewEnd + 3600, run: () => { rail.value = 4 } },
    { at: reviewEnd + 3800, run: () => { tools.value = 1 } },
    { at: ANSWER_AT - 100, run: () => {
      tools.value = 2
      shown.value = 4
    } },
    ...typing(ANSWER, ANSWER_AT, typedAnswer),
    { at: answerEnd + 200, run: () => { rail.value = 5 } }
  ],
  reset: () => {
    shown.value = 0
    reacted.value = false
    turn.value = 1
    rail.value = 0
    tools.value = 0
    runSeen.value = false
    typedReview.value = 0
    typedAnswer.value = 0
    picked.value = false
  },
  settle: () => {
    shown.value = 4
    reacted.value = true
    turn.value = 2
    rail.value = 5
    tools.value = TURNS[2].tools.length
    runSeen.value = true
    typedReview.value = REVIEW.length
    typedAnswer.value = ANSWER.length
  }
})

function pick(next: Turn) {
  picked.value = true
  turn.value = next
  rail.value = 5
  tools.value = TURNS[next].tools.length
}

function nodeState(i: number) {
  if (rail.value > i + 1) return 'done'
  if (rail.value === i + 1) return 'active'
  return 'idle'
}

function dimmed(t: Turn) {
  return picked.value && turn.value !== t
}

const sameRun = computed(() => turn.value === 2 && rail.value >= 3)
</script>

<template>
  <DocsFigure
    ref="root"
    caption="A mention starts a workflow run that reviews the pull request, and a reply in the same thread resumes that run for the next turn."
    :finished
    :still
    @replay="replay"
  >
    <div class="grid text-[13px]/6 md:grid-cols-[minmax(0,1fr)_17rem]">
      <section class="min-w-0 p-4 sm:p-5">
        <header class="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-(--d-line) pb-3">
          <span class="inline-flex items-center gap-1 rounded-full border border-(--d-line-strong) px-2 py-0.5 text-[11.5px] text-toned">
            <UIcon
              name="i-lucide-git-pull-request"
              class="size-3"
            />
            Open
          </span>
          <span class="text-highlighted">Retry failed uploads</span>
          <span class="text-dimmed">#128</span>
        </header>

        <ol class="relative mt-4 flex flex-col gap-4 before:absolute before:inset-y-2 before:left-3 before:w-px before:bg-(--d-line)">
          <li
            class="d-step relative flex gap-3 transition-opacity duration-300"
            :class="dimmed(1) ? 'opacity-40' : ''"
            :data-on="shown > 0"
          >
            <span class="relative grid size-6 shrink-0 place-items-center rounded-full border border-(--d-line-strong) bg-(--d-raised-strong) text-[11px] text-toned">A</span>
            <div class="min-w-0 flex-1 rounded-lg border border-(--d-line) bg-default">
              <p class="border-b border-(--d-line) px-3 py-1.5 text-[12px] text-muted">
                <span class="text-highlighted">ana</span> commented
              </p>
              <p class="px-3 py-2 text-highlighted">
                <span class="font-semibold">@my-review-agent</span> review this PR
              </p>
              <div class="px-3 pb-2">
                <span
                  class="d-step inline-flex items-center gap-1 rounded-full border border-(--d-line-strong) px-2 py-px text-[11.5px] text-toned"
                  :data-on="reacted"
                >
                  <UIcon
                    name="i-lucide-eye"
                    class="size-3"
                  />
                  eyes 1
                </span>
              </div>
            </div>
          </li>

          <li
            class="d-step relative flex gap-3 transition-opacity duration-300"
            :class="dimmed(1) ? 'opacity-40' : ''"
            :data-on="shown > 1"
          >
            <span class="relative grid size-6 shrink-0 place-items-center rounded-full bg-(--d-signal) text-(--d-signal-fg)">
              <UIcon
                name="i-lucide-bot"
                class="size-3.5"
              />
            </span>
            <div class="min-w-0 flex-1 rounded-lg border border-(--d-line) bg-default">
              <p class="border-b border-(--d-line) px-3 py-1.5 text-[12px] text-muted">
                <span class="text-highlighted">my-review-agent</span> commented
              </p>
              <p class="px-3 py-2 text-default">
                {{ REVIEW.slice(0, typedReview) }}<span
                  v-if="typedReview > 0 && typedReview < REVIEW.length"
                  class="d-caret"
                />
              </p>
            </div>
          </li>

          <li
            class="d-step relative flex gap-3 transition-opacity duration-300"
            :class="dimmed(2) ? 'opacity-40' : ''"
            :data-on="shown > 2"
          >
            <span class="relative grid size-6 shrink-0 place-items-center rounded-full border border-(--d-line-strong) bg-(--d-raised-strong) text-[11px] text-toned">A</span>
            <div class="min-w-0 flex-1 rounded-lg border border-(--d-line) bg-default">
              <p class="border-b border-(--d-line) px-3 py-1.5 text-[12px] text-muted">
                <span class="text-highlighted">ana</span> commented
              </p>
              <p class="px-3 py-2 text-highlighted">
                is the retry logic safe?
              </p>
            </div>
          </li>

          <li
            class="d-step relative flex gap-3 transition-opacity duration-300"
            :class="dimmed(2) ? 'opacity-40' : ''"
            :data-on="shown > 3"
          >
            <span class="relative grid size-6 shrink-0 place-items-center rounded-full bg-(--d-signal) text-(--d-signal-fg)">
              <UIcon
                name="i-lucide-bot"
                class="size-3.5"
              />
            </span>
            <div class="min-w-0 flex-1 rounded-lg border border-(--d-line) bg-default">
              <p class="border-b border-(--d-line) px-3 py-1.5 text-[12px] text-muted">
                <span class="text-highlighted">my-review-agent</span> commented
              </p>
              <p class="px-3 py-2 text-default">
                {{ ANSWER.slice(0, typedAnswer) }}<span
                  v-if="typedAnswer > 0 && typedAnswer < ANSWER.length"
                  class="d-caret"
                />
              </p>
            </div>
          </li>
        </ol>
      </section>

      <aside class="flex min-w-0 flex-col border-t border-(--d-line) p-4 sm:p-5 md:border-t-0 md:border-l">
        <div
          role="group"
          aria-label="Show the path for one turn"
          class="inline-flex w-fit rounded-lg border border-(--d-line) bg-(--d-raised-strong) p-0.5 text-[12px]"
        >
          <button
            v-for="t in ([1, 2] as const)"
            :key="t"
            type="button"
            :aria-pressed="turn === t"
            :disabled="!finished"
            class="rounded-md px-2.5 py-1 transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) disabled:cursor-default"
            :class="turn === t ? 'bg-default text-highlighted shadow-xs ring-1 ring-(--d-line-strong)' : 'text-muted enabled:hover:text-highlighted'"
            @click="pick(t)"
          >
            Turn {{ t }}: {{ TURNS[t].label }}
          </button>
        </div>

        <ol class="mt-4 flex flex-col">
          <template
            v-for="(node, i) in NODES"
            :key="node.name"
          >
            <li
              class="flex gap-3 transition-opacity duration-300"
              :class="nodeState(i) === 'idle' ? 'opacity-45' : ''"
            >
              <span
                class="grid size-7 shrink-0 place-items-center rounded-md border transition-colors duration-300"
                :class="{
                  'border-(--d-line) text-dimmed': nodeState(i) === 'idle',
                  'border-(--d-signal) text-highlighted': nodeState(i) === 'active',
                  'border-(--d-signal) bg-(--d-signal) text-(--d-signal-fg)': nodeState(i) === 'done'
                }"
              >
                <UIcon
                  :name="nodeState(i) === 'done' ? 'i-lucide-check' : node.icon"
                  class="size-3.5"
                />
              </span>
              <div class="min-w-0 flex-1 pb-1">
                <p class="text-[12px] text-dimmed">
                  {{ node.name }}
                </p>

                <template v-if="i === 0">
                  <code class="font-mono text-[12px] text-highlighted">POST /webhooks/github</code>
                </template>

                <template v-else-if="i === 1">
                  <code class="font-mono text-[12px] text-highlighted">{{ current.chat }}</code>
                  <p class="text-[11.5px]/5 text-muted">
                    {{ current.chatNote }}
                  </p>
                </template>

                <template v-else-if="i === 2">
                  <code class="font-mono text-[12px] [overflow-wrap:anywhere] text-highlighted">{{ current.run }}</code>
                  <p
                    class="d-step mt-1 flex flex-wrap items-center gap-1.5"
                    :data-on="runSeen"
                  >
                    <span
                      class="rounded border px-1.5 font-mono text-[11px]/5 transition-colors duration-300"
                      :class="sameRun ? 'border-(--d-signal) bg-(--d-signal) text-(--d-signal-fg)' : 'border-(--d-line-strong) text-toned'"
                    >{{ RUN_ID }}</span>
                    <span class="text-[11.5px]/5 text-muted">{{ current.runNote }}</span>
                  </p>
                </template>

                <template v-else>
                  <span class="font-mono text-[12px] text-highlighted">turn {{ turn }}</span>
                  <span class="ml-1.5 text-[11.5px] text-muted">preset code-review</span>
                  <ul class="mt-1.5 flex flex-col gap-1">
                    <li
                      v-for="(tool, j) in current.tools"
                      :key="`${turn}-${tool}`"
                      class="d-step flex items-center gap-1.5"
                      :data-on="tools > j"
                    >
                      <UIcon
                        :name="tools > j + 1 || rail > 4 ? 'i-lucide-check' : 'i-lucide-loader'"
                        class="size-3 shrink-0 text-muted"
                        :class="tools === j + 1 && rail === 4 ? 'animate-spin' : ''"
                      />
                      <code class="min-w-0 truncate font-mono text-[11.5px] text-toned">{{ tool }}</code>
                    </li>
                  </ul>
                </template>
              </div>
            </li>

            <li
              v-if="i < NODES.length - 1"
              aria-hidden="true"
              class="relative ml-3.5 h-5 w-px overflow-visible bg-(--d-line)"
            >
              <span
                class="absolute inset-0 origin-top bg-(--d-signal) transition-transform duration-300 ease-(--d-ease)"
                :class="rail > i + 1 ? 'scale-y-100' : 'scale-y-0'"
              />
              <span
                v-if="rail === i + 2"
                class="d-pulse absolute -left-[2.5px] top-0 size-1.5 rounded-full bg-(--d-signal)"
              />
            </li>
          </template>
        </ol>
      </aside>
    </div>
  </DocsFigure>
</template>

<style scoped>
.d-caret {
  display: inline-block;
  width: 1px;
  height: 1em;
  margin-left: 1px;
  vertical-align: -0.15em;
  background: currentColor;
  animation: d-blink 900ms steps(2, start) infinite;
}

.d-pulse {
  animation: d-travel 520ms var(--d-ease) both;
}

@keyframes d-blink {
  to {
    visibility: hidden;
  }
}

@keyframes d-travel {
  from {
    transform: translateY(0);
    opacity: 1;
  }

  to {
    transform: translateY(20px);
    opacity: 0;
  }
}
</style>
