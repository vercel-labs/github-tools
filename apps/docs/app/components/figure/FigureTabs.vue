<script setup lang="ts" generic="T extends string">
/** The one control figures use to switch a state: a quiet segmented control. */
defineProps<{
  /** Accessible name of the group, shown as a muted label when `showLabel` is set. */
  label: string
  options: readonly { value: T, label: string }[]
  showLabel?: boolean
  /** Set the option labels in mono, for literal values such as `'app'`. */
  mono?: boolean
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    class="flex min-w-0 items-center gap-2.5"
  >
    <span
      v-if="showLabel"
      class="d-label shrink-0"
    >{{ label }}</span>
    <div class="flex min-w-0 flex-wrap gap-1">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :aria-pressed="model === option.value"
        class="h-7 rounded-md px-2.5 text-[13px] whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-(--d-line-strong)"
        :class="[
          mono ? 'font-mono text-[12.5px]' : '',
          model === option.value
            ? 'bg-(--d-raised-strong) text-highlighted'
            : 'text-muted hover:bg-(--d-raised) hover:text-highlighted'
        ]"
        @click="model = option.value"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
