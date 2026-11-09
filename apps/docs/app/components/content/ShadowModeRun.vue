<script setup lang="ts">
const DECISIONS = [
  { text: 'Add the label bug', tool: 'addLabels' },
  { text: 'Comment "Duplicate of #398"', tool: 'addIssueComment' },
  { text: 'Close the issue', tool: 'closeIssue' }
]

const dryRun = ref(true)

const { root, finished, still } = useFigure({ steps: [], reset: () => {}, settle: () => {}, autoplay: false })
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The agent makes the same decisions either way. dryRun only decides whether they reach GitHub, so you can read them before you let the agent act."
    :finished
    :still
  >
    <template #controls>
      <button
        type="button"
        role="switch"
        :aria-checked="dryRun"
        class="flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] text-highlighted hover:bg-(--d-raised)"
        @click="dryRun = !dryRun"
      >
        <span
          class="relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150"
          :class="dryRun ? 'bg-(--d-signal)' : 'bg-(--d-raised-strong) ring-1 ring-(--d-line-strong) ring-inset'"
        >
          <span
            class="absolute top-0.5 left-0.5 size-4 rounded-full transition-transform duration-150"
            :class="dryRun ? 'translate-x-4 bg-(--d-signal-fg)' : 'bg-(--ui-text-muted)'"
          />
        </span>
        <code class="font-mono text-[12.5px]">dryRun: {{ dryRun }}</code>
      </button>
      <p class="text-[13px] text-muted">
        Click to switch it {{ dryRun ? 'off' : 'on' }}.
      </p>
    </template>

    <div class="@container">
      <div class="grid gap-4 px-4 py-6 sm:px-8 sm:py-8 @min-[40rem]:grid-cols-2">
        <section class="rounded-lg border border-(--d-line) bg-(--d-raised)">
          <p class="border-b border-(--d-line) px-3.5 py-2.5 text-[13px] text-highlighted">
            What the agent decided
          </p>
          <ol class="flex flex-col gap-2 px-3.5 py-3">
            <li
              v-for="decision in DECISIONS"
              :key="decision.tool"
              class="flex items-baseline gap-2 text-[13px]"
            >
              <UIcon
                name="i-lucide-arrow-right"
                class="size-3.5 shrink-0 translate-y-0.5 text-dimmed"
              />
              <span class="text-toned">{{ decision.text }}</span>
              <code class="ms-auto font-mono text-[12px] text-dimmed">{{ decision.tool }}</code>
            </li>
          </ol>
          <p class="border-t border-(--d-line) px-3.5 py-2.5 text-[12.5px] text-muted">
            Same three decisions with dryRun on or off.
          </p>
        </section>

        <section class="rounded-lg border border-(--d-line) bg-(--d-raised)">
          <p class="flex items-center gap-2 border-b border-(--d-line) px-3.5 py-2.5 text-[13px] text-highlighted">
            <UIcon
              name="i-simple-icons-github"
              class="size-3.5"
            />
            What happened on GitHub
          </p>
          <div class="px-3.5 py-3">
            <p class="text-[13px] text-highlighted">
              Uploads over 2 GB fail <span class="text-dimmed">#412</span>
            </p>
            <p class="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span class="inline-flex h-6 items-center gap-1 rounded-full bg-(--d-raised-strong) px-2 text-[12px] text-highlighted">
                <UIcon
                  :name="dryRun ? 'i-lucide-circle-dot' : 'i-lucide-circle-check'"
                  class="size-3.5"
                />
                {{ dryRun ? 'Open' : 'Closed' }}
              </span>
              <span
                v-if="!dryRun"
                class="rounded-full border border-(--d-line-strong) px-2 text-[12px]/5 text-toned"
              >bug</span>
            </p>
            <p
              v-if="!dryRun"
              class="mt-2.5 rounded-md border border-(--d-line) bg-default px-2.5 py-1.5 text-[12.5px] text-toned"
            >
              <span class="text-highlighted">triage-agent</span> commented: Duplicate of #398
            </p>
          </div>
          <p class="border-t border-(--d-line) px-3.5 py-2.5 text-[12.5px] text-muted">
            {{ dryRun ? 'Nothing changed. You get the three decisions as a report instead.' : 'All three decisions ran on GitHub.' }}
          </p>
        </section>
      </div>
    </div>
  </DocsFigure>
</template>
