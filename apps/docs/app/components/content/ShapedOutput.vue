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

/** Splits a JSON line into a key and a value, so each can take its own color. */
function tokenize(text: string) {
  const match = /^\s*("(?:[^"\\]|\\.)*":\s)?(.*)$/.exec(text)!
  const value = match[2]!
  return { key: match[1] ?? '', value, string: value.startsWith('"') }
}

// About four characters per token, on the compact JSON the model is sent.
const tokens = (value: unknown) => Math.round(JSON.stringify(value).length / 4 / 10) * 10

const rawLines = jsonLines(raw)
// A few real lines of the raw response, in its field order; skeleton rows stand in for the rest.
const RAW_ROWS: ({ skeleton: string } | ReturnType<typeof rawRow>)[] = [
  rawRow(''),
  { skeleton: '84%' },
  { skeleton: '62%' },
  rawRow('id'),
  rawRow('node_id'),
  rawRow('number'),
  rawRow('title'),
  ...['78%', '52%', '86%', '40%', '70%', '58%', '82%', '46%', '66%'].map(skeleton => ({ skeleton }))
]

function rawRow(path: string) {
  const line = rawLines.find(l => l.path === path)!
  return { ...line, ...tokenize(line.text) }
}
const shapedLines = jsonLines(shaped).map(line => ({
  ...line,
  ...tokenize(line.text),
  field: line.depth === 0 ? -1 : FIELDS.indexOf(line.path.split('.')[0] as keyof typeof shaped)
}))
const rawStats = { fields: leaves(raw), tokens: tokens(raw) }

// The shaped fields appear in four groups of three, in the order getIssueCore builds them.
const GROUP = 3
const GROUPS = Math.ceil(FIELDS.length / GROUP)
const groupOf = (field: number) => Math.floor(field / GROUP)

const shown = ref(false)
const groups = ref(0)
const rawCount = ref(0)
const shapedCount = ref(0)

const picked = computed(() => Math.min(FIELDS.length, groups.value * GROUP))
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

const DURATIONS = [1500, ...Array.from({ length: GROUPS }, () => 1300)]
const AT = timeline(DURATIONS)

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: AT[0]!, run: () => {
      shown.value = true
      countTo(rawCount, rawStats.tokens, 1200)
    } },
    ...Array.from({ length: GROUPS }, (_, g) => ({ at: AT[g + 1]!, run: () => {
      groups.value = g + 1
      countTo(shapedCount, tokens(partial.value), 600)
    } }))
  ],
  reset: () => {
    run++
    shown.value = false
    groups.value = 0
    rawCount.value = 0
    shapedCount.value = 0
  },
  settle: () => {
    shown.value = true
    groups.value = GROUPS
    rawCount.value = rawStats.tokens
    shapedCount.value = tokens(shaped)
  }
})

const format = (n: number) => n.toLocaleString('en-US')
</script>

<template>
  <DocsFigure
    ref="root"
    caption="The model only reads the right side. GitHub's REST response for an issue carries over a hundred fields, and getIssue returns the few the model needs."
    :finished
    :still
    @replay="replay"
  >
    <div class="@container px-4 py-8 sm:px-8 sm:py-10">
      <div class="mx-auto grid max-w-3xl gap-4 @2xl:grid-cols-2">
        <section
          class="panel"
          aria-label="GitHub REST response"
        >
          <header class="panel-head">
            <span class="font-mono text-[12px]/5 text-highlighted">GET /issues/1347</span>
            <span class="flex items-center gap-2.5 text-[12px]/5 text-muted tabular-nums">
              <span>{{ rawStats.fields }} fields</span>
              <span class="font-mono text-toned">{{ format(rawCount) }} tokens</span>
            </span>
          </header>
          <div
            class="d-step code"
            :data-on="shown"
          >
            <template
              v-for="(row, i) in RAW_ROWS"
              :key="i"
            >
              <div
                v-if="'skeleton' in row"
                class="flex h-5 items-center ps-[2ch]"
                aria-hidden="true"
              >
                <span
                  class="h-1.5 rounded-full bg-(--d-raised-strong)"
                  :style="{ width: row.skeleton }"
                />
              </div>
              <div
                v-else
                class="line"
                :style="{ paddingLeft: `${row.depth * 2}ch` }"
              >
                <span
                  v-if="row.key"
                  class="key"
                >{{ row.key }}</span><span :class="row.string ? 'text-(--d-ok)' : 'text-highlighted'">{{ row.value }}</span>
              </div>
            </template>
            <div class="line text-highlighted">
              }
            </div>
          </div>
        </section>

        <section
          class="panel"
          aria-label="getIssue result"
        >
          <header class="panel-head">
            <span class="font-mono text-[12px]/5 text-highlighted">getIssue</span>
            <span class="flex items-center gap-2.5 text-[12px]/5 text-muted tabular-nums">
              <span>{{ shapedFields }} fields</span>
              <span class="font-mono text-(--d-ok)">{{ format(shapedCount) }} tokens</span>
            </span>
          </header>
          <div class="code">
            <div
              v-for="(line, i) in shapedLines"
              :key="i"
              class="d-step line"
              :data-on="line.field === -1 ? groups > 0 : groupOf(line.field) < groups"
              :style="{ paddingLeft: `${line.depth * 2}ch` }"
            >
              <span
                v-if="line.key"
                class="key"
              >{{ line.key }}</span><span :class="line.string ? 'text-(--d-ok)' : 'text-highlighted'">{{ line.value }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </DocsFigure>
</template>

<style scoped>
.panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid var(--d-line-strong);
  background: var(--d-raised);
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem 0.75rem;
  border-bottom: 1px solid var(--d-line);
  padding: 0.5rem 0.75rem;
}

.code {
  padding: 0.625rem 0.75rem;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 20px;
}

/* A long value wraps in its own column, next to its key. */
.line {
  display: flex;
  overflow-wrap: anywhere;
}

.key {
  flex-shrink: 0;
  white-space: pre;
  color: var(--ui-text-muted);
}
</style>
