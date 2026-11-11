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
      { path: '/start/agent-skills' }
    ]
  },
  {
    label: 'Learn',
    items: [
      { path: '/learn/github-agents' },
      { path: '/learn/tool-calls' },
      { path: '/learn/first-agent' }
    ]
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
      { path: '/observability' }
    ]
  },
  {
    label: 'Integrations',
    items: [
      { path: '/integrations', title: 'Overview' },
      { path: '/integrations/eve' },
      { path: '/integrations/ai-sdk' },
      { path: '/integrations/tanstack-ai' },
      { path: '/integrations/workflow' },
      { path: '/integrations/chat-sdk' }
    ]
  },
  {
    label: 'Guides',
    items: [
      { path: '/guides', title: 'Overview' },
      { path: '/guides/review-pull-requests' },
      { path: '/guides/triage-issues' },
      { path: '/guides/fix-failing-ci' },
      { path: '/guides/release-notes' },
      { path: '/guides/chat-bot' },
      { path: '/guides/multi-agent' }
    ]
  },
  {
    label: 'Compare',
    items: [
      { path: '/compare/github-mcp-server' },
      { path: '/compare/octokit-and-gh-cli' }
    ]
  },
  {
    label: 'Reference',
    items: [
      { path: '/reference/api' },
      { path: '/reference/tools' },
      { path: '/reference/glossary' },
      { path: '/reference/upgrade' }
    ]
  }
]

/** Sections of the docs home, each a row of cards. */
export const docsHomeSections: { label: string, paths: string[] }[] = [
  { label: 'New to GitHub agents', paths: ['/learn/github-agents', '/learn/tool-calls', '/learn/first-agent', '/start/quick-start'] },
  { label: 'Guides', paths: ['/guides/review-pull-requests', '/guides/triage-issues', '/guides/fix-failing-ci', '/guides/chat-bot'] },
  { label: 'Core', paths: ['/tools', '/presets', '/approval', '/auth'] },
  { label: 'Integrations', paths: ['/integrations/eve', '/integrations/ai-sdk', '/integrations/tanstack-ai', '/integrations/workflow'] },
  { label: 'Compare', paths: ['/compare/github-mcp-server', '/compare/octokit-and-gh-cli'] }
]
