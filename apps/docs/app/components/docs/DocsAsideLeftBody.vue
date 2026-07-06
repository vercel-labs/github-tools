<script setup lang="ts">
const { sidebarNavigation } = useSubNavigation()

const contentNavVariants = useUIConfig('contentNavigation')
</script>

<template>
  <UContentNavigation
    :collapsible="false"
    :highlight="contentNavVariants.highlight ?? true"
    :highlight-color="contentNavVariants.highlightColor"
    :variant="contentNavVariants.variant ?? 'link'"
    :color="contentNavVariants.color"
    :navigation="sidebarNavigation"
    :ui="{
      link: 'text-base/6',
      trigger: 'text-base/6 font-semibold text-highlighted',
    }"
  />
</template>
