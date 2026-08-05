<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { joinURL } from 'ufo'

const { seo } = useAppConfig()
const site = useSiteConfig()

const title = 'Give any agent GitHub access'
const description = seo.description
const ogImage = site.url ? joinURL(site.url, '/og.png') : undefined

useSeo({ title, description, type: 'website', ogImage })

const installCmd = 'pnpm add @github-tools/sdk'
const { copy, copied } = useClipboard()

const frameworks = [
  {
    title: 'AI SDK',
    description: 'Already have an AI SDK app? Drop the tools into generateText, streamText, or a ToolLoopAgent.',
    to: '/frameworks/ai-sdk',
    icon: 'i-lucide-sparkles',
  },
  {
    title: 'Vercel Workflow',
    description: 'Need agents that survive restarts and long approvals? Every tool call is a durable, retryable step.',
    to: '/frameworks/vercel-workflow',
    icon: 'i-lucide-refresh-cw',
  },
  {
    title: 'Chat SDK',
    description: 'Building a GitHub, Slack, or Discord bot? Durable multi-turn sessions in ~60 lines.',
    to: '/frameworks/chat-sdk',
    icon: 'i-lucide-message-square',
  },
]

const pillars = [
  {
    title: 'Agent-ready',
    description: 'Mount as an eve extension in one file: a complete, durable GitHub agent in 3.',
    to: '/frameworks/eve-extension',
    icon: 'i-custom:eve',
    featured: true,
  },
  {
    title: 'Scoped by task',
    description: 'Presets hand an agent exactly what a job needs (code review, issue triage, security audits, releases), nothing more.',
    to: '/guide/presets',
    icon: 'i-lucide-layers',
  },
  {
    title: 'Safe by default',
    description: 'Every write pauses for human approval unless you opt out. Approve once per session, or gate on a predicate.',
    to: '/guide/approval-control',
    icon: 'i-lucide-shield-check',
  },
  {
    title: 'Durable by design',
    description: 'Every tool call is a "use step" boundary, so agents survive restarts, retries, and long-running approvals.',
    to: '/frameworks/vercel-workflow',
    icon: 'i-lucide-refresh-cw',
  },
  {
    title: 'Token-efficient',
    description: 'Shaped outputs, truncated patches, paginated list tools, and toolpick integration, built for the context window.',
    to: '/api/tools-catalog',
    icon: 'i-lucide-gauge',
  },
]

const comparisonRows = [
  { label: 'Integration', githubTools: 'Native AI SDK tool() objects', mcp: 'MCP wire protocol via a separate process', cli: 'Shell-out from the agent', octokit: 'Hand-written per call' },
  { label: 'Human approval', githubTools: 'Built in, on by default', mcp: 'Host-dependent, inconsistent', cli: 'None', octokit: 'You build it' },
  { label: 'Durable / retryable', githubTools: 'Every call is a "use step"', mcp: 'No', cli: 'No', octokit: 'No' },
  { label: 'Scoped by task', githubTools: 'Presets (7 built-in)', mcp: 'Full server surface, or manual filtering', cli: 'Full CLI surface', octokit: 'You build it' },
  { label: 'Token-efficient output', githubTools: 'Shaped and truncated by design', mcp: 'Raw API responses', cli: 'Raw text, needs parsing', octokit: 'Raw API responses' },
  { label: 'Native eve / Workflow / Chat SDK', githubTools: 'Yes', mcp: 'No', cli: 'No', octokit: 'No' },
]

const integrationStack = [
  { label: 'TypeScript', icon: 'i-simple-icons-typescript' },
  { label: 'Node.js', icon: 'i-simple-icons-nodedotjs' },
  { label: 'Bun', icon: 'i-simple-icons-bun' },
]

const eveFiles = [
  {
    name: 'instructions.md',
    code: 'You are a GitHub code-review assistant.',
  },
  {
    name: 'agent.ts',
    code: `import { defineAgent } from 'eve'

export default defineAgent({
  model: 'anthropic/claude-sonnet-5',
})`,
  },
  {
    name: 'extensions/github.ts',
    code: `import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  preset: 'maintainer',
})`,
  },
]
const activeEveFile = ref(0)
</script>

