<script setup lang="ts">
type Mode = 'preset' | 'auto'

// Scope lists from connectGithubScopesForPreset('issue-triage') and connectGithubScopesForTools([tool]).
const PRESET_SCOPES = ['contents:read', 'metadata:read', 'pull_requests:read', 'issues:read', 'issues:write']
const LIST_ISSUES_SCOPES = ['contents:read', 'metadata:read', 'issues:read']
const ADD_LABELS_SCOPES = ['contents:read', 'metadata:read', 'issues:read', 'issues:write']

const modes: { value: Mode, label: string }[] = [
  { value: 'preset', label: 'issue-triage' },
  { value: 'auto', label: 'auto (eve)' }
]
const mode = ref<Mode>('preset')

type Source = 'agent' | 'sdk' | 'connect' | 'github'
interface Line {
  key: string
  time: string
  source: Source
  text: string
  scopes?: string[]
  /** Scopes the previous request did not have. */
  added?: string[]
  status?: { label: string, tone: 'ok' | 'muted' }
  note?: string
  /** The row that differs between the two modes. */
  focus?: boolean
}

function lines(m: Mode): Line[] {
  const preset = m === 'preset'
  return [
    { key: 'call1', time: '12:04:01.120', source: 'agent', text: 'listIssues({ owner: \'vercel\', repo: \'ai\' })' },
    { key: `scopes1-${m}`, time: '12:04:01.122', source: 'sdk', text: 'Token request for vercel/ai', scopes: preset ? PRESET_SCOPES : LIST_ISSUES_SCOPES },
    { key: 'token1', time: '12:04:01.304', source: 'connect', text: 'Minted token A', note: 'vercel installation, repository ai', status: { label: 'new', tone: 'ok' } },
    { key: 'http1', time: '12:04:01.588', source: 'github', text: 'GET /repos/vercel/ai/issues', status: { label: '200', tone: 'ok' } },
    { key: 'call2', time: '12:04:06.410', source: 'agent', text: 'addLabels({ issueNumber: 42, labels: [\'bug\'] })', note: 'write, approved' },
    { key: `scopes2-${m}`, time: '12:04:06.412', source: 'sdk', text: preset ? 'Token request for vercel/ai, same preset scopes' : 'Token request for vercel/ai, scopes of addLabels', scopes: preset ? PRESET_SCOPES : ADD_LABELS_SCOPES, added: preset ? [] : ['issues:write'] },
    { key: `token2-${m}`, time: '12:04:06.415', source: 'connect', text: preset ? 'Reused token A' : 'Minted token B', note: preset ? 'same connector and parameters' : 'new scopes, so a new token', status: preset ? { label: 'cached', tone: 'muted' } : { label: 'new', tone: 'ok' }, focus: true },
    { key: 'http2', time: '12:04:06.702', source: 'github', text: 'POST /repos/vercel/ai/issues/42/labels', status: { label: '200', tone: 'ok' } }
  ]
}

const views = { preset: lines('preset'), auto: lines('auto') }
const rows = views.preset.map((line, i) => ({ preset: line, auto: views.auto[i]!, varies: line.key !== views.auto[i]!.key }))

const sourceLabel: Record<Source, string> = { agent: 'Agent', sdk: 'SDK', connect: 'Connect', github: 'GitHub' }

const { root, finished, still } = useFigure({ steps: [], reset: () => {}, settle: () => {}, autoplay: false })

</script>

