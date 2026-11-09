<script setup lang="ts">
type Column = 'queued' | 'building' | 'review' | 'ready' | 'merged'
type Card = { number: number, title: string, column: Column, step: number }

const COLUMNS: { id: Column, label: string, actor: string }[] = [
  { id: 'queued', label: 'Queued', actor: 'labeled agent' },
  { id: 'building', label: 'Building', actor: 'factory agent' },
  { id: 'review', label: 'In review', actor: 'review agent' },
  { id: 'ready', label: 'Ready', actor: 'you' }
]

const WORK: Record<'building' | 'review', string[]> = {
  building: ['reading the code', 'editFiles on agent/*', 'opening a pull request'],
  review: ['checks running', 'reviewing the diff', 'approved']
}

const BACKLOG = [
  { number: 101, title: 'Session cookie misses SameSite' },
  { number: 104, title: 'Retry webhook deliveries' },
  { number: 107, title: 'Typo in the billing email' },
  { number: 110, title: 'Empty state on the search page' }
]

const { later, clear } = useSceneTimers()
const cards = ref<Card[]>([
  { number: 84, title: 'Paginate the audit log', column: 'ready', step: 0 },
  { number: 86, title: 'Cache the pricing page', column: 'review', step: 1 },
  { number: 89, title: 'Flaky checkout test', column: 'review', step: 0 },
  { number: 92, title: 'Reset links never expire', column: 'building', step: 1 },
  { number: 93, title: 'Slow CSV export', column: 'building', step: 0 },
  { number: 95, title: 'Dark mode toggle resets', column: 'queued', step: 0 },
  { number: 97, title: 'Broken link in the footer', column: 'queued', step: 0 },
  { number: 98, title: 'Validate webhook signatures', column: 'queued', step: 0 }
])
const merged = ref(41)
const nextIssue = ref(0)
let ticking = true
let turn = 0

function tick() {
  if (!ticking) return
  turn++
  const active = cards.value.filter(card => card.column === 'building' || card.column === 'review')
  const card = active[turn % Math.max(active.length, 1)]
  if (card) {
    if (card.step < 2) card.step++
    else {
      card.column = card.column === 'building' ? 'review' : 'ready'
      card.step = 0
    }
  }
  const building = cards.value.filter(entry => entry.column === 'building').length
  const queued = cards.value.find(entry => entry.column === 'queued')
  if (building < 2 && queued) queued.column = 'building'
  later(900, tick)
}

function label() {
  const issue = BACKLOG[nextIssue.value % BACKLOG.length]!
  nextIssue.value++
  cards.value.push({ ...issue, number: issue.number + Math.floor((nextIssue.value - 1) / BACKLOG.length) * 20, column: 'queued', step: 0 })
}

function merge(card: Card) {
  card.column = 'merged'
  merged.value++
}

onMounted(() => later(900, tick))
onBeforeUnmount(() => {
  ticking = false
  clear()
})

function inColumn(column: Column) {
  return cards.value.filter(card => card.column === column)
}

const hint = computed(() => inColumn('ready').length
  ? 'Agents build and review on their own, inside agent/* branches. Merging into main stays yours.'
  : 'Label another issue: the factory picks it up from the queue.')

defineExpose({ hint })
</script>

<template>
  <LandingSceneWindow
    app="github"
    title="github.com/orgs/acme/projects/7"
    class="h-full"
  >
    <div class="flex h-11 shrink-0 items-center gap-3 border-b border-(--d-line) px-3.5">
      <p class="text-[14px] text-highlighted">
        Factory
      </p>
      <p class="hidden items-center gap-1.5 text-[12px] text-muted sm:flex">
        <UIcon
          name="i-lucide-git-merge"
          class="size-3.5"
        />
        <span class="tabular-nums">{{ merged }}</span> merged this week
      </p>
      <button
        type="button"
        class="ms-auto flex h-7 items-center gap-1.5 rounded-md border border-(--d-line-strong) px-2.5 text-[12.5px] text-toned transition-colors hover:bg-(--d-raised-strong) hover:text-highlighted"
        @click="label"
      >
        <UIcon
          name="i-lucide-tag"
          class="size-3.5"
        />
        Label an issue agent
      </button>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-3 gap-px bg-(--d-line) sm:grid-cols-4">
      <section
        v-for="column in COLUMNS"
        :key="column.id"
        class="flex min-h-0 flex-col bg-default"
        :class="column.id === 'queued' ? 'hidden sm:flex' : ''"
      >
        <header class="shrink-0 px-2.5 pt-2.5 pb-2">
          <p class="flex items-center gap-1.5 text-[12.5px] text-highlighted">
            {{ column.label }}
            <span class="rounded-full bg-(--d-raised-strong) px-1.5 text-[12px]/4 text-muted tabular-nums">{{ inColumn(column.id).length }}</span>
          </p>
          <p class="mt-0.5 truncate text-[12px] text-dimmed">
            {{ column.actor }}
          </p>
        </header>
        <ol class="scene-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-2 pb-2">
          <li
            v-for="card in inColumn(column.id)"
            :key="card.number"
            class="scene-row rounded-md border border-(--d-line) bg-(--d-raised) px-2 py-1.5"
          >
            <p class="flex items-center gap-1 text-[12px] text-muted">
              <UIcon
                :name="column.id === 'queued' ? 'i-lucide-circle-dot' : 'i-lucide-git-pull-request'"
                class="size-3.5 shrink-0"
              />
              #{{ card.number }}
            </p>
            <p class="mt-0.5 line-clamp-2 text-[12.5px]/4.5 text-highlighted">
              {{ card.title }}
            </p>
            <p
              v-if="column.id === 'building' || column.id === 'review'"
              class="mt-1 flex items-center gap-1 text-[12px] text-dimmed"
            >
              <UIcon
                name="i-lucide-loader-circle"
                class="size-3 shrink-0 animate-spin"
              />
              <span class="truncate">{{ WORK[column.id][card.step] }}</span>
            </p>
            <button
              v-if="column.id === 'ready'"
              type="button"
              class="relative mt-1.5 h-6 w-full rounded-md bg-(--d-go) text-[12px] font-medium text-white transition-transform active:scale-[0.97]"
              @click="merge(card)"
            >
              <span
                class="scene-ping pointer-events-none absolute inset-0 rounded-md"
                aria-hidden="true"
              />
              Merge
            </button>
          </li>
        </ol>
      </section>
    </div>
  </LandingSceneWindow>
</template>
