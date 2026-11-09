<script setup lang="ts">
// Text copied from githubToolsErrors.NOT_FOUND in packages/github-tools/src/core/errors.ts.
const why = {
  before: 'Either the resource does not exist, ',
  mark: 'or the token cannot see it',
  after: ' — GitHub deliberately returns 404 instead of 403 for private resources the token has no access to.'
}
const fix = {
  before: 'Check the owner/repo/number input first. ',
  mark: 'If it is correct, the token lacks access',
  after: ': grant the repository to the PAT or App installation, or use a Connect subject that has access.'
}
const link = 'https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#404-not-found-for-an-existing-resource'
const ANSWER = 'I can\'t read acme/billing with this token. GitHub answers 404 for private repositories the token can\'t see, so the README may well exist. Grant the repository to the App installation, then ask again.'

// shown: 1 call, 2 404, 3 error expanded, 4 answer, 5 raw comparison. read: phrases highlighted.
const shown = ref(0)
const read = ref(0)

const B = FIGURE_PACE.beat
const at = timeline([B, B, B, B + 200, readFor(why.mark), readFor(fix.mark), 2 * B, 0])

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: at[0]!, run: () => { shown.value = 1 } },
    { at: at[1]!, run: () => { shown.value = 2 } },
    { at: at[2]!, run: () => { shown.value = 3 } },
    { at: at[3]!, run: () => { read.value = 1 } },
    { at: at[4]!, run: () => { read.value = 2 } },
    { at: at[5]!, run: () => { read.value = 3 } },
    { at: at[6]!, run: () => { shown.value = 4 } },
    { at: at[7]!, run: () => { shown.value = 5 } }
  ],
  reset: () => {
    shown.value = 0
    read.value = 0
  },
  settle: () => {
    shown.value = 5
    read.value = 3
  }
})

