<template>
  <UMain>
    <UContainer class="py-6 sm:py-8">
      <!--
        Fixed-width left column instead of the default fractional `col-span-2`.
        A `col-span` sidebar resizes with the grid, so it visibly narrows whenever
        anything shrinks the available width (e.g. opening the AI assistant panel),
        shifting where the sidebar ends relative to the page title.
      -->
      <UPage
        :ui="{
          root: 'lg:grid-cols-[16rem_minmax(0,1fr)]',
          left: 'lg:col-span-1',
          center: 'lg:col-span-1',
        }"
      >
        <template #left>
          <UPageAside>
            <DocsAsideLeftTop />
            <DocsAsideLeftBody />
          </UPageAside>
        </template>
        <slot />
      </UPage>
    </UContainer>
  </UMain>
</template>
