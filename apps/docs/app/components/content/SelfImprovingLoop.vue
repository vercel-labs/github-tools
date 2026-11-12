<script setup lang="ts">
interface Week {
  seconds: number
  pr?: { number: number, title: string }
}

// Four example weeks. Each pull request names a real tool from GITHUB_TOOL_CATALOG.
const WEEKS: Week[] = [
  { seconds: 48, pr: { number: 41, title: 'Call getCiFailureContext first for CI questions' } },
  { seconds: 31, pr: { number: 44, title: 'Read a pull request with getPullRequestContext' } },
  { seconds: 24, pr: { number: 47, title: 'Find issues with searchIssues, not by paging listIssues' } },
  { seconds: 19 }
]
const SLOWEST = WEEKS[0]!.seconds

const B = FIGURE_PACE.beat
// Per week with a pull request: opened (read it, then hold on "waiting"), merged, then the next bar.
const at = timeline([
  B,
  ...WEEKS.slice(0, 3).flatMap(w => [readFor(w.pr!.title) + FIGURE_PACE.hold, B, B])
])

// shown: weeks whose bar is drawn. opened/merged: weeks whose pull request is opened or merged.
const shown = ref(1)
const opened = ref(0)
const merged = ref(0)
const clean = ref(false)

const { root, finished, still, replay } = useFigure({
  steps: [
    ...[0, 1, 2].flatMap(i => [
      { at: at[i * 3 + 1]!, run: () => { opened.value = i + 1 } },
      { at: at[i * 3 + 2]!, run: () => { merged.value = i + 1 } },
      { at: at[i * 3 + 3]!, run: () => { shown.value = i + 2 } }
    ]),
    { at: at[9]! + B, run: () => { clean.value = true } }
  ],
  reset: () => {
    shown.value = 1
    opened.value = 0
    merged.value = 0
    clean.value = false
  },
  settle: () => {
    shown.value = 4
    opened.value = 3
    merged.value = 3
    clean.value = true
  }
})
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The agent improves itself every week, on its own. Each Monday a schedule starts the review, nobody asks for it, and the agent opens a pull request for what slowed it down. You review and merge, and the next week's runs are faster. When nothing repeats, it opens nothing."
    :finished
    :still
    @replay="replay"
  >
    <div class="@container px-4 py-8 sm:px-8 sm:py-10">
      <div class="mx-auto max-w-[46rem] text-[13px]/5">
        <p class="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[12px] text-muted">
          <span>Average time per run</span>
          <span class="inline-flex items-center gap-1.5">
            <UIcon
              name="i-lucide-clock"
              class="size-3.5"
            />
            Review every Monday 08:00 UTC, no prompt
          </span>
        </p>

        <ol class="divide-y divide-(--d-line) rounded-lg border border-(--d-line-strong) bg-(--d-raised)">
          <li
            v-for="(week, i) in WEEKS"
            :key="i"
            class="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-2 px-3 py-3 transition-opacity duration-500 @xl:grid-cols-[4rem_minmax(0,13rem)_minmax(0,1fr)] @xl:items-center"
            :class="shown > i ? '' : 'opacity-40'"
          >
            <span class="font-medium text-highlighted">Week {{ i + 1 }}</span>

            <span class="flex items-center gap-2.5">
              <span class="h-2 flex-1 overflow-hidden rounded-full bg-(--d-raised-strong)">
                <span
                  class="block h-full origin-left rounded-full transition-transform duration-700 ease-(--d-ease)"
                  :class="i === 0 ? 'bg-(--d-line-strong)' : 'bg-(--d-signal)'"
                  :style="{ transform: `scaleX(${shown > i ? week.seconds / SLOWEST : 0})` }"
                />
              </span>
              <span
                class="w-9 shrink-0 text-end font-mono text-[12px] tabular-nums transition-opacity duration-500"
                :class="[shown > i ? '' : 'opacity-0', i > 0 ? 'text-(--d-ok)' : 'text-toned']"
              >{{ week.seconds }} s</span>
            </span>

            <span
              v-if="week.pr"
              class="d-step col-span-2 flex min-w-0 items-start gap-2 @xl:col-span-1"
              :data-on="opened > i"
            >
              <UIcon
                name="i-lucide-git-pull-request"
                class="mt-0.5 size-3.5 shrink-0 transition-colors duration-500"
                :class="merged > i ? 'text-(--d-ok)' : 'text-(--d-warn)'"
              />
              <span class="min-w-0">
                <span class="block text-highlighted">
                  <span class="text-muted tabular-nums">#{{ week.pr.number }}</span> {{ week.pr.title }}
                </span>
                <span class="d-stack text-[12px]/5">
                  <span
                    class="text-muted transition-opacity duration-300"
                    :class="merged > i ? 'invisible opacity-0' : ''"
                  >Opened by <span class="text-toned">github-agent</span> · <span class="text-(--d-warn)">waiting for your review</span></span>
                  <span
                    class="text-muted transition-opacity duration-300"
                    :class="merged > i ? '' : 'invisible opacity-0'"
                  >Opened by <span class="text-toned">github-agent</span> · <span class="text-(--d-ok)">merged by you</span></span>
                </span>
              </span>
            </span>
            <span
              v-else
              class="d-step col-span-2 text-muted @xl:col-span-1"
              :data-on="clean"
            >Nothing repeated this week. The agent opened nothing.</span>
          </li>
        </ol>

        <p
          class="d-step mt-3 text-[12px] text-muted"
          :data-on="clean"
        >
          <span class="text-(--d-ok)">48 s to 19 s in three weeks.</span> Your part: reviewing three pull requests.
        </p>
      </div>
    </div>
  </DocsFigure>
</template>
