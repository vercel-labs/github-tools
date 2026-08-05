<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { PRESETS, TOOL_DOMAINS, getTool } from '../../utils/preset-explorer-data'

const selected = ref<string[]>(['code-review'])

function togglePreset(id: string) {
  if (selected.value.includes(id)) {
    if (selected.value.length === 1) return
    selected.value = selected.value.filter(p => p !== id)
  } else {
    selected.value = [...selected.value, id]
  }
}

const selectedTools = computed(() => {
  const presets = PRESETS.filter(p => selected.value.includes(p.id))
  return [...new Set(presets.flatMap(p => p.tools))]
})

const groupedTools = computed(() => {
  const names = new Set(selectedTools.value)
  return TOOL_DOMAINS
    .map(domain => ({
      domain,
      tools: getToolsInDomain(domain).filter(tool => names.has(tool.name)),
    }))
    .filter(group => group.tools.length > 0)
})

function getToolsInDomain(domain: string) {
  return selectedTools.value
    .map(name => getTool(name))
    .filter(tool => tool.domain === domain)
}

const writeCount = computed(() => selectedTools.value.filter(name => getTool(name).write).length)

const presetOption = computed(() => selected.value.length === 1 ? `'${selected.value[0]}'` : `[${selected.value.map(p => `'${p}'`).join(', ')}]`)

const codeSnippet = computed(() => `import { createGithubTools } from '@github-tools/sdk'

const tools = createGithubTools({
  preset: ${presetOption.value},
})`)

const { copy, copied } = useClipboard()
</script>

<template>
  <div class="not-prose my-6 overflow-hidden rounded-xl border border-default bg-elevated">
    <div class="flex flex-wrap gap-2 border-b border-default p-4">
      <button
        v-for="preset in PRESETS"
        :key="preset.id"
        type="button"
        class="rounded-full border px-3 py-1 font-mono text-xs transition-colors"
        :class="selected.includes(preset.id)
          ? 'border-inverted bg-inverted text-inverted'
          : 'border-default bg-default text-toned hover:text-highlighted'"
        :aria-pressed="selected.includes(preset.id)"
        @click="togglePreset(preset.id)"
      >
        {{ preset.label }}
      </button>
    </div>

    <div class="grid gap-0 lg:grid-cols-2">
      <div class="min-w-0 space-y-4 border-b border-default p-4 lg:border-b-0 lg:border-r">
        <div class="flex items-center justify-between">
          <p class="vercel-section-label">
            {{ selectedTools.length }} tools ({{ writeCount }} write)
          </p>
        </div>
        <div class="max-h-96 space-y-4 overflow-y-auto pr-1">
          <div v-for="group in groupedTools" :key="group.domain">
            <p class="mb-1.5 text-xs font-semibold text-highlighted">{{ group.domain }}</p>
            <ul class="space-y-1">
              <li
                v-for="tool in group.tools"
                :key="tool.name"
                class="flex items-start gap-2 text-xs"
              >
                <code class="shrink-0 rounded bg-accented px-1 py-0.5 font-mono text-highlighted">{{ tool.name }}</code>
                <span class="text-toned">{{ tool.capability }}</span>
                <span
                  v-if="tool.write"
                  class="ms-auto shrink-0 rounded-full border border-default px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted"
                >write</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="min-w-0 space-y-3 p-4">
        <p class="vercel-section-label">
          Usage
        </p>
        <p class="text-sm/6 text-toned">
          Preset{{ selected.length > 1 ? 's' : '' }} <template v-for="(id, i) in selected" :key="id"><code class="rounded bg-accented px-1 py-0.5 font-mono text-highlighted">{{ id }}</code>{{ i < selected.length - 1 ? ', ' : '' }}</template> — {{ PRESETS.find(p => p.id === selected[0])?.useCase }}.
        </p>
        <div class="relative">
          <pre class="overflow-x-auto rounded-lg bg-default p-3 font-mono text-xs text-toned"><code>{{ codeSnippet }}</code></pre>
          <UButton
            :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
            color="neutral"
            variant="ghost"
            size="xs"
            square
            class="absolute right-2 top-2"
            aria-label="Copy code"
            @click="copy(codeSnippet)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