<template>
  <DocsFigure
    ref="root"
    caption="Every call gets a short-lived token. Each tool call asks Connect for a token on the repository it targets, scoped to the preset, or to the one tool under eve's auto preset."
    :finished
    :still
  >
    <template #controls>
      <FigureTabs
        v-model="mode"
        label="preset"
        :options="modes"
        show-label
        mono
      />
    </template>

    <div class="flex justify-center px-4 py-8 sm:px-10 sm:py-10">
      <section class="@container w-full max-w-[40rem] rounded-lg border border-(--d-line) bg-(--d-raised) py-2">
        <div
          class="flex items-center gap-3 px-3 py-2"
          aria-hidden="true"
        >
          <span class="size-1.5 shrink-0 rounded-full bg-(--d-line-strong)" />
          <span class="hidden h-1.5 w-16 rounded-full bg-(--d-raised-strong) @min-[34rem]:block" />
          <span class="h-1.5 w-12 rounded-full bg-(--d-raised-strong)" />
          <span class="h-1.5 w-2/5 rounded-full bg-(--d-raised-strong)" />
        </div>

        <ol>
          <li
            v-for="(row, i) in rows"
            :key="i"
            class="d-stack"
            :class="i === 4 ? 'mt-2 border-t border-(--d-line) pt-2' : ''"
          >
            <div
              v-for="m in (row.varies ? (['preset', 'auto'] as const) : (['preset'] as const))"
              :key="m"
              class="mx-1.5 grid grid-cols-[0.375rem_3.75rem_minmax(0,1fr)] gap-x-3 rounded-md px-1.5 py-1.5 @min-[34rem]:grid-cols-[0.375rem_6.5rem_3.75rem_minmax(0,1fr)]"
              :class="[
                row.varies ? [mode === m ? '' : 'invisible opacity-0'] : '',
                row[m].focus ? (row[m].status?.tone === 'ok' ? 'bg-(--d-ok-bg)' : 'bg-(--d-raised-strong)') : ''
              ]"
              :aria-hidden="row.varies && mode !== m"
            >
              <span
                class="mt-1.75 size-1.5 rounded-full"
                :class="row[m].status?.tone === 'ok' ? 'bg-(--d-ok)' : 'bg-(--d-line-strong)'"
              />
              <span class="hidden font-mono text-[12px]/5 text-dimmed tabular-nums @min-[34rem]:block">{{ row[m].time }}</span>
              <span class="font-mono text-[12px]/5 text-muted">{{ sourceLabel[row[m].source] }}</span>
              <div class="min-w-0">
                <p class="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span
                    class="font-mono text-[12px]/5 [overflow-wrap:anywhere]"
                    :class="row[m].focus ? (row[m].status?.tone === 'ok' ? 'text-(--d-ok)' : 'text-highlighted') : 'text-highlighted'"
                  >{{ row[m].source === 'github' ? row[m].text.replaceAll('/', '/\u200B') : row[m].text }}</span>
                  <span
                    v-if="row[m].status"
                    class="font-mono text-[12px]/5"
                    :class="row[m].status!.tone === 'ok' ? 'text-(--d-ok)' : 'text-muted'"
                  >{{ row[m].status!.label }}</span>
                </p>
                <p
                  v-if="row[m].note"
                  class="text-[12px]/5 text-muted"
                >
                  {{ row[m].note }}
                </p>
                <p
                  v-if="row[m].scopes"
                  class="flex flex-wrap gap-x-3"
                >
                  <span
                    v-for="scope in row[m].scopes"
                    :key="scope"
                    class="font-mono text-[12px]/5"
                    :class="row[m].added?.includes(scope) ? 'text-(--d-ok)' : 'text-muted'"
                  >{{ row[m].added?.includes(scope) ? '+ ' : '' }}{{ scope }}</span>
                </p>
              </div>
            </div>
          </li>
        </ol>

        <div class="d-stack mx-3 mt-2 border-t border-(--d-line) pt-2.5 pb-1 text-[12.5px]/5 text-muted">
          <p
            v-for="m in (['preset', 'auto'] as const)"
            :key="m"
            :class="[mode === m ? '' : 'invisible opacity-0']"
            :aria-hidden="mode !== m"
          >
            {{ m === 'preset' ? 'Token A is short-lived and expires on its own.' : 'Both tokens are short-lived and expire on their own.' }} A later call gets a new one.
          </p>
        </div>
      </section>
    </div>
  </DocsFigure>
</template>
