<script setup lang="ts">
/**
 * A person or the agent in a scene. People get a GitHub-style identicon drawn from their name,
 * the agent gets the octocat on an ink tile.
 */
const props = withDefaults(defineProps<{
  name: string
  bot?: boolean
  size?: 'sm' | 'md'
  shape?: 'circle' | 'square'
}>(), {
  size: 'md',
  shape: 'circle'
})

const cells = computed(() => {
  let hash = 2166136261
  for (const char of props.name) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  const filled: [number, number][] = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      if ((hash >>> (row * 3 + col)) & 1) {
        filled.push([col, row])
        if (col < 2) filled.push([4 - col, row])
      }
    }
  }
  return filled
})
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center overflow-hidden"
    :class="[
      size === 'sm' ? 'size-5' : 'size-7',
      shape === 'circle' ? 'rounded-full' : 'rounded-md',
      bot ? 'bg-(--d-signal) text-(--d-signal-fg)' : 'bg-(--d-raised-strong) text-toned ring-1 ring-(--d-line) ring-inset'
    ]"
    :aria-label="name"
    role="img"
  >
    <UIcon
      v-if="bot"
      name="i-simple-icons-github"
      :class="size === 'sm' ? 'size-3' : 'size-4'"
    />
    <svg
      v-else
      viewBox="0 0 5 5"
      class="size-[52%]"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      <rect
        v-for="([x, y]) in cells"
        :key="`${x}-${y}`"
        :x="x"
        :y="y"
        width="1"
        height="1"
        fill="currentColor"
      />
    </svg>
  </span>
</template>
