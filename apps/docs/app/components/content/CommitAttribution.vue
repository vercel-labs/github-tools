<script setup lang="ts">
type TokenKind = 'app' | 'user'
type Option = 'author' | 'committer' | 'coAuthors'

const owners: Record<TokenKind, { label: string, name: string, bot: boolean }> = {
  app: { label: 'GitHub App', name: 'acme-agent[bot]', bot: true },
  user: { label: 'User token', name: 'ada', bot: false }
}
const author = { name: 'Docs Team', email: 'docs@acme.dev' }
const committer = { name: 'Release Bot', email: 'release@acme.dev' }
const coAuthor = { name: 'my-bot[bot]', email: '12345+my-bot[bot]@users.noreply.github.com' }

const options: Option[] = ['author', 'committer', 'coAuthors']

const tokenKind = ref<TokenKind>('app')
const set = ref<Record<Option, boolean>>({ author: false, committer: false, coAuthors: false })
const shown = ref(0)
const pressing = ref('')
const touched = ref(false)

const owner = computed(() => owners[tokenKind.value])
const authorName = computed(() => set.value.author ? author.name : owner.value.name)
const committerName = computed(() => set.value.committer ? committer.name : owner.value.name)
const custom = computed(() => set.value.author || set.value.committer)
const verified = computed(() => tokenKind.value === 'app' && !custom.value)

const byline = computed(() => {
  const names = set.value.coAuthors ? `${authorName.value} and ${coAuthor.name}` : authorName.value
  return authorName.value === committerName.value
    ? { lead: names, rest: 'committed' }
    : { lead: names, rest: `authored and ${committerName.value} committed` }
})

const reason = computed(() => {
  if (custom.value) return 'Not signed. A custom author or committer skips the signed path, so the REST contents API makes the commit.'
  if (tokenKind.value === 'user') return 'Not signed. The createCommitOnBranch mutation ran, but GitHub only signs commits for Apps.'
  return 'Signed by GitHub. An App token went through the createCommitOnBranch mutation.'
})

const sha = computed(() => {
  const key = `${tokenKind.value}${set.value.author}${set.value.committer}${set.value.coAuthors}`
  let h = 2166136261
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7)
})

function press(key: string, apply: () => void) {
  if (touched.value) return
  pressing.value = key
  setTimeout(() => {
    pressing.value = ''
    if (!touched.value) apply()
  }, 160)
}

function chooseToken(kind: TokenKind) {
  touched.value = true
  shown.value = 3
  tokenKind.value = kind
}

function toggle(option: Option) {
  touched.value = true
  shown.value = 3
  set.value = { ...set.value, [option]: !set.value[option] }
}

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 200, run: () => { shown.value = 1 } },
    { at: 700, run: () => { shown.value = 2 } },
    { at: 1200, run: () => { shown.value = 3 } },
    { at: 3200, run: () => press('coAuthors', () => { set.value = { ...set.value, coAuthors: true } }) },
    { at: 5600, run: () => press('author', () => { set.value = { ...set.value, author: true } }) }
  ],
  reset: () => {
    shown.value = 0
    pressing.value = ''
    touched.value = false
    tokenKind.value = 'app'
    set.value = { author: false, committer: false, coAuthors: false }
  },
  settle: () => {
    shown.value = 3
    set.value = { author: true, committer: false, coAuthors: true }
  }
})

