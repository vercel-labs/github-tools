<script setup lang="ts">
type Call = { tool: string, args: string, result: string, write?: boolean }
type Entry
  = | { id: number, kind: 'comment', author: string, text: string, seen?: boolean }
    | { id: number, kind: 'review', calls: Call[], file?: { path: string, lines: [number, string][], mark: number }, text: string }
    | { id: number, kind: 'working' }

const REPLIES: { calls: Call[], file?: { path: string, lines: [number, string][], mark: number }, text: string }[] = [
  {
    calls: [
      { tool: 'getPullRequestContext', args: 'acme/app#128', result: '4 files, 3 commits' },
      { tool: 'listPullRequestFiles', args: 'acme/app#128', result: '+145 −1' },
      { tool: 'getFileContent', args: 'src/auth/reset.ts', result: '48 lines' }
    ],
    file: { path: 'src/auth/reset.ts', lines: [[18, 'const token = randomToken()'], [19, 'await db.resets.insert({ userId, token })']], mark: 19 },
    text: 'The reset link never expires: anyone who finds an old email can still change the password. Save an expiry, such as one hour, and check it on /reset.'
  },
  {
    calls: [
      { tool: 'getFileContent', args: 'src/auth/reset.test.ts', result: '37 lines' },
      { tool: 'listPullRequestReviewThreads', args: 'acme/app#128', result: '1 open' }
    ],
    text: 'No. Tokens are random and work once, and the tests cover the flow. Fix the expiry and this is ready to merge.'
  }
]

const DRAFTS = ['@github-agent review this', '@github-agent anything else?']

const COMMITS: [string, string, string][] = [
  ['Add a "Forgot password?" link', 'a1f3c9e', '2 days ago'],
  ['Email a one-time reset link', '7be20d4', '2 days ago'],
  ['Add the reset page and tests', 'c41a8f2', 'yesterday']
]

const FILES: [string, string][] = [
  ['src/auth/reset.ts', '+48'],
  ['src/pages/login.vue', '+6 −1'],
  ['src/pages/reset.vue', '+54'],
  ['src/auth/reset.test.ts', '+37']
]

const { later } = useSceneTimers()
const thread = ref<HTMLElement | null>(null)

const tab = ref<'conversation' | 'commits' | 'files'>('conversation')
const entries = ref<Entry[]>([])
const mentions = ref(0)
const busy = ref(false)
const draft = ref(DRAFTS[0]!)
let nextId = 0

function post(text: string) {
  if (busy.value) return
  tab.value = 'conversation'
  const comment = reactive({ id: nextId++, kind: 'comment' as const, author: 'you', text, seen: false })
  entries.value.push(comment)
  if (!text.includes('@github-agent')) {
    draft.value = ''
    return
  }

  const reply = REPLIES[Math.min(mentions.value, REPLIES.length - 1)]!
  mentions.value++
  draft.value = DRAFTS[mentions.value] ?? ''
  busy.value = true
  later(600, () => {
    comment.seen = true
    entries.value.push({ id: -1, kind: 'working' })
  })
  later(2600, () => {
    entries.value = [...entries.value.filter(entry => entry.kind !== 'working'), { id: nextId++, kind: 'review', ...reply }]
    busy.value = false
  })
}

const hint = computed(() => {
  if (busy.value) return 'The agent is reading the pull request.'
  if (mentions.value === 0) return 'Post the comment to mention the agent, or type your own.'
  if (mentions.value === 1) return 'Click "Used 3 tools" to see what it read, then ask a follow-up.'
  return 'Reads ran without asking. Browse the commits and files too.'
})

useScrollToEnd(thread, () => entries)

defineExpose({ hint })
</script>

