<script setup lang="ts">
type Platform = 'github' | 'slack'

const PLATFORMS: { value: Platform, label: string }[] = [
  { value: 'github', label: 'GitHub' },
  { value: 'slack', label: 'Slack' }
]
const IDS = PLATFORMS.map(p => p.value)

const ROUTE: Record<Platform, string> = { github: 'POST /webhooks/github', slack: 'POST /webhooks/slack' }

// The handler path from examples/pr-review-agent with the triage workflow from the guide.
// `split` lines are the parts the guide changes for Slack: the trust check and the target.
const LINES: { text: Record<Platform, string> | string, comment?: boolean, split?: boolean, indent?: number }[] = [
  { text: 'agent.onNewMention(thread, message)' },
  { text: { github: '// trust: canWrite on GitHub', slack: '// trust: your Slack allowlist' }, comment: true, split: true, indent: 1 },
  { text: 'addReaction(emoji.eyes)', indent: 1 },
  { text: 'thread.subscribe()', indent: 1 },
  { text: { github: '// context: from the webhook', slack: '// context: from a channel map' }, comment: true, split: true, indent: 1 },
  { text: 'start(triageWorkflow, [text, ctx])', indent: 1 },
  { text: '// runTriageTurn, preset issue-triage', comment: true, indent: 2 },
  { text: 'getIssueContext', indent: 2 },
  { text: 'addLabels({ labels: [\'bug\'] })', indent: 2 },
  { text: 'addIssueComment', indent: 2 }
]

const platform = ref<Platform>('github')

const { root, still } = useFigure({ steps: [], reset: () => {}, settle: () => {}, autoplay: false })

function swap(p: Platform) {
  return platform.value === p ? 'visible opacity-100' : 'pointer-events-none invisible opacity-0'
}
</script>

