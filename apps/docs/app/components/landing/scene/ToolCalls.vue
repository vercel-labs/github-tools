<script setup lang="ts">
/** The tools an agent message used, behind a disclosure, the way agent apps show their work. */
defineProps<{ calls: { tool: string, args: string, result: string, write?: boolean }[] }>()

const open = ref(false)
const list = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
  if (open.value) nextTick(() => revealInScene(list.value!))
}
</script>

<template>
  <div class="text-[12px]">
    <button
      type="button"
      class="inline-flex h-6 items-center gap-1 rounded-md px-1.5 -ms-1.5 text-muted transition-colors hover:bg-(--d-raised-strong) hover:text-highlighted"
      :aria-expanded="open"
      @click="toggle"
    >
      <UIcon
        name="i-lucide-chevron-right"
        class="size-3.5 transition-transform duration-200"
        :class="open ? 'rotate-90' : ''"
      />
      Used {{ calls.length }} {{ calls.length === 1 ? 'tool' : 'tools' }}
    </button>
    <ul
      v-show="open"
      ref="list"
      class="mt-1 flex flex-col gap-1 rounded-md border border-(--d-line) bg-(--d-raised) px-2.5 py-2 font-mono"
    >
      <li
        v-for="call in calls"
        :key="call.tool + call.args"
        class="flex min-w-0 items-baseline gap-2"
      >
        <span class="shrink-0 text-highlighted">{{ call.tool }}</span>
        <span class="min-w-0 truncate text-muted">{{ call.args }}</span>
        <span class="ms-auto shrink-0 text-dimmed">{{ call.result }}</span>
        <span
          v-if="call.write"
          class="shrink-0 rounded-sm border border-(--d-line-strong) px-1 font-sans text-[12px]/4 text-toned"
        >write</span>
      </li>
    </ul>
  </div>
</template>
