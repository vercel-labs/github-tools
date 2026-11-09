<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { joinURL } from 'ufo'
import { PRESET_TOOLS, TOOL_GROUPS, WRITE_TOOLS } from '~/utils/figure-data/presets'

const site = useSiteConfig()
const TOTAL = TOOL_GROUPS.reduce((sum, group) => sum + group.tools.length, 0)
const REVIEW = PRESET_TOOLS['code-review'].length

const title = 'All of GitHub, for your AI agents'
const description = `${TOTAL} typed GitHub operations across pull requests, issues, Actions, releases and security alerts. Presets scope each agent to its job, and every write waits for a person.`
const ogImage = site.url ? joinURL(site.url, '/og.png') : undefined

useSeo({ title, description, type: 'website', ogImage })

const installs = [
  { value: 'agents', label: 'For agents', command: 'npx skills add https://github-tools.com' },
  { value: 'humans', label: 'For humans', command: 'pnpm add @github-tools/sdk ai zod' }
] as const
const audience = ref<(typeof installs)[number]['value']>('agents')
const command = computed(() => installs.find(install => install.value === audience.value)!.command)
const { copy, copied } = useClipboard()

const comparisons = [
  {
    question: 'Tools the model reads on every request, for a code review',
    raw: { value: TOTAL, label: `${TOTAL} tools` },
    ours: { value: REVIEW, label: `${REVIEW} tools, the code-review preset` },
    max: TOTAL,
    to: '/presets',
    link: 'Presets'
  },
  {
    question: 'Tokens the model reads for one issue',
    raw: { value: 1130, label: 'about 1,130 tokens' },
    ours: { value: 90, label: 'about 90 tokens' },
    max: 1130,
    to: '/tools',
    link: 'Tools'
  },
  {
    question: 'Writes that reach GitHub without a person',
    raw: { value: WRITE_TOOLS.size, label: `all ${WRITE_TOOLS.size}` },
    ours: { value: 0, label: 'none: each waits for your approval' },
    max: WRITE_TOOLS.size,
    to: '/approval',
    link: 'Approval'
  }
]

const jobs = [
  { title: 'Review pull requests', detail: 'Read the diff and the checks, then post a review once you approve it.', preset: 'code-review', to: '/guides/review-pull-requests' },
  { title: 'Triage issues', detail: 'Label and comment on inactive issues, and ask before closing any.', preset: 'issue-triage', to: '/guides/triage-issues' },
  { title: 'Fix failing CI', detail: 'Explain why a GitHub Actions run failed, and ask before rerunning it.', preset: 'ci-ops', to: '/guides/fix-failing-ci' },
  { title: 'Write release notes', detail: 'Group what changed since the last release into a draft.', preset: 'release-manager', to: '/guides/release-notes' },
  { title: 'Answer in a chat thread', detail: 'A bot that triages an issue when someone mentions it on GitHub or Slack.', preset: 'issue-triage', to: '/guides/chat-bot' },
  { title: 'Split work across agents', detail: 'A manager hands each request to a subagent with its own preset.', preset: 'eve subagents', to: '/guides/multi-agent' }
]

type Token = [text: string, kind?: 'kw' | 'str' | 'fn' | 'cm' | 'pr']
const snippets: { value: string, label: string, file: string, lines: Token[][] }[] = [
  {
    value: 'ai-sdk',
    label: 'AI SDK',
    file: 'agent.ts',
    lines: [
      [['import', 'kw'], [' { createGithubAgent } '], ['from', 'kw'], [' '], ['\'@github-tools/sdk\'', 'str']],
      [],
      [['const', 'kw'], [' agent = '], ['createGithubAgent', 'fn'], ['({']],
      [['  model', 'pr'], [': '], ['\'anthropic/claude-opus-5.5\'', 'str'], [',']],
      [['  preset', 'pr'], [': '], ['\'code-review\'', 'str'], [', '], [`// ${REVIEW} tools, not ${TOTAL}`, 'cm']],
      [['  requireApproval', 'pr'], [': '], ['true', 'kw'], [', '], ['// every write waits for you', 'cm']],
      [['})']]
    ]
  },
  {
    value: 'eve',
    label: 'eve',
    file: 'agent/extensions/github.ts',
    lines: [
      [['import', 'kw'], [' githubExtension '], ['from', 'kw'], [' '], ['\'@github-tools/eve-extension\'', 'str']],
      [],
      [['export default', 'kw'], [' '], ['githubExtension', 'fn'], ['({']],
      [['  preset', 'pr'], [': '], ['\'code-review\'', 'str'], [',']],
      [['  requireApproval', 'pr'], [': { '], ['addPullRequestComment', 'pr'], [': '], ['\'once\'', 'str'], [' },']],
      [['})']]
    ]
  }
]
const snippet = ref(snippets[0]!.value)

