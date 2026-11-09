<script setup lang="ts">
const props = defineProps<{
  /** One sentence under the frame saying what the figure shows. */
  caption?: string
  /** Shows the Replay button once the figure has played. */
  finished?: boolean
  /** Reduced motion: the figure never plays, so there is nothing to replay. */
  still?: boolean
}>()

defineEmits<{ replay: [] }>()

/** Vercel captions lead with a short phrase in the primary color: the first sentence. */
const captionParts = computed(() => {
  const caption = props.caption ?? ''
  const end = caption.search(/[.!?](\s|$)/)
  if (end === -1) return { lead: caption, rest: '' }
  return { lead: caption.slice(0, end + 1), rest: caption.slice(end + 1).trim() }
})
</script>

<template>
  <figure class="not-prose my-8">
    <div class="group/fig relative overflow-hidden border border-(--d-line) bg-default">
      <div
        v-if="$slots.controls"
        class="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-(--d-line) px-4 py-2.5 sm:px-5"
      >
        <slot name="controls" />
      </div>
      <slot />

      <button
        v-if="!props.still"
        type="button"
        class="absolute right-3 bottom-3 rounded-md bg-default/70 px-2.5 py-1 text-[12.5px] text-dimmed ring-1 ring-(--d-line) backdrop-blur transition-[opacity,color,transform] duration-200 ring-inset hover:text-highlighted focus-visible:opacity-100 active:scale-[0.97]"
        :class="props.finished ? 'opacity-0 group-hover/fig:opacity-100' : 'pointer-events-none opacity-0'"
        :tabindex="props.finished ? 0 : -1"
        @click="$emit('replay')"
      >
        Replay
      </button>
    </div>

    <figcaption
      v-if="props.caption"
      class="mt-3 text-sm/5 text-pretty text-muted"
    >
      <span class="font-medium text-highlighted">{{ captionParts.lead }}</span>
      {{ captionParts.rest }}
    </figcaption>
  </figure>
</template>
