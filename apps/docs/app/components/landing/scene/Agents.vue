<script setup lang="ts">
import { PRESET_TOOLS, type PresetName } from '~/utils/figure-data/presets'

type Helper = {
  name: string
  preset: PresetName
  job: string
  can: string
  cannot: string
  result: string
  /** When the helper starts and finishes, in ms after the plan is posted. */
  at: [number, number]
  approval?: string
}

const HELPERS: Helper[] = [
  { name: 'reviewer', preset: 'code-review', job: 'Review the open v2.1 pull requests', can: 'review and comment', cannot: 'push code or merge', result: '#131 needs a test. #133 is ready.', at: [300, 2600] },
  { name: 'triager', preset: 'issue-triage', job: 'Find the issues fixed since v2.0.0', can: 'read, label and close issues', cannot: 'touch code', result: '#57, #61 and #88 are fixed.', at: [300, 2000] },
  { name: 'releaser', preset: 'release-manager', job: 'Draft the v2.1.0 release notes', can: 'draft releases', cannot: 'merge or push', result: 'Draft v2.1.0: 2 features, 3 fixes.', at: [2200, 3800], approval: 'Create draft release v2.1.0?' }
]

const { later, clear } = useSceneTimers()
const thread = ref<HTMLElement | null>(null)
const draft = ref('@github-agent get v2.1 ready to ship')
const question = ref('')
const planned = ref(false)
const status = ref<('queued' | 'running' | 'done')[]>(HELPERS.map(() => 'queued'))
const approved = ref<boolean | null>(null)

const waiting = computed(() => status.value[2] === 'done' && approved.value === null)
const finished = computed(() => status.value.every(state => state === 'done') && approved.value !== null)

function ask(text: string) {
  if (question.value) return
  clear()
  question.value = text
  draft.value = ''
  later(900, () => { planned.value = true })
  HELPERS.forEach((helper, index) => {
    later(900 + helper.at[0], () => { status.value[index] = 'running' })
    later(900 + helper.at[1], () => { status.value[index] = 'done' })
  })
}

useScrollToEnd(thread, () => [question, planned, status, approved])

const hint = computed(() => {
  if (!question.value) return 'Send one request. An orchestrator agent splits it and hands each part to a sub-agent.'
  if (waiting.value) return 'Drafting a release is a write, so that sub-agent waits for you.'
  if (finished.value) return 'One orchestrator, three sub-agents, three sets of tools. None could merge or push.'
  return 'The sub-agents work at the same time, each with its own preset.'
})

defineExpose({ hint })
</script>

<template>
  <LandingSceneWindow
    app="slack"
    title="acme · # releases"
    class="h-full"
  >
    <div
      ref="thread"
      class="scene-scroll min-h-0 flex-1 overflow-y-auto"
    >
      <div class="flex min-h-full flex-col justify-end gap-3.5 px-4 py-3 text-[13px]/5">
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
              <span class="font-semibold text-highlighted">you</span> <span class="text-dimmed">10:02</span>
            </p>
            <p class="text-toned">
              {{ question }}
            </p>
          </div>
        </div>

        <div
          v-if="planned"
          class="scene-row flex gap-2.5"
        >
          <LandingSceneAvatar
            name="github-agent"
            bot
            shape="square"
          />
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-1.5 text-[12.5px]">
              <span class="font-semibold text-highlighted">github-agent</span>
              <span class="rounded-sm border border-(--d-line-strong) px-1 text-[12px]/4 text-toned">orchestrator</span>
              <span class="text-dimmed">10:02</span>
            </p>
            <p class="text-toned">
              Three jobs here. I'm handing each one to a sub-agent that only has the tools for it.
            </p>

            <ol class="mt-2.5 flex flex-col gap-3 border-s-2 border-(--d-line) ps-3">
              <li
                v-for="(helper, index) in HELPERS"
                :key="helper.name"
                class="flex gap-2"
              >
                <LandingSceneAvatar
                  :name="helper.name"
                  bot
                  size="sm"
                  shape="square"
                />
                <div class="min-w-0 flex-1">
                  <p class="flex flex-wrap items-center gap-x-1.5 text-[12.5px]">
                    <span class="font-semibold text-highlighted">{{ helper.name }}</span>
                    <span class="rounded-sm bg-(--d-raised-strong) px-1 text-[12px]/4 text-muted">sub-agent</span>
                    <UIcon
                      :name="status[index] === 'done' ? 'i-lucide-circle-check' : status[index] === 'running' ? 'i-lucide-loader-circle' : 'i-lucide-circle-dashed'"
                      class="size-3.5 shrink-0"
                      :class="status[index] === 'done' ? 'text-highlighted' : status[index] === 'running' ? 'animate-spin text-muted' : 'text-dimmed'"
                    />
                  </p>
                  <p class="text-toned">
                    {{ helper.job }}
                  </p>
                  <p class="text-[12px] text-dimmed">
                    <code class="font-mono">{{ helper.preset }}</code>, {{ PRESET_TOOLS[helper.preset].length }} tools: can {{ helper.can }}, can't {{ helper.cannot }}
                  </p>
                  <p
                    v-if="status[index] === 'done' && !(helper.approval && approved === null)"
                    class="mt-1 text-highlighted"
                  >
                    {{ helper.approval && approved === false ? 'You denied the draft. Nothing was created.' : helper.result }}
                  </p>
                  <div
                    v-if="helper.approval && status[index] === 'done' && approved === null"
                    class="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-(--d-line-strong) bg-default px-2.5 py-2"
                  >
                    <span class="me-auto text-[12.5px] text-highlighted">{{ helper.approval }}</span>
                    <button
                      type="button"
                      class="relative h-7 rounded-md bg-(--d-go) px-3 text-[12.5px] font-medium text-white"
                      @click="approved = true"
                    >
                      <span
                        class="scene-ping pointer-events-none absolute inset-0 rounded-md"
                        aria-hidden="true"
                      />
                      Approve
                    </button>
                    <button
                      type="button"
                      class="h-7 rounded-md border border-(--d-line-strong) px-3 text-[12.5px] text-highlighted"
                      @click="approved = false"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </li>
            </ol>

            <p
              v-if="finished"
              class="scene-row mt-3 text-toned"
            >
              v2.1 is almost ready: #131 needs a test before it merges. {{ approved ? 'The v2.1.0 draft is on GitHub.' : 'I left the release for you.' }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <LandingSceneComposer
      v-model="draft"
      placeholder="Message #releases"
      :disabled="!!question"
      @submit="ask"
    />
  </LandingSceneWindow>
</template>