const integrations = [
  { title: 'eve', description: 'Mount the tools in an eve agent from one file.', to: '/integrations/eve', icon: 'i-custom:eve' },
  { title: 'AI SDK', description: 'generateText, streamText and a reusable agent.', to: '/integrations/ai-sdk', icon: 'i-custom:ai' },
  { title: 'TanStack AI', description: 'Native server tools and approval interrupts.', to: '/integrations/tanstack-ai', icon: 'i-nucleo-cube' },
  { title: 'Vercel Workflow', description: 'Runs that resume after a crash and wait for approval.', to: '/integrations/workflow', icon: 'i-simple-icons-vercel' },
  { title: 'Chat SDK', description: 'A bot that answers mentions on GitHub or Slack.', to: '/integrations/chat-sdk', icon: 'i-nucleo-chat-bubble' }
]
</script>

<template>
  <NuxtLayout name="default">
    <UContainer>
      <section class="grid gap-12 pt-16 pb-20 sm:pt-24 lg:grid-cols-12 lg:items-center lg:gap-10">
        <div class="min-w-0 lg:col-span-5">
          <h1 class="text-[2.5rem]/12 font-[450] tracking-[-0.04em] text-balance text-highlighted sm:text-5xl/[56px]">
            All of GitHub, for your AI agents
          </h1>
          <p
            class="mt-5 max-w-[52ch] text-lg/7 text-toned"
          >
            {{ TOTAL }} typed operations across pull requests, issues, Actions, releases and security alerts. Presets scope each agent to its job, and every write waits for a person.
          </p>
          <div
            class="mt-8 flex flex-wrap items-center gap-3"
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
            class="mt-6 max-w-md overflow-hidden rounded-lg border border-default"
          >
            <div
              role="tablist"
              aria-label="Install"
              class="flex border-b border-default px-1.5"
            >
              <button
                v-for="install in installs"
                :key="install.value"
                type="button"
                role="tab"
                :aria-selected="audience === install.value"
                class="-mb-px border-b px-2.5 py-2 text-[13px] transition-colors duration-150"
                :class="audience === install.value ? 'border-(--ui-text-highlighted) text-highlighted' : 'border-transparent text-muted hover:text-highlighted'"
                @click="audience = install.value"
              >
                {{ install.label }}
              </button>
            </div>
            <div class="flex items-center gap-2 bg-muted py-1.5 ps-3.5 pe-1.5">
              <span class="text-dimmed select-none">$</span>
              <code class="min-w-0 flex-1 truncate font-mono text-[13px] text-highlighted select-all">{{ command }}</code>
              <UButton
                :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                color="neutral"
                variant="ghost"
                size="sm"
                square
                aria-label="Copy install command"
                @click="copy(command)"
              />
            </div>
          </div>
        </div>

        <div
          class="min-w-0 lg:col-span-7"
        >
          <LandingScene />
        </div>
      </section>

      <section class="border-t border-default py-16">
        <h2 class="max-w-[24ch] text-[2rem]/10 font-[450] tracking-[-0.035em] text-balance text-highlighted">
          Less to read, nothing written behind your back
        </h2>
        <p class="mt-4 max-w-[60ch] text-base/6 text-toned">
          Handed the raw GitHub API, a model reads every operation and every field GitHub returns, and its writes go straight through. Here is the same agent going through GitHub tools.
        </p>
        <div class="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
          <span class="inline-flex items-center gap-2"><span class="h-2 w-4 rounded-full bg-(--d-line-strong)" />Raw GitHub API</span>
          <span class="inline-flex items-center gap-2"><span class="h-2 w-4 rounded-full bg-(--d-signal)" />GitHub tools</span>
        </div>
        <ul class="mt-6 divide-y divide-default border-t border-default">
          <li
            v-for="row in comparisons"
            :key="row.question"
            class="grid gap-x-10 gap-y-4 py-6 lg:grid-cols-12"
          >
            <div class="lg:col-span-4">
              <p class="text-base/6 text-highlighted">
                {{ row.question }}
              </p>
              <NuxtLink
                :to="row.to"
                class="group mt-2 inline-flex items-center gap-1 text-sm text-muted hover:text-highlighted"
              >
                {{ row.link }}
                <UIcon
                  name="i-lucide-arrow-right"
                  class="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </NuxtLink>
            </div>
            <div class="flex flex-col gap-3 lg:col-span-8">
              <div class="grid grid-cols-[minmax(0,1fr)] gap-1.5">
                <span class="h-2.5 w-full rounded-full bg-(--d-raised-strong)">
                  <span
                    class="block h-full rounded-full bg-(--d-line-strong)"
                    :style="{ width: `${(row.raw.value / row.max) * 100}%` }"
                  />
                </span>
                <span class="text-[13px] text-muted tabular-nums">Raw API: {{ row.raw.label }}</span>
              </div>
              <div class="grid grid-cols-[minmax(0,1fr)] gap-1.5">
                <span class="h-2.5 w-full rounded-full bg-(--d-raised-strong)">
                  <span
                    class="block h-full min-w-0 rounded-full bg-(--d-signal)"
                    :style="{ width: `${(row.ours.value / row.max) * 100}%` }"
                  />
                </span>
                <span class="text-[13px] text-highlighted tabular-nums">GitHub tools: {{ row.ours.label }}</span>
              </div>
            </div>
          </li>
        </ul>
      </section>

      <section class="border-t border-default py-16">
        <h2 class="text-2xl/8 font-[450] tracking-[-0.025em] text-highlighted">
          Built for the jobs agents do on GitHub
        </h2>
        <p class="mt-3 max-w-[60ch] text-base/6 text-toned">
          Each guide pairs a preset with an integration and the code to run it.
        </p>
        <ul class="mt-8 grid gap-px bg-(--ui-border) p-px sm:grid-cols-2 lg:grid-cols-3">
          <li
            v-for="job in jobs"
            :key="job.to"
            class="bg-default"
          >
            <NuxtLink
              :to="job.to"
              class="group flex h-full flex-col gap-2 p-5 transition-colors hover:bg-muted"
            >
              <span class="flex items-center justify-between gap-3">
                <span class="text-base/6 font-medium text-highlighted">{{ job.title }}</span>
                <UIcon
                  name="i-lucide-arrow-right"
                  class="size-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-highlighted"
                />
              </span>
              <span class="text-sm/5 text-toned">{{ job.detail }}</span>
              <span class="mt-auto pt-2 font-mono text-[12px] text-muted">{{ job.preset }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section class="grid gap-10 border-t border-default py-16 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <h2 class="text-2xl/8 font-[450] tracking-[-0.025em] text-highlighted">
            Narrow by default
          </h2>
          <p class="mt-3 max-w-[52ch] text-base/6 text-toned">
            Pick the preset for the job, and keep approval on. The model then sees only that job's tools, and nothing it writes reaches GitHub until you say yes.
          </p>
          <UButton
            to="/start/quick-start"
            label="Quick start"
            trailing-icon="i-lucide-arrow-right"
            color="neutral"
            variant="link"
            class="mt-4 px-0"
          />
        </div>
        <div class="min-w-0 overflow-hidden rounded-lg border border-default bg-muted lg:col-span-7">
          <div class="flex items-center justify-between gap-3 border-b border-default ps-1.5 pe-3.5">
            <div
              role="tablist"
              aria-label="Integration"
              class="flex"
            >
              <button
                v-for="entry in snippets"
                :key="entry.value"
                type="button"
                role="tab"
                :aria-selected="snippet === entry.value"
                class="-mb-px border-b px-2.5 py-2.5 text-[13px] transition-colors duration-150"
                :class="snippet === entry.value ? 'border-(--ui-text-highlighted) text-highlighted' : 'border-transparent text-muted hover:text-highlighted'"
                @click="snippet = entry.value"
              >
                {{ entry.label }}
              </button>
            </div>
            <span class="truncate font-mono text-[12px] text-muted">{{ snippets.find(entry => entry.value === snippet)!.file }}</span>
          </div>
          <div class="d-stack">
            <pre
              v-for="entry in snippets"
              :key="entry.value"
              :aria-hidden="snippet !== entry.value"
              class="overflow-x-auto p-4 font-mono text-[13px]/6 text-highlighted"
              :class="snippet === entry.value ? '' : 'invisible'"
            ><code><span
              v-for="(line, index) in entry.lines"
              :key="index"
              class="block min-h-6"
            ><span
              v-for="(token, tokenIndex) in line"
              :key="tokenIndex"
              :class="token[1] ? `code-${token[1]}` : ''"
            >{{ token[0] }}</span></span></code></pre>
          </div>
        </div>
      </section>

      <section class="border-t border-default py-16">
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
        <ul class="mt-8 grid gap-px bg-(--ui-border) p-px sm:grid-cols-2 lg:grid-cols-5">
          <li
            v-for="integration in integrations"
            :key="integration.title"
            class="bg-default"
          >
            <NuxtLink
              :to="integration.to"
              class="flex h-full flex-col gap-3 p-5 transition-colors hover:bg-muted"
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

      <section class="grid gap-10 border-t border-default py-16 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <h2 class="text-2xl/8 font-[450] tracking-[-0.025em] text-highlighted">
            Already using something else?
          </h2>
          <p class="mt-3 max-w-[52ch] text-base/6 text-toned">
            How GitHub tools differs from the GitHub MCP server, Octokit and the gh CLI, and when to use each.
          </p>
        </div>
        <ul class="divide-y divide-default border-y border-default lg:col-span-7">
          <li
            v-for="link in [{ to: '/compare/github-mcp-server', label: 'GitHub tools and the GitHub MCP server' }, { to: '/compare/octokit-and-gh-cli', label: 'GitHub tools, Octokit and the gh CLI' }]"
            :key="link.to"
          >
            <NuxtLink
              :to="link.to"
              class="group flex items-center justify-between py-3.5 text-base/6 text-highlighted"
            >
              {{ link.label }}
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
