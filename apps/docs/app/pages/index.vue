<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { joinURL } from 'ufo'

const { seo } = useAppConfig()
const site = useSiteConfig()

const title = 'GitHub tools for AI agents'
const description = seo.description
const ogImage = site.url ? joinURL(site.url, '/og.png') : undefined

useSeo({ title, description, type: 'website', ogImage })

const installCmd = 'pnpm add @github-tools/sdk ai zod'
const { copy, copied } = useClipboard()

const stats = [
  { value: '91', label: 'GitHub operations', detail: 'Typed inputs, results trimmed to what the model reads', to: '/reference/tools' },
  { value: '10', label: 'Presets', detail: 'One tool set per job, from code review to releases', to: '/presets' },
  { value: '45', label: 'Writes ask first', detail: 'Every write waits for a person unless you say otherwise', to: '/approval' },
  { value: '5', label: 'Integrations', detail: 'eve, AI SDK, TanStack AI, Vercel Workflow, Chat SDK', to: '/integrations' }
]

const integrations = [
  { title: 'eve', description: 'Mount the tools in an eve agent from one file.', to: '/integrations/eve', icon: 'i-custom:eve' },
  { title: 'AI SDK', description: 'generateText, streamText and a reusable agent.', to: '/integrations/ai-sdk', icon: 'i-custom:ai' },
  { title: 'TanStack AI', description: 'Native server tools and approval interrupts.', to: '/integrations/tanstack-ai', icon: 'i-nucleo-cube' },
  { title: 'Vercel Workflow', description: 'Runs that resume after a crash and wait for approval.', to: '/integrations/workflow', icon: 'i-simple-icons-vercel' },
  { title: 'Chat SDK', description: 'A bot that answers mentions on GitHub or Slack.', to: '/integrations/chat-sdk', icon: 'i-nucleo-chat-bubble' }
]

const guides = [
  { title: 'Review pull requests', to: '/guides/review-pull-requests' },
  { title: 'Triage issues', to: '/guides/triage-issues' },
  { title: 'Fix failing CI', to: '/guides/fix-failing-ci' },
  { title: 'Write release notes', to: '/guides/release-notes' }
]

const eveFiles = [
  {
    name: 'agent/agent.ts',
    code: `import { defineAgent } from 'eve'

export default defineAgent({
  model: 'anthropic/claude-opus-5.5',
})`
  },
  {
    name: 'agent/instructions.md',
    code: 'You are a GitHub assistant. Inspect pull requests and issues, and say what you changed.'
  },
  {
    name: 'agent/extensions/github.ts',
    code: `import githubExtension from '@github-tools/eve-extension'

export default githubExtension({
  preset: 'code-review',
})`
  }
]
const activeEveFile = ref(2)
</script>