<template>
  <NuxtLayout name="default">
    <UContainer class="py-6 sm:py-8 [--ui-container:72rem]">
      <section class="min-w-0 max-w-full space-y-16 pb-16 pt-10 sm:pt-14">
        <header class="space-y-6">
          <h1 class="max-w-3xl text-4xl font-light tracking-tighter text-highlighted text-balance sm:text-5xl/[1.15]">
            Give any agent GitHub access
          </h1>
          <p class="max-w-2xl text-lg/8 text-toned">
            A typed tool layer for GitHub AI agents, with presets, human approval, and durable execution, built for the context window. Works with eve, the AI SDK, Vercel Workflow, and Chat SDK.
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <UButton
              to="/frameworks/eve-extension"
              color="neutral"
              variant="solid"
              size="md"
            >
              Build a GitHub agent
            </UButton>
            <UButton
              to="/getting-started/quick-start"
              color="neutral"
              variant="outline"
              size="md"
            >
              Quick Start
            </UButton>
          </div>
        </header>

        <div class="vercel-command-bar max-w-xl">
          <span class="select-all truncate">{{ installCmd }}</span>
          <UButton
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            class="ms-auto shrink-0 text-highlighted"
            aria-label="Copy install command"
            @click="copy(installCmd)"
          />
        </div>

        <section class="space-y-4">
          <p class="vercel-section-label">
            Pick your path
          </p>
          <div class="grid min-w-0 gap-4 lg:grid-cols-2">
          <div class="flex min-w-0 flex-col overflow-hidden rounded-xl border border-default bg-elevated">
            <div class="flex items-center gap-1 overflow-x-auto border-b border-default px-2 pt-2">
              <button
                v-for="(file, index) in eveFiles"
                :key="file.name"
                type="button"
                class="shrink-0 rounded-t-md border-b-2 px-3 py-2 font-mono text-xs transition"
                :class="index === activeEveFile ? 'border-highlighted text-highlighted' : 'border-transparent text-muted hover:text-toned'"
                @click="activeEveFile = index"
              >
                {{ file.name }}
              </button>
            </div>
            <pre class="min-h-32 min-w-0 flex-1 overflow-x-auto whitespace-pre px-4 py-4 font-mono text-xs leading-relaxed text-toned sm:text-sm"><code>{{ eveFiles[activeEveFile]!.code }}</code></pre>
            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default px-4 py-3.5">
              <p class="text-sm/6 text-toned">
                <span class="font-semibold text-highlighted">A GitHub agent in 3 files.</span>
                One file registers every tool your agent needs, durable approval included.
              </p>
              <UButton
                to="/frameworks/eve-extension"
                variant="link"
                color="neutral"
                size="sm"
                trailing-icon="i-lucide-arrow-right"
                class="shrink-0 px-0 text-highlighted"
              >
                Guide
              </UButton>
            </div>
          </div>
            <div class="grid min-w-0 gap-4">
              <NuxtLink
                v-for="framework in frameworks"
                :key="framework.title"
                :to="framework.to"
                class="vercel-card group flex min-h-28 flex-col gap-3"
              >
                <div class="flex items-center gap-2.5">
                  <UIcon :name="framework.icon" class="size-4.5 shrink-0 text-toned transition group-hover:text-highlighted" />
                  <p class="text-base font-semibold text-highlighted">{{ framework.title }}</p>
                </div>
                <p class="text-sm/6 text-toned">{{ framework.description }}</p>
              </NuxtLink>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 pt-2">
            <span class="text-xs text-muted">Works in any TypeScript app:</span>
            <UBadge
              v-for="target in integrationStack"
              :key="target.label"
              color="neutral"
              variant="outline"
              size="md"
              :icon="target.icon"
              :label="target.label"
            />
          </div>
        </section>

        <section class="space-y-4">
          <p class="vercel-section-label">
            Why github-tools
          </p>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="item in pillars"
              :key="item.title"
              :to="item.to"
              class="vercel-card group flex flex-col justify-between"
              :class="item.featured ? 'lg:row-span-2 min-h-64' : 'min-h-36'"
            >
              <UIcon :name="item.icon" class="size-5 text-toned transition group-hover:text-highlighted" />
              <div class="space-y-2">
                <p class="text-lg font-semibold text-highlighted">{{ item.title }}</p>
                <p class="text-sm/6 text-toned">{{ item.description }}</p>
              </div>
            </NuxtLink>
          </div>
        </section>

        <section class="space-y-4">
          <p class="vercel-section-label">
            github-tools vs the alternatives
          </p>
          <p class="max-w-2xl text-sm/6 text-toned">
            The GitHub MCP server, the <code class="rounded bg-accented px-1 py-0.5 font-mono text-highlighted">gh</code> CLI, and raw Octokit calls all reach the GitHub API, but none of them were built as an agent's tool layer.
          </p>
          <div class="overflow-x-auto rounded-xl border border-default">
            <table class="w-full min-w-180 border-collapse text-left text-sm">
              <thead>
                <tr class="border-b border-default bg-muted">
                  <th class="px-4 py-3 font-medium text-muted" />
                  <th class="px-4 py-3 font-semibold text-highlighted">github-tools</th>
                  <th class="px-4 py-3 font-medium text-toned">GitHub MCP server</th>
                  <th class="px-4 py-3 font-medium text-toned">gh CLI</th>
                  <th class="px-4 py-3 font-medium text-toned">Raw Octokit</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in comparisonRows"
                  :key="row.label"
                  class="border-b border-default last:border-b-0"
                >
                  <td class="px-4 py-3 font-medium text-highlighted">{{ row.label }}</td>
                  <td class="px-4 py-3 text-toned">{{ row.githubTools }}</td>
                  <td class="px-4 py-3 text-muted">{{ row.mcp }}</td>
                  <td class="px-4 py-3 text-muted">{{ row.cli }}</td>
                  <td class="px-4 py-3 text-muted">{{ row.octokit }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </UContainer>
  </NuxtLayout>
</template>
