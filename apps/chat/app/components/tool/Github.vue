<script setup lang="ts">
import { GITHUB_TOOL_META } from '#shared/utils/tools/github'
import type { GithubToolName, GithubUIToolInvocation } from '#shared/utils/tools/github'

const props = defineProps<{
  invocation: GithubUIToolInvocation
}>()

const toolName = computed(() => props.invocation.type.slice(5) as GithubToolName)

const meta = computed(() => GITHUB_TOOL_META[toolName.value] ?? {
  title: toolName.value,
  label: toolName.value,
  labelActive: toolName.value,
  icon: 'i-simple-icons-github'
})

const approvalInfo = computed(() => (props.invocation as { approval?: { approved?: boolean } }).approval)
const isRunning = computed(() =>
  props.invocation.state === 'input-streaming'
  || props.invocation.state === 'input-available'
  || (props.invocation.state === 'approval-responded' && approvalInfo.value?.approved === true)
)
const isDenied = computed(() =>
  props.invocation.state === 'output-denied'
  || (props.invocation.state === 'approval-responded' && approvalInfo.value?.approved === false)
)
const isError = computed(() => props.invocation.state === 'output-error')
const isDone = computed(() => props.invocation.state === 'output-available')

const label = computed(() => {
  if (isDenied.value) return `${meta.value.title} denied`
  return isRunning.value ? meta.value.labelActive : meta.value.label
})

const context = computed(() => {
  const input = props.invocation.input
  if (!input) return null
  if (input.owner && input.repo) return `${input.owner}/${input.repo}`
  if (input.query) return String(input.query)
  if (input.path) return String(input.path)
  return null
})
</script>

<template>
  <div class="flex items-center gap-1.5 text-xs my-1">
    <UIcon :name="meta.icon" class="size-3 shrink-0 text-muted" />
    <span class="text-default/70 font-medium">{{ label }}</span>
    <span v-if="context" class="text-muted font-mono">{{ context }}</span>
    <UIcon v-if="isRunning" name="i-lucide-loader-circle" class="size-3 shrink-0 text-muted animate-spin" />
    <UIcon v-else-if="isDone" name="i-lucide-check" class="size-3 shrink-0 text-success/60" />
    <UIcon v-else-if="isDenied" name="i-lucide-ban" class="size-3 shrink-0 text-warning/60" />
    <UIcon v-else-if="isError" name="i-lucide-x" class="size-3 shrink-0 text-error/60" />
  </div>
</template>