<template>
  <NuxtLayout name="default">
    <UContainer class="[--ui-container:72rem]">
      <section class="grid gap-12 pt-16 pb-20 sm:pt-24 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div class="lg:col-span-5">
          <h1 class="landing-rise text-[2.5rem]/12 font-[450] tracking-[-0.04em] text-balance text-highlighted sm:text-5xl/[56px]">
            GitHub tools for AI agents
          </h1>
          <p
            class="landing-rise mt-5 max-w-[52ch] text-lg/7 text-toned"
            style="--i: 1"
          >
            Give a model typed GitHub operations, scoped to one job, with a person in front of every write. Works with eve, the AI SDK, TanStack AI, Vercel Workflow and Chat SDK.
          </p>
          <div
            class="landing-rise mt-8 flex flex-wrap items-center gap-3"
            style="--i: 2"
          >
            <UButton
              to="/start/quick-start"
              label="Quick start"
              color="neutral"
              size="lg"
            />
            <UButton
              to="/docs"
              label="Read the docs"
              color="neutral"
              variant="outline"
              size="lg"
            />
          </div>
          <div
            class="landing-rise mt-6 flex max-w-md items-center gap-2 rounded-lg border border-default bg-muted py-1.5 ps-3.5 pe-1.5"
            style="--i: 3"
          >
            <span class="text-dimmed select-none">$</span>
            <code class="min-w-0 flex-1 truncate font-mono text-[13px] text-highlighted select-all">{{ installCmd }}</code>
            <UButton
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              color="neutral"
              variant="ghost"
              size="sm"
              square
              aria-label="Copy install command"
              @click="copy(installCmd)"
            />
          </div>
        </div>

        <div
          class="landing-rise min-w-0 lg:col-span-7"
          style="--i: 2"
        >
          <ApprovalFlow />
        </div>
      </section>

      <section class="border-t border-default py-14">
        <dl class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="stat in stats"
            :key="stat.label"
            :to="stat.to"
            class="group"
          >
            <dt class="text-[13px] font-medium text-muted">
              {{ stat.label }}
            </dt>
            <dd class="mt-2 text-5xl/[56px] font-[450] tracking-[-0.04em] text-highlighted tabular-nums">
              {{ stat.value }}
            </dd>
            <dd class="mt-2 text-sm/5 text-toned group-hover:text-highlighted">
              {{ stat.detail }}
            </dd>
          </NuxtLink>
        </dl>
      </section>

      <section class="grid gap-10 border-t border-default py-14 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <h2 class="text-2xl/8 font-[450] tracking-[-0.025em] text-highlighted">
            A GitHub agent in three files
          </h2>
          <p class="mt-3 max-w-[52ch] text-base/6 text-toned">
            The eve extension adds the tools, instructions on how to use them, and an approval policy for every write. Run <code class="font-mono text-[13px] text-highlighted">npx eve dev</code> and ask about a pull request.
          </p>
          <UButton
            to="/integrations/eve"
            label="Build it with eve"
            trailing-icon="i-lucide-arrow-right"
            color="neutral"
            variant="link"
            class="mt-4 px-0"
          />
        </div>
        <div class="min-w-0 overflow-hidden rounded-lg border border-default bg-muted lg:col-span-7">
          <div
            role="tablist"
            aria-label="Agent files"
            class="flex gap-1 overflow-x-auto border-b border-default px-2"
          >
            <button
              v-for="(file, index) in eveFiles"
              :key="file.name"
              type="button"
              role="tab"
              :aria-selected="index === activeEveFile"
              class="shrink-0 border-b px-2.5 py-2.5 font-mono text-[12.5px] transition-colors"
              :class="index === activeEveFile ? 'border-(--ui-text-highlighted) text-highlighted' : 'border-transparent text-muted hover:text-highlighted'"
              @click="activeEveFile = index"
            >
              {{ file.name }}
            </button>
          </div>
          <pre class="min-h-36 overflow-x-auto p-4 font-mono text-[13px]/6 text-highlighted"><code>{{ eveFiles[activeEveFile]!.code }}</code></pre>
        </div>
      </section>

      <section class="border-t border-default py-14">
        <div class="flex flex-wrap items-baseline justify-between gap-4">
          <h2 class="text-2xl/8 font-[450] tracking-[-0.025em] text-highlighted">
            Works where your agent runs
          </h2>
          <NuxtLink
            to="/integrations"
            class="text-sm text-toned hover:text-highlighted"
          >
            Compare integrations
          </NuxtLink>
        </div>
        <ul class="mt-8 grid gap-px overflow-hidden rounded-lg border border-default bg-(--ui-border) sm:grid-cols-2 lg:grid-cols-5">
          <li
            v-for="integration in integrations"
            :key="integration.title"
            class="bg-default"
          >
            <NuxtLink
              :to="integration.to"
              class="group flex h-full flex-col gap-3 p-5 transition-colors hover:bg-muted"
            >
              <UIcon
                :name="integration.icon"
                class="size-5 text-highlighted"
              />
              <span class="text-base/6 font-medium text-highlighted">{{ integration.title }}</span>
              <span class="text-sm/5 text-toned">{{ integration.description }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section class="grid gap-10 border-t border-default py-14 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <h2 class="text-2xl/8 font-[450] tracking-[-0.025em] text-highlighted">
            Start from a job
          </h2>
          <p class="mt-3 max-w-[52ch] text-base/6 text-toned">
            Each guide pairs a preset with an integration and the code to run it.
          </p>
        </div>
        <ul class="divide-y divide-default border-y border-default lg:col-span-7">
          <li
            v-for="guide in guides"
            :key="guide.to"
          >
            <NuxtLink
              :to="guide.to"
              class="group flex items-center justify-between py-3.5 text-base/6 text-highlighted"
            >
              {{ guide.title }}
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-highlighted"
              />
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section class="grid gap-10 border-t border-default py-14 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <h2 class="text-2xl/8 font-[450] tracking-[-0.025em] text-highlighted">
            Already using something else?
          </h2>
          <p class="mt-3 max-w-[52ch] text-base/6 text-toned">
            How GitHub tools differs from the GitHub MCP server, Octokit and the gh CLI, and when to use each.
          </p>
        </div>
        <ul class="divide-y divide-default border-y border-default lg:col-span-7">
          <li>
            <NuxtLink
              to="/compare/github-mcp-server"
              class="group flex items-center justify-between py-3.5 text-base/6 text-highlighted"
            >
              GitHub tools and the GitHub MCP server
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-highlighted"
              />
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/compare/octokit-and-gh-cli"
              class="group flex items-center justify-between py-3.5 text-base/6 text-highlighted"
            >
              GitHub tools, Octokit and the gh CLI
              <UIcon
                name="i-lucide-arrow-right"
                class="size-4 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-highlighted"
              />
            </NuxtLink>
          </li>
        </ul>
      </section>
    </UContainer>
  </NuxtLayout>
</template>

<style>
.landing-rise {
  animation: landing-rise 600ms cubic-bezier(0.23, 1, 0.32, 1) backwards;
  animation-delay: calc(var(--i, 0) * 70ms);
}

@keyframes landing-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-rise {
    animation: none;
  }
}
</style>
