export type DocsSidebarItem = {
  path: string
  /** Replaces the page's navigation title in the sidebar, e.g. "Overview" for a section index. */
  title?: string
}

export type DocsSidebarGroup = {
  label: string
  items: DocsSidebarItem[]
}

/** Sidebar groups, in order. Titles and icons come from each page's frontmatter. */
export const docsSidebar: DocsSidebarGroup[] = [
  {
    label: 'Getting started',
    items: [
      { path: '/start/introduction' },
      { path: '/start/installation' },
      { path: '/start/quick-start' },
      { path: '/start/agent-skills' },
    ],
  },
  {
    label: 'Core',
    items: [
      { path: '/tools' },
      { path: '/presets' },
      { path: '/approval' },
      { path: '/auth' },
      { path: '/context' },
      { path: '/commits' },
      { path: '/errors' },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { path: '/integrations', title: 'Overview' },
      { path: '/integrations/eve' },
      { path: '/integrations/ai-sdk' },
      { path: '/integrations/tanstack-ai' },
      { path: '/integrations/workflow' },
      { path: '/integrations/chat-sdk' },
    ],
  },
  {
    label: 'Examples',
    items: [
      { path: '/examples', title: 'Overview' },
      { path: '/examples/eve-stale-issue-triager' },
      { path: '/examples/ai-sdk-release-notes-generator' },
      { path: '/examples/vercel-workflow-ci-failure-bot' },
      { path: '/examples/chat-sdk-issue-triage-bot' },
      { path: '/examples/manager-agent-with-subagents' },
    ],
  },
  {
    label: 'Reference',
    items: [
      { path: '/reference/api' },
      { path: '/reference/tools' },
      { path: '/reference/glossary' },
      { path: '/reference/upgrade' },
    ],
  },
]

/** Sections of the docs home, each a row of cards. */
export const docsHomeSections: { label: string, paths: string[] }[] = [
  { label: 'Popular', paths: ['/start/quick-start', '/integrations/eve', '/approval', '/presets'] },
  { label: 'Core', paths: ['/tools', '/auth', '/context', '/errors'] },
  { label: 'Integrations', paths: ['/integrations/ai-sdk', '/integrations/tanstack-ai', '/integrations/workflow', '/integrations/chat-sdk'] },
  { label: 'Examples', paths: ['/examples/eve-stale-issue-triager', '/examples/ai-sdk-release-notes-generator', '/examples/vercel-workflow-ci-failure-bot', '/examples/manager-agent-with-subagents'] },
]
