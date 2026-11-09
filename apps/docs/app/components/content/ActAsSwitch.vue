<script setup lang="ts">
type ActAs = 'app' | 'user' | 'caller'
type Driver = 'maintainer' | 'reader' | 'new' | 'schedule'
type Outcome = 'app' | 'user' | 'forbidden' | 'sign-in' | 'principal'
type Tone = 'ok' | 'fail' | 'warn' | 'none'

const actAsOptions = (['app', 'user', 'caller'] as const).map(value => ({ value, label: value }))
const driverOptions: { value: Driver, label: string }[] = [
  { value: 'maintainer', label: 'Maintainer' },
  { value: 'reader', label: 'Reader' },
  { value: 'new', label: 'New user' },
  { value: 'schedule', label: 'Schedule' }
]
const people: Record<Exclude<Driver, 'schedule'>, { name: string, note: string }> = {
  maintainer: { name: 'Ada', note: 'signed in, can merge' },
  reader: { name: 'Ben', note: 'signed in, read access' },
  new: { name: 'Cleo', note: 'signed in, App not authorized' }
}

const actAs = ref<ActAs>('caller')
const driver = ref<Driver>('maintainer')

function outcomeOf(a: ActAs, d: Driver): Outcome {
  if (a === 'app') return 'app'
  if (d === 'schedule') return a === 'user' ? 'principal' : 'app'
  if (d === 'new') return 'sign-in'
  if (d === 'reader') return 'forbidden'
  return 'user'
}

interface Node {
  key: string
  title: string
  sub: string
  status?: { label: string, tone: Tone }
}

function requester(d: Driver): Node & { mark: string } {
  if (d === 'schedule') return { key: d, mark: '', title: 'Weekday schedule', sub: '09:00, nobody signed in' }
  return { key: d, mark: people[d].name[0]!, title: people[d].name, sub: people[d].note }
}

function token(o: Outcome, d: Driver): Node {
  const name = d === 'schedule' ? '' : people[d].name
  switch (o) {
    case 'app': return { key: 'app', title: 'App installation token', sub: 'acme-agent' }
    case 'user':
    case 'forbidden': return { key: `user-${d}`, title: `${name}'s GitHub token`, sub: 'user token' }
    case 'sign-in': return { key: 'sign-in', title: 'No token yet', sub: `eve asks ${name} to authorize the App`, status: { label: 'Waiting', tone: 'warn' } }
    case 'principal': return { key: 'principal', title: 'No token', sub: 'no signed-in user to act as', status: { label: 'principal_required', tone: 'fail' } }
  }
}

function github(o: Outcome, d: Driver): Node {
  switch (o) {
    case 'app': return { key: 'app', title: 'acme/web#128', sub: 'merged by acme-agent[bot]', status: { label: 'Merged', tone: 'ok' } }
    case 'user': return { key: `user-${d}`, title: 'acme/web#128', sub: `merged by ${people[d as Exclude<Driver, 'schedule'>].name.toLowerCase()}, with the acme-agent badge`, status: { label: 'Merged', tone: 'ok' } }
    case 'forbidden': return { key: 'forbidden', title: 'acme/web#128', sub: 'Ben can read the repository but not merge', status: { label: '403', tone: 'fail' } }
    case 'sign-in': return { key: 'sign-in', title: 'acme/web#128', sub: 'still open, the merge resumes after sign-in', status: { label: 'Open', tone: 'none' } }
    case 'principal': return { key: 'principal', title: 'acme/web#128', sub: 'still open', status: { label: 'Open', tone: 'none' } }
  }
}

const combos = (['app', 'user', 'caller'] as const).flatMap(a => driverOptions.map(d => ({ d: d.value, o: outcomeOf(a, d.value) })))
function unique<T extends { key: string }>(items: T[]) {
  return [...new Map(items.map(item => [item.key, item])).values()]
}
const requesters = driverOptions.map(d => requester(d.value))
const tokens = unique(combos.map(c => token(c.o, c.d)))
const githubs = unique(combos.map(c => github(c.o, c.d)))

const outcome = computed(() => outcomeOf(actAs.value, driver.value))
const sent = computed(() => outcome.value === 'app' || outcome.value === 'user' || outcome.value === 'forbidden')
const tokenKey = computed(() => token(outcome.value, driver.value).key)
const githubKey = computed(() => github(outcome.value, driver.value).key)

const tone: Record<Tone, { text: string, dot: string }> = {
  ok: { text: 'text-(--d-ok)', dot: 'bg-(--d-ok)' },
  fail: { text: 'text-(--d-fail)', dot: 'bg-(--d-fail)' },
  warn: { text: 'text-(--d-warn)', dot: 'bg-(--d-warn)' },
  none: { text: 'text-muted', dot: 'bg-(--d-line-strong)' }
}

