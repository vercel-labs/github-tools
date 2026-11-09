<script setup lang="ts">
type Job = 'passed' | 'failed' | 'running'

const { later } = useSceneTimers()
const thread = ref<HTMLElement | null>(null)

const draft = ref('@github-agent why is CI red on main?')
const question = ref('')
const read = ref(false)
const answer = ref<'pending' | 'approved' | 'denied'>('pending')
const testJob = ref<Job>('failed')

function ask(text: string) {
  if (question.value) return
  question.value = text
  draft.value = ''
  later(1600, () => { read.value = true })
}

function decide(value: 'approved' | 'denied') {
  if (!read.value || answer.value !== 'pending') return
  answer.value = value
  if (value === 'approved') {
    later(500, () => { testJob.value = 'running' })
    later(3200, () => { testJob.value = 'passed' })
  }
}

const jobs = computed<[string, Job, string][]>(() => [
  ['build', 'passed', '48s'],
  ['lint', 'passed', '21s'],
  ['test (node 22)', testJob.value, testJob.value === 'failed' ? '30s' : testJob.value === 'running' ? 'attempt 2' : '1m 12s']
])

const JOB_ICON: Record<Job, string> = {
  passed: 'i-lucide-circle-check',
  failed: 'i-lucide-circle-x',
  running: 'i-lucide-loader-circle'
}

const followUp = computed(() => {
  if (answer.value === 'denied') return 'OK, I left the run as it is.'
  if (answer.value === 'approved') return testJob.value === 'passed' ? 'Passed on attempt 2. CI is green on main.' : 'Rerunning test (node 22)…'
  return ''
})

const hint = computed(() => {
  if (!question.value) return 'Send the message to ask why CI failed.'
  if (!read.value) return 'The agent reads the failed job and its log.'
  if (answer.value === 'pending') return 'Rerunning is a write, so it waits for you. Rerun it, or don\'t.'
  return answer.value === 'approved' ? 'The run page updates only after your OK.' : 'Denied: the run page stays as it was.'
})

useScrollToEnd(thread, () => [question, read, answer, followUp])

defineExpose({ hint })
</script>

