export default defineAppConfig({
  name: 'GitHub Tools',
  description: 'AI-callable GitHub tools for the Vercel AI SDK — presets, agents, durable workflows, and granular write approvals for production use.',
  landing: false,
  socials: {
    x: 'https://x.com/hugorcd',
  },
  seo: {
    titleTemplate: '%s - GitHub Tools',
    title: 'GitHub Tools',
    description: 'AI-callable GitHub tools for the Vercel AI SDK — presets, agents, durable workflows, and granular write approvals for production use.',
  },
  github: {
    rootDir: 'apps/docs',
  },
  assistant: {
    icons: {
      trigger: 'i-custom:ai',
    },
    faqQuestions: [
      {
        category: 'Tools',
        items: [
          'What tools are available in the SDK?',
          'How do I use GitHub tools with generateText?',
          'Which tools require write permissions?',
        ],
      },
      {
        category: 'Presets',
        items: [
          'What is the difference between presets?',
          'How do I combine multiple presets?',
          'Which preset should I use for a code review agent?',
        ],
      },
      {
        category: 'Agents',
        items: [
          'How do I create a reusable GitHub agent?',
          'What is the difference between createGithubTools and createGithubAgent?',
          'How do I add custom system instructions to an agent?',
        ],
      },
      {
        category: 'Safety',
        items: [
          'How does approval control work?',
          'What token permissions do I need?',
          'How do I run the SDK in read-only mode?',
        ],
      },
    ],
  },
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'neutral',
    },
    prose: {
      prompt: {
        slots: {
          root: 'relative flex flex-wrap items-center gap-2 border border-default bg-elevated/50 rounded-sm px-4 py-3 my-5 last:mb-0',
        },
      },
      p: {
        slots: {
          root: 'text-base/7 text-toned',
        },
      },
    },
    pageFeature: {
      slots: {
        root: 'relative rounded-sm py-2',
        title: 'text-base/7 text-pretty font-semibold text-highlighted',
        description: 'mt-1 text-[15px]/7 text-pretty text-muted',
      },
      variants: {
        orientation: {
          horizontal: {
            root: 'mb-3 flex items-start gap-3',
          },
        },
      },
    },
  },
  footer: {
    sections: [
      {
        title: 'Getting Started',
        links: [
          { label: 'Introduction', to: '/getting-started/introduction' },
          { label: 'Installation', to: '/getting-started/installation' },
          { label: 'Agent Skills', to: '/getting-started/agent-skills' },
        ],
      },
      {
        title: 'Guides',
        links: [
          { label: 'Quick Start', to: '/guide/quick-start' },
          { label: 'Presets', to: '/guide/presets' },
          { label: 'Durable Workflows', to: '/guide/durable-workflows' },
        ],
      },
      {
        title: 'API',
        links: [
          { label: 'Tools Catalog', to: '/api/tools-catalog' },
          { label: 'API Reference', to: '/api/reference' },
        ],
      },
    ],
  },
})
