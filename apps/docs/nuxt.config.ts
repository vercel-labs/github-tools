/** Canonical docs origin; override with NUXT_PUBLIC_SITE_URL. Preview builds use VERCEL_URL when set. */
const docsSiteUrl =
  process.env.NUXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://github-tools.com')

export default defineNuxtConfig({
  extends: ['docus'],
  modules: ['@nuxt/eslint', '@vercel/analytics', '@vercel/speed-insights'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },
  site: {
    name: 'GitHub Tools',
    url: docsSiteUrl,
  },
  llms: {
    domain: docsSiteUrl,
    title: 'GitHub Tools',
    description:
      'AI-callable GitHub tools for the Vercel AI SDK — presets, agents, durable workflows, and granular write approvals.',
    full: {
      title: 'GitHub Tools',
      description:
        'GitHub REST API as AI SDK tools: generateText, streamText, ToolLoopAgent, and Vercel Workflow DurableAgent.',
    },
  },
  content: {
    experimental: {
      sqliteConnector: 'native'
    }
  },
  mcp: {
    name: 'GitHub Tools MCP',
  },
  icon: {
    customCollections: [
      {
        prefix: 'custom',
        dir: './app/assets/icons',
      },
    ],
  },
})