const control = 'rounded-md px-2 py-1 transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) sm:px-2.5'
const controlOn = 'bg-default text-highlighted shadow-xs ring-1 ring-(--d-line-strong)'
const controlOff = 'text-muted hover:text-highlighted'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Commits carry the token owner unless you set an author or committer, and only an App token with neither set gets a Verified commit."
    :finished
    :still
    @replay="replay"
  >
    <div class="flex flex-col gap-3 border-b border-(--d-line) px-4 py-3 text-[12.5px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:px-6">
      <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
        <span
          id="commit-token-label"
          class="text-dimmed"
        >Token</span>
        <div
          role="group"
          aria-labelledby="commit-token-label"
          class="inline-flex w-fit rounded-lg border border-(--d-line) bg-(--d-raised-strong) p-0.5"
        >
          <button
            v-for="kind in (['app', 'user'] as const)"
            :key="kind"
            type="button"
            :aria-pressed="tokenKind === kind"
            :class="[control, tokenKind === kind ? controlOn : controlOff]"
            @click="chooseToken(kind)"
          >
            {{ owners[kind].label }}
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
        <span
          id="commit-options-label"
          class="text-dimmed"
        >Options</span>
        <div
          role="group"
          aria-labelledby="commit-options-label"
          class="inline-flex w-fit gap-1 font-mono"
        >
          <button
            v-for="option in options"
            :key="option"
            type="button"
            :aria-pressed="set[option]"
            class="inline-flex items-center gap-1.5 border"
            :class="[
              control,
              set[option] ? 'border-(--d-signal)/50 bg-(--d-signal)/8 text-highlighted' : 'border-(--d-line) text-muted hover:text-highlighted',
              pressing === option ? 'scale-95' : ''
            ]"
            @click="toggle(option)"
          >
            <span
              class="size-1.5 rounded-full transition-colors duration-200"
              :class="set[option] ? 'bg-(--d-signal)' : 'bg-(--d-line-strong)'"
            />
            {{ option }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4 p-4 text-[13.5px]/6 sm:p-6">
      <div
        class="d-step overflow-hidden rounded-lg border border-(--d-line) bg-default"
        :data-on="shown > 0"
      >
        <div class="flex items-start justify-between gap-3 px-4 pt-3">
          <p class="font-medium text-highlighted">
            Update README.md
          </p>
          <span
            class="shrink-0 rounded-full border border-(--d-signal)/50 px-2 text-[11.5px]/5 text-(--d-signal-text) transition-[opacity,transform] duration-300 ease-(--d-ease)"
            :class="verified ? 'opacity-100' : 'scale-95 opacity-0'"
            :aria-hidden="!verified"
          >Verified</span>
        </div>

        <div
          class="grid transition-[grid-template-rows] duration-300 ease-(--d-ease)"
          :class="set.coAuthors ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
        >
          <div class="overflow-hidden">
            <p
              class="px-4 pt-2 font-mono text-[12px]/5 break-all text-muted transition-opacity duration-300"
              :class="set.coAuthors ? 'opacity-100' : 'opacity-0'"
            >
              Co-authored-by: {{ coAuthor.name }} &lt;{{ coAuthor.email }}&gt;
            </p>
          </div>
        </div>

        <div class="mt-3 flex items-start gap-2.5 border-t border-(--d-line) bg-(--d-raised-strong) px-4 py-2.5 text-[12.5px]">
          <span class="flex shrink-0 -space-x-1 pt-0.5">
            <span
              class="inline-flex size-5 items-center justify-center bg-inverted text-[10px] font-semibold text-inverted ring-2 ring-(--d-raised-strong)"
              :class="!set.author && owner.bot ? 'rounded-md' : 'rounded-full'"
            >{{ authorName[0]?.toUpperCase() }}</span>
            <span
              v-if="set.coAuthors"
              class="inline-flex size-5 items-center justify-center rounded-md bg-(--d-line-strong) text-[10px] font-semibold text-highlighted ring-2 ring-(--d-raised-strong)"
            >M</span>
          </span>
          <span class="min-w-0 flex-1 text-muted">
            <span class="font-medium text-highlighted">{{ byline.lead }}</span>
            {{ byline.rest }}
          </span>
          <code class="shrink-0 font-mono text-[12px]/6 text-dimmed">{{ sha }}</code>
        </div>
      </div>

      <dl
        class="d-step grid grid-cols-[5.5rem_1fr] gap-x-4 gap-y-1.5 text-[12.5px] sm:grid-cols-[6rem_1fr]"
        :data-on="shown > 1"
      >
        <dt class="text-dimmed">
          Author
        </dt>
        <dd class="min-w-0 break-words text-muted">
          <span class="text-highlighted">{{ set.author ? `${author.name} <${author.email}>` : owner.name }}</span>
          <span v-if="!set.author"> (token owner)</span>
        </dd>
        <dt class="text-dimmed">
          Committer
        </dt>
        <dd class="min-w-0 break-words text-muted">
          <span class="text-highlighted">{{ set.committer ? `${committer.name} <${committer.email}>` : owner.name }}</span>
          <span v-if="!set.committer"> (token owner)</span>
        </dd>
      </dl>

      <p
        class="d-step inline-flex items-start gap-2 text-[12.5px] text-muted"
        :data-on="shown > 2"
      >
        <span
          class="mt-1.5 size-1.5 shrink-0 rounded-full transition-colors duration-300"
          :class="verified ? 'bg-(--d-signal)' : 'bg-(--d-line-strong)'"
        />
        {{ reason }}
      </p>
    </div>
  </DocsFigure>
</template>
