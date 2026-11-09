<script setup lang="ts">
/** An app window in a landing scene: macOS controls, the app's mark and a title or address. */
const props = defineProps<{
  app: 'github' | 'slack' | 'linear' | 'terminal' | 'vercel' | 'editor'
  title: string
}>()

const MARK = {
  github: 'i-simple-icons-github',
  slack: 'i-simple-icons-slack',
  linear: 'i-simple-icons-linear',
  terminal: 'i-lucide-terminal',
  vercel: 'i-simple-icons-vercel',
  editor: 'i-lucide-code-xml'
} as const

const browser = computed(() => props.app === 'github' || props.app === 'vercel')
</script>

<template>
  <section
    :aria-label="app"
    class="flex min-h-0 flex-col overflow-hidden rounded-lg border border-(--d-line-strong)"
    :class="app === 'terminal' || app === 'editor' ? 'bg-(--d-raised)' : 'bg-default'"
  >
    <header class="relative flex h-9 shrink-0 items-center border-b border-(--d-line) px-3">
      <span
        class="flex gap-1.5"
        aria-hidden="true"
      >
        <span class="size-2.5 rounded-full bg-(--d-line-strong)" />
        <span class="size-2.5 rounded-full bg-(--d-line-strong)" />
        <span class="size-2.5 rounded-full bg-(--d-line-strong)" />
      </span>
      <span
        class="absolute inset-x-16 mx-auto flex w-fit max-w-[calc(100%-8rem)] items-center gap-1.5 truncate text-[12px] text-muted"
        :class="browser ? 'rounded-md bg-(--d-raised-strong) px-2.5 py-0.5' : ''"
      >
        <UIcon
          :name="MARK[app]"
          class="size-3.5 shrink-0 text-highlighted"
        />
        <span class="truncate">{{ title }}</span>
      </span>
    </header>
    <slot />
  </section>
</template>
