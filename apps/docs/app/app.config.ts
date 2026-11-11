export default defineAppConfig({
  name: 'GitHub tools',
  description: 'A typed tool layer for GitHub AI agents, with presets, human approval, and durable execution. Works with eve, the AI SDK, Vercel Workflow, and Chat SDK.',
  landing: false,
  socials: {
    x: 'https://x.com/hugorcd',
  },
  search: {
    fts: true,
  },
  seo: {
    titleTemplate: '%s - GitHub tools',
    title: 'GitHub tools',
    description: 'A typed tool layer for GitHub AI agents, with presets, human approval, and durable execution. Works with eve, the AI SDK, Vercel Workflow, and Chat SDK.',
    schema: {
      type: 'SoftwareApplication',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      price: 0,
      priceCurrency: 'USD',
      sameAs: [
        'https://github.com/vercel-labs/github-tools',
        'https://www.npmjs.com/package/@github-tools/sdk',
      ],
      organization: {
        name: 'Vercel',
        url: 'https://vercel.com',
        sameAs: [
          'https://github.com/vercel',
          'https://x.com/vercel',
        ],
      },
    },
  },
  github: {
    rootDir: 'apps/docs',
    url: 'https://github.com/vercel-labs/github-tools',
  },
  assistant: {
    icons: {
      trigger: 'i-custom:ai',
    },
    faqQuestions: [
      {
        category: 'Get started',
        items: [
          'How do I build a GitHub agent with eve?',
          'How do I pick the right integration for my agent?',
          'Which preset should I use?',
          'How is this different from the GitHub MCP server or the gh CLI?',
        ],
      },
      {
        category: 'Build agents',
        items: [
          'How do I add GitHub tools as an eve extension?',
          'How do I build a PR review bot?',
          'When should I use createGithubAgent vs createGithubTools?',
        ],
      },
      {
        category: 'Go to production',
        items: [
          'How do I make agents crash-safe with Workflow?',
          'How do I stream a durable agent to chat?',
          'How do I reduce tool context with toolpick?',
        ],
      },
      {
        category: 'Safety & auth',
        items: [
          'How do I require approval before merging?',
          'How do I approve writes once per session?',
          'How do I use Vercel Connect for tokens?',
        ],
      },
      {
        category: 'Customize',
        items: [
          'How do I credit my bot on commits?',
          'How do I override tool descriptions?',
          'How do I cherry-pick individual tools?',
        ],
      },
    ],
  },
  ui: {
    colors: {
      primary: 'neutral',
      neutral: 'neutral',
    },
    container: {
      base: 'w-full max-w-(--ui-container) mx-auto px-6',
    },
    header: {
      slots: {
        root: 'bg-default/80 backdrop-blur border-b border-default h-(--ui-header-height) sticky top-0 z-50',
        right: 'flex items-center justify-end lg:flex-1 gap-1 md:gap-1.5',
      },
    },
    pageHeader: {
      slots: {
        root: 'relative py-10 sm:py-12',
        title: 'text-[2rem]/10 sm:text-[2.5rem]/12 font-[450] tracking-[-0.035em] text-pretty text-highlighted',
        description: 'text-lg/7 font-normal text-toned mt-3',
        headline: 'hidden',
      },
    },
    contentSearch: {
      slots: {
        modal: 'rounded-xl border border-default bg-default shadow-2xl ring-0',
      },
      variants: {
        fullscreen: {
          false: {
            modal: 'sm:max-w-2xl h-full sm:h-[26rem]',
          },
        },
      },
    },
    commandPalette: {
      slots: {
        input: '[&>input]:text-[15px]',
        label: 'px-2.5 pt-2.5 pb-1 text-xs font-normal text-muted',
        item: 'px-2.5 py-2 text-sm before:rounded-md',
        itemLeadingIcon: 'size-4 text-muted group-data-highlighted:text-highlighted',
      },
    },
    contentToc: {
      defaultVariants: {
        highlightVariant: 'circuit',
      },
      slots: {
        trigger: 'text-sm font-normal text-highlighted',
        link: 'text-sm font-normal py-1',
      },
      variants: {
        active: {
          false: {
            link: 'text-muted hover:text-highlighted',
          },
        },
      },
    },
    contentNavigation: {
      defaultVariants: {
        variant: 'link',
        color: 'neutral',
      },
      slots: {
        trigger: 'font-normal',
        link: 'font-normal',
      },
      variants: {
        active: {
          false: {
            link: 'text-toned hover:text-highlighted',
          },
        },
      },
    },
    contentSurround: {
      slots: {
        linkTitle: 'font-normal text-[15px] text-highlighted mb-1 truncate',
      },
    },
    button: {
      compoundVariants: [
        {
          color: 'neutral',
          variant: 'outline',
          class: 'ring-0 border border-default bg-accented text-highlighted shadow-sm hover:bg-muted hover:border-border-accented active:bg-muted',
        },
        {
          color: 'neutral',
          variant: 'subtle',
          class: 'ring-1 ring-inset ring-default bg-accented text-toned hover:text-highlighted hover:bg-muted hover:ring-border-accented',
        },
        {
          color: 'neutral',
          variant: 'ghost',
          class: 'text-toned hover:text-highlighted hover:bg-accented/80',
        },
      ],
    },
    prose: {
      h1: {
        slots: {
          base: 'text-[2rem]/10 font-[450] tracking-[-0.035em]',
        },
      },
      h2: {
        slots: {
          base: 'text-2xl/8 font-[450] tracking-[-0.025em]',
        },
      },
      h3: {
        slots: {
          base: 'text-xl/[26px] font-[450] tracking-[-0.015em]',
        },
      },
      h4: {
        slots: {
          base: 'text-base/6 font-medium',
        },
      },
      a: {
        base: 'font-normal',
      },
      li: {
        base: 'font-normal',
      },
      th: {
        base: 'text-[13px] font-medium text-highlighted',
      },
      prompt: {
        slots: {
          root: 'relative my-4 flex flex-wrap items-center gap-2 border border-default bg-muted rounded-lg px-3 py-2.5',
          description: 'min-w-0 flex-1 text-sm/5 text-toned',
          actions: 'prompt-actions flex shrink-0 flex-wrap items-center gap-1.5 sm:ms-auto',
        },
      },
      p: {
        base: 'my-4 text-base/6 font-normal text-toned text-pretty',
      },
    },
    pageFeature: {
      slots: {
        root: 'relative rounded-sm py-2',
        title: 'text-base/7 text-pretty font-normal text-highlighted',
        description: 'mt-1 text-[15px]/7 font-normal text-pretty text-muted',
      },
      variants: {
        orientation: {
          horizontal: {
            root: 'mb-3 flex items-start gap-3',
          },
        },
      },
    },
    pageLinks: {
      slots: {
        root: 'flex flex-col gap-1.5',
        title: 'text-[12px] font-medium uppercase tracking-wider text-muted',
        list: 'flex flex-col gap-px',
        link: 'w-full min-w-0 items-start text-left rounded-md px-2 py-1.5 transition-colors',
        linkLabel: 'min-w-0 flex-1 whitespace-normal text-left text-[13px]/5 text-pretty',
      },
      variants: {
        active: {
          false: {
            link: 'text-muted hover:text-highlighted hover:bg-accented',
          },
        },
      },
    },
  },
  footer: {
    sections: [
      {
        title: 'Start',
        links: [
          { label: 'Introduction', to: '/start/introduction' },
          { label: 'Installation', to: '/start/installation' },
          { label: 'Quick start', to: '/start/quick-start' },
          { label: 'Agent skills', to: '/start/agent-skills' },
        ],
      },
      {
        title: 'Core',
        links: [
          { label: 'Tools', to: '/tools' },
          { label: 'Presets', to: '/presets' },
          { label: 'Approval', to: '/approval' },
          { label: 'Auth', to: '/auth' },
          { label: 'Context', to: '/context' },
          { label: 'Commits', to: '/commits' },
          { label: 'Errors', to: '/errors' },
          { label: 'Observability', to: '/observability' },
        ],
      },
      {
        title: 'Integrations',
        links: [
          { label: 'eve', to: '/integrations/eve' },
          { label: 'AI SDK', to: '/integrations/ai-sdk' },
          { label: 'TanStack AI', to: '/integrations/tanstack-ai' },
          { label: 'Vercel Workflow', to: '/integrations/workflow' },
          { label: 'Chat SDK', to: '/integrations/chat-sdk' },
        ],
      },
      {
        title: 'Reference',
        links: [
          { label: 'API', to: '/reference/api' },
          { label: 'Tool catalog', to: '/reference/tools' },
          { label: 'Glossary', to: '/reference/glossary' },
          { label: 'Guides', to: '/guides' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { label: 'GitHub', to: 'https://github.com/vercel-labs/github-tools' },
          { label: 'npm', to: 'https://www.npmjs.com/package/@github-tools/sdk' },
        ],
      },
    ],
  },
})
