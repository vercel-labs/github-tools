<script setup lang="ts">
// read: 0 idle, 1 called, 2 request sent, 3 done.
// write: 0 idle, 1 called, 2 waiting at approval, 3 approved, 4 request sent, 5 done.
const read = ref(0)
const write = ref(0)
const cursor = ref<'off' | 'in' | 'gone'>('off')
const pressing = ref(false)

const B = FIGURE_PACE.beat
const [r1, r2, r3, w1, w2, move, press, w3, w4, w5] = timeline([
  B, B, B, B, FIGURE_PACE.hold + 600, 700, 180, B, B, B
])

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: r1!, run: () => { read.value = 1 } },
    { at: r2!, run: () => { read.value = 2 } },
    { at: r3!, run: () => { read.value = 3 } },
    { at: w1!, run: () => { write.value = 1 } },
    { at: w2!, run: () => { write.value = 2 } },
    { at: move!, run: () => { cursor.value = 'in' } },
    { at: press!, run: () => { pressing.value = true } },
    { at: w3!, run: () => {
      pressing.value = false
      write.value = 3
    } },
    { at: w4!, run: () => {
      write.value = 4
      cursor.value = 'gone'
    } },
    { at: w5!, run: () => { write.value = 5 } }
  ],
  reset: () => {
    read.value = 0
    write.value = 0
    cursor.value = 'off'
    pressing.value = false
  },
  settle: () => {
    read.value = 3
    write.value = 5
    cursor.value = 'gone'
  }
})

const waiting = computed(() => write.value === 2)
const writeLine = computed(() => (write.value >= 3 ? 'bg-(--d-ok)' : 'bg-(--d-warn)'))

function dot(state: 'idle' | 'run' | 'ok' | 'warn') {
  return {
    idle: 'bg-(--d-line-strong)',
    run: 'bg-(--d-ok) opacity-60',
    ok: 'bg-(--d-ok)',
    warn: 'bg-(--d-warn)'
  }[state]
}

const readDot = computed(() => (read.value === 0 ? 'idle' : read.value < 3 ? 'run' : 'ok'))
const writeDot = computed(() => (write.value === 0 ? 'idle' : write.value === 2 ? 'warn' : write.value < 5 ? 'run' : 'ok'))

