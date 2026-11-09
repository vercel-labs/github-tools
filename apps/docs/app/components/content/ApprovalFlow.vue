<script setup lang="ts">
const shown = ref(0)
const pressing = ref(false)
const approved = ref(false)

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 200, run: () => { shown.value = 1 } },
    { at: 900, run: () => { shown.value = 2 } },
    { at: 1600, run: () => { shown.value = 3 } },
    { at: 2200, run: () => { shown.value = 4 } },
    { at: 3600, run: () => { pressing.value = true } },
    { at: 3780, run: () => {
      pressing.value = false
      approved.value = true
    } },
    { at: 4200, run: () => { shown.value = 5 } },
    { at: 4900, run: () => { shown.value = 6 } }
  ],
  reset: () => {
    shown.value = 0
    pressing.value = false
    approved.value = false
  },
  settle: () => {
    shown.value = 6
    approved.value = true
  }
})
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The read runs straight away. The write stops before it reaches GitHub, and only runs once a person approves it."
    :finished
    :still
    @replay="replay"
  >
    <ol class="flex flex-col gap-3 p-5 text-[13.5px]/6 sm:p-6">
      <li
        class="d-step flex gap-4"
        :data-on="shown > 0"
      >
        <span class="w-14 shrink-0 text-dimmed">You</span>
        <span class="text-highlighted">Close vercel/ai#42, it duplicates #40.</span>
      </li>

      <li
        class="d-step flex flex-wrap items-center gap-x-4 gap-y-1"
        :data-on="shown > 1"
      >
        <span class="w-14 shrink-0 text-dimmed">Agent</span>
        <code class="rounded-md border border-(--d-line) bg-(--d-raised-strong) px-2 py-0.5 font-mono text-[12.5px] text-highlighted">getIssue({ issueNumber: 42 })</code>
        <span class="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
          <span class="size-1.5 rounded-full bg-(--d-signal)" />
          Read, runs without asking
        </span>
      </li>

      <li
        class="d-step flex flex-wrap items-center gap-x-4 gap-y-1"
        :data-on="shown > 2"
      >
        <span class="w-14 shrink-0 text-dimmed">Agent</span>
        <code class="rounded-md border border-(--d-line) bg-(--d-raised-strong) px-2 py-0.5 font-mono text-[12.5px] text-highlighted">closeIssue({ issueNumber: 42 })</code>
        <span class="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
          <span
            class="size-1.5 rounded-full transition-colors duration-300"
            :class="approved ? 'bg-(--d-signal)' : 'bg-(--d-warn)'"
          />
          {{ approved ? 'Write, approved' : 'Write, paused' }}
        </span>
      </li>

      <li
        class="d-step ms-0 sm:ms-18"
        :data-on="shown > 3"
      >
        <div
          class="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors duration-300"
          :class="approved ? 'border-(--d-line) bg-(--d-raised-strong)' : 'border-(--d-warn)/40 bg-(--d-raised-strong)'"
        >
          <div>
            <p class="text-highlighted">
              Close issue vercel/ai#42?
            </p>
            <p class="mt-0.5 text-[12.5px] text-muted">
              <span v-if="approved">Approved by you</span>
              <span
                v-else
                class="inline-flex items-center gap-1.5"
              >
                <span class="size-1.5 animate-pulse rounded-full bg-(--d-warn)" />
                Waiting for a person
              </span>
            </p>
          </div>
          <div class="flex gap-2 text-[12.5px]">
            <span
              class="rounded-md border border-(--d-line) px-2.5 py-1 text-muted transition-opacity duration-300"
              :class="approved ? 'opacity-40' : ''"
            >Deny</span>
            <span
              class="inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-all duration-150"
              :class="[
                approved ? 'bg-(--d-signal) text-(--d-signal-fg)' : 'bg-inverted text-inverted',
                pressing ? 'scale-95' : ''
              ]"
            >
              <UIcon
                v-if="approved"
                name="i-lucide-check"
                class="size-3.5"
              />
              {{ approved ? 'Approved' : 'Approve' }}
            </span>
          </div>
        </div>
      </li>

      <li
        class="d-step flex flex-wrap items-center gap-x-4 gap-y-1"
        :data-on="shown > 4"
      >
        <span class="w-14 shrink-0 text-dimmed">GitHub</span>
        <code class="font-mono text-[12.5px] text-muted">PATCH /repos/vercel/ai/issues/42</code>
        <span class="font-mono text-[12.5px] text-(--d-signal-text)">200 closed</span>
      </li>

      <li
        class="d-step flex gap-4"
        :data-on="shown > 5"
      >
        <span class="w-14 shrink-0 text-dimmed">Agent</span>
        <span class="text-highlighted">Closed #42 as a duplicate of #40.</span>
      </li>
    </ol>
  </DocsFigure>
</template>
