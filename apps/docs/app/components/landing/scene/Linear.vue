<script setup lang="ts">
const STEPS = ['Searched acme/app for "upload limit"', 'Read pull request #118', 'Read release v2.0.1']

const { later } = useSceneTimers()
const thread = ref<HTMLElement | null>(null)
const draft = ref('@github-agent did we already fix this?')
const comments = ref<string[]>([])
const asked = ref(false)
const steps = ref(0)
const replied = ref(false)
const preview = ref(false)
const card = ref<HTMLElement | null>(null)

function togglePreview() {
  preview.value = !preview.value
  if (preview.value) nextTick(() => revealInScene(card.value!))
}

function send(text: string) {
  comments.value.push(text)
  draft.value = ''
  if (asked.value || !text.includes('@github-agent')) return
  asked.value = true
  STEPS.forEach((_, index) => later(800 + index * 800, () => { steps.value = index + 1 }))
  later(800 + STEPS.length * 800 + 300, () => { replied.value = true })
}

const hint = computed(() => {
  if (!asked.value) return 'Send the comment. The agent answers from GitHub, inside Linear.'
  if (!replied.value) return 'The agent searches GitHub for the fix.'
  return preview.value ? 'Every step here was a read, so nothing waited for approval.' : 'Open the linked pull request.'
})

useScrollToEnd(thread, () => [comments, steps, replied])

defineExpose({ hint })
</script>

<template>
  <LandingSceneWindow
    app="linear"
    title="Linear"
    class="h-full"
  >
    <div class="flex min-h-0 flex-1">
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="shrink-0 px-4 pt-3.5">
          <p class="text-[12px] text-muted">
            ENG-412
          </p>
          <p class="mt-1 text-[16px] font-medium text-highlighted">
            Uploads over 2 GB fail
          </p>
          <p class="mt-1.5 text-[13px]/5 text-toned">
            A customer reports a 413 on every upload above 2 GB.
          </p>
          <p class="mt-3 border-t border-(--d-line) pt-3 text-[12.5px] font-medium text-highlighted">
            Activity
          </p>
        </div>

        <div class="relative min-h-0 flex-1 overflow-hidden">
          <div
            ref="thread"
            class="scene-scroll absolute inset-0 overflow-y-auto"
          >
            <TransitionGroup
              tag="ol"
              name="scene"
              class="flex flex-col gap-3 px-4 pt-3 pb-3"
            >
            <li
              key="created"
              class="flex items-center gap-2 text-[12px] text-muted"
            >
              <LandingSceneAvatar
                name="leo"
                size="sm"
              />
              <span><span class="text-toned">leo</span> created the issue · 1h</span>
            </li>
            <li
              v-for="(text, index) in comments"
              :key="`comment-${index}`"
              class="rounded-md border border-(--d-line) bg-(--d-raised) px-3 py-2.5"
            >
              <p class="flex items-center gap-2 text-[12px] text-muted">
                <LandingSceneAvatar
                  name="you"
                  size="sm"
                />
                <span class="text-highlighted">you</span> just now
              </p>
              <p class="mt-1.5 text-[13px]/5 text-highlighted">
                {{ text }}
              </p>
            </li>
            <li
              v-if="steps"
              key="agent"
              class="rounded-md border border-(--d-line) bg-(--d-raised) px-3 py-2.5"
            >
              <p class="flex items-center gap-2 text-[12px] text-muted">
                <LandingSceneAvatar
                  name="github-agent"
                  bot
                  size="sm"
                  shape="square"
                />
                <span class="text-highlighted">github-agent</span> agent
              </p>
              <p
                v-for="(step, index) in STEPS"
                :key="step"
                class="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-muted transition-opacity duration-300"
                :class="steps > index ? 'opacity-100' : 'opacity-0'"
              >
                <UIcon
                  name="i-lucide-check"
                  class="size-3.5 shrink-0"
                />
                <span class="truncate">{{ step }}</span>
              </p>
              <div
                class="transition-opacity duration-300"
                :class="replied ? 'opacity-100' : 'opacity-0'"
              >
                <p class="mt-2 text-[13px]/5 text-highlighted">
                  Yes. #118 raised the limit to 5 GB and shipped in v2.0.1 three days ago.
                </p>
                <button
                  ref="card"
                  type="button"
                  class="relative mt-2 w-full rounded-md border border-(--d-line) bg-default px-2.5 py-1.5 text-start text-[12.5px] transition-colors hover:border-(--d-line-strong)"
                  :aria-expanded="preview"
                  @click="togglePreview"
                >
                  <span
                    v-if="replied && !preview"
                    class="scene-ping pointer-events-none absolute inset-0 rounded-md"
                    aria-hidden="true"
                  />
                  <span class="flex items-center gap-2">
                    <UIcon
                      name="i-lucide-git-merge"
                      class="size-3.5 shrink-0 text-muted"
                    />
                    <span class="min-w-0 truncate text-highlighted">Raise upload limit to 5 GB</span>
                    <span class="ms-auto shrink-0 text-dimmed">acme/app#118</span>
                  </span>
                  <span
                    v-if="preview"
                    class="mt-1.5 flex flex-col gap-0.5 border-t border-(--d-line) pt-1.5 text-muted"
                  >
                    <span>Merged by leo 3 days ago into <code class="font-mono text-[12px]">main</code></span>
                    <span>2 files changed, <span class="font-mono text-[12px]">+12 −3</span></span>
                    <span>Released in v2.0.1</span>
                  </span>
                </button>
              </div>
            </li>
            </TransitionGroup>
          </div>
        </div>

        <LandingSceneComposer
          v-model="draft"
          placeholder="Leave a comment…"
          @submit="send"
        />
      </div>

      <aside class="hidden w-44 shrink-0 flex-col gap-3 border-s border-(--d-line) px-3.5 py-3.5 text-[12.5px] sm:flex">
        <p
          v-for="[key, value] in [['Status', 'Triage'], ['Priority', 'High'], ['Assignee', 'leo'], ['Labels', 'bug'], ['Project', 'Uploads']]"
          :key="key"
          class="flex flex-col gap-0.5"
        >
          <span class="text-dimmed">{{ key }}</span>
          <span class="text-toned">{{ value }}</span>
        </p>
      </aside>
    </div>
  </LandingSceneWindow>
</template>
