<script setup lang="ts">
import { GITHUB_TOOL_META } from '#shared/utils/tools/github'
import type { GithubToolName, GithubUIToolInvocation } from '#shared/utils/tools/github'

const props = defineProps<{
  invocation: GithubUIToolInvocation
}>()

const emit = defineEmits<{
  approve: []
  deny: []
}>()

const toolName = computed(() => props.invocation.type.slice(5) as GithubToolName)

const meta = computed(() => GITHUB_TOOL_META[toolName.value] ?? {
  title: toolName.value,
  label: toolName.value,
  labelActive: toolName.value,
  icon: 'i-simple-icons-github'
})

const inputEntries = computed(() => {
  const input = props.invocation.input
  if (!input) return []
  return Object.entries(input).filter(([, v]) => v !== undefined && v !== null && v !== '')
})
</script>

<template>
  <div class="rounded-xl border border-default bg-elevated w-full max-w-sm mt-2 mb-1 overflow-hidden">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-default">
      <UIcon :name="meta.icon" class="size-3.5 shrink-0 text-default" />
      <span class="font-semibold text-default text-sm">{{ meta.title }}</span>
      <span class="text-xs text-muted ml-auto">needs approval</span>
    </div>

    <p v-if="invocation.approval?.requestReason" class="px-3 py-2 text-xs text-muted border-b border-default">
      {{ invocation.approval.requestReason }}
    </p>

    <div v-if="inputEntries.length" class="divide-y divide-default">
      <div
        v-for="([key, value]) in inputEntries"
        :key="key"
        class="flex items-baseline gap-3 px-3 py-1 text-xs"
      >
        <span class="text-muted w-12 shrink-0">{{ key }}</span>
        <span class="text-default font-mono truncate">{{ typeof value === 'string' ? value : JSON.stringify(value) }}</span>
      </div>
    </div>

    <div class="flex items-center gap-1.5 px-3 py-2 border-t border-default">
      <UButton
        label="Approve"
        size="xs"
        color="neutral"
        variant="outline"
        icon="i-lucide-check"
        @click="emit('approve')"
      />
      <UButton
        label="Deny"
        size="xs"
        color="neutral"
        variant="subtle"
        icon="i-lucide-x"
        @click="emit('deny')"
      />
    </div>
  </div>
</template>
