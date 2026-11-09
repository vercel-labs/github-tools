<script setup lang="ts">
import { PRESET_TOOLS, TOOL_GROUPS, WRITE_TOOLS } from '~/utils/figure-data/presets'
import type { PresetName } from '~/utils/figure-data/presets'

const presets = (Object.keys(PRESET_TOOLS) as PresetName[]).map(value => ({ value, label: value }))
const allTools = TOOL_GROUPS.flatMap(group => group.tools)

const selected = ref<PresetName>('code-review')
const cursor = ref<string>()
const gridFocused = ref(false)

const included = computed<ReadonlySet<string>>(() => new Set(PRESET_TOOLS[selected.value]))
const writes = computed(() => [...included.value].filter(tool => WRITE_TOOLS.has(tool)).length)

const { root, finished, still } = useFigure({ steps: [], reset: () => {}, settle: () => {}, autoplay: false })

function columns(count: number) {
  return count > 9 ? Math.ceil(count / 2) : count
}

function cellClass(tool: string) {
  return [
    included.value.has(tool) ? 'text-(--d-signal)' : 'text-(--d-line-strong)',
    WRITE_TOOLS.has(tool) ? 'ring-[1.5px] ring-current ring-inset' : 'bg-current',
    cursor.value === tool ? 'scale-125' : ''
  ]
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
  return `${kind}, ${included.value.has(cursor.value) ? 'included' : 'not included'}`
})
</script>

<template>
  <DocsFigure
    ref="root"
    :caption="`A preset keeps only the tools its job needs. Each square is one of the ${allTools.length} tools, filled for reads and outlined for writes.`"
    :finished
    :still
  >
    <template #controls>
      <FigureTabs
        v-model="selected"
        label="Preset"
        :options="presets"
        show-label
        mono
      />
    </template>

    <div class="flex justify-center px-4 py-8 sm:px-10 sm:py-10">
      <section class="@container w-full max-w-[40rem] rounded-lg border border-(--d-line) bg-(--d-raised)">
        <header class="flex flex-col border-b border-(--d-line) px-3 py-2.5 @min-[28rem]:flex-row @min-[28rem]:items-baseline @min-[28rem]:justify-between @min-[28rem]:gap-x-4">
          <p class="font-mono text-[13px]/5 font-medium text-highlighted">
            {{ selected }}
          </p>
          <p
            class="font-mono text-[12px]/5 text-muted tabular-nums"
            aria-live="polite"
          >
            {{ included.size }} tools, {{ writes }} writes
          </p>
        </header>
    <div
      class="flex flex-wrap gap-x-6 gap-y-4 rounded-sm p-3 outline-none focus-visible:ring-2 focus-visible:ring-(--d-signal) focus-visible:ring-inset"
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
          class="mb-2 text-[12px]/4"
          :class="group.tools.some(tool => included.has(tool)) ? 'text-muted' : 'text-dimmed'"
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
            :class="cellClass(tool)"
            aria-hidden="true"
            @pointerenter="cursor = tool"
          />
        </div>
      </div>
    </div>

    <div class="border-t border-(--d-line) px-3 py-2 text-[12.5px]/5">
      <div class="d-stack min-h-10 @min-[28rem]:min-h-0">
        <p
          :class="cursor ? 'invisible opacity-0' : ''"
        >
          <span class="inline-flex items-center gap-4 text-dimmed">
            <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] bg-current" />Read</span>
            <span class="inline-flex items-center gap-1.5"><span class="size-2.5 rounded-[2px] ring-[1.5px] ring-current ring-inset" />Write</span>
          </span>
        </p>
        <p
          class="text-dimmed"
          :class="cursor ? '' : 'invisible opacity-0'"
          aria-live="polite"
        >
          <span class="d-code mr-2">{{ cursor }}</span>{{ cursorNote }}
        </p>
      </div>
    </div>
      </section>
    </div>
  </DocsFigure>
</template>
