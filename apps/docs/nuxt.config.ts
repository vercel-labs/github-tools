/** Canonical docs origin; override with NUXT_PUBLIC_SITE_URL. Preview builds use VERCEL_URL when set. */
const docsSiteUrl =
  process.env.NUXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://github-tools.com')

const siteDescription =
  'A typed tool layer for GitHub AI agents, with presets, human approval, and durable execution. Works with eve, the AI SDK, Vercel Workflow, and Chat SDK.'

export default defineNuxtConfig({
  extends: ['docus'],
  modules: ['@nuxt/eslint', '@nuxt/fonts', '@vercel/analytics', '@vercel/speed-insights'],
  app: {
    head: {
      meta: [
        { name: 'twitter:card', content: 'summary_large_image' },
        { property: 'og:site_name', content: 'GitHub tools' },
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
    name: 'GitHub tools',
    url: docsSiteUrl,
  },
  llms: {
    domain: docsSiteUrl,
    title: 'GitHub tools',
    description: siteDescription,
    full: {
      title: 'GitHub tools',
      description: siteDescription,
    },
  },
  // A redirect target without a fragment keeps the one the reader came with, so old anchors such as
  // `/guide/vercel-connect#per-user-tokens` still land on the matching heading of the merged page.
  routeRules: Object.fromEntries(Object.entries({
    '/getting-started/introduction': '/start/introduction',
    '/getting-started/installation': '/start/installation',
    '/getting-started/quick-start': '/start/quick-start',
    '/getting-started/agent-skills': '/start/agent-skills',
    '/guide/quick-start': '/start/quick-start',
    '/guide/presets': '/presets',
    '/guide/approval-control': '/approval',
    '/guide/jev-typesafe-ai': '/approval',
    '/guide/jev-tyesafe-ai': '/approval',
    '/guide/commit-attribution': '/commits',
    '/guide/tokens-and-auth': '/auth',
    '/guide/token-permissions': '/auth',
    '/guide/vercel-connect': '/auth',
    '/guide/working-context': '/context',
    '/guide/errors': '/errors',
    '/frameworks/eve-extension': '/integrations/eve',
    '/guide/eve-agents': '/integrations/eve',
    '/frameworks/ai-sdk': '/integrations/ai-sdk',
    '/frameworks/tanstack-ai': '/integrations/tanstack-ai',
    '/frameworks/vercel-workflow': '/integrations/workflow',
    '/guide/durable-workflows': '/integrations/workflow',
    '/frameworks/chat-sdk': '/integrations/chat-sdk',
    '/frameworks/eve': '/reference/upgrade',
    '/deprecated/eve': '/reference/upgrade',
    '/examples': '/guides',
    '/examples/overview': '/guides',
    '/examples/recipes': '/guides',
    '/guide/examples': '/guides',
    '/examples/eve-stale-issue-triager': '/guides/triage-issues',
    '/examples/ai-sdk-release-notes-generator': '/guides/release-notes',
    '/examples/vercel-workflow-ci-failure-bot': '/guides/fix-failing-ci',
    '/examples/chat-sdk-issue-triage-bot': '/guides/chat-bot',
    '/examples/manager-agent-with-subagents': '/guides/multi-agent',
    '/api/tools-catalog': '/reference/tools',
    '/api/reference': '/reference/api',
  }).map(([from, to]) => [from, { redirect: { to, statusCode: 301 } }])),
  content: {
    experimental: {
      sqliteConnector: 'native'
    },
    build: {
      markdown: {
        highlight: {
          // Docus loads a short list; the docs also show TSX and TOML.
          langs: ['bash', 'diff', 'json', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'vue', 'shell', 'mdc', 'md', 'yaml', 'toml']
        }
      }
    }
  },
  mcp: {
    name: 'GitHub tools MCP',
  },
  icon: {
    // Figures swap icons with their state; bundling them avoids a blank icon while one loads.
    clientBundle: {
      scan: true,
      includeCustomCollections: true,
      icons: ['lucide:alert-circle', 'lucide:arrow-right', 'lucide:check', 'lucide:check-circle', 'lucide:chevron-down', 'lucide:circle-check', 'lucide:circle-dot', 'lucide:circle-x', 'lucide:clock', 'lucide:copy', 'lucide:cpu', 'lucide:eye', 'lucide:file-code', 'lucide:git-merge', 'lucide:git-pull-request', 'lucide:hand', 'lucide:key-round', 'lucide:link', 'lucide:menu', 'lucide:message-square', 'lucide:pen', 'lucide:pencil', 'lucide:plug', 'lucide:rocket', 'lucide:server', 'lucide:tag', 'lucide:terminal', 'lucide:wrench', 'lucide:x', 'lucide:rotate-ccw', 'lucide:loader-circle', 'lucide:arrow-up', 'lucide:send-horizontal', 'simple-icons:github', 'simple-icons:slack', 'simple-icons:linear', 'simple-icons:vercel', 'lucide:chevron-right', 'lucide:shield', 'lucide:code-xml', 'lucide:play'],
    },
    customCollections: [
      {
        prefix: 'custom',
        dir: './app/assets/icons',
      },
      {
        prefix: 'nucleo',
        dir: './app/assets/icons/nucleo',
      },
    ],
  },
})