const { root, finished, still } = useFigure({ steps: [], reset: () => {}, settle: () => {}, autoplay: false })

function layer(on: boolean) {
  return on ? '' : 'invisible opacity-0'
}
const nodeClass = 'flex items-center gap-2.5 rounded-lg border border-(--d-line) bg-(--d-raised) px-3 py-2'
const tileClass = 'grid size-7 shrink-0 place-items-center rounded-md border border-(--d-line) bg-default text-[12px] font-semibold text-highlighted'
const tagClass = 'absolute top-1/2 left-1/2 -translate-1/2 rounded-sm border border-(--d-line) bg-default px-1.5 font-mono text-[12px]/4 whitespace-nowrap'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="actAs picks whose token runs the call. GitHub checks that person or the App, and records them as the one who merged."
    :finished
    :still
  >
    <template #controls>
      <FigureTabs
        v-model="actAs"
        label="actAs"
        :options="actAsOptions"
        show-label
        mono
      />
      <FigureTabs
        v-model="driver"
        label="Turn from"
        :options="driverOptions"
        show-label
      />
    </template>

    <div class="flex justify-center px-4 py-8 sm:px-10 sm:py-10">
      <div class="flex w-full max-w-[26rem] flex-col">
        <div class="d-stack">
          <div
            v-for="r in requesters"
            :key="r.key"
            :class="[nodeClass, layer(driver === r.key)]"
            :aria-hidden="driver !== r.key"
          >
            <span :class="tileClass">
              <template v-if="r.mark">{{ r.mark }}</template>
              <UIcon
                v-else
                name="i-lucide-clock"
                class="size-4"
              />
            </span>
            <div class="min-w-0">
              <p class="text-[13px]/5 font-medium text-highlighted">
                {{ r.title }}
              </p>
              <p class="font-mono text-[12px]/4 text-muted">
                {{ r.sub }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="relative flex h-11 justify-center"
          aria-hidden="true"
        >
          <span class="w-px bg-(--d-line-strong)" />
          <span :class="[tagClass, 'text-muted']">mergePullRequest</span>
        </div>

        <div class="d-stack">
          <div
            v-for="t in tokens"
            :key="t.key"
            :class="[nodeClass, layer(tokenKey === t.key), t.status?.tone === 'warn' ? 'border-(--d-warn)/50' : t.status?.tone === 'fail' ? 'border-(--d-fail)/50' : '']"
            :aria-hidden="tokenKey !== t.key"
          >
            <span :class="tileClass">
              <UIcon
                name="i-lucide-key-round"
                class="size-4"
              />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[13px]/5 font-medium text-highlighted">
                {{ t.title }}
              </p>
              <p class="font-mono text-[12px]/4 text-muted">
                {{ t.sub }}
              </p>
            </div>
            <span
              v-if="t.status"
              class="inline-flex shrink-0 items-center gap-1.5 font-mono text-[12px]"
              :class="tone[t.status.tone].text"
            >
              <span
                class="size-1.5 rounded-full"
                :class="[tone[t.status.tone].dot, t.status.tone === 'warn' ? 'animate-pulse motion-reduce:animate-none' : '']"
              />
              {{ t.status.label }}
            </span>
          </div>
        </div>

        <div
          class="d-stack h-11"
          aria-hidden="true"
        >
          <div
            v-for="isSent in [true, false]"
            :key="String(isSent)"
            class="relative flex justify-center"
            :class="[sent === isSent ? '' : 'invisible opacity-0']"
          >
            <span
              class="w-0 border-l"
              :class="isSent ? 'border-(--d-line-strong)' : 'border-dashed border-(--d-line)'"
            />
            <span :class="[tagClass, isSent ? 'text-muted' : 'text-dimmed']">{{ isSent ? 'PUT /pulls/128/merge' : 'not sent' }}</span>
          </div>
        </div>

        <div class="d-stack">
          <div
            v-for="g in githubs"
            :key="g.key"
            :class="[nodeClass, layer(githubKey === g.key)]"
            :aria-hidden="githubKey !== g.key"
          >
            <span :class="tileClass">
              <UIcon
                name="i-simple-icons-github"
                class="size-4"
              />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[13px]/5 font-medium text-highlighted">
                {{ g.title }}
              </p>
              <p class="font-mono text-[12px]/4 text-muted">
                {{ g.sub }}
              </p>
            </div>
            <span
              v-if="g.status"
              class="inline-flex shrink-0 items-center gap-1.5 font-mono text-[12px]"
              :class="tone[g.status.tone].text"
            >
              <span
                class="size-1.5 rounded-full"
                :class="tone[g.status.tone].dot"
              />
              {{ g.status.label }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </DocsFigure>
</template>
