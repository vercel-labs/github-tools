<script setup lang="ts">
// GitHub's documented example issue, octocat/Hello-World#1347, in the field order the REST API returns.
const user = (login: string, id: number, nodeId: string) => ({
  login,
  id,
  node_id: nodeId,
  avatar_url: `https://avatars.githubusercontent.com/u/${id}?v=4`,
  gravatar_id: '',
  url: `https://api.github.com/users/${login}`,
  html_url: `https://github.com/${login}`,
  followers_url: `https://api.github.com/users/${login}/followers`,
  following_url: `https://api.github.com/users/${login}/following{/other_user}`,
  gists_url: `https://api.github.com/users/${login}/gists{/gist_id}`,
  starred_url: `https://api.github.com/users/${login}/starred{/owner}{/repo}`,
  subscriptions_url: `https://api.github.com/users/${login}/subscriptions`,
  organizations_url: `https://api.github.com/users/${login}/orgs`,
  repos_url: `https://api.github.com/users/${login}/repos`,
  events_url: `https://api.github.com/users/${login}/events{/privacy}`,
  received_events_url: `https://api.github.com/users/${login}/received_events`,
  type: 'User',
  user_view_type: 'public',
  site_admin: false
})

const repoApi = 'https://api.github.com/repos/octocat/Hello-World'
const octocat = user('octocat', 583231, 'MDQ6VXNlcjU4MzIzMQ==')
const hubot = user('hubot', 480938, 'MDQ6VXNlcjQ4MDkzOA==')

const raw = {
  url: `${repoApi}/issues/1347`,
  repository_url: repoApi,
  labels_url: `${repoApi}/issues/1347/labels{/name}`,
  comments_url: `${repoApi}/issues/1347/comments`,
  events_url: `${repoApi}/issues/1347/events`,
  html_url: 'https://github.com/octocat/Hello-World/issues/1347',
  id: 1,
  node_id: 'MDU6SXNzdWUx',
  number: 1347,
  title: 'Found a bug',
  user: octocat,
  labels: [
    { id: 208045946, node_id: 'MDU6TGFiZWwyMDgwNDU5NDY=', url: `${repoApi}/labels/bug`, name: 'bug', color: 'f29513', default: true, description: 'Something isn\'t working' },
    { id: 208045947, node_id: 'MDU6TGFiZWwyMDgwNDU5NDc=', url: `${repoApi}/labels/needs-triage`, name: 'needs-triage', color: 'ededed', default: false, description: 'Not reviewed yet' }
  ],
  state: 'open',
  locked: false,
  assignee: hubot,
  assignees: [hubot],
  milestone: null,
  comments: 3,
  created_at: '2026-10-28T09:14:02Z',
  updated_at: '2026-11-02T16:40:51Z',
  closed_at: null,
  author_association: 'OWNER',
  type: null,
  active_lock_reason: null,
  sub_issues_summary: { total: 0, completed: 0, percent_completed: 0 },
  issue_dependencies_summary: { blocked_by: 0, total_blocked_by: 0, blocking: 0, total_blocking: 0 },
  body: 'I\'m having a problem with this. Saving a file with a space in its name returns a 500.',
  closed_by: null,
  reactions: { 'url': `${repoApi}/issues/1347/reactions`, 'total_count': 2, '+1': 2, '-1': 0, 'laugh': 0, 'hooray': 0, 'confused': 0, 'heart': 0, 'rocket': 0, 'eyes': 0 },
  timeline_url: `${repoApi}/issues/1347/timeline`,
  performed_via_github_app: null,
  state_reason: null
}

// What getIssueCore returns for the same issue.
const shaped = {
  number: raw.number,
  title: raw.title,
  body: raw.body,
  state: raw.state,
  url: raw.html_url,
  author: raw.user.login,
  assignees: raw.assignees.map(a => a.login),
  labels: raw.labels.map(l => l.name),
  comments: raw.comments,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  closedAt: raw.closed_at
}

