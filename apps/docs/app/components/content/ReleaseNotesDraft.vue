<script setup lang="ts">
type Kind = 'Features' | 'Fixes' | 'Other'

const COMMAND = 'npm run generate -- vercel-labs github-tools'
const ECHO = ['> generate', '> tsx --env-file=.env scripts/generate-release-notes.ts vercel-labs github-tools']

const CALLS = [
  { call: 'getReleaseContext({})', result: 'latest @github-tools/sdk@1.19.0, previous 1.18.0' },
  { call: 'listPullRequests({ state: \'closed\' })', result: '30 closed pull requests' }
]

// Merge order, newest first.
const PRS: { number: number, title: string, kind: Kind, note: string }[] = [
  { number: 227, title: 'fix(sdk): find the previous release beyond the 30 most recent', kind: 'Fixes', note: 'Find the previous release beyond the 30 most recent' },
  { number: 226, title: 'feat(sdk): explain auto-approval decisions with call-level toolApproval', kind: 'Features', note: 'Explain auto-approval decisions with call-level toolApproval' },
  { number: 225, title: 'feat(sdk): add code scanning, Dependabot and secret scanning alert tools', kind: 'Features', note: 'Add code scanning, Dependabot and secret scanning alert tools' },
  { number: 224, title: 'feat(sdk): add auto-merge and branch rules tools', kind: 'Features', note: 'Add auto-merge and branch rules tools' },
  { number: 223, title: 'feat(sdk): let review comments span a range of lines', kind: 'Features', note: 'Let review comments span a range of lines' },
  { number: 222, title: 'fix(eve): label failed GitHub calls as failed instead of done', kind: 'Fixes', note: 'Label failed GitHub calls as failed instead of done' },
  { number: 203, title: 'docs: fix counts, option names and paths that drifted from the code', kind: 'Other', note: 'Fix counts, option names and paths in the docs' },
  { number: 202, title: 'chore(sdk): remove dead code and check preset tool names at compile time', kind: 'Other', note: 'Check preset tool names at compile time' }
]

const KINDS: Kind[] = ['Features', 'Fixes', 'Other']

const DRAFT = KINDS.flatMap((kind, k) => [
  ...k > 0 ? [''] : [],
  `## ${kind}`,
  ...PRS.filter(pr => pr.kind === kind).map(pr => `- ${pr.note} (#${pr.number})`)
])

const TYPE_AT = 300
const CHAR_GAP = 28
const CALL_AT = TYPE_AT + COMMAND.length * CHAR_GAP + 500
const PR_AT = CALL_AT + 1800
const PR_GAP = 220
const SORT_AT = PR_AT + PRS.length * PR_GAP + 600
const DRAFT_AT = SORT_AT + 1300
const LINE_GAP = 110

const typed = ref(0)
const shown = ref(0)
const step = ref(0)
const calls = ref(0)
const prs = ref(0)
const sorted = ref(false)
const printed = ref(0)
const done = ref(false)

const { root, finished, still, replay } = useFigure({
  steps: [
    ...Array.from(COMMAND, (_, i) => ({ at: TYPE_AT + i * CHAR_GAP, run: () => { typed.value = i + 1 } })),
    { at: CALL_AT - 300, run: () => { shown.value = 1 } },
    { at: CALL_AT, run: () => { step.value = 1 } },
    { at: CALL_AT + 700, run: () => { calls.value = 1 } },
    { at: CALL_AT + 900, run: () => { step.value = 2 } },
    { at: CALL_AT + 1500, run: () => { calls.value = 2 } },
    ...PRS.map((_, i) => ({ at: PR_AT + i * PR_GAP, run: () => { prs.value = i + 1 } })),
    { at: SORT_AT - 300, run: () => { step.value = 3 } },
    { at: SORT_AT, run: () => { sorted.value = true } },
    ...DRAFT.map((_, i) => ({ at: DRAFT_AT + i * LINE_GAP, run: () => { printed.value = i + 1 } })),
    { at: DRAFT_AT + DRAFT.length * LINE_GAP + 500, run: () => { done.value = true } }
  ],
  reset: () => {
    typed.value = 0
    shown.value = 0
    step.value = 0
    calls.value = 0
    prs.value = 0
    sorted.value = false
    printed.value = 0
    done.value = false
  },
  settle: () => {
    typed.value = COMMAND.length
    shown.value = 1
    step.value = 3
    calls.value = CALLS.length
    prs.value = PRS.length
    sorted.value = true
    printed.value = DRAFT.length
    done.value = true
  }
})

const running = computed(() => step.value > 0 && printed.value === 0)

const items = computed(() => {
  const merged = PRS.slice(0, prs.value).map(pr => ({ key: String(pr.number), pr }))
  if (!sorted.value) return merged
  return KINDS.flatMap(kind => [
    { key: kind, heading: kind },
    ...merged.filter(item => item.pr.kind === kind)
  ])
})

