<script setup lang="ts">
type Kind = 'Features' | 'Fixes' | 'Other'
type Order = 'merged' | 'grouped'

const COMMAND = 'npm run generate -- vercel-labs github-tools'
const ECHO = ['> generate', '> tsx --env-file=.env scripts/generate-release-notes.ts vercel-labs github-tools']

// Merge order, newest first: the pull requests merged since @github-tools/sdk@1.19.0.
const PRS: { number: number, type: string, kind: Kind, note: string, bar: string }[] = [
  { number: 227, type: 'fix(sdk)', kind: 'Fixes', note: 'Find the previous release beyond the 30 most recent', bar: 'w-[70%]' },
  { number: 226, type: 'feat(sdk)', kind: 'Features', note: 'Explain auto-approval decisions with call-level toolApproval', bar: 'w-[85%]' },
  { number: 225, type: 'feat(sdk)', kind: 'Features', note: 'Add code scanning, Dependabot and secret scanning alert tools', bar: 'w-[90%]' },
  { number: 224, type: 'feat(sdk)', kind: 'Features', note: 'Add auto-merge and branch rules tools', bar: 'w-[55%]' },
  { number: 222, type: 'fix(eve)', kind: 'Fixes', note: 'Label failed GitHub calls as failed instead of done', bar: 'w-[75%]' },
  { number: 203, type: 'docs', kind: 'Other', note: 'Fix counts, option names and paths in the docs', bar: 'w-[65%]' }
]

const KINDS: Kind[] = ['Features', 'Fixes', 'Other']

const DRAFT = KINDS.flatMap((kind, k) => [
  ...k > 0 ? [''] : [],
  `## ${kind}`,
  ...PRS.filter(pr => pr.kind === kind).map(pr => `- ${pr.note} (#${pr.number})`)
])

const CALLS = [
  { name: 'getReleaseContext', result: '1.19.0, previous 1.18.0' },
  { name: 'listPullRequests', result: '6 merged since 1.19.0' }
]

const ORDER_OPTIONS = [
  { value: 'merged', label: 'Merge order' },
  { value: 'grouped', label: 'Grouped' }
] as const

const CHUNK = 2
const typingMs = Math.ceil(COMMAND.length / CHUNK) * CHUNK * FIGURE_PACE.perChar

const typed = ref(0)
const echoed = ref(false)
const calls = ref(0)
const listed = ref(false)
const order = ref<Order>('merged')
const printed = ref(false)
const done = ref(false)

const at = timeline([
  typingMs + 300,
  FIGURE_PACE.beat,
  FIGURE_PACE.beat,
  1500,
  1500,
  1500,
  0
])

const { root, finished, still, replay } = useFigure({
  steps: [
    ...Array.from({ length: Math.ceil(COMMAND.length / CHUNK) }, (_, i) => ({
      at: at[0]! + i * CHUNK * FIGURE_PACE.perChar,
      run: () => { typed.value = Math.min(COMMAND.length, (i + 1) * CHUNK) }
    })),
    { at: at[1]!, run: () => { echoed.value = true } },
    { at: at[2]!, run: () => { calls.value = 1 } },
    { at: at[3]!, run: () => {
      calls.value = 2
      listed.value = true
    } },
    { at: at[4]!, run: () => { order.value = 'grouped' } },
    { at: at[5]!, run: () => { printed.value = true } },
    { at: at[6]!, run: () => { done.value = true } }
  ],
  reset: () => {
    typed.value = 0
    echoed.value = false
    calls.value = 0
    listed.value = false
    order.value = 'merged'
    printed.value = false
    done.value = false
  },
  settle: () => {
    typed.value = COMMAND.length
    echoed.value = true
    calls.value = CALLS.length
    listed.value = true
    order.value = 'grouped'
    printed.value = true
    done.value = true
  }
})

function rows(o: Order) {
  const merged = PRS.map(pr => ({ key: String(pr.number), pr }))
  if (o === 'merged') return merged
  return KINDS.flatMap(kind => [
    { key: kind, heading: kind },
    ...merged.filter(item => item.pr.kind === kind)
  ])
}

const live = computed(() => rows(order.value))
</script>