const NODE = 'flex items-center gap-2.5 rounded-lg border bg-(--d-raised) px-2.5 py-2 transition-colors duration-500'
const TILE = 'grid size-7 shrink-0 place-items-center rounded-md border border-(--d-line) bg-(--d-raised-strong) text-muted'
const TAG = 'relative z-10 rounded-[4px] border bg-default px-1.5 font-mono text-[12px]/5 whitespace-nowrap transition-colors duration-500'
const BASE = 'absolute bg-(--d-line-strong)'
const DRAW = 'absolute transition-transform duration-500 ease-(--d-ease)'
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Writes wait for a person. The read runs at once; closeIssue stops at approval before it reaches GitHub, and continues once someone approves it."
    :finished
    :still
    @replay="replay"
  >
    <div class="px-4 py-9 sm:px-10 sm:py-12">
      <div class="mx-auto grid w-full max-w-[30rem] grid-cols-2 text-[13px]">
        <!-- agent -->
        <div class="col-span-2 flex justify-center">
          <div
            :class="NODE"
            class="border-(--d-line-strong)"
          >
            <span :class="TILE">
              <UIcon
                name="i-lucide-cpu"
                class="size-4"
              />
            </span>
            <span class="flex flex-col">
              <span class="font-medium text-highlighted">triage-agent</span>
              <span class="font-mono text-[12px] text-muted">vercel/ai</span>
            </span>
          </div>
        </div>

        <!-- fork -->
        <div
          class="relative col-span-2 h-7"
          aria-hidden="true"
        >
          <span :class="BASE" class="top-0 left-1/2 h-1/2 w-px" />
          <span :class="BASE" class="top-1/2 left-1/4 h-px w-1/2" />
          <span :class="BASE" class="top-1/2 left-1/4 h-1/2 w-px" />
          <span :class="BASE" class="top-1/2 left-3/4 h-1/2 w-px" />
          <span
            :class="[DRAW, read > 0 || write > 0 ? 'scale-y-100' : 'scale-y-0']"
            class="top-0 left-1/2 h-1/2 w-px origin-top bg-(--d-ok)"
          />
          <span
            :class="[DRAW, read > 0 ? 'scale-x-100' : 'scale-x-0']"
            class="top-1/2 left-1/4 h-px w-1/4 origin-right bg-(--d-ok)"
          />
          <span
            :class="[DRAW, read > 0 ? 'scale-y-100' : 'scale-y-0']"
            class="top-1/2 left-1/4 h-1/2 w-px origin-top bg-(--d-ok)"
          />
          <span
            :class="[DRAW, write > 0 ? 'scale-x-100' : 'scale-x-0', writeLine]"
            class="top-1/2 left-1/2 h-px w-1/4 origin-left"
          />
          <span
            :class="[DRAW, write > 0 ? 'scale-y-100' : 'scale-y-0', writeLine]"
            class="top-1/2 left-3/4 h-1/2 w-px origin-top"
          />
        </div>

        <!-- tools -->
        <div class="flex justify-center px-1">
          <div
            :class="NODE"
            class="w-full max-w-52"
            :style="{ borderColor: read > 0 ? 'var(--d-line-strong)' : 'var(--d-line)' }"
          >
            <span
              :class="TILE"
              class="max-sm:hidden"
            >
              <UIcon
                name="i-lucide-eye"
                class="size-4"
              />
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="flex items-center justify-between gap-2">
                <span class="font-medium text-highlighted">getIssue</span>
                <span
                  class="size-2 shrink-0 rounded-full transition-colors duration-500"
                  :class="dot(readDot)"
                />
              </span>
              <span class="font-mono text-[12px] text-muted">read</span>
            </span>
          </div>
        </div>
        <div class="flex justify-center px-1">
          <div
            :class="NODE"
            class="w-full max-w-52"
            :style="{ borderColor: waiting ? 'color-mix(in oklab, var(--d-warn) 55%, transparent)' : write > 0 ? 'var(--d-line-strong)' : 'var(--d-line)' }"
          >
            <span
              :class="TILE"
              class="max-sm:hidden"
            >
              <UIcon
                name="i-lucide-pencil"
                class="size-4"
              />
            </span>
            <span class="flex min-w-0 flex-1 flex-col">
              <span class="flex items-center justify-between gap-2">
                <span class="font-medium text-highlighted">closeIssue</span>
                <span
                  class="size-2 shrink-0 rounded-full transition-colors duration-500"
                  :class="[dot(writeDot), waiting && !still ? 'animate-pulse' : '']"
                />
              </span>
              <span class="font-mono text-[12px] text-muted">write</span>
            </span>
          </div>
        </div>

        <!-- read leg: one line through three rows -->
        <div class="relative row-span-3 flex items-center justify-center py-2">
          <span
            :class="BASE"
            class="inset-y-0 left-1/2 w-px"
            aria-hidden="true"
          />
          <span
            :class="[DRAW, read > 1 ? 'scale-y-100' : 'scale-y-0']"
            class="inset-y-0 left-1/2 w-px origin-top bg-(--d-ok)"
            aria-hidden="true"
          />
          <span
            :class="TAG"
            :style="{ borderColor: read > 1 ? 'var(--d-line-strong)' : 'var(--d-line)' }"
            class="text-muted"
          >GET /issues/42</span>
        </div>

        <!-- write leg: approval gate -->
        <div class="relative flex h-11 items-center justify-center">
          <span
            :class="BASE"
            class="inset-y-0 left-1/2 w-px"
            aria-hidden="true"
          />
          <span
            :class="[DRAW, write > 1 ? 'scale-y-100' : 'scale-y-0', writeLine]"
            class="inset-y-0 left-1/2 w-px origin-top"
            aria-hidden="true"
          />
          <span
            :class="TAG"
            class="d-stack"
            :style="{ borderColor: waiting ? 'var(--d-warn)' : write > 2 ? 'color-mix(in oklab, var(--d-ok) 60%, transparent)' : 'var(--d-line)' }"
          >
            <span
              class="text-(--d-warn) transition-opacity duration-300"
              :class="write > 2 ? 'opacity-0' : ''"
            >APPROVAL</span>
            <span
              class="text-center text-(--d-ok) transition-opacity duration-300"
              :class="write > 2 ? '' : 'opacity-0'"
            >APPROVED</span>
          </span>
        </div>

        <!-- approval fragment -->
        <div class="flex justify-center px-1">
          <div
            class="w-full max-w-52 rounded-lg border px-2.5 py-2.5 transition-colors duration-500"
            :class="waiting ? 'border-(--d-warn)/55 bg-(--d-warn-bg)' : 'border-(--d-line-strong) bg-(--d-raised)'"
          >
            <p class="font-medium text-highlighted">
              Close vercel/ai#42?
            </p>
            <div class="d-stack mt-2">
              <div
                class="flex flex-wrap items-center gap-1.5 transition-opacity duration-300"
                :class="write > 2 ? 'opacity-0' : ''"
                :aria-hidden="write > 2"
              >
                <span class="inline-flex h-7 items-center rounded-md border border-(--d-line-strong) bg-default px-2.5 text-highlighted">Deny</span>
                <span class="relative">
                  <span
                    class="inline-flex h-7 items-center rounded-md bg-(--d-signal) px-2.5 font-medium text-(--d-signal-fg) transition-transform duration-150 ease-out"
                    :class="pressing ? 'scale-[0.93]' : ''"
                  >Approve</span>
                  <svg
                    viewBox="0 0 16 20"
                    class="pointer-events-none absolute top-[55%] left-[62%] z-10 h-5 w-4 transition-[opacity,translate] duration-700 ease-(--d-ease)"
                    :class="{
                      'translate-x-[-40px] translate-y-[22px] opacity-0': cursor === 'off',
                      'translate-x-0 translate-y-0 opacity-100': cursor === 'in',
                      'translate-x-0 translate-y-0 opacity-0': cursor === 'gone'
                    }"
                    aria-hidden="true"
                  >
                    <path
                      d="M1.5 1.5v14.2l3.9-3.6 2.6 6 2.6-1.1-2.6-5.9h5.3z"
                      class="fill-(--d-signal) stroke-(--d-signal-fg)"
                      stroke-width="1.2"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              </div>
              <p
                class="flex items-center gap-1.5 self-center text-muted transition-opacity duration-300"
                :class="write > 2 ? '' : 'opacity-0'"
                :aria-hidden="write < 3"
              >
                <span class="size-2 rounded-full bg-(--d-ok)" />
                Approved by you
              </p>
            </div>
          </div>
        </div>

        <!-- write leg: request -->
        <div class="relative flex h-11 items-center justify-center">
          <span
            :class="BASE"
            class="inset-y-0 left-1/2 w-px"
            aria-hidden="true"
          />
          <span
            :class="[DRAW, write > 3 ? 'scale-y-100' : 'scale-y-0']"
            class="inset-y-0 left-1/2 w-px origin-top bg-(--d-ok)"
            aria-hidden="true"
          />
          <span
            :class="TAG"
            :style="{ borderColor: write > 3 ? 'var(--d-line-strong)' : 'var(--d-line)' }"
            class="text-muted"
          >PATCH /issues/42</span>
        </div>

        <!-- join -->
        <div
          class="relative col-span-2 h-7"
          aria-hidden="true"
        >
          <span :class="BASE" class="top-0 left-1/4 h-1/2 w-px" />
          <span :class="BASE" class="top-0 left-3/4 h-1/2 w-px" />
          <span :class="BASE" class="top-1/2 left-1/4 h-px w-1/2" />
          <span :class="BASE" class="top-1/2 left-1/2 h-1/2 w-px" />
          <span
            :class="[DRAW, read > 1 ? 'scale-y-100' : 'scale-y-0']"
            class="top-0 left-1/4 h-1/2 w-px origin-top bg-(--d-ok)"
          />
          <span
            :class="[DRAW, read > 1 ? 'scale-x-100' : 'scale-x-0']"
            class="top-1/2 left-1/4 h-px w-1/4 origin-left bg-(--d-ok)"
          />
          <span
            :class="[DRAW, write > 3 ? 'scale-y-100' : 'scale-y-0']"
            class="top-0 left-3/4 h-1/2 w-px origin-top bg-(--d-ok)"
          />
          <span
            :class="[DRAW, write > 3 ? 'scale-x-100' : 'scale-x-0']"
            class="top-1/2 left-1/2 h-px w-1/4 origin-right bg-(--d-ok)"
          />
          <span
            :class="[DRAW, read > 1 || write > 3 ? 'scale-y-100' : 'scale-y-0']"
            class="top-1/2 left-1/2 h-1/2 w-px origin-top bg-(--d-ok)"
          />
        </div>

        <!-- GitHub -->
        <div class="col-span-2 flex justify-center">
          <div
            :class="NODE"
            class="border-(--d-line-strong)"
          >
            <span :class="TILE">
              <UIcon
                name="i-simple-icons-github"
                class="size-4 text-highlighted"
              />
            </span>
            <span class="flex flex-col">
              <span class="flex items-center gap-2">
                <span class="font-medium text-highlighted">GitHub</span>
              </span>
              <span class="d-stack font-mono text-[12px] text-muted">
                <span
                  class="transition-opacity duration-300"
                  :class="write > 4 ? 'opacity-0' : ''"
                >#42 open</span>
                <span
                  class="text-(--d-ok) transition-opacity duration-300"
                  :class="write > 4 ? '' : 'opacity-0'"
                >#42 closed</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </DocsFigure>
</template>