// Where each shaped field comes from in the raw response.
const SOURCES: Record<string, keyof typeof shaped> = {
  'number': 'number',
  'title': 'title',
  'body': 'body',
  'state': 'state',
  'html_url': 'url',
  'user.login': 'author',
  'assignees.*.login': 'assignees',
  'labels.*.name': 'labels',
  'comments': 'comments',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'closed_at': 'closedAt'
}
const FIELDS = Object.keys(shaped) as (keyof typeof shaped)[]

interface JsonLine {
  depth: number
  text: string
  path: string
}

function jsonLines(value: unknown): JsonLine[] {
  const out: JsonLine[] = []
  const walk = (v: unknown, path: string, depth: number, prefix: string, comma: string) => {
    const pad = '  '.repeat(depth)
    if (v === null || typeof v !== 'object') {
      out.push({ depth, text: `${pad}${prefix}${JSON.stringify(v)}${comma}`, path })
      return
    }
    const isArray = Array.isArray(v)
    const entries = Object.entries(v)
    out.push({ depth, text: `${pad}${prefix}${isArray ? '[' : '{'}`, path })
    entries.forEach(([key, child], i) => {
      const childPath = isArray ? `${path}.*` : path ? `${path}.${key}` : key
      walk(child, childPath, depth + 1, isArray ? '' : `"${key}": `, i < entries.length - 1 ? ',' : '')
    })
    out.push({ depth, text: `${pad}${isArray ? ']' : '}'}${comma}`, path })
  }
  walk(value, '', 0, '', '')
  return out
}

function leaves(value: unknown): number {
  if (value === null || typeof value !== 'object') return 1
  return Object.values(value).reduce<number>((sum, child) => sum + leaves(child), 0)
}

// About four characters per token, on the compact JSON the model is sent.
const tokens = (value: unknown) => Math.round(JSON.stringify(value).length / 4 / 10) * 10

// Each line carries the index of the shaped field it feeds, or -1.
const rawLines = jsonLines(raw).map(line => ({ ...line, field: SOURCES[line.path] ? FIELDS.indexOf(SOURCES[line.path]!) : -1 }))
const shapedLines = jsonLines(shaped).map(line => ({ ...line, field: line.depth === 0 ? -1 : FIELDS.indexOf(line.path.split('.')[0] as keyof typeof shaped) }))
const rawStats = { fields: leaves(raw), tokens: tokens(raw) }

const shown = ref(0)
const picked = ref(0)
const tracing = ref(false)
const rawCount = ref(0)
const shapedCount = ref(0)

const partial = computed(() => Object.fromEntries(FIELDS.slice(0, picked.value).map(key => [key, shaped[key]])))
const shapedFields = computed(() => leaves(partial.value))

let run = 0
function countTo(target: Ref<number>, to: number, ms: number) {
  const id = run
  const from = target.value
  const start = performance.now()
  const frame = (now: number) => {
    if (id !== run) return
    const p = Math.min(1, (now - start) / ms)
    target.value = Math.round((from + (to - from) * (1 - (1 - p) ** 3)) / 10) * 10
    if (p < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

const pane = useTemplateRef<HTMLElement>('pane')

function pick(count: number) {
  picked.value = count
  countTo(shapedCount, tokens(partial.value), 360)
  const line = pane.value?.querySelector<HTMLElement>(`[data-field="${count - 1}"]`)
  if (line) pane.value!.scrollTo({ top: line.offsetTop - 56, behavior: 'smooth' })
}

const PICK = 420

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 200, run: () => {
      shown.value = 1
      countTo(rawCount, rawStats.tokens, 1100)
    } },
    { at: 1500, run: () => {
      shown.value = 2
      tracing.value = true
    } },
    ...FIELDS.map((_, i) => ({ at: 1900 + i * PICK, run: () => pick(i + 1) })),
    { at: 1900 + FIELDS.length * PICK + 300, run: () => {
      tracing.value = false
    } }
  ],
  reset: () => {
    run++
    shown.value = 0
    picked.value = 0
    tracing.value = false
    rawCount.value = 0
    shapedCount.value = 0
    pane.value?.scrollTo({ top: 0 })
  },
  settle: () => {
    shown.value = 2
    picked.value = FIELDS.length
    rawCount.value = rawStats.tokens
    shapedCount.value = tokens(shaped)
  }
})

