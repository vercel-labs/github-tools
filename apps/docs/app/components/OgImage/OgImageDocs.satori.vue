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
  '47 typed GitHub tools with presets, human approval, and durable execution — for the AI SDK, eve, Vercel Workflow, and Chat SDK.'

function ogTitleLines(raw: string): string[] {
  const title = !raw ? 'Documentation' : (raw.length > 68 ? `${raw.slice(0, 65)}…` : raw)

  const withBreak = title.match(/^(.+?)\s+with\s+(.+)$/i)
  if (withBreak?.[1] && withBreak[2] && withBreak[1].length >= 8)
    return [`${withBreak[1]} with`, withBreak[2]]

  if (title.length <= 34)
    return [title]

  const words = title.split(/\s+/)
  if (words.length < 3)
    return [title]

  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}
</script>

<template>
  <div
    class="w-full h-full"
    style="position: relative; overflow: hidden; background: #000000; color: #ededed; display: flex; flex-direction: column; align-items: stretch; padding: 48px 64px 40px; box-sizing: border-box; font-family: Geist, ui-sans-serif, system-ui, sans-serif;"
  >
    <div
      style="position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 80% 55% at 50% -10%, rgba(255,255,255,0.06) 0%, transparent 55%);"
    />

    <div style="position: relative; display: flex; align-items: center; gap: 14px;">
      <svg
        width="88"
        height="24"
        viewBox="0 0 232 65"
        fill="#ededed"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M73.4619 64.2783H0L36.7305 0L73.4619 64.2783ZM113.694 4.80566C129.268 4.80572 138.598 15.3104 138.598 32.1328C138.598 48.9555 129.268 59.3144 113.694 59.3145C98.1939 59.3145 88.8643 48.9555 88.8643 32.1328C88.8644 15.3103 98.1941 4.80566 113.694 4.80566ZM163.259 4.80566C175.747 4.80579 182.579 12.0784 183.754 22.1426L174.131 22.583C173.47 16.9266 169.723 13.0332 163.111 13.0332C157.602 13.0333 154.223 15.8249 154.223 19.8652C154.223 24.1259 156.647 25.7417 165.977 27.8721C180.008 30.884 184.709 36.0266 184.709 43.8135C184.709 53.3635 176.922 59.3145 165.095 59.3145C152.166 59.3144 144.232 52.0412 143.424 41.1689L153.121 40.5811C154.003 47.3395 158.043 51.0859 165.242 51.0859C171.413 51.0859 174.938 48.8091 174.938 44.3281C174.938 40.2878 172.882 37.8629 162.23 35.3652C149.301 32.4268 144.452 28.754 144.452 20.2324C144.452 11.1232 151.578 4.80566 163.259 4.80566ZM210.125 4.80566C222.613 4.80578 229.445 12.0784 230.62 22.1426L220.997 22.583C220.336 16.9266 216.589 13.0332 209.978 13.0332C204.468 13.0333 201.089 15.8249 201.089 19.8652C201.089 24.1259 203.513 25.7417 212.843 27.8721C226.874 30.884 231.575 36.0266 231.575 43.8135C231.575 53.3635 223.788 59.3145 211.961 59.3145C199.032 59.3143 191.098 52.0412 190.29 41.1689L199.987 40.5811C200.869 47.3395 204.909 51.0859 212.108 51.0859C218.279 51.0859 221.805 48.8091 221.805 44.3281C221.805 40.2878 219.748 37.8629 209.097 35.3652C196.167 32.4268 191.318 28.754 191.318 20.2324C191.318 11.1232 198.445 4.80566 210.125 4.80566ZM113.694 13.1064C104.365 13.1064 98.7081 20.2323 98.708 32.1328C98.708 44.0336 104.365 51.0127 113.694 51.0127C123.171 51.0126 128.754 44.0336 128.754 32.1328C128.754 20.2323 123.171 13.1065 113.694 13.1064Z" />
      </svg>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="rgba(255,255,255,0.35)"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          clip-rule="evenodd"
          d="m4.02 15.4.3-.7 6-14 .29-.68 1.37.59-.3.69-6 14-.29.68z"
          fill-rule="evenodd"
        />
      </svg>
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="#ededed"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
      <span style="font-size: 28px; font-weight: 400; letter-spacing: -0.03em; color: #ededed;">GitHub Tools</span>
    </div>

    <div
      style="position: relative; flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; padding: 24px 0 32px; min-height: 0;"
    >
      <div v-if="headline" style="margin-bottom: 20px; width: 100%;">
        <span style="font-size: 18px; font-weight: 400; letter-spacing: -0.01em; color: rgba(255,255,255,0.58);">{{ headline }}</span>
      </div>

      <h1 style="display: flex; flex-direction: column; font-size: 76px; font-weight: 400; letter-spacing: -0.04em; line-height: 1.05; margin: 0 0 28px; max-width: 1080px; width: 100%; color: #ffffff;">
        <span v-for="(line, index) in ogTitleLines(title)" :key="index">{{ line }}</span>
      </h1>

      <p style="font-size: 30px; font-weight: 400; line-height: 1.45; margin: 0; max-width: 920px; width: 100%; color: rgba(255,255,255,0.62);">
        {{ !description ? FALLBACK_DESCRIPTION : (description.length > 190 ? description.slice(0, 187) + '…' : description) }}
      </p>
    </div>

    <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.06) 50%, transparent 100%);" />
  </div>
</template>
