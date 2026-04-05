<script lang="ts" setup>
// nuxt-og-image: expose title/description/headline in plain {{ }} (no computed wrappers).
withDefaults(
  defineProps<{
    title?: string
    description?: string
    headline?: string
  }>(),
  {
    title: '',
    description: '',
    headline: '',
  },
)

const FALLBACK_DESCRIPTION =
  'AI-callable GitHub tools for the Vercel AI SDK — presets, agents, durable workflows, and agent skills.'
</script>

<template>
  <div
    class="w-full h-full"
    style="position: relative; overflow: hidden; background: #0a0a0f; color: #fafafa; display: flex; flex-direction: column; align-items: stretch; padding: 48px 64px 40px; box-sizing: border-box; font-family: Inter, ui-sans-serif, system-ui, sans-serif;"
  >
    <div
      style="position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 80% 55% at 50% -10%, rgba(255,255,255,0.06) 0%, transparent 55%);"
    />

    <div style="position: relative; display: flex; align-items: center;">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="#a1a1aa"
      >
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
      <span style="margin-left: 16px; font-size: 28px; font-weight: 600; letter-spacing: -0.03em; color: #e4e4e7;">GitHub Tools</span>
    </div>

    <div
      style="position: relative; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 24px 0 32px; min-height: 0;"
    >
      <div v-if="headline" style="margin-bottom: 22px; width: 100%;">
        <span style="font-size: 16px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.5);">{{ headline }}</span>
      </div>

      <h1 style="font-size: 76px; font-weight: 700; letter-spacing: -0.04em; line-height: 1.05; margin: 0 0 28px; max-width: 1080px; width: 100%; color: #ffffff;">
        {{ !title ? 'Documentation' : (title.length > 68 ? title.slice(0, 65) + '…' : title) }}
      </h1>

      <p style="font-size: 30px; font-weight: 400; line-height: 1.45; margin: 0; max-width: 920px; width: 100%; color: rgba(255,255,255,0.62);">
        {{ !description ? FALLBACK_DESCRIPTION : (description.length > 190 ? description.slice(0, 187) + '…' : description) }}
      </p>
    </div>

    <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 50%, transparent 100%);" />
  </div>
</template>