function rawClass(field: number) {
  if (shown.value < 2) return 'text-muted'
  if (field === -1 || field >= picked.value) return 'text-dimmed'
  if (tracing.value && field === picked.value - 1) return 'bg-(--d-line) font-medium text-highlighted'
  return 'font-medium text-highlighted'
}

const format = (n: number) => n.toLocaleString('en-US')
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The same issue twice: the REST response GitHub sends, and the getIssue result the SDK builds from it, field by field. The model only ever reads the right side."
    :finished
    :still
    @replay="replay"
  >
    <div class="grid sm:grid-cols-2">
      <section
        class="d-step flex min-w-0 flex-col border-b border-(--d-line) sm:border-r sm:border-b-0"
        :data-on="shown > 0"
        aria-label="GitHub REST response"
      >
        <header class="flex items-baseline justify-between gap-3 border-b border-(--d-line) px-4 py-2.5 text-[12.5px]">
          <span class="text-highlighted">GitHub REST response</span>
          <code class="truncate font-mono text-dimmed">GET /repos/…/issues/1347</code>
        </header>
        <div class="relative h-72 sm:h-auto sm:flex-1">
          <pre
            ref="pane"
            class="d-fade absolute inset-0 overflow-auto py-3 pb-14 font-mono text-[12px]/[1.7]"
            tabindex="0"
            aria-label="Raw issue JSON, scrollable"
          ><span
            v-for="(line, i) in rawLines"
            :key="i"
            class="block w-max min-w-full px-4 transition-[color,background-color] duration-300"
            :class="rawClass(line.field)"
            :data-field="line.field === -1 ? undefined : line.field"
          >{{ line.text }}</span></pre>
        </div>
        <footer class="mt-auto border-t border-(--d-line) px-4 py-2.5 text-[12.5px] text-muted tabular-nums">
          {{ rawStats.fields }} fields, about {{ format(rawCount) }} tokens
        </footer>
      </section>

      <section
        class="d-step flex min-w-0 flex-col"
        :data-on="shown > 1"
        aria-label="getIssue result"
      >
        <header class="flex items-baseline justify-between gap-3 border-b border-(--d-line) px-4 py-2.5 text-[12.5px]">
          <span class="text-highlighted">getIssue result</span>
          <span class="text-dimmed">what the model reads</span>
        </header>
        <pre class="py-3 font-mono text-[12px]/[1.7] [overflow-wrap:anywhere] whitespace-pre-wrap text-highlighted"><span
          v-for="(line, i) in shapedLines"
          :key="i"
          class="d-step block px-4"
          :class="tracing && line.field !== -1 && line.field === picked - 1 ? 'bg-(--d-line)' : ''"
          :data-on="line.field < picked"
          :style="{ paddingLeft: `calc(1rem + ${line.depth * 2 + 2}ch)`, textIndent: '-2ch' }"
        >{{ line.text.trimStart() }}</span></pre>
        <footer class="mt-auto border-t border-(--d-line) px-4 py-2.5 pr-20 text-[12.5px] text-muted tabular-nums">
          {{ shapedFields }} fields, about {{ format(shapedCount) }} tokens
        </footer>
      </section>
    </div>
  </DocsFigure>
</template>

<style scoped>
.d-fade {
  mask-image: linear-gradient(to bottom, #000 78%, transparent);
}
</style>
