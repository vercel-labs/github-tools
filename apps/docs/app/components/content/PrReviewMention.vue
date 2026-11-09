<script setup lang="ts">
type Entry
  = | { id: string, kind: 'comment', author: 'ana' | 'bot', body: string, reaction?: boolean }
    | { id: string, kind: 'event', text: string, run: string }

const RUN = 'wrun_01JF3K8Q2M'

const drafts = [
  '@my-review-agent review this PR',
  'is the retry logic safe?'
]

const entries = ref<Entry[]>([])
const turn = ref(0)
const busy = ref(false)
let timers: ReturnType<typeof setTimeout>[] = []

const draft = computed(() => drafts[turn.value] ?? '')
const done = computed(() => turn.value >= drafts.length && !busy.value)

function later(ms: number, run: () => void) {
  timers.push(setTimeout(run, ms))
}

function post() {
  if (busy.value || !draft.value) return
  busy.value = true
  const index = turn.value
  const comment: Entry = { id: `ana-${index}`, kind: 'comment', author: 'ana', body: draft.value }
  entries.value.push(comment)
  turn.value++

  if (index === 0) {
    later(700, () => {
      comment.reaction = true
      entries.value = [...entries.value]
    })
    later(1500, () => entries.value.push({ id: 'start', kind: 'event', text: 'started reviewWorkflow', run: RUN }))
    later(3000, () => {
      entries.value.push({
        id: 'review',
        kind: 'comment',
        author: 'bot',
        body: 'Reviewed 4 files. withRetry retries 5xx and network errors with backoff, which looks right. One risk: putObject is not idempotent, so a timeout after the server stored the file uploads it twice. Consider an idempotency key.'
      })
      busy.value = false
    })
  }
  else {
    later(1200, () => entries.value.push({ id: 'resume', kind: 'event', text: 'resumed the same run for turn 2', run: RUN }))
    later(2700, () => {
      entries.value.push({
        id: 'answer',
        kind: 'comment',
        author: 'bot',
        body: 'Mostly. Backoff stops after 3 attempts, but the retry wraps putObject, which is not idempotent: a timeout after the write still uploads twice. Pass an idempotency key and retry only on 5xx and network errors.'
      })
      busy.value = false
    })
  }
}

function reset() {
  timers.forEach(clearTimeout)
  timers = []
  entries.value = []
  turn.value = 0
  busy.value = false
}

onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <DocsFigure
    still
    caption="Try it: post the comment. The mention starts one workflow run that reviews the pull request, and your reply resumes that same run instead of starting over.">
    <template #controls>
      <p class="text-[13px] text-muted">
        {{ done ? 'That is the whole loop.' : turn === 0 ? 'Post the comment to mention the bot.' : 'Reply in the same thread.' }}
      </p>
      <button
        type="button"
        class="ms-auto h-7 rounded-md px-2.5 text-[13px] text-muted transition-colors hover:bg-(--d-raised) hover:text-highlighted disabled:opacity-40"
        :disabled="!entries.length"
        @click="reset"
      >
        Start over
      </button>
    </template>

    <div class="flex h-[30rem] flex-col">
      <header class="border-b border-(--d-line) px-4 py-3.5 sm:px-5">
        <p class="text-[15px]/6 text-highlighted">
          Retry failed uploads <span class="text-dimmed">#128</span>
        </p>
        <p class="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
          <span class="inline-flex items-center gap-1 rounded-full bg-(--d-raised-strong) px-2 py-0.5 text-[12px] text-highlighted">
            <UIcon
              name="i-lucide-git-pull-request"
              class="size-3.5"
            />
            Open
          </span>
          <span><span class="text-highlighted">ana</span> wants to merge 3 commits into <code class="font-mono text-[12px] text-toned">main</code></span>
        </p>
      </header>

      <div class="relative min-h-0 flex-1 overflow-hidden">
        <div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-linear-to-b from-(--ui-bg) to-transparent" />
        <TransitionGroup
          tag="ol"
          name="thread"
          class="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-4 pt-4 pb-3 sm:px-5"
        >
          <li
            v-if="!entries.length"
            key="empty"
            class="py-6 text-center text-[13px] text-dimmed"
          >
            No comments yet.
          </li>
          <li
            v-for="entry in entries"
            :key="entry.id"
          >
            <div
              v-if="entry.kind === 'comment'"
              class="flex gap-3"
            >
              <LandingSceneAvatar
                :name="entry.author === 'bot' ? 'my-review-agent' : 'ana'"
                :bot="entry.author === 'bot'"
              />
              <div class="min-w-0 flex-1 overflow-hidden rounded-md border border-(--d-line)">
                <p class="flex items-center gap-1.5 border-b border-(--d-line) bg-(--d-raised) px-3 py-1.5 text-[12.5px] text-muted">
                  <span class="font-medium text-highlighted">{{ entry.author === 'bot' ? 'my-review-agent' : 'ana' }}</span>
                  <span
                    v-if="entry.author === 'bot'"
                    class="rounded-full border border-(--d-line-strong) px-1.5 text-[12px]/4"
                  >bot</span>
                  <span>commented just now</span>
                </p>
                <p class="px-3 py-2.5 text-[13.5px]/5.5 text-highlighted">
                  {{ entry.body }}
                </p>
                <p
                  v-if="entry.author === 'ana'"
                  class="px-3 pb-2.5"
                >
                  <span
                    class="inline-flex h-6 items-center gap-1 rounded-full border border-(--d-line) px-2 text-[12px] text-toned transition-[opacity,transform] duration-300"
                    :class="entry.reaction ? 'scale-100 opacity-100' : 'scale-90 opacity-0'"
                  >👀 <span class="tabular-nums">1</span></span>
                </p>
              </div>
            </div>
            <p
              v-else
              class="flex flex-wrap items-center gap-x-2 gap-y-1 ps-10 text-[12.5px] text-muted"
            >
              <span class="size-1.5 rounded-full bg-(--ui-text-muted)" />
              <span class="font-medium text-highlighted">my-review-agent</span>
              {{ entry.text }}
              <code class="font-mono text-[12px] text-toned">{{ entry.run }}</code>
            </p>
          </li>
        </TransitionGroup>
      </div>

      <form
        class="border-t border-(--d-line) p-3 sm:px-5"
        @submit.prevent="post"
      >
        <div class="flex items-center gap-2 rounded-md border border-(--d-line-strong) bg-(--d-raised) py-1.5 ps-3 pe-1.5">
          <span
            class="min-w-0 flex-1 truncate text-[13.5px]"
            :class="draft ? 'text-highlighted' : 'text-dimmed'"
          >{{ draft || 'Conversation complete' }}</span>
          <button
            type="submit"
            class="h-7 shrink-0 rounded-md bg-(--d-signal) px-3 text-[13px] font-medium text-(--d-signal-fg) transition-[opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-40"
            :disabled="busy || !draft"
          >
            Comment
          </button>
        </div>
      </form>
    </div>
  </DocsFigure>
</template>

<style scoped>
.thread-enter-active,
.thread-move {
  transition: opacity 320ms var(--d-ease), transform 320ms var(--d-ease);
}

.thread-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.thread-leave-active {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .thread-enter-active,
  .thread-move {
    transition: opacity 150ms ease;
  }

  .thread-enter-from {
    transform: none;
  }
}
</style>