<template>
  <DocsFigure
    ref="root"
    caption="One handler for both platforms. A mention on GitHub or in Slack runs the same Chat SDK handler and triage step; only the route, the trust check and the target differ."
    finished
    :still
  >
    <template #controls>
      <FigureTabs
        v-model="platform"
        label="Platform"
        :options="PLATFORMS"
        show-label
      />
    </template>

    <div class="px-4 py-8 sm:px-8 sm:py-10">
      <div class="mx-auto flex max-w-md flex-col items-center">
        <div class="d-stack w-full">
          <div
            class="card"
            :class="swap('github')"
            :aria-hidden="platform !== 'github'"
          >
            <p class="flex items-center gap-2 border-b border-(--d-line) px-3 py-2 text-[12px]/5 text-muted">
              <UIcon
                name="i-simple-icons-github"
                class="size-3.5 text-toned"
              />
              <span class="font-mono">acme/uploads #57</span>
            </p>
            <div class="flex gap-2.5 px-3 py-2.5">
              <span class="mono-tile">a</span>
              <div class="flex min-w-0 flex-col items-start gap-1">
                <p class="text-[13px]/5">
                  <span class="font-medium text-highlighted">ana</span> <span class="text-muted">commented</span>
                </p>
                <p class="text-[13px]/5 text-highlighted">
                  <span class="font-semibold">@triage-bot</span> triage this
                </p>
                <span class="reaction">
                  <UIcon
                    name="i-lucide-eye"
                    class="size-3.5"
                  />
                  1
                </span>
              </div>
            </div>
          </div>

          <div
            class="card"
            :class="swap('slack')"
            :aria-hidden="platform !== 'slack'"
          >
            <p class="flex items-center gap-2 border-b border-(--d-line) px-3 py-2 text-[12px]/5 text-muted">
              <UIcon
                name="i-simple-icons-slack"
                class="size-3.5 text-toned"
              />
              <span class="font-mono"># uploads</span>
              <span class="text-dimmed">mapped to acme/uploads</span>
            </p>
            <div class="flex gap-2.5 px-3 py-2.5">
              <span class="mono-tile">a</span>
              <div class="flex min-w-0 flex-col items-start gap-1">
                <p class="text-[13px]/5">
                  <span class="font-medium text-highlighted">ana</span> <span class="text-[12px] text-dimmed tabular-nums">10:42 AM</span>
                </p>
                <p class="text-[13px]/5 text-highlighted">
                  <span class="font-semibold">@triage-bot</span> triage issue 57
                </p>
                <span class="reaction">
                  <UIcon
                    name="i-lucide-eye"
                    class="size-3.5"
                  />
                  1
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="wire">
          <span class="tag d-stack">
            <span
              v-for="p in IDS"
              :key="p"
              :class="swap(p)"
              :aria-hidden="platform !== p"
            >{{ ROUTE[p] }}</span>
          </span>
        </div>

        <section
          class="card w-full"
          aria-label="Handler path"
        >
          <p class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-(--d-line) px-3 py-2 text-[12px]/5">
            <span class="font-mono text-toned">server/lib/agent.ts</span>
            <span class="flex items-center gap-1.5 text-muted">
              <span class="h-3 w-0.5 rounded-full bg-(--d-signal)" />
              per platform
            </span>
          </p>
          <ol class="py-2 font-mono text-[12.5px]/5">
            <li
              v-for="(l, i) in LINES"
              :key="i"
              class="border-l-2 px-3 py-px"
              :class="l.split ? 'border-(--d-signal) bg-(--d-raised-strong)' : 'border-transparent'"
            >
              <span
                class="block [overflow-wrap:anywhere]"
                :style="{ paddingLeft: `${(l.indent ?? 0) * 2}ch` }"
                :class="l.comment ? 'text-muted' : 'text-highlighted'"
              >
                <template v-if="typeof l.text === 'string'">{{ l.text }}</template>
                <span
                  v-else
                  class="d-stack"
                >
                  <span
                    v-for="p in IDS"
                    :key="p"
                    :class="swap(p)"
                    :aria-hidden="platform !== p"
                  >{{ l.text[p] }}</span>
                </span>
              </span>
            </li>
          </ol>
        </section>

        <div class="wire">
          <span class="tag">no approval needed</span>
        </div>

        <section
          class="card w-full"
          aria-label="Result on GitHub"
        >
          <p class="flex items-center gap-2 border-b border-(--d-line) px-3 py-2 text-[12px]/5 text-muted">
            <UIcon
              name="i-simple-icons-github"
              class="size-3.5 text-toned"
            />
            <span class="font-mono">acme/uploads #57</span>
          </p>
          <ul class="flex flex-col gap-2 px-3 py-2.5 text-[13px]/5">
            <li class="flex items-center gap-2.5">
              <span class="size-2 shrink-0 rounded-full bg-(--d-ok)" />
              <span class="text-highlighted"><code class="font-mono text-[12.5px]">bug</code> label added</span>
            </li>
            <li class="flex items-center gap-2.5">
              <span class="size-2 shrink-0 rounded-full bg-(--d-ok)" />
              <span class="text-highlighted">Comment posted</span>
            </li>
            <li
              class="flex flex-col gap-1.5 ps-[18px]"
              aria-hidden="true"
            >
              <span class="h-1.5 w-[88%] rounded-full bg-(--d-raised-strong)" />
              <span class="h-1.5 w-[60%] rounded-full bg-(--d-raised-strong)" />
            </li>
            <li class="mt-1 flex items-start gap-2.5 rounded-md bg-(--d-warn-bg) px-2 py-1 -mx-2">
              <span class="mt-1.5 size-2 shrink-0 rounded-full bg-(--d-warn)" />
              <span class="text-(--d-warn)"><code class="font-mono text-[12.5px]">closeIssue</code> would wait for approval, and nothing answers it here</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </DocsFigure>
</template>

<style scoped>
.card {
  min-width: 0;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--d-line-strong);
  background: var(--d-raised);
}

.mono-tile {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 6px;
  border: 1px solid var(--d-line-strong);
  background: var(--ui-bg);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ui-text-toned);
}

.reaction {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border-radius: 9999px;
  padding: 0 0.5rem;
  font-size: 12px;
  line-height: 20px;
  color: var(--ui-text-toned);
  box-shadow: inset 0 0 0 1px var(--d-line-strong);
}

.wire {
  position: relative;
  display: grid;
  place-items: center;
  height: 2.5rem;
  width: 100%;
}

.wire::before {
  content: '';
  position: absolute;
  inset-block: 0;
  left: 50%;
  border-left: 1px dashed var(--d-line-strong);
}

.tag {
  position: relative;
  border-radius: 4px;
  padding: 0 0.375rem;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 18px;
  color: var(--ui-text-toned);
  background: var(--ui-bg);
  box-shadow: inset 0 0 0 1px var(--d-line-strong);
}
</style>
