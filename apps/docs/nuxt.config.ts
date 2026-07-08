/** Canonical docs origin; override with NUXT_PUBLIC_SITE_URL. Preview builds use VERCEL_URL when set. */
const docsSiteUrl =
  process.env.NUXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://github-tools.com')

const siteDescription =
  '47 typed GitHub tools with presets, human approval, and durable execution — for the AI SDK, eve, Vercel Workflow, and Chat SDK.'

export default defineNuxtConfig({
  extends: ['docus'],
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@vercel/analytics', '@vercel/speed-insights'],
  app: {
    head: {
      meta: [
        { name: 'twitter:card', content: 'summary_large_image' },
        { property: 'og:site_name', content: 'GitHub Tools' },
      ],
    },
  },
  fonts: {
    defaults: {
      // Full variable axis — discrete weights from @nuxt/ui defaults render too thin on Chromium.
      weights: ['100 900'],
    },
    families: [
      { name: 'Geist', weights: ['100 900'], global: true },
      { name: 'Geist Mono', weights: ['100 900'], global: true },
    ],
  },
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
    description: siteDescription,
    full: {
      title: 'GitHub Tools',
      description: siteDescription,
    },
  },
  routeRules: {
    '/guide/quick-start': { redirect: { to: '/getting-started/quick-start', statusCode: 301 } },
    '/guide/eve-agents': { redirect: { to: '/frameworks/eve', statusCode: 301 } },
    '/guide/durable-workflows': { redirect: { to: '/frameworks/vercel-workflow', statusCode: 301 } },
    '/guide/token-permissions': { redirect: { to: '/guide/tokens-and-auth', statusCode: 301 } },
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