const segment = 'rounded-md px-2 py-0.5 transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) disabled:cursor-default'
const segmentOn = 'bg-default text-highlighted shadow-xs ring-1 ring-(--d-line-strong)'
const segmentOff = 'text-muted enabled:hover:text-highlighted'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The script reads the latest release and the merged pull requests, the model groups them into sections, and the draft prints in the terminal without writing anything to GitHub."
    :finished
    :still
    @replay="replay"
  >
    <div class="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section class="border-b border-(--d-line) md:border-r md:border-b-0">
        <h4 class="flex items-center gap-2 border-b border-(--d-line) px-4 py-2 text-[12px] text-dimmed">
          <UIcon
            name="i-lucide-square-terminal"
            class="size-3.5"
          />
          Terminal
        </h4>
        <div class="px-4 py-3 font-mono text-[11.5px]/[19px]">
          <p class="[overflow-wrap:anywhere] text-highlighted">
            <span class="text-dimmed select-none">$ </span>{{ COMMAND.slice(0, typed) }}<span
              v-if="typed < COMMAND.length"
              class="ms-px inline-block h-3.5 w-1.5 animate-pulse bg-(--d-signal) align-[-2px]"
            />
          </p>
          <div
            class="d-step mt-1 text-dimmed"
            :data-on="shown > 0"
          >
            <p
              v-for="line in ECHO"
              :key="line"
              class="[overflow-wrap:anywhere]"
            >
              {{ line }}
            </p>
          </div>
          <p
            class="mt-2 inline-flex items-center gap-2 text-dimmed transition-opacity duration-300"
            :class="running ? 'opacity-100' : 'h-0 opacity-0'"
          >
            <UIcon
              name="i-lucide-loader-circle"
              class="size-3.5 animate-spin"
            />
            waiting for generateText
          </p>
          <div class="mt-2">
            <p
              v-for="(line, i) in DRAFT"
              :key="i"
              class="min-h-[19px] whitespace-pre-wrap transition-opacity duration-200"
              :class="[
                printed > i ? 'opacity-100' : 'opacity-0',
                line.startsWith('##') ? 'text-highlighted' : 'ps-[2ch] -indent-[2ch] text-muted'
              ]"
            >
              {{ line }}
            </p>
          </div>
        </div>
      </section>

      <section class="flex min-w-0 flex-col">
        <h4 class="flex items-center justify-between gap-2 border-b border-(--d-line) px-4 py-2 text-[12px] text-dimmed">
          <span>Inside generateText</span>
          <span class="font-mono tabular-nums">{{ step > 0 ? `step ${step} of up to 10` : 'not started' }}</span>
        </h4>
        <div class="flex flex-1 flex-col gap-3 px-4 py-3">
          <ol class="flex flex-col gap-2">
            <li
              v-for="(c, i) in CALLS"
              :key="c.call"
              class="d-step"
              :data-on="step > i"
            >
              <code class="block font-mono text-[11.5px]/5 [overflow-wrap:anywhere] text-highlighted">{{ c.call }}</code>
              <p class="flex items-center gap-1.5 text-[12px]/5">
                <UIcon
                  v-if="calls > i"
                  name="i-lucide-check"
                  class="size-3.5 shrink-0 text-highlighted"
                />
                <span
                  v-else
                  class="mx-1 size-1.5 shrink-0 animate-pulse rounded-full bg-(--d-line-strong)"
                />
                <span :class="calls > i ? 'text-muted' : 'text-dimmed'">{{ calls > i ? c.result : 'reading' }}</span>
              </p>
            </li>
          </ol>

          <div
            class="d-step rounded-lg border border-(--d-line) bg-(--d-raised-strong)"
            :data-on="prs > 0"
          >
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-(--d-line) px-3 py-1.5 text-[11.5px] text-dimmed">
              <span>Merged since 1.19.0</span>
              <div
                role="group"
                aria-label="Order the pull requests"
                class="inline-flex rounded-md border border-(--d-line) bg-(--d-raised) p-0.5"
              >
                <button
                  type="button"
                  :disabled="!finished"
                  :aria-pressed="!sorted"
                  :class="[segment, !sorted ? segmentOn : segmentOff]"
                  @click="sorted = false"
                >
                  Merge order
                </button>
                <button
                  type="button"
                  :disabled="!finished"
                  :aria-pressed="sorted"
                  :class="[segment, sorted ? segmentOn : segmentOff]"
                  @click="sorted = true"
                >
                  Grouped
                </button>
              </div>
            </div>
            <TransitionGroup
              tag="ul"
              class="relative px-3 py-2"
              move-class="transition-transform duration-700 ease-(--d-ease)"
              enter-active-class="transition-[opacity,transform] duration-400 ease-(--d-ease)"
              enter-from-class="translate-y-1 opacity-0"
              leave-active-class="absolute transition-opacity duration-200"
              leave-to-class="opacity-0"
            >
              <li
                v-for="item in items"
                :key="item.key"
                class="flex min-w-0 gap-2 text-[12px]/[22px]"
                :class="'heading' in item ? 'pt-1 text-[11.5px] text-dimmed first:pt-0' : ''"
              >
                <template v-if="'heading' in item">
                  {{ item.heading }}
                </template>
                <template v-else>
                  <span class="shrink-0 font-mono text-dimmed tabular-nums">#{{ item.pr.number }}</span>
                  <span class="truncate text-muted">{{ item.pr.title }}</span>
                </template>
              </li>
            </TransitionGroup>
          </div>
        </div>
      </section>
    </div>

    <p
      class="d-step flex items-start gap-2 border-t border-(--d-line) px-4 py-3 text-[12.5px]/5 text-muted"
      :data-on="done"
    >
      <UIcon
        name="i-lucide-shield-check"
        class="mt-0.5 size-3.5 shrink-0 text-highlighted"
      />
      <span><span class="text-highlighted">Nothing was written to GitHub.</span> createRelease is in the preset, but nothing in the script answers its approval request.</span>
    </p>
  </DocsFigure>
</template>
