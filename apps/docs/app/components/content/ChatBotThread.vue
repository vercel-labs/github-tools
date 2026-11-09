<script setup lang="ts">
type Platform = 'github' | 'slack'

const PLATFORMS: { id: Platform, label: string, icon: string }[] = [
  { id: 'github', label: 'GitHub', icon: 'i-simple-icons-github' },
  { id: 'slack', label: 'Slack', icon: 'i-simple-icons-slack' }
]

// The handler path from examples/pr-review-agent with the triage workflow from the guide.
// `split` lines are the two parts the guide changes for Slack: the target and the trust check.
const LINES: { kind: 'code' | 'note' | 'step', text: Record<Platform, string>, split?: boolean, tool?: boolean, approval?: boolean }[] = [
  { kind: 'code', text: { github: 'POST /webhooks/github', slack: 'POST /webhooks/slack' }, split: true },
  { kind: 'code', text: { github: 'agent.onNewMention(thread, message)', slack: 'agent.onNewMention(thread, message)' } },
  { kind: 'note', text: { github: 'trust: canWrite on GitHub', slack: 'trust: your Slack allowlist' }, split: true },
  { kind: 'code', text: { github: 'addReaction(emoji.eyes)', slack: 'addReaction(emoji.eyes)' } },
  { kind: 'code', text: { github: 'thread.subscribe()', slack: 'thread.subscribe()' } },
  { kind: 'note', text: { github: 'context: from the webhook', slack: 'context: from a channel map' }, split: true },
  { kind: 'code', text: { github: 'start(triageWorkflow, [text, ctx])', slack: 'start(triageWorkflow, [text, ctx])' } },
  { kind: 'step', text: { github: 'runTriageTurn, preset issue-triage', slack: 'runTriageTurn, preset issue-triage' } },
  { kind: 'code', text: { github: 'getIssueContext', slack: 'getIssueContext' }, tool: true },
  { kind: 'code', text: { github: 'addLabels({ labels: [\'bug\'] })', slack: 'addLabels({ labels: [\'bug\'] })' }, tool: true, approval: true },
  { kind: 'code', text: { github: 'addIssueComment', slack: 'addIssueComment' }, tool: true, approval: true }
]

const COMMENT = 'Classified as a bug: uploads over 2 GB fail with 413 Payload Too Large. Next step: reproduce with a 2 GB file and check the server\'s request size limit.'

const ROW = 28
const LINE_STEP = 380
const REACT_LINE = 3
const LABEL_LINE = 9
const COMMENT_LINE = 10

const platform = ref<Platform>('github')
const pressing = ref<Platform | ''>('')
const mention = ref(false)
const line = ref(-1)
const passed = ref<Record<Platform, number>>({ github: -1, slack: -1 })
const typed = ref(0)
const touched = ref(false)

const reacted = computed(() => line.value >= REACT_LINE)
const labeled = computed(() => line.value >= LABEL_LINE)
const commenting = computed(() => line.value >= COMMENT_LINE)

function enter(p: Platform) {
  platform.value = p
  mention.value = false
  line.value = -1
  typed.value = 0
}

function run(p: Platform, base: number) {
  const steps = [
    { at: base, run: () => { pressing.value = p } },
    { at: base + 160, run: () => {
      pressing.value = ''
      enter(p)
    } },
    { at: base + 450, run: () => { mention.value = true } }
  ]
  LINES.forEach((_, i) => {
    steps.push({ at: base + 1000 + i * LINE_STEP, run: () => {
      line.value = i
      passed.value = { ...passed.value, [p]: i }
    } })
  })
  const typeAt = base + 1000 + COMMENT_LINE * LINE_STEP + 250
  for (let n = 4; n < COMMENT.length + 4; n += 4) {
    const count = Math.min(n, COMMENT.length)
    steps.push({ at: typeAt + (n / 4) * 28, run: () => { typed.value = count } })
  }
  const end = typeAt + Math.ceil(COMMENT.length / 4) * 28 + 300
  steps.push({ at: end, run: () => {
    line.value = LINES.length
    passed.value = { ...passed.value, [p]: LINES.length }
  } })
  return { steps, end }
}

const github = run('github', 200)
const slack = run('slack', github.end + 1400)

function settleOn(p: Platform) {
  platform.value = p
  mention.value = true
  line.value = LINES.length
  typed.value = COMMENT.length
}

const { root, finished, still, replay } = useFigure({
  steps: [...github.steps, ...slack.steps],
  reset: () => {
    enter('github')
    pressing.value = ''
    passed.value = { github: -1, slack: -1 }
    touched.value = false
  },
  settle: () => {
    settleOn('slack')
    passed.value = { github: LINES.length, slack: LINES.length }
  }
})

function choose(p: Platform) {
  touched.value = true
  settleOn(p)
}

function lineState(i: number) {
  if (line.value === i) return 'active'
  if (line.value > i) return 'done'
  return 'idle'
}
</script>

