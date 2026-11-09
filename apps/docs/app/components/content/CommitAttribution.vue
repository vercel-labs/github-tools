<script setup lang="ts">
type TokenKind = 'app' | 'user'
type Option = 'coAuthors' | 'author' | 'committer'

const owners: Record<TokenKind, string> = { app: 'acme-agent[bot]', user: 'ada' }
const author = 'Docs Team'
const committer = 'Release Bot'
const coAuthor = { name: 'my-bot[bot]', email: '12345+my-bot[bot]@users.noreply.github.com' }

const tokenOptions = [
  { value: 'app' as const, label: 'GitHub App' },
  { value: 'user' as const, label: 'User token' }
]
const optionOptions = (['coAuthors', 'author', 'committer'] as const).map(value => ({ value, label: value }))

const tokenKind = ref<TokenKind>('app')
const option = ref<Option>('coAuthors')

interface View {
  key: string
  people: string[]
  byline: { lead: string, rest: string }
  verified: boolean
  reason: string
  sha: string
}

const SHAS: Record<string, string> = { 'app-coAuthors': '3f2a91c', 'app-author': 'b81d04e', 'app-committer': '9c47e2a', 'user-coAuthors': '5e0a7d3', 'user-author': 'd2f96b1', 'user-committer': '71c3a8f' }

function view(kind: TokenKind, opt: Option): View {
  const owner = owners[kind]
  const authorName = opt === 'author' ? author : owner
  const committerName = opt === 'committer' ? committer : owner
  return {
    key: `${kind}-${opt}`,
    people: opt === 'coAuthors' ? [owner, coAuthor.name] : [authorName],
    byline: opt === 'coAuthors'
      ? { lead: `${owner} and ${coAuthor.name}`, rest: 'committed' }
      : { lead: authorName, rest: `authored and ${committerName} committed` },
    verified: kind === 'app' && opt === 'coAuthors',
    reason: opt !== 'coAuthors'
      ? `Not signed. A custom ${opt} skips the signed path, so the REST contents API made the commit.`
      : kind === 'user'
        ? 'Not signed. The mutation ran, but GitHub signs commits only for Apps.'
        : 'Verified. GitHub signed the commit because an App token made it.',
    sha: SHAS[`${kind}-${opt}`]!
  }
}

const views = (['app', 'user'] as const).flatMap(kind => optionOptions.map(o => view(kind, o.value)))
const current = computed(() => `${tokenKind.value}-${option.value}`)
const signedPath = computed(() => option.value === 'coAuthors')

const { root, finished, still } = useFigure({ steps: [], reset: () => {}, settle: () => {}, autoplay: false })

function layer(on: boolean) {
  return on ? '' : 'invisible opacity-0'
}
const tagClass = 'absolute top-1/2 left-1/2 -translate-1/2 rounded-sm border border-(--d-line) bg-default px-1.5 font-mono text-[12px]/4 whitespace-nowrap text-muted'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Only an App token gets a Verified commit. Commits carry the token owner unless you set an author or committer, and setting either one skips the signed path."
    :finished
    :still
  >
    <template #controls>
      <FigureTabs
        v-model="tokenKind"
        label="Token"
        :options="tokenOptions"
        show-label
      />
      <FigureTabs
        v-model="option"
        label="Option"
        :options="optionOptions"
        show-label
        mono
      />
    </template>

    <div class="flex justify-center px-4 py-8 sm:px-10 sm:py-10">
      <div class="flex w-full max-w-[28rem] flex-col">
        <div class="d-stack">
          <div
            v-for="kind in tokenOptions"
            :key="kind.value"
            class="mx-auto flex items-center gap-2.5 rounded-lg border border-(--d-line) bg-(--d-raised) px-3 py-2"
            :class="[layer(tokenKind === kind.value)]"
            :aria-hidden="tokenKind !== kind.value"
          >
            <span class="grid size-7 shrink-0 place-items-center rounded-md border border-(--d-line) bg-default text-highlighted">
              <UIcon
                name="i-lucide-key-round"
                class="size-4"
              />
            </span>
            <div>
              <p class="text-[13px]/5 font-medium text-highlighted">
                {{ kind.value === 'app' ? 'App installation token' : 'User token' }}
              </p>
              <p class="font-mono text-[12px]/4 text-muted">
                owner: {{ owners[kind.value] }}
              </p>
            </div>
          </div>
        </div>

        <div
          class="d-stack h-12"
          aria-hidden="true"
        >
          <div
            v-for="path in [true, false]"
            :key="String(path)"
            class="relative flex justify-center"
            :class="[signedPath === path ? '' : 'invisible opacity-0']"
          >
            <span class="w-px bg-(--d-line-strong)" />
            <span :class="tagClass">{{ path ? 'createCommitOnBranch' : 'REST contents API' }}</span>
          </div>
        </div>

        <article class="rounded-lg border border-(--d-line) bg-(--d-raised)">
          <div class="flex flex-col gap-1.5 px-3 pt-2.5 pb-3">
            <div class="flex items-center justify-between gap-3">
              <h4 class="text-[13px]/5 font-medium text-highlighted">
                Update README.md
              </h4>
              <span
                class="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-(--d-ok)/40 bg-(--d-ok-bg) px-2 text-[12px] font-medium text-(--d-ok)"
                :class="[views.find(v => v.key === current)!.verified ? '' : 'invisible opacity-0']"
              >Verified</span>
            </div>
            <div class="flex flex-col gap-1.5">
              <span class="h-1.5 w-11/12 rounded-full bg-(--d-raised-strong)" />
              <span class="h-1.5 w-2/3 rounded-full bg-(--d-raised-strong)" />
            </div>
            <p
              class="mt-1 font-mono text-[12px]/4 [overflow-wrap:anywhere] text-muted"
              :class="[option === 'coAuthors' ? '' : 'invisible opacity-0']"
              :aria-hidden="option !== 'coAuthors'"
            >
              Co-authored-by: {{ coAuthor.name }} &lt;{{ coAuthor.email }}&gt;
            </p>
          </div>

          <div class="d-stack border-t border-(--d-line)">
            <div
              v-for="v in views"
              :key="v.key"
              class="flex items-start gap-2.5 px-3 py-2.5"
              :class="[layer(current === v.key)]"
              :aria-hidden="current !== v.key"
            >
              <span class="flex shrink-0 gap-1">
                <span
                  v-for="person in v.people"
                  :key="person"
                  class="grid size-6 place-items-center rounded-md border border-(--d-line) bg-default text-[12px] font-semibold text-highlighted"
                  aria-hidden="true"
                >{{ person[0]!.toUpperCase() }}</span>
              </span>
              <p class="min-w-0 flex-1 pt-0.5 text-[13px]/5 text-muted">
                <span class="font-medium text-highlighted">{{ v.byline.lead }}</span>
                {{ v.byline.rest }}
              </p>
              <code class="shrink-0 pt-0.5 font-mono text-[12px]/5 text-muted">{{ v.sha }}</code>
            </div>
          </div>
        </article>

        <div class="d-stack mt-4">
          <p
            v-for="v in views"
            :key="v.key"
            class="flex gap-2 text-[13px]/5 text-muted"
            :class="[layer(current === v.key)]"
            :aria-hidden="current !== v.key"
          >
            <span
              class="mt-1.75 size-1.5 shrink-0 rounded-full"
              :class="v.verified ? 'bg-(--d-ok)' : 'bg-(--d-line-strong)'"
            />
            <span>{{ v.reason }}</span>
          </p>
        </div>
      </div>
    </div>
  </DocsFigure>
</template>
