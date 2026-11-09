<script setup lang="ts">
const emit = defineEmits<{ openMenu: [] }>()

const route = useRoute()
const appConfig = useAppConfig()
const { isEnabled: isAssistantEnabled } = useAssistant()

const crumbs = computed(() => {
  if (route.path === '/docs') return ['Home']
  for (const group of docsSidebar) {
    const item = group.items.find(entry => entry.path === route.path)
    if (item) return [group.label]
  }
  return []
})
</script>

<template>
  <header class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-default bg-default/80 px-4 backdrop-blur sm:px-6">
    <UButton
      icon="i-lucide-menu"
      color="neutral"
      variant="ghost"
      aria-label="Open navigation"
      class="lg:hidden"
      @click="emit('openMenu')"
    />

    <NuxtLink
      to="/docs"
      class="flex items-center gap-2 text-highlighted lg:hidden"
    >
      <AppHeaderLogo
        icon-only
        class="size-5"
      />
      <span class="text-[15px] font-medium">Docs</span>
    </NuxtLink>

    <nav
      v-if="crumbs.length"
      aria-label="Breadcrumb"
      class="hidden text-sm text-highlighted lg:block"
    >
      {{ crumbs.join(' / ') }}
    </nav>

    <div class="ms-auto flex items-center gap-1.5">
      <UContentSearchButton
        :collapsed="true"
        variant="ghost"
        color="neutral"
        class="lg:hidden"
      />
      <AssistantChat v-if="isAssistantEnabled" />
      <ClientOnly>
        <UColorModeButton />
        <template #fallback>
          <div class="size-8" />
        </template>
      </ClientOnly>
      <UButton
        v-if="appConfig.github?.url"
        :to="appConfig.github.url"
        target="_blank"
        label="GitHub"
        icon="i-simple-icons-github"
        color="neutral"
        variant="outline"
        size="sm"
        class="rounded-full"
      />
    </div>
  </header>
</template>