const MARK = 'rounded-[3px] transition-colors duration-500'
const LIT = 'bg-(--d-fail-bg) text-highlighted'
const SKELETON = [[48, 64, 70], [48, 64, 52]]
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The model gets the cause, not a bare 404. The SDK turns GitHub's Not Found into a coded error with the cause and the fix, so the model names the real problem."
    :finished
    :still
    @replay="replay"
  >
    <div class="px-3 py-8 sm:px-8 sm:py-10">
      <div class="mx-auto max-w-[42rem]">
        <ol class="overflow-hidden rounded-lg border border-(--d-line-strong) bg-(--d-raised) p-1.5 text-[12.5px]/5">
          <li
            v-for="(row, i) in SKELETON"
            :key="i"
            class="flex items-center gap-3 px-2.5 py-2"
            aria-hidden="true"
          >
            <span class="size-2 shrink-0 rounded-full bg-(--d-ok)" />
            <span
              v-for="(w, j) in row"
              :key="j"
              class="h-1.5 rounded-full bg-(--d-line-strong)"
              :class="j === 2 ? 'flex-1' : 'shrink-0 max-sm:hidden'"
              :style="j === 2 ? { maxWidth: `${w}%` } : { width: `${w}px` }"
            />
          </li>

          <li class="grid grid-cols-[0.5rem_minmax(0,1fr)] items-start gap-x-3 rounded-md px-2.5 py-1.5">
            <span
              class="mt-1.5 size-2 rounded-full transition-colors duration-500"
              :class="shown > 1 ? 'bg-(--d-fail)' : 'bg-(--d-line-strong)'"
            />
            <span class="d-stack min-w-0">
              <span
                class="flex items-center gap-3 py-1.5 transition-opacity duration-300"
                :class="shown > 0 ? 'opacity-0' : ''"
                aria-hidden="true"
              >
                <span class="h-1.5 w-[4.5rem] shrink-0 rounded-full bg-(--d-line-strong) max-sm:hidden" />
                <span class="h-1.5 w-3/5 rounded-full bg-(--d-line-strong)" />
              </span>
              <span
                class="flex min-w-0 gap-x-3 transition-opacity duration-300"
                :class="shown > 0 ? '' : 'opacity-0'"
              >
                <span class="w-[4.5rem] shrink-0 font-mono text-dimmed max-sm:hidden">tool call</span>
                <code class="min-w-0 font-mono [overflow-wrap:anywhere] text-highlighted">getFileContent({ owner: 'acme', repo: 'billing', path: 'README.md' })</code>
              </span>
            </span>
          </li>

          <li
            class="d-step overflow-hidden rounded-md bg-(--d-fail-bg)"
            :data-on="shown > 1"
          >
            <div class="flex items-start gap-x-3 px-2.5 py-1.5">
              <span class="mt-1.5 size-2 shrink-0 rounded-full bg-(--d-fail)" />
              <span class="w-[4.5rem] shrink-0 font-mono text-(--d-fail) max-sm:hidden">github</span>
              <span class="min-w-0 font-mono [overflow-wrap:anywhere] text-(--d-fail)">GET /repos/acme/billing/contents/README.md 404 Not Found</span>
            </div>

            <div
              class="d-step mx-1.5 mb-1.5 rounded-md border border-(--d-line) bg-default px-3 py-2.5 font-mono text-muted"
              :data-on="shown > 2"
            >
              <p class="mb-1 text-[12px] text-dimmed">
                Returned to the model
              </p>
              <div class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-[1ch]">
                <span class="text-toned">name</span>
                <span class="text-highlighted">"EvlogError"</span>
                <span class="text-toned">message</span>
                <span class="[overflow-wrap:anywhere]">"GitHub resource not found (404): Not Found"</span>
                <span class="text-toned">status</span>
                <span>404</span>
                <span class="text-toned">code</span>
                <span><span :class="[MARK, read > 0 ? LIT : 'text-highlighted']">"github_tools.NOT_FOUND"</span></span>
                <span class="text-toned">why</span>
                <span class="[overflow-wrap:anywhere]">"{{ why.before }}<span :class="[MARK, read > 1 ? LIT : '']">{{ why.mark }}</span>{{ why.after }}"</span>
                <span class="text-toned">fix</span>
                <span class="[overflow-wrap:anywhere]">"{{ fix.before }}<span :class="[MARK, read > 2 ? LIT : '']">{{ fix.mark }}</span>{{ fix.after }}"</span>
                <span class="text-toned">link</span>
                <span class="[overflow-wrap:anywhere]">"{{ link }}"</span>
              </div>
            </div>
          </li>

          <li class="grid grid-cols-[0.5rem_minmax(0,1fr)] items-start gap-x-3 rounded-md px-2.5 py-1.5">
            <span
              class="mt-1.5 size-2 rounded-full transition-colors duration-500"
              :class="shown > 3 ? 'bg-(--d-ok)' : 'bg-(--d-line-strong)'"
            />
            <span class="d-stack min-w-0">
              <span
                class="flex flex-col justify-center gap-2 py-1.5 transition-opacity duration-300 sm:ps-[5.25rem]"
                :class="shown > 3 ? 'opacity-0' : ''"
                aria-hidden="true"
              >
                <span class="h-1.5 w-11/12 rounded-full bg-(--d-line-strong)" />
                <span class="h-1.5 w-4/5 rounded-full bg-(--d-line-strong)" />
                <span class="h-1.5 w-2/3 rounded-full bg-(--d-line-strong)" />
              </span>
              <span
                class="flex min-w-0 gap-x-3 transition-opacity duration-300"
                :class="shown > 3 ? '' : 'opacity-0'"
              >
                <span class="w-[4.5rem] shrink-0 font-mono text-dimmed max-sm:hidden">agent</span>
                <span class="min-w-0 text-[13px]/5 text-highlighted">{{ ANSWER }}</span>
              </span>
            </span>
          </li>
        </ol>

        <p
          class="d-step mt-4 px-1 text-[13px]/5 text-muted"
          :data-on="shown > 4"
        >
          Without the SDK, the model only gets Octokit's <code class="font-mono text-[12.5px] text-toned">Not Found</code> and guesses: "acme/billing has no README.md."
        </p>
      </div>
    </div>
  </DocsFigure>
</template>