<template>
  <LandingSceneWindow
    app="github"
    title="github.com/acme/app/pull/128"
    class="h-full"
  >
    <div class="shrink-0 px-4 pt-3.5">
      <p class="truncate text-[15px] text-highlighted">
        Add password reset <span class="text-dimmed">#128</span>
      </p>
      <p class="mt-1.5 flex items-center gap-2 text-[12.5px] text-muted">
        <span class="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-(--d-raised-strong) px-2 text-[12px] text-highlighted">
          <UIcon
            name="i-lucide-git-pull-request"
            class="size-3.5"
          />
          Open
        </span>
        <span class="truncate"><span class="text-highlighted">ana</span> wants to merge 3 commits into <code class="font-mono text-[12px]">main</code></span>
      </p>
      <nav
        class="mt-3 flex gap-1 border-b border-(--d-line) text-[12.5px]"
        aria-label="Pull request"
      >
        <button
          v-for="[id, label, count] in ([['conversation', 'Conversation', 1 + entries.filter(entry => entry.kind !== 'working').length], ['commits', 'Commits', 3], ['files', 'Files changed', 4]] as const)"
          :key="id"
          type="button"
          class="-mb-px flex items-center gap-1.5 border-b px-1.5 pb-2 whitespace-nowrap"
          :class="tab === id ? 'border-(--ui-text-highlighted) text-highlighted' : 'border-transparent text-muted hover:text-highlighted'"
          :aria-pressed="tab === id"
          @click="tab = id"
        >
          <span :class="id === 'files' ? 'hidden min-[420px]:inline' : ''">{{ label }}</span>
          <span
            v-if="id === 'files'"
            class="min-[420px]:hidden"
          >Files</span>
          <span class="rounded-full bg-(--d-raised-strong) px-1.5 text-[12px]/4 text-toned tabular-nums">{{ count }}</span>
        </button>
      </nav>
    </div>

    <div class="relative min-h-0 flex-1">
      <div
        v-show="tab === 'conversation'"
        ref="thread"
        class="scene-scroll absolute inset-0 overflow-y-auto"
      >
        <TransitionGroup
          tag="ol"
          name="scene"
          class="flex flex-col gap-3 px-4 pt-3.5 pb-3"
        >
          <li
            key="description"
            class="flex gap-2.5"
          >
            <LandingSceneAvatar name="ana" />
            <div class="min-w-0 flex-1 overflow-hidden rounded-md border border-(--d-line)">
              <p class="border-b border-(--d-line) bg-(--d-raised) px-3 py-1.5 text-[12px] text-muted">
                <span class="text-highlighted">ana</span> opened this 2 days ago
              </p>
              <div class="px-3 py-2.5 text-[13px]/5 text-toned">
                <p class="font-medium text-highlighted">
                  Summary
                </p>
                <ul class="mt-1 list-disc ps-4">
                  <li>Adds a "Forgot password?" link to the login page</li>
                  <li>Emails a one-time reset link</li>
                  <li>A new /reset page sets the new password</li>
                </ul>
                <p class="mt-2.5 font-medium text-highlighted">
                  Testing
                </p>
                <p class="mt-1">
                  <code class="font-mono text-[12px]">reset.test.ts</code> covers the email and the reset page.
                </p>
                <p class="mt-2.5 text-muted">
                  Closes #92
                </p>
              </div>
            </div>
          </li>

          <li
            v-for="entry in entries"
            :key="entry.id"
          >
            <p
              v-if="entry.kind === 'working'"
              class="flex items-center gap-2 ps-9.5 text-[12.5px] text-muted"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-3.5 animate-spin"
              />
              <span class="text-highlighted">github-agent</span> is reviewing…
            </p>

            <div
              v-else
              class="flex gap-2.5"
            >
              <LandingSceneAvatar
                :name="entry.kind === 'comment' ? entry.author : 'github-agent'"
                :bot="entry.kind === 'review'"
              />
              <div class="min-w-0 flex-1 overflow-hidden rounded-md border border-(--d-line)">
                <p class="flex items-center gap-1.5 border-b border-(--d-line) bg-(--d-raised) px-3 py-1.5 text-[12px] text-muted">
                  <template v-if="entry.kind === 'comment'">
                    <span class="text-highlighted">{{ entry.author }}</span> commented just now
                  </template>
                  <template v-else>
                    <span class="text-highlighted">github-agent</span>
                    <span class="rounded-full border border-(--d-line-strong) px-1.5 text-[12px]/4">bot</span>
                    <span class="truncate">{{ entry.file ? 'reviewed 4 files' : 'replied' }}</span>
                  </template>
                </p>

                <template v-if="entry.kind === 'comment'">
                  <p class="px-3 pt-2 text-[13px]/5 text-highlighted">
                    {{ entry.text }}
                  </p>
                  <p class="px-3 pt-1.5 pb-2">
                    <span
                      class="inline-flex h-5.5 items-center gap-1 rounded-full border border-(--d-line) px-1.5 text-[12px] text-toned transition-[opacity,transform] duration-300"
                      :class="entry.seen ? 'scale-100 opacity-100' : 'scale-90 opacity-0'"
                    >👀 1</span>
                  </p>
                </template>

                <div
                  v-else
                  class="px-3 py-2"
                >
                  <LandingSceneToolCalls :calls="entry.calls" />
                  <div
                    v-if="entry.file"
                    class="mt-2 overflow-hidden rounded-md border border-(--d-line) font-mono text-[12px]/5"
                  >
                    <p class="border-b border-(--d-line) bg-(--d-raised) px-2 py-1 text-muted">
                      {{ entry.file.path }}
                    </p>
                    <p
                      v-for="[line, code] in entry.file.lines"
                      :key="line"
                      class="truncate px-2 whitespace-pre"
                      :class="line === entry.file.mark ? 'bg-(--d-raised-strong) text-highlighted' : 'text-dimmed'"
                    >
                      <span class="me-3 text-dimmed select-none">{{ line }}</span>{{ code }}
                    </p>
                  </div>
                  <p class="mt-2 text-[13px]/5 text-toned">
                    {{ entry.text }}
                  </p>
                </div>
              </div>
            </div>
          </li>
        </TransitionGroup>
      </div>

      <ul
        v-show="tab === 'commits'"
        class="scene-scroll absolute inset-0 overflow-y-auto px-4 py-3"
      >
        <li
          v-for="[message, sha, when] in COMMITS"
          :key="sha"
          class="flex items-start gap-2.5 border-b border-(--d-line) py-2.5 last:border-b-0"
        >
          <LandingSceneAvatar
            name="ana"
            size="sm"
          />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[13px]/5 text-highlighted">{{ message }}</span>
            <span class="block text-[12px]/5 text-muted">ana committed {{ when }}</span>
          </span>
          <code class="shrink-0 font-mono text-[12px]/5 text-muted">{{ sha }}</code>
        </li>
      </ul>

      <div
        v-show="tab === 'files'"
        class="scene-scroll absolute inset-0 overflow-y-auto px-4 py-3"
      >
        <ul class="overflow-hidden rounded-md border border-(--d-line)">
          <li
            v-for="[path, delta] in FILES"
            :key="path"
            class="flex items-center gap-2 border-b border-(--d-line) px-3 py-2 text-[12.5px] last:border-b-0"
          >
            <UIcon
              name="i-lucide-file-code"
              class="size-3.5 shrink-0 text-muted"
            />
            <span class="min-w-0 truncate font-mono text-[12px] text-highlighted">{{ path }}</span>
            <span class="ms-auto shrink-0 font-mono text-[12px] text-muted">{{ delta }}</span>
          </li>
        </ul>
        <div class="mt-3 overflow-hidden rounded-md border border-(--d-line) font-mono text-[12px]/5">
          <p class="border-b border-(--d-line) bg-(--d-raised) px-2 py-1 text-muted">
            src/pages/login.vue
          </p>
          <p class="truncate px-2 whitespace-pre text-dimmed">
            <span class="me-2 select-none"/>&lt;button type="submit"&gt;Sign in&lt;/button&gt;
          </p>
          <p class="truncate bg-(--d-fail-bg)/60 px-2 whitespace-pre text-toned">
            <span class="me-2 select-none">−</span>&lt;p&gt;Contact support to reset&lt;/p&gt;
          </p>
          <p class="truncate bg-(--d-ok-bg)/60 px-2 whitespace-pre text-highlighted">
            <span class="me-2 select-none">+</span>&lt;a href="/forgot"&gt;Forgot password?&lt;/a&gt;
          </p>
        </div>
      </div>
    </div>

    <LandingSceneComposer
      v-model="draft"
      placeholder="Leave a comment"
      action="Comment"
      :disabled="busy"
      @submit="post"
    />
  </LandingSceneWindow>
</template>
