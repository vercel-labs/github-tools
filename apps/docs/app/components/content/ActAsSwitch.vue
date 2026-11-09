<script setup lang="ts">
type ActAs = 'app' | 'user' | 'caller'
type Driver = 'maintainer' | 'reader' | 'new' | 'schedule'
type Outcome = 'app' | 'user' | 'forbidden' | 'sign-in' | 'principal'

const actAsOptions: ActAs[] = ['app', 'user', 'caller']

const drivers: { id: Driver, label: string, name: string, note: string }[] = [
  { id: 'maintainer', label: 'Maintainer', name: 'Ada', note: 'can merge in acme/web' },
  { id: 'reader', label: 'Reader', name: 'Ben', note: 'read access to acme/web' },
  { id: 'new', label: 'New user', name: 'Cleo', note: 'has not authorized the App yet' },
  { id: 'schedule', label: 'Schedule', name: 'Schedule', note: 'Weekdays at 09:00, nobody signed in' }
]

const actAs = ref<ActAs>('app')
const driver = ref<Driver>('maintainer')
const shown = ref(0)
const pressing = ref('')
const touched = ref(false)

const person = computed(() => drivers.find(d => d.id === driver.value)!)
const signedIn = computed(() => driver.value !== 'schedule')

const outcome = computed<Outcome>(() => {
  if (actAs.value === 'app') return 'app'
  if (!signedIn.value) return actAs.value === 'user' ? 'principal' : 'app'
  if (driver.value === 'new') return 'sign-in'
  if (driver.value === 'reader') return 'forbidden'
  return 'user'
})

const token = computed(() => {
  if (outcome.value === 'app') return { label: 'App installation token', on: true }
  if (outcome.value === 'principal') return { label: 'None: no signed-in user to act as', on: false }
  if (outcome.value === 'sign-in') return { label: `None yet: ${person.value.name} has no GitHub token`, on: false }
  return { label: `${person.value.name}'s own GitHub token`, on: true }
})

const login = computed(() => person.value.name.toLowerCase())

function press(key: string, apply: () => void) {
  pressing.value = key
  setTimeout(() => {
    pressing.value = ''
    apply()
  }, 160)
}

function auto(key: string, apply: () => void) {
  return () => {
    if (touched.value) return
    press(key, () => {
      if (!touched.value) apply()
    })
  }
}

function choose(next: { actAs?: ActAs, driver?: Driver }) {
  touched.value = true
  shown.value = 3
  if (next.actAs) actAs.value = next.actAs
  if (next.driver) driver.value = next.driver
}

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 200, run: () => { shown.value = 1 } },
    { at: 800, run: () => { shown.value = 2 } },
    { at: 1400, run: () => { shown.value = 3 } },
    { at: 3600, run: auto('act-caller', () => { actAs.value = 'caller' }) },
    { at: 6000, run: auto('drv-reader', () => { driver.value = 'reader' }) },
    { at: 8400, run: auto('drv-schedule', () => { driver.value = 'schedule' }) },
    { at: 10800, run: auto('act-user', () => { actAs.value = 'user' }) },
    { at: 13200, run: auto('drv-maintainer', () => { driver.value = 'maintainer' }) }
  ],
  reset: () => {
    shown.value = 0
    pressing.value = ''
    touched.value = false
    actAs.value = 'app'
    driver.value = 'maintainer'
  },
  settle: () => {
    shown.value = 3
    actAs.value = 'user'
    driver.value = 'maintainer'
  }
})

