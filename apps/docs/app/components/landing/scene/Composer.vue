<script setup lang="ts">
/** The message box at the bottom of a scene: a real input, prefilled with a suggestion. */
defineProps<{
  placeholder: string
  /** Button text. Without it, the button shows an arrow. */
  action?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ submit: [text: string] }>()
const model = defineModel<string>({ required: true })

function submit() {
  const text = model.value.trim()
  if (!text) return
  emit('submit', text)
}
</script>

<template>
  <form
    class="flex shrink-0 items-center gap-2 border-t border-(--d-line) p-3"
    @submit.prevent="submit"
  >
    <input
      v-model="model"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="placeholder"
      class="h-8 min-w-0 flex-1 rounded-md border border-(--d-line-strong) bg-(--d-raised) px-2.5 text-[13px] text-highlighted outline-none placeholder:text-dimmed focus:border-(--ui-text-muted) disabled:opacity-60"
    >
    <button
      type="submit"
      class="relative flex h-8 shrink-0 items-center justify-center rounded-md bg-(--d-signal) text-[13px] font-medium text-(--d-signal-fg) transition-[opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-30"
      :class="action ? 'px-3' : 'w-8'"
      :disabled="disabled || !model.trim()"
      :aria-label="action ?? 'Send'"
    >
      <span
        v-if="!disabled && model.trim()"
        class="scene-ping pointer-events-none absolute inset-0 rounded-md"
        aria-hidden="true"
      />
      <template v-if="action">
        {{ action }}
      </template>
      <UIcon
        v-else
        name="i-lucide-arrow-up"
        class="size-4"
      />
    </button>
  </form>
</template>
