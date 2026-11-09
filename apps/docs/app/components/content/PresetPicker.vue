<script setup lang="ts">
import { PRESET_TOOLS, TOOL_GROUPS, WRITE_TOOLS } from '~/utils/figure-data/presets'
import type { PresetName } from '~/utils/figure-data/presets'

const presets = Object.keys(PRESET_TOOLS) as PresetName[]
const allTools = TOOL_GROUPS.flatMap(group => group.tools)
const allWrites = allTools.filter(tool => WRITE_TOOLS.has(tool)).length

const selected = ref<PresetName>()
// Once the reader picks a preset, the autoplay leaves the figure alone.
const touched = ref(false)
const cursor = ref<string>()
const gridFocused = ref(false)

const revealed = ref(false)

const included = computed<ReadonlySet<string>>(() => new Set(selected.value ? PRESET_TOOLS[selected.value] : allTools))
const writes = computed(() => [...included.value].filter(tool => WRITE_TOOLS.has(tool)).length)

// The readout counts toward the new totals while the squares sweep, at the same pace.
const shownTools = ref(allTools.length)
const shownWrites = ref(allWrites)
let tweenId = 0
function countTo(tools: number, toolWrites: number, ms = 600) {
  const id = ++tweenId
  const from = [shownTools.value, shownWrites.value] as const
  const start = performance.now()
  const frame = (now: number) => {
    if (id !== tweenId) return
    const p = Math.min(1, (now - start) / ms)
    const eased = 1 - (1 - p) ** 3
    shownTools.value = Math.round(from[0] + (tools - from[0]) * eased)
    shownWrites.value = Math.round(from[1] + (toolWrites - from[1]) * eased)
    if (p < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

function play(preset: PresetName) {
  return () => {
    if (!touched.value) selected.value = preset
  }
}

const { root, finished, still, replay } = useFigure({
  steps: [
    { at: 150, run: () => {
      revealed.value = true
    } },
    { at: 1400, run: play('repo-explorer') },
    { at: 3400, run: play('code-review') },
    { at: 5400, run: play('issue-triage') }
  ],
  reset: () => {
    touched.value = false
    revealed.value = false
    selected.value = undefined
  },
  settle: () => {
    revealed.value = true
    selected.value = 'issue-triage'
  }
})

watch([() => included.value.size, writes], ([tools, toolWrites]) => {
  if (still.value) {
    shownTools.value = tools
    shownWrites.value = toolWrites
  }
  else countTo(tools, toolWrites)
})

// Squares change in catalog order, so a new preset reads as a sweep across the grid.
function cellStyle(tool: string) {
  const delay = allTools.indexOf(tool) * 5
  return {
    opacity: revealed.value ? 1 : 0,
    transition: `opacity 300ms var(--d-ease) ${delay}ms, color 320ms var(--d-ease) ${delay}ms, background-color 320ms var(--d-ease) ${delay}ms, box-shadow 320ms var(--d-ease) ${delay}ms, transform 150ms var(--d-ease)`
  }
}

function pick(preset: PresetName) {
  touched.value = true
  selected.value = selected.value === preset ? undefined : preset
}

function columns(count: number) {
  return count > 9 ? Math.ceil(count / 2) : count
}

function cellClass(tool: string) {
  const write = WRITE_TOOLS.has(tool)
  const color = !selected.value
    ? 'text-(--ui-text-dimmed)'
    : included.value.has(tool) ? 'text-(--d-signal)' : 'text-(--d-line-strong)'
  return [color, write ? 'ring-[1.5px] ring-current ring-inset' : 'bg-current']
}

function onKey(event: KeyboardEvent) {
  const moves: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
  let index = cursor.value ? allTools.indexOf(cursor.value) : -1
  if (event.key in moves) index = index === -1 ? 0 : (index + moves[event.key]! + allTools.length) % allTools.length
  else if (event.key === 'Home') index = 0
  else if (event.key === 'End') index = allTools.length - 1
  else return
  event.preventDefault()
  cursor.value = allTools[index]
}

function onFocus() {
  gridFocused.value = true
  cursor.value ??= allTools[0]
}

function onBlur() {
  gridFocused.value = false
  cursor.value = undefined
}

const cursorNote = computed(() => {
  if (!cursor.value) return ''
  const kind = WRITE_TOOLS.has(cursor.value) ? 'write' : 'read'
  if (!selected.value) return kind
  return `${kind}, ${included.value.has(cursor.value) ? 'in' : 'not in'} ${selected.value}`
})
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Each square is one of the 91 tools, filled for reads and outlined for writes. A preset keeps only the tools its job needs."
    :finished
    :still
    @replay="replay"
  >
    <div
      class="flex flex-wrap gap-1.5 border-b border-(--d-line) p-3 sm:px-5"
      role="group"
      aria-label="Presets"
    >
      <button
        v-for="preset in presets"
        :key="preset"
        type="button"
        :aria-pressed="selected === preset"
        class="rounded-md px-2 py-1 font-mono text-[12.5px] ring-1 transition-[color,background-color,box-shadow,transform] duration-150 ring-inset focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) active:scale-[0.97]"
        :class="selected === preset
          ? 'bg-(--d-raised-strong) text-highlighted ring-(--d-line-strong)'
          : 'text-muted ring-transparent hover:text-highlighted'"
        @click="pick(preset)"
      >
        {{ preset }}
      </button>
    </div>

    <div
      class="flex flex-wrap gap-x-6 gap-y-4 rounded-sm p-5 outline-none focus-visible:ring-2 focus-visible:ring-(--d-signal) focus-visible:ring-inset sm:px-6"
      tabindex="0"
      role="group"
      :aria-label="`${allTools.length} tools. Use the arrow keys to read their names.`"
      @keydown="onKey"
      @focus="onFocus"
      @blur="onBlur"
      @pointerleave="!gridFocused && (cursor = undefined)"
    >
      <div
        v-for="group in TOOL_GROUPS"
        :key="group.label"
      >
        <p
          class="mb-1.5 text-[11.5px] transition-colors duration-300"
          :class="!selected || group.tools.some(tool => included.has(tool)) ? 'text-muted' : 'text-dimmed'"
        >
          {{ group.label }}
        </p>
        <div
          class="grid gap-1"
          :style="{ gridTemplateColumns: `repeat(${columns(group.tools.length)}, 0.875rem)` }"
        >
          <span
            v-for="tool in group.tools"
            :key="tool"
            class="size-3.5 rounded-[3px]"
            :class="[cellClass(tool), cursor === tool ? 'scale-125' : '']"
            :style="cellStyle(tool)"
            aria-hidden="true"
            @pointerenter="cursor = tool"
          />
        </div>
      </div>
    </div>

    <div class="flex min-h-12 flex-wrap items-center gap-x-5 gap-y-1 border-t border-(--d-line) px-5 py-3 pr-20 text-[13px] sm:px-6">
      <p>
        <span class="font-mono text-[12.5px] text-highlighted">{{ selected ?? 'All tools' }}</span>
        <span
          class="ml-2 text-muted tabular-nums"
          aria-hidden="true"
        >{{ shownTools }} tools, {{ shownWrites }} writes</span>
        <span
          class="sr-only"
          aria-live="polite"
        >{{ included.size }} tools, {{ writes }} writes</span>
      </p>
      <p
        class="text-dimmed"
        aria-live="polite"
      >
        <template v-if="cursor">
          <span class="font-mono text-[12.5px] text-highlighted">{{ cursor }}</span>
          <span class="ml-2">{{ cursorNote }}</span>
        </template>
        <span
          v-else
          class="inline-flex items-center gap-3"
        >
          <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-current" />Read</span>
          <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] ring-[1.5px] ring-current ring-inset" />Write</span>
        </span>
      </p>
    </div>
  </DocsFigure>
</template>
