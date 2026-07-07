<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { joinURL } from 'ufo'

const { seo } = useAppConfig()
const site = useSiteConfig()

const title = 'Connect GitHub to any agent'
const description = seo.description
const ogImage = site.url ? joinURL(site.url, '/og.png') : undefined

useSeo({ title, description, type: 'website', ogImage })

const installCmd = 'pnpm add @github-tools/sdk'
const { copy, copied } = useClipboard()

const layers = [
  {
    title: 'Tools',
    description: '42 AI-callable GitHub operations — repositories, branches, pull requests, issues, commits, search, gists, and workflows.',
    to: '/api/tools-catalog',
    icon: 'i-custom:sdk',
    featured: true,
  },
  {
    title: 'Presets',
    description: 'Curated tool subsets for focused workflows. Create specialized agents with separation of concerns.',
    to: '/guide/presets',
    icon: 'i-lucide-layers',
  },
  {
    title: 'Agents',
    description: 'Pre-configured agents with tools, presets, and system instructions ready to use.',
    to: '/frameworks/ai-sdk',
    icon: 'i-custom:bot',
  },
]

const frameworks = [
  {
    title: 'AI SDK',
    description: 'Drop the tools into generateText, streamText, or a ToolLoopAgent — the core integration path.',
    to: '/frameworks/ai-sdk',
    icon: 'i-simple-icons-vercel',
  },
  {
    title: 'eve',
    description: 'A complete GitHub agent in 3 files, with durable approval — once, predicates, always.',
    to: '/frameworks/eve',
    icon: 'i-custom:eve',
  },
  {
    title: 'Vercel Workflow',
    description: 'Crash-safe agents — every tool call is a durable, retryable workflow step.',
    to: '/frameworks/vercel-workflow',
    icon: 'i-lucide-refresh-cw',
  },
  {
    title: 'Chat SDK',
    description: 'GitHub, Slack, and Discord bots with durable multi-turn sessions in ~60 lines.',
    to: '/frameworks/chat-sdk',
    icon: 'i-lucide-message-square',
  },
]

const integrationStack = [
  { label: 'TypeScript', icon: 'i-simple-icons-typescript' },
  { label: 'Node.js', icon: 'i-simple-icons-nodedotjs' },
  { label: 'Bun', icon: 'i-simple-icons-bun' },
]

const guides = [
  { title: 'Quick Start', to: '/getting-started/quick-start' },
  { title: 'Installation', to: '/getting-started/installation' },
  { title: 'Presets', to: '/guide/presets' },
  { title: 'Approval Control', to: '/guide/approval-control' },
  { title: 'Tokens & Auth', to: '/guide/tokens-and-auth' },
  { title: 'Commit Attribution', to: '/guide/commit-attribution' },
  { title: 'Examples', to: '/guide/examples' },
  { title: 'Agent Skills', to: '/getting-started/agent-skills' },
]

const apiLinks = [
  { title: 'Tools Catalog', to: '/api/tools-catalog' },
  { title: 'API Reference', to: '/api/reference' },
]
</script>

<template>
  <NuxtLayout name="docs">
    <section class="min-w-0 max-w-full space-y-16 pb-16 pt-10 sm:pt-14">
      <header class="space-y-6">
        <h1 class="max-w-3xl text-4xl font-light tracking-tighter text-highlighted text-balance sm:text-5xl/[1.15]">
          Connect GitHub to any agent
        </h1>
        <p class="max-w-2xl text-lg/8 text-toned">
          42 typed GitHub tools with presets, human approval, and durable execution — for the AI SDK, eve, Vercel Workflow, and Chat SDK.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <UButton
            to="/getting-started/quick-start"
            color="neutral"
            variant="solid"
            size="md"
          >
            Quick Start
          </UButton>
          <UButton
            to="/api/tools-catalog"
            color="neutral"
            variant="outline"
            size="md"
          >
            Browse tools
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
          Three layers, one SDK
        </p>
        <div class="grid gap-4 lg:grid-cols-2 lg:grid-rows-2">
          <NuxtLink
            v-for="item in layers"
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
          Works with your framework
        </p>
        <div class="grid min-w-0 gap-4 lg:grid-cols-2">
          <div class="grid min-w-0 gap-4 sm:grid-cols-2">
            <NuxtLink
              v-for="framework in frameworks"
              :key="framework.title"
              :to="framework.to"
              class="vercel-card group flex min-h-36 flex-col justify-between"
            >
              <UIcon :name="framework.icon" class="size-5 text-toned transition group-hover:text-highlighted" />
              <div class="space-y-2">
                <p class="text-base font-semibold text-highlighted">{{ framework.title }}</p>
                <p class="text-sm/6 text-toned">{{ framework.description }}</p>
              </div>
            </NuxtLink>
          </div>
          <NuxtLink
            to="/frameworks/eve"
            class="vercel-card group flex min-w-0 flex-col justify-between gap-4"
          >
            <pre class="min-w-0 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-toned sm:text-xs"><code><span class="text-muted">// instructions.md</span>
You are a GitHub code-review assistant.

<span class="text-muted">// agent.ts</span>
<span class="text-highlighted">import</span> { defineAgent } <span class="text-highlighted">from</span> 'eve'
<span class="text-highlighted">export default</span> defineAgent({
  model: 'anthropic/claude-sonnet-5',
})

<span class="text-muted">// tools/github.ts</span>
<span class="text-highlighted">import</span> { createGithubTools } <span class="text-highlighted">from</span> '@github-tools/sdk/eve'
<span class="text-highlighted">export default</span> createGithubTools({
  preset: 'maintainer',
})</code></pre>
            <p class="text-sm/6 text-toned">
              <span class="font-semibold text-highlighted">A GitHub agent in 3 files.</span>
              With eve, one tools file registers all 42 tools — durable approval included.
            </p>
          </NuxtLink>
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

      <section class="grid gap-10 sm:grid-cols-2">
        <div class="space-y-4">
          <p class="vercel-section-label">
            Guides
          </p>
          <ul class="space-y-2">
            <li
              v-for="guide in guides"
              :key="guide.to"
            >
              <NuxtLink
                :to="guide.to"
                class="text-sm text-toned transition hover:text-highlighted"
              >
                {{ guide.title }}
              </NuxtLink>
            </li>
          </ul>
        </div>
        <div class="space-y-4">
          <p class="vercel-section-label">
            API
          </p>
          <ul class="space-y-2">
            <li
              v-for="link in apiLinks"
              :key="link.to"
            >
              <NuxtLink
                :to="link.to"
                class="text-sm text-toned transition hover:text-highlighted"
              >
                {{ link.title }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </section>
    </section>
  </NuxtLayout>
</template>