<template>
  <DocsFigure
    ref="root"
    caption="A draft, not a release. The script reads the latest release and what merged since, the model groups the pull requests, and the notes print in the terminal without writing anything to GitHub."
    :finished
    :still
    @replay="replay"
  >
    <template #controls>
      <FigureTabs
        v-model="order"
        label="Pull requests"
        :options="ORDER_OPTIONS"
        show-label
        :inert="!finished"
      />
    </template>

    <div class="@container px-4 py-8 sm:px-10 sm:py-12">
      <div class="mx-auto grid max-w-[30rem] items-center @2xl:max-w-none @2xl:grid-cols-[minmax(0,1.15fr)_2.5rem_minmax(0,1fr)]">
        <section class="min-w-0 overflow-hidden rounded-lg border border-(--d-line-strong) bg-(--d-raised)">
          <header class="relative flex h-9 items-center border-b border-(--d-line) px-3">
            <span
              aria-hidden="true"
              class="flex gap-1.5"
            >
              <span
                v-for="n in 3"
                :key="n"
                class="size-2.5 rounded-full bg-(--d-line-strong)"
              />
            </span>
            <span class="absolute inset-x-0 text-center font-mono text-[12px] text-muted">release-notes</span>
          </header>
          <div class="px-3 py-3 font-mono text-[12.5px]/5">
            <p class="d-stack">
              <span
                class="invisible [overflow-wrap:anywhere]"
                aria-hidden="true"
              >$ {{ COMMAND }}</span>
              <span class="[overflow-wrap:anywhere] text-highlighted"><span class="text-muted select-none">$ </span>{{ COMMAND.slice(0, typed) }}</span>
            </p>
            <div
              class="d-step text-muted"
              :data-on="echoed"
            >
              <p
                v-for="line in ECHO"
                :key="line"
                class="[overflow-wrap:anywhere]"
              >
                {{ line }}
              </p>
            </div>
            <div class="mt-3">
              <p
                v-for="(line, i) in DRAFT"
                :key="i"
                class="min-h-5 transition-opacity duration-300"
                :class="[
                  printed ? 'opacity-100' : 'opacity-0',
                  line.startsWith('##') ? 'text-highlighted' : 'ps-[2ch] -indent-[2ch] text-toned'
                ]"
                :style="{ transitionDelay: printed && !still ? `${i * 70}ms` : '0ms' }"
              >
                {{ line }}
              </p>
            </div>
            <p
              class="mt-3 text-muted transition-opacity duration-300"
              :class="done ? '' : 'opacity-0'"
            >
              $<span class="ms-1.5 inline-block h-3.5 w-1.5 animate-pulse bg-(--d-signal) align-[-2px]" />
            </p>
          </div>
        </section>

        <div
          aria-hidden="true"
          class="relative h-10 @2xl:h-full"
        >
          <span
            class="absolute inset-y-0 left-1/2 w-px transition-colors duration-500 @2xl:inset-x-0 @2xl:inset-y-auto @2xl:top-1/2 @2xl:left-0 @2xl:h-px @2xl:w-full"
            :class="calls > 0 ? 'bg-(--d-signal)' : 'bg-(--d-line-strong)'"
          />
        </div>

        <section class="min-w-0 rounded-lg border border-(--d-line-strong) bg-(--d-raised)">
          <header class="border-b border-(--d-line) px-3 py-2.5">
            <p class="text-[13px]/5 font-medium text-highlighted">
              generateText
            </p>
            <p class="font-mono text-[12px]/4 text-muted">
              release-manager preset
            </p>
          </header>

          <ul class="flex flex-col gap-1 border-b border-(--d-line) px-3 py-2.5">
            <li
              v-for="(c, i) in CALLS"
              :key="c.name"
              class="flex flex-wrap items-center gap-x-2 text-[12px]/5"
            >
              <span
                class="size-1.5 shrink-0 rounded-full transition-colors duration-300"
                :class="calls > i ? 'bg-(--d-ok)' : 'bg-(--d-line-strong)'"
              />
              <code class="font-mono text-toned">{{ c.name }}</code>
              <span
                class="text-muted transition-opacity duration-300"
                :class="calls > i ? '' : 'opacity-0'"
              >{{ c.result }}</span>
            </li>
          </ul>

          <div
            class="d-step d-stack px-3 py-2"
            :data-on="listed"
          >
            <ul
              aria-hidden="true"
              class="invisible"
            >
              <li
                v-for="item in rows('grouped')"
                :key="item.key"
                class="h-7"
              />
            </ul>
            <TransitionGroup
              tag="ul"
              class="relative"
              move-class="transition-transform duration-700 ease-(--d-ease)"
              enter-active-class="transition-opacity duration-500 delay-300"
              enter-from-class="opacity-0"
              leave-active-class="absolute inset-x-0 transition-opacity duration-200"
              leave-to-class="opacity-0"
            >
              <li
                v-for="item in live"
                :key="item.key"
                class="flex h-7 items-center gap-2.5"
              >
                <span
                  v-if="'heading' in item"
                  class="text-[12px] font-medium text-muted"
                >{{ item.heading }}</span>
                <template v-else>
                  <UIcon
                    name="i-lucide-git-merge"
                    class="size-3.5 shrink-0 text-muted"
                  />
                  <code class="w-9 shrink-0 font-mono text-[12px] text-toned tabular-nums">#{{ item.pr.number }}</code>
                  <code class="w-[4.5rem] shrink-0 font-mono text-[12px] text-muted">{{ item.pr.type }}</code>
                  <span
                    aria-hidden="true"
                    class="min-w-0 flex-1"
                  >
                    <span
                      class="block h-1.5 rounded-full bg-(--d-raised-strong)"
                      :class="item.pr.bar"
                    />
                  </span>
                </template>
              </li>
            </TransitionGroup>
          </div>
        </section>
      </div>
    </div>
  </DocsFigure>
</template>
