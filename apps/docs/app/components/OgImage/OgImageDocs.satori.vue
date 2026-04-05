<script lang="ts" setup>
import { computed } from 'vue'

const props = withDefaults(defineProps<{ title?: string, description?: string, headline?: string }>(), {
  title: '',
  description: '',
  headline: '',
})

const title = computed(() => (props.title || '').slice(0, 60))
const description = computed(() => (props.description || '').slice(0, 200))
</script>

<template>
  <div class="w-full h-full flex flex-col justify-end" style="background: #0a0a0f; position: relative; overflow: hidden;">
    <div style="position: absolute; top: -300px; right: -200px; width: 1200px; height: 900px; background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.025) 0%, transparent 50%);" />

    <div style="position: absolute; top: 60px; left: 80px; display: flex; align-items: center;">
      <svg
width="32"
height="32"
viewBox="0 0 24 24"
fill="#3f3f46">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
      <span style="color: #3f3f46; font-size: 24px; font-weight: 600; margin-left: 14px;">GitHub Tools</span>
    </div>

    <div style="padding: 0 80px 70px;">
      <p
        v-if="headline"
        style="color: #a1a1aa; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 20px;"
      >
        {{ headline }}
      </p>
      <h1
        v-if="title"
        style="color: #fafafa; font-size: 72px; font-weight: 700; letter-spacing: -0.035em; line-height: 1; margin: 0 0 20px;"
      >
        {{ title }}
      </h1>
      <p
        v-if="description"
        style="color: #52525b; font-size: 28px; line-height: 1.4; max-width: 700px; margin: 0;"
      >
        {{ description }}
      </p>
    </div>

    <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #a1a1aa 0%, #52525b 30%, transparent 100%);" />
  </div>
</template>