<template>
  <DocsFigure
    ref="root"
    caption="A mention on GitHub or in Slack runs the same Chat SDK handler and the same triage step, and only the route, the trust check and the target differ."
    :finished
    :still
    @replay="replay"
  >
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-(--d-line) px-4 py-3 sm:px-5">
      <div
        role="group"
        aria-label="Platform"
        class="inline-flex rounded-lg border border-(--d-line) bg-(--d-raised-strong) p-0.5 text-[12.5px]"
      >
        <button
          v-for="p in PLATFORMS"
          :key="p.id"
          type="button"
          :aria-pressed="platform === p.id"
          :disabled="!finished && !touched"
          class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) disabled:cursor-default"
          :class="[
            platform === p.id ? 'bg-default text-highlighted shadow-xs ring-1 ring-(--d-line-strong)' : 'text-muted enabled:hover:text-highlighted',
            pressing === p.id ? 'scale-95' : ''
          ]"
          @click="choose(p.id)"
        >
          <UIcon
            :name="p.icon"
            class="size-3.5"
          />
          {{ p.label }}
        </button>
      </div>
      <span class="text-[12px] text-dimmed">One bot, two adapters</span>
    </div>

    <div class="grid text-[13px]/6 md:grid-cols-2">
      <section class="min-w-0 border-b border-(--d-line) p-4 sm:p-5 md:border-r md:border-b-0">
        <div
          v-if="platform === 'github'"
          key="github"
        >
          <header class="border-b border-(--d-line) pb-3">
            <p>
              <span class="text-highlighted">Upload fails on files over 2 GB</span>
              <span class="ml-1.5 text-dimmed">#57</span>
            </p>
            <p class="mt-1 flex items-center gap-2 text-[12px] text-muted">
              <span class="inline-flex items-center gap-1 rounded-full border border-(--d-line-strong) px-2 py-px text-[11.5px] text-toned">
                <UIcon
                  name="i-lucide-circle-dot"
                  class="size-3"
                />
                Open
              </span>
              <span
                class="d-step inline-flex items-center gap-1 rounded-full bg-(--d-signal) px-2 py-px text-[11.5px] text-(--d-signal-fg)"
                :data-on="labeled"
              >bug</span>
            </p>
          </header>

          <ol class="mt-4 flex flex-col gap-3">
            <li
              class="d-step flex gap-3"
              :data-on="mention"
            >
              <span class="grid size-6 shrink-0 place-items-center rounded-full border border-(--d-line-strong) bg-(--d-raised-strong) text-[11px] text-toned">A</span>
              <div class="min-w-0 flex-1 rounded-lg border border-(--d-line) bg-default">
                <p class="border-b border-(--d-line) px-3 py-1.5 text-[12px] text-muted">
                  <span class="text-highlighted">ana</span> commented
                </p>
                <p class="px-3 py-2 text-highlighted">
                  <span class="font-semibold">@triage-bot</span> triage this
                </p>
                <div class="px-3 pb-2">
                  <span
                    class="d-step inline-flex items-center gap-1 rounded-full border border-(--d-line-strong) px-2 py-px text-[11.5px] text-toned"
                    :data-on="reacted"
                  >
                    <UIcon
                      name="i-lucide-eye"
                      class="size-3"
                    />
                    eyes 1
                  </span>
                </div>
              </div>
            </li>

            <li
              class="d-step flex items-center gap-3 ps-1.5 text-[12px] text-muted"
              :data-on="labeled"
            >
              <UIcon
                name="i-lucide-tag"
                class="size-3.5 shrink-0"
              />
              <span><span class="text-highlighted">triage-bot</span> added the <span class="text-highlighted">bug</span> label</span>
            </li>

            <li
              class="d-step flex gap-3"
              :data-on="commenting"
            >
              <span class="grid size-6 shrink-0 place-items-center rounded-full bg-(--d-signal) text-(--d-signal-fg)">
                <UIcon
                  name="i-lucide-bot"
                  class="size-3.5"
                />
              </span>
              <div class="min-w-0 flex-1 rounded-lg border border-(--d-line) bg-default">
                <p class="border-b border-(--d-line) px-3 py-1.5 text-[12px] text-muted">
                  <span class="text-highlighted">triage-bot</span> commented
                </p>
                <p class="px-3 py-2 text-default">
                  {{ COMMENT.slice(0, typed) }}<span
                    v-if="typed > 0 && typed < COMMENT.length"
                    class="d-caret"
                  />
                </p>
              </div>
            </li>
          </ol>
        </div>

        <div
          v-else
          key="slack"
        >
          <header class="flex items-baseline gap-2 border-b border-(--d-line) pb-3">
            <span class="text-highlighted"># uploads</span>
            <span class="text-[12px] text-dimmed">mapped to acme/uploads</span>
          </header>

          <div
            class="d-step mt-4 flex gap-3"
            :data-on="mention"
          >
            <span class="grid size-7 shrink-0 place-items-center rounded-md border border-(--d-line-strong) bg-(--d-raised-strong) text-[11px] text-toned">A</span>
            <div class="min-w-0">
              <p class="text-[12px]">
                <span class="font-semibold text-highlighted">ana</span>
                <span class="ml-1.5 text-dimmed">10:42</span>
              </p>
              <p class="text-highlighted">
                <span class="rounded bg-(--d-raised-strong) px-0.5 font-semibold">@triage-bot</span> triage issue 57
              </p>
              <span
                class="d-step mt-1 inline-flex items-center gap-1 rounded-full border border-(--d-line-strong) px-2 py-px text-[11.5px] text-toned"
                :data-on="reacted"
              >
                <UIcon
                  name="i-lucide-eye"
                  class="size-3"
                />
                eyes 1
              </span>
            </div>
          </div>

          <div
            class="d-step mt-4 rounded-lg border border-(--d-line) bg-default p-3"
            :data-on="labeled"
          >
            <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
              <UIcon
                name="i-simple-icons-github"
                class="size-3.5"
              />
              The tools act on acme/uploads#57
              <span class="rounded-full bg-(--d-signal) px-2 py-px text-[11.5px] text-(--d-signal-fg)">bug</span>
            </p>
            <p
              class="d-step mt-2 border-t border-(--d-line) pt-2 text-default"
              :data-on="commenting"
            >
              <span class="mb-0.5 block text-[12px] text-muted"><span class="text-highlighted">triage-bot</span> commented</span>
              {{ COMMENT.slice(0, typed) }}<span
                v-if="typed > 0 && typed < COMMENT.length"
                class="d-caret"
              />
            </p>
          </div>
        </div>
      </section>

      <section class="min-w-0 p-4 sm:p-5">
        <div class="mb-2 flex items-center justify-between text-[11.5px] text-dimmed">
          <span>Handler path</span>
          <span class="flex gap-2.5">
            <span
              v-for="p in PLATFORMS"
              :key="p.id"
              class="inline-flex w-4 justify-center"
              :title="p.label"
            >
              <UIcon
                :name="p.icon"
                class="size-3"
                :aria-label="p.label"
              />
            </span>
          </span>
        </div>

        <ol class="relative font-mono text-[11.5px]">
          <span
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 top-0 rounded-md border-l-2 border-(--d-signal) bg-(--d-raised-strong) transition-[transform,opacity] duration-300 ease-(--d-ease)"
            :class="line >= 0 && line < LINES.length ? 'opacity-100' : 'opacity-0'"
            :style="{ height: `${ROW}px`, transform: `translateY(${Math.max(0, Math.min(line, LINES.length - 1)) * ROW}px)` }"
          />
          <li
            v-for="(l, i) in LINES"
            :key="i"
            class="relative flex items-center gap-2 px-2"
            :style="{ height: `${ROW}px` }"
          >
            <span
              class="min-w-0 flex-1 truncate transition-colors duration-200"
              :class="[
                l.kind === 'step' ? 'font-sans text-[12px]' : '',
                l.kind === 'note' ? 'font-sans text-[12px] italic' : '',
                l.tool ? 'ps-3' : '',
                lineState(i) === 'idle' ? 'text-dimmed' : lineState(i) === 'active' ? 'text-highlighted' : 'text-toned'
              ]"
            >
              <Transition
                mode="out-in"
                enter-from-class="opacity-0"
                leave-to-class="opacity-0"
                enter-active-class="transition-opacity duration-200"
                leave-active-class="transition-opacity duration-150"
              >
                <span :key="l.split ? platform : 'shared'">{{ l.text[platform] }}</span>
              </Transition>
            </span>
            <span
              v-if="l.split"
              class="shrink-0 rounded border border-(--d-line-strong) px-1 font-sans text-[10.5px]/4 text-muted"
            >per platform</span>
            <span
              v-if="l.approval"
              class="shrink-0 font-sans text-[10.5px] text-muted max-sm:hidden"
            >no approval</span>
            <span class="flex shrink-0 gap-2.5">
              <span
                v-for="p in PLATFORMS"
                :key="p.id"
                class="grid w-4 place-items-center"
              >
                <span
                  class="size-1.5 rounded-full transition-[background-color,transform] duration-300"
                  :class="passed[p.id] >= i ? 'scale-100 bg-(--d-signal)' : 'scale-75 bg-(--d-line-strong)'"
                />
              </span>
            </span>
          </li>
        </ol>

        <p class="mt-3 flex items-start gap-1.5 text-[12px]/5 text-muted">
          <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-(--d-warn)" />
          <span>Other writes, such as <code class="font-mono text-toned">closeIssue</code>, still need approval, and nothing answers it in this bot.</span>
        </p>
      </section>
    </div>
  </DocsFigure>
</template>

<style scoped>
.d-caret {
  display: inline-block;
  width: 1px;
  height: 1em;
  margin-left: 1px;
  vertical-align: -0.15em;
  background: currentColor;
  animation: d-blink 900ms steps(2, start) infinite;
}

@keyframes d-blink {
  to {
    visibility: hidden;
  }
}
</style>
