export default defineAppConfig({
  name: 'GitHub Tools',
  description: 'AI-callable GitHub tools for the Vercel AI SDK and Eve — presets, agents, durable workflows, and granular write approvals for production use.',
  landing: false,
  socials: {
    x: 'https://x.com/hugorcd',
  },
  seo: {
    titleTemplate: '%s - GitHub Tools',
    title: 'GitHub Tools',
    description: 'AI-callable GitHub tools for the Vercel AI SDK and Eve — presets, agents, durable workflows, and granular write approvals for production use.',
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
      {
        category: 'Eve',
        items: [
          'How do I use these GitHub tools in an Eve agent?',
          'What does the github-tools eve scaffold CLI generate?',
          'How does write approval work in Eve compared to the AI SDK?',
        ],
      },
    ],
  },
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'zinc',
    },
    prose: {
      h1: {
        slots: {
          root: 'scroll-m-20 text-3xl/9 font-semibold tracking-tight sm:text-4xl/10',
        },
      },
      h2: {
        slots: {
          root: 'mt-10 text-2xl/8 font-semibold tracking-tight',
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
})
