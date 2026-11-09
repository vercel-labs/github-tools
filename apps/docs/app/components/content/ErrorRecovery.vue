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

const shown = ref(0)
const read = ref(0)

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 200, run: () => { shown.value = 1 } },
    { at: 900, run: () => { shown.value = 2 } },
    { at: 1700, run: () => { shown.value = 3 } },
    { at: 2600, run: () => { shown.value = 4 } },
    { at: 3600, run: () => { read.value = 1 } },
    { at: 4300, run: () => { read.value = 2 } },
    { at: 5000, run: () => { read.value = 3 } },
    { at: 5800, run: () => { shown.value = 5 } },
    { at: 7000, run: () => { shown.value = 6 } }
  ],
  reset: () => {
    shown.value = 0
    read.value = 0
  },
  settle: () => {
    shown.value = 6
    read.value = 3
  }
})

const mark = 'rounded-[3px] transition-colors duration-300'
const lit = 'bg-(--d-signal)/12 text-(--d-signal-text)'
const row = 'flex gap-[1ch]'
const key = 'shrink-0 text-toned'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The SDK turns GitHub's bare 404 into a coded error with the cause and the fix, so the model names the real problem."
    :finished
    :still
    @replay="replay"
  >
    <ol class="flex flex-col gap-3 p-4 text-[13.5px]/6 sm:p-6">
      <li
        class="d-step flex gap-4"
        :data-on="shown > 0"
      >
        <span class="w-14 shrink-0 text-dimmed">You</span>
        <span class="text-highlighted">Summarize the README of acme/billing.</span>
      </li>

      <li
        class="d-step flex flex-wrap items-center gap-x-4 gap-y-1"
        :data-on="shown > 1"
      >
        <span class="w-14 shrink-0 text-dimmed">Agent</span>
        <code class="min-w-0 rounded-md border border-(--d-line) bg-(--d-raised-strong) px-2 py-0.5 font-mono text-[12.5px] break-words text-highlighted">getFileContent({ owner: 'acme', repo: 'billing', path: 'README.md' })</code>
      </li>

      <li
        class="d-step flex flex-wrap items-center gap-x-4 gap-y-1"
        :data-on="shown > 2"
      >
        <span class="w-14 shrink-0 text-dimmed">GitHub</span>
        <code class="min-w-0 font-mono text-[12.5px] break-all text-muted">GET /repos/acme/billing/contents/README.md</code>
        <span class="font-mono text-[12.5px] text-(--d-warn)">404 Not Found</span>
      </li>

      <li
        class="d-step flex flex-col gap-2 sm:flex-row sm:gap-4"
        :data-on="shown > 3"
      >
        <span class="w-14 shrink-0 text-dimmed">SDK</span>
        <div class="min-w-0 flex-1">
          <p class="mb-2 text-[12.5px] text-muted">
            The model receives:
          </p>
          <div class="overflow-hidden rounded-lg border border-(--d-line) bg-(--d-raised-strong) px-3 py-2.5 font-mono text-[11.5px]/5 text-muted sm:px-4 sm:text-[12px]/5">
            <p class="text-dimmed">
              {
            </p>
            <div class="ps-[2ch]">
              <p :class="row">
                <span :class="key">"name":</span><span>"EvlogError",</span>
              </p>
              <p :class="row">
                <span :class="key">"message":</span><span class="min-w-0">"GitHub resource not found (404): Not Found",</span>
              </p>
              <p :class="row">
                <span :class="key">"status":</span><span>404,</span>
              </p>
              <p :class="row">
                <span :class="key">"data":</span><span class="text-dimmed">{</span>
              </p>
              <div class="ps-[2ch]">
                <p :class="row">
                  <span :class="key">"code":</span>
                  <span class="min-w-0"><span :class="[mark, read > 0 ? lit : 'text-highlighted']">"github_tools.NOT_FOUND"</span>,</span>
                </p>
                <p :class="row">
                  <span :class="key">"why":</span>
                  <span class="min-w-0">"{{ why.before }}<span :class="[mark, read > 1 ? lit : '']">{{ why.mark }}</span>{{ why.after }}",</span>
                </p>
                <p :class="row">
                  <span :class="key">"fix":</span>
                  <span class="min-w-0">"{{ fix.before }}<span :class="[mark, read > 2 ? lit : '']">{{ fix.mark }}</span>{{ fix.after }}",</span>
                </p>
                <p :class="row">
                  <span :class="key">"link":</span>
                  <span class="min-w-0 break-all">"{{ link }}"</span>
                </p>
              </div>
              <p class="text-dimmed">
                }
              </p>
            </div>
            <p class="text-dimmed">
              }
            </p>
          </div>
        </div>
      </li>

      <li
        class="d-step flex gap-4"
        :data-on="shown > 4"
      >
        <span class="w-14 shrink-0 text-dimmed">Agent</span>
        <span class="min-w-0 text-highlighted">I can't read acme/billing with this token. GitHub answers 404 for private repositories the token can't see, so the README may well exist. Grant the repository to the App installation, then ask again.</span>
      </li>

      <li
        class="d-step mt-2 flex flex-col gap-2 border-t border-dashed border-(--d-line-strong) pt-4 opacity-70 sm:flex-row sm:gap-4"
        :data-on="shown > 5"
      >
        <span class="w-14 shrink-0 text-dimmed">Raw</span>
        <div class="flex min-w-0 flex-col gap-1.5 text-muted">
          <span class="text-[12.5px]">
            Without the SDK, the model only gets Octokit's <code class="font-mono text-toned">Not Found</code> and guesses:
          </span>
          <span class="inline-flex items-start gap-2">
            <span class="mt-2.5 size-1.5 shrink-0 rounded-full bg-(--d-warn)" />
            <span>"acme/billing has no README.md."</span>
          </span>
        </div>
      </li>
    </ol>
  </DocsFigure>
</template>
