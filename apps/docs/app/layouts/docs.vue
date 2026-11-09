<script setup lang="ts">
const route = useRoute()
const menuOpen = ref(false)

watch(() => route.path, () => {
  menuOpen.value = false
})
</script>

<template>
  <div class="docs-shell min-h-dvh lg:ps-72">
    <aside class="fixed inset-y-0 start-0 z-40 hidden w-72 border-e border-default bg-muted lg:block">
      <DocsSidebar />
    </aside>

    <USlideover
      v-model:open="menuOpen"
      side="left"
      :ui="{ content: 'max-w-72 bg-muted' }"
    >
      <template #content>
        <DocsSidebar />
      </template>
    </USlideover>

    <DocsTopBar @open-menu="menuOpen = true" />

    <UMain>
      <UContainer
        :key="route.path"
        class="docs-page-enter max-w-6xl"
      >
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>

<style>
.docs-shell {
  --ui-header-height: 3.5rem;
}

.docs-page-enter {
  animation: docs-page-enter 320ms cubic-bezier(0.23, 1, 0.32, 1) backwards;
}

@keyframes docs-page-enter {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .docs-page-enter {
    animation: none;
  }
}
</style>