const segment = 'rounded-md px-2 py-1 transition-[background-color,color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) sm:px-2.5'
const segmentOn = 'bg-default text-highlighted shadow-xs ring-1 ring-(--d-line-strong)'
const segmentOff = 'text-muted hover:text-highlighted'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="With a connector, actAs decides whose GitHub token runs the call, so GitHub checks and records that person or the App."
    :finished
    :still
    @replay="replay"
  >
    <div class="flex flex-col gap-3 border-b border-(--d-line) px-4 py-3 text-[12.5px] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:px-6">
      <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
        <span
          id="act-as-label"
          class="font-mono text-dimmed"
        >actAs</span>
        <div
          role="group"
          aria-labelledby="act-as-label"
          class="inline-flex w-fit rounded-lg border border-(--d-line) bg-(--d-raised-strong) p-0.5 font-mono"
        >
          <button
            v-for="option in actAsOptions"
            :key="option"
            type="button"
            :aria-pressed="actAs === option"
            :class="[segment, actAs === option ? segmentOn : segmentOff, pressing === `act-${option}` ? 'scale-95' : '']"
            @click="choose({ actAs: option })"
          >
            '{{ option }}'
          </button>
        </div>
      </div>

      <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2.5">
        <span
          id="act-as-driver"
          class="text-dimmed"
        >Turn from</span>
        <div
          role="group"
          aria-labelledby="act-as-driver"
          class="inline-flex w-fit rounded-lg border border-(--d-line) bg-(--d-raised-strong) p-0.5"
        >
          <button
            v-for="d in drivers"
            :key="d.id"
            type="button"
            :aria-pressed="driver === d.id"
            :class="[segment, driver === d.id ? segmentOn : segmentOff, pressing === `drv-${d.id}` ? 'scale-95' : '']"
            @click="choose({ driver: d.id })"
          >
            {{ d.label }}
          </button>
        </div>
      </div>
    </div>

    <ol class="flex flex-col gap-3 p-4 text-[13.5px]/6 sm:p-6">
      <li
        class="d-step flex gap-4"
        :data-on="shown > 0"
      >
        <span class="w-16 shrink-0 text-dimmed">{{ signedIn ? person.name : 'Schedule' }}</span>
        <span class="min-w-0">
          <span class="text-highlighted">
            <template v-if="signedIn">@agent merge acme/web#128</template>
            <template v-else>Merge acme/web#128 once checks pass.</template>
          </span>
          <span class="block text-[12.5px] text-dimmed">{{ signedIn ? `Signed in, ${person.note}` : person.note }}</span>
        </span>
      </li>

      <li
        class="d-step flex flex-wrap items-center gap-x-4 gap-y-1"
        :data-on="shown > 1"
      >
        <span class="w-16 shrink-0 text-dimmed">Agent</span>
        <code class="rounded-md border border-(--d-line) bg-(--d-raised-strong) px-2 py-0.5 font-mono text-[12.5px] text-highlighted">mergePullRequest({ pullNumber: 128 })</code>
      </li>

      <li
        class="d-step"
        :data-on="shown > 2"
      >
        <Transition
          mode="out-in"
          enter-active-class="transition duration-300 ease-(--d-ease) motion-reduce:transition-opacity"
          enter-from-class="opacity-0 translate-y-1 motion-reduce:translate-y-0"
          leave-active-class="transition-opacity duration-150"
          leave-to-class="opacity-0"
        >
          <div
            :key="`${actAs}-${driver}`"
            class="flex flex-col gap-3"
          >
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span class="w-16 shrink-0 text-dimmed">Token</span>
              <span class="inline-flex items-center gap-1.5 text-[12.5px] text-muted">
                <span
                  class="size-1.5 rounded-full"
                  :class="token.on ? 'bg-(--d-signal)' : 'bg-(--d-warn)'"
                />
                {{ token.label }}
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span class="w-16 shrink-0 text-dimmed">GitHub</span>

              <span
                v-if="outcome === 'app' || outcome === 'user'"
                class="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-(--d-line) bg-(--d-raised-strong) px-2.5 py-1.5 text-[12.5px]"
              >
                <span class="relative inline-flex">
                  <span
                    class="inline-flex size-5 items-center justify-center bg-inverted text-[10px] font-semibold text-inverted"
                    :class="outcome === 'app' ? 'rounded-md' : 'rounded-full'"
                  >{{ outcome === 'app' ? 'a' : person.name[0] }}</span>
                  <span
                    v-if="outcome === 'user'"
                    class="absolute -right-1 -bottom-1 inline-flex size-3 items-center justify-center rounded-[3px] bg-(--d-signal) text-[7px] font-bold text-(--d-signal-fg) ring-2 ring-(--d-raised-strong)"
                    aria-hidden="true"
                  >a</span>
                </span>
                <span class="font-medium text-highlighted">{{ outcome === 'app' ? 'acme-agent' : login }}</span>
                <span
                  v-if="outcome === 'app'"
                  class="rounded-full border border-(--d-line-strong) px-1.5 text-[10.5px]/4 text-muted"
                >bot</span>
                <span class="text-muted">merged commit <code class="font-mono">3f2a91c</code> into main</span>
                <span
                  v-if="outcome === 'user'"
                  class="text-dimmed"
                >with the acme-agent badge</span>
              </span>

              <span
                v-else-if="outcome === 'forbidden'"
                class="inline-flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <code class="font-mono text-[12.5px] text-muted">PUT /repos/acme/web/pulls/128/merge</code>
                <span class="font-mono text-[12.5px] text-(--d-warn)">403</span>
              </span>

              <span
                v-else
                class="text-[12.5px] text-muted"
              >No request sent</span>
            </div>

            <div class="flex gap-4">
              <span class="w-16 shrink-0 text-dimmed">Agent</span>

              <div
                v-if="outcome === 'sign-in'"
                class="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 rounded-lg border border-(--d-warn)/40 bg-(--d-raised-strong) px-4 py-3"
              >
                <div>
                  <p class="text-highlighted">
                    Connect GitHub to continue
                  </p>
                  <p class="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-muted">
                    <span class="size-1.5 animate-pulse rounded-full bg-(--d-warn) motion-reduce:animate-none" />
                    The merge resumes once Cleo authorizes the App
                  </p>
                </div>
                <span class="rounded-md bg-inverted px-2.5 py-1 text-[12.5px] text-inverted">Authorize</span>
              </div>

              <span
                v-else-if="outcome === 'principal'"
                class="min-w-0 text-highlighted"
              >
                Fails with <code class="font-mono text-[12.5px] text-(--d-warn)">principal_required</code>
              </span>

              <span
                v-else-if="outcome === 'forbidden'"
                class="min-w-0 text-highlighted"
              >GitHub refused: Ben can read acme/web but can't merge. Ask a maintainer.</span>

              <span
                v-else
                class="min-w-0 text-highlighted"
              >Merged acme/web#128.</span>
            </div>
          </div>
        </Transition>
      </li>
    </ol>
  </DocsFigure>
</template>
