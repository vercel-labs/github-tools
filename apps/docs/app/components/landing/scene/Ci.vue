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
    later(3400, () => { testJob.value = 'passed' })
  }
}

const jobs = computed<[string, Job, string][]>(() => [
  ['build', 'passed', '48s'],
  ['lint', 'passed', '21s'],
  ['test (node 22)', testJob.value, testJob.value === 'failed' ? '30s' : testJob.value === 'running' ? 'attempt 2' : '1m 12s']
])

const JOB: Record<Job, { icon: string, class: string }> = {
  passed: { icon: 'i-lucide-circle-check', class: 'text-(--d-ok)' },
  failed: { icon: 'i-lucide-circle-x', class: 'text-(--d-fail)' },
  running: { icon: 'i-lucide-loader-circle', class: 'animate-spin text-(--d-warn)' }
}

const followUp = computed(() => {
  if (answer.value === 'denied') return 'OK, I left the run as it is.'
  if (answer.value === 'approved') return testJob.value === 'passed' ? 'Passed on attempt 2. CI is green on main.' : 'Rerunning test (node 22)…'
  return ''
})

useScrollToEnd(thread, () => [question, read, answer, followUp])

const hint = computed(() => {
  if (!question.value) return 'Send the message to ask why CI failed.'
  if (!read.value) return 'The agent reads the failed job and its log.'
  if (answer.value === 'pending') return 'Rerunning is a write, so it waits for you. Rerun it, or don\'t.'
  return answer.value === 'approved' ? 'Watch the run page: the job reruns only after your OK.' : 'Denied: the run page stays as it was.'
})

defineExpose({ hint })
</script>

<template>
  <div class="relative h-full">
    <LandingSceneWindow
      app="github"
      title="github.com/acme/app/actions/runs/9182"
      class="absolute inset-y-0 left-0 hidden w-[78%] sm:flex"
    >
      <div class="w-[44%] min-w-56 px-4 py-3.5">
        <p class="flex items-center gap-2 text-[15px] text-highlighted">
          <UIcon
            :name="JOB[testJob].icon"
            class="size-4 shrink-0"
            :class="JOB[testJob].class"
          />
          CI <span class="text-dimmed">#9182</span>
        </p>
        <p class="mt-1 truncate text-[12.5px] text-muted">
          <code class="font-mono text-[12px]">main</code> · Update footer links
        </p>
        <ul class="mt-3 flex flex-col gap-2 border-t border-(--d-line) pt-3">
          <li
            v-for="[name, state, time] in jobs"
            :key="name"
            class="flex items-center gap-2 text-[13px]"
          >
            <UIcon
              :name="JOB[state].icon"
              class="size-3.5 shrink-0"
              :class="JOB[state].class"
            />
            <span class="truncate text-highlighted">{{ name }}</span>
            <span class="ms-auto shrink-0 text-[12px] text-dimmed tabular-nums">{{ time }}</span>
          </li>
        </ul>
        <div
          class="mt-3.5 rounded-md border px-2.5 py-2 font-mono text-[12px]/5"
          :class="testJob === 'passed' ? 'border-(--d-line) bg-(--d-raised)' : 'border-(--d-fail)/30 bg-(--d-fail-bg)/40'"
        >
          <p class="text-toned">
            checkout.test.ts
          </p>
          <p class="truncate text-muted">
            <span :class="testJob === 'passed' ? 'text-(--d-ok)' : 'text-(--d-fail)'">{{ testJob === 'passed' ? '✓' : '✕' }}</span> applies a discount code
          </p>
          <p class="truncate text-dimmed">
            {{ testJob === 'passed' ? 'Passed in 1.2s' : 'Timed out after 30s' }}
          </p>
        </div>
        <p
          class="mt-3.5 inline-flex h-7 items-center gap-1.5 rounded-md border border-(--d-line-strong) px-2.5 text-[12.5px]"
          :class="testJob === 'running' ? 'text-dimmed' : 'text-toned'"
        >
          <UIcon
            name="i-lucide-rotate-ccw"
            class="size-3.5"
          />
          Re-run failed jobs
        </p>
      </div>
    </LandingSceneWindow>

    <LandingSceneWindow
      app="slack"
      title="acme · # ci"
      class="absolute inset-0 flex shadow-[0_24px_48px_-12px_rgb(0_0_0/0.4)] sm:inset-auto sm:right-0 sm:bottom-0 sm:h-[24rem] sm:w-[66%]"
    >
      <div class="flex min-h-0 flex-1">
        <nav class="hidden w-28 shrink-0 flex-col gap-0.5 border-e border-(--d-line) bg-(--d-raised) px-2 py-3 text-[12.5px] text-muted md:flex">
          <p class="mb-1.5 px-1.5 text-[12px] font-semibold text-highlighted">
            acme
          </p>
          <span
            v-for="channel in ['general', 'ci', 'releases', 'support']"
            :key="channel"
            class="truncate rounded-sm px-1.5 py-0.5"
            :class="channel === 'ci' ? 'bg-(--d-raised-strong) text-highlighted' : ''"
          ># {{ channel }}</span>
        </nav>

        <div class="flex min-w-0 flex-1 flex-col">
          <div
            ref="thread"
            class="scene-scroll min-h-0 flex-1 overflow-y-auto"
          >
            <div class="flex min-h-full flex-col justify-end gap-3.5 px-3.5 py-3 text-[13px]/5">
              <div class="flex gap-2.5">
                <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--d-raised-strong) text-highlighted">
                  <UIcon
                    name="i-simple-icons-github"
                    class="size-4"
                  />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-[12.5px]">
                    <span class="font-semibold text-highlighted">GitHub</span>
                    <span class="ms-1 rounded-sm bg-(--d-raised-strong) px-1 text-[12px] text-muted">APP</span>
                    <span class="ms-1 text-dimmed">9:38</span>
                  </p>
                  <p class="mt-1 border-s-[3px] border-(--d-fail) ps-2.5 text-toned">
                    <span class="text-highlighted">CI failed on main</span><br>
                    <span class="text-[12.5px] text-muted">acme/app · run #9182 · test (node 22)</span>
                  </p>
                </div>
              </div>

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
                v-if="read"
                class="flex gap-2.5"
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
                        class="relative h-7 rounded-md bg-(--d-ok) px-3 text-[12.5px] font-medium text-white transition-transform active:scale-[0.97]"
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
                      class="size-3.5 shrink-0 animate-spin text-(--d-warn)"
                    />
                    {{ followUp }}
                  </p>
                </div>
              </div>

              <div
                v-if="testJob === 'passed'"
                class="flex gap-2.5"
              >
                <span class="flex size-7 shrink-0 items-center justify-center rounded-md bg-(--d-raised-strong) text-highlighted">
                  <UIcon
                    name="i-simple-icons-github"
                    class="size-4"
                  />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-[12.5px]">
                    <span class="font-semibold text-highlighted">GitHub</span>
                    <span class="ms-1 rounded-sm bg-(--d-raised-strong) px-1 text-[12px] text-muted">APP</span>
                    <span class="ms-1 text-dimmed">9:43</span>
                  </p>
                  <p class="mt-1 border-s-[3px] border-(--d-ok) ps-2.5 text-toned">
                    <span class="text-highlighted">CI passed on main</span><br>
                    <span class="text-[12.5px] text-muted">acme/app · run #9182 · attempt 2</span>
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
        </div>
      </div>
    </LandingSceneWindow>
  </div>
</template>