<template>
  <div class="relative h-full">
    <LandingSceneWindow
      app="github"
      title="github.com/acme/app/actions/runs/9182"
      class="absolute top-0 left-0 hidden h-[19rem] w-[80%] sm:flex"
    >
      <div class="w-[42%] min-w-56 px-4 py-3.5">
        <p class="flex items-center gap-2 text-[15px] text-highlighted">
          <UIcon
            :name="JOB_ICON[testJob]"
            class="size-4 shrink-0"
            :class="[testJob === 'failed' ? 'text-(--d-fail)' : 'text-muted', testJob === 'running' ? 'animate-spin' : '']"
          />
          CI <span class="text-dimmed">#9182</span>
        </p>
        <p class="mt-1 truncate text-[12.5px] text-muted">
          main · Update footer links
        </p>
        <ul class="mt-3 flex flex-col gap-2 border-t border-(--d-line) pt-3">
          <li
            v-for="[name, state, time] in jobs"
            :key="name"
            class="flex items-center gap-2 text-[13px]"
          >
            <UIcon
              :name="JOB_ICON[state]"
              class="size-3.5 shrink-0"
              :class="[state === 'failed' ? 'text-(--d-fail)' : 'text-muted', state === 'running' ? 'animate-spin' : '']"
            />
            <span class="truncate text-highlighted">{{ name }}</span>
            <span class="ms-auto shrink-0 text-[12px] text-dimmed tabular-nums">{{ time }}</span>
          </li>
        </ul>
        <div class="mt-3.5 rounded-md border border-(--d-line) bg-(--d-raised) px-2.5 py-2 font-mono text-[12px]/5">
          <p class="text-toned">
            checkout.test.ts
          </p>
          <p class="truncate text-muted">
            <span :class="testJob === 'passed' ? 'text-muted' : 'text-(--d-fail)'">{{ testJob === 'passed' ? '✓' : '✕' }}</span> applies a discount code
          </p>
          <p class="truncate text-dimmed">
            {{ testJob === 'passed' ? 'Passed in 1.2s' : 'Timed out after 30s' }}
          </p>
        </div>
      </div>
    </LandingSceneWindow>

    <LandingSceneWindow
      app="slack"
      title="# ci"
      class="absolute inset-0 flex shadow-[0_24px_48px_-12px_rgb(0_0_0/0.35)] sm:inset-auto sm:right-0 sm:bottom-0 sm:h-[23rem] sm:w-[64%]"
    >
      <div
        ref="thread"
        class="scene-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <div class="flex min-h-full flex-col justify-end gap-3.5 px-3.5 py-3 text-[13px]/5">
          <div
            v-if="question"
            class="flex gap-2.5"
          >
            <LandingSceneAvatar
              name="you"
              shape="square"
            />
            <div class="min-w-0">
              <p class="text-[12.5px]">
                <span class="font-semibold text-highlighted">you</span> <span class="text-dimmed">9:41</span>
              </p>
              <p class="text-toned">
                {{ question }}
              </p>
            </div>
          </div>

          <div
            class="flex gap-2.5 transition-opacity duration-300"
            :class="read ? 'opacity-100' : 'opacity-0'"
          >
            <LandingSceneAvatar
              name="github-agent"
              bot
              shape="square"
            />
            <div class="min-w-0 flex-1">
              <p class="text-[12.5px]">
                <span class="font-semibold text-highlighted">github-agent</span>
                <span class="ms-1 rounded-sm bg-(--d-raised-strong) px-1 text-[12px] text-muted">APP</span>
                <span class="ms-1 text-dimmed">9:41</span>
              </p>
              <p class="text-toned">
                The checkout test timed out. The last commit only touches the footer, so it looks flaky.
              </p>

              <div
                v-if="answer === 'pending'"
                class="mt-2 rounded-md border border-(--d-line-strong) bg-default p-2.5"
              >
                <p class="text-highlighted">
                  Rerun the failed job?
                </p>
                <p class="mt-0.5 font-mono text-[12px] text-muted">
                  rerunWorkflowRun · run 9182
                </p>
                <div class="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    class="relative h-7 rounded-md bg-(--d-signal) px-3 text-[12.5px] font-medium text-(--d-signal-fg) transition-transform active:scale-[0.97]"
                    :disabled="!read"
                    @click="decide('approved')"
                  >
                    <span
                      class="scene-ping pointer-events-none absolute inset-0 rounded-md"
                      aria-hidden="true"
                    />
                    Rerun
                  </button>
                  <button
                    type="button"
                    class="h-7 rounded-md border border-(--d-line-strong) px-3 text-[12.5px] text-highlighted transition-transform active:scale-[0.97]"
                    :disabled="!read"
                    @click="decide('denied')"
                  >
                    Not now
                  </button>
                </div>
              </div>
              <p
                v-else
                class="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted"
              >
                <UIcon
                  :name="answer === 'approved' ? 'i-lucide-check' : 'i-lucide-x'"
                  class="size-3.5"
                />
                {{ answer === 'approved' ? 'You approved rerunWorkflowRun' : 'You denied rerunWorkflowRun' }}
              </p>
              <p
                v-if="followUp"
                class="mt-2 flex items-center gap-1.5 text-toned"
              >
                <UIcon
                  v-if="testJob === 'running'"
                  name="i-lucide-loader-circle"
                  class="size-3.5 shrink-0 animate-spin text-muted"
                />
                {{ followUp }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <LandingSceneComposer
        v-model="draft"
        placeholder="Message #ci"
        :disabled="!!question"
        @submit="ask"
      />
    </LandingSceneWindow>
  </div>
</template>
