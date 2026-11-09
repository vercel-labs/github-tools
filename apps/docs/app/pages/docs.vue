<script setup lang="ts">
definePageMeta({
  layout: 'docs'
})

const description = 'Give an AI agent typed GitHub tools, scoped to one job, with a person in front of every write.'

const paths = docsHomeSections.flatMap(section => section.paths)

const { data: pages } = await useAsyncData('docs-home', () => queryCollection('docs')
  .where('path', 'IN', paths)
  .select('path', 'title', 'description', 'navigation')
  .all())

const sections = computed(() => docsHomeSections.map(section => ({
  label: section.label,
  cards: section.paths.flatMap((path) => {
    const page = pages.value?.find(entry => entry.path === path)
    if (!page) return []
    const navigation = page.navigation as { icon?: string } | boolean | undefined
    return [{
      to: path,
      title: page.title,
      description: page.description,
      icon: typeof navigation === 'object' ? navigation.icon : undefined
    }]
  })
})))

useSeoMeta({
  title: 'Docs',
  description
})
</script>

<template>
  <div class="mx-auto max-w-5xl py-14 sm:py-20">
    <h1 class="text-[2.5rem]/12 font-[450] tracking-[-0.04em] text-highlighted sm:text-5xl/[56px]">
      GitHub tools docs
    </h1>
    <p
      class="mt-4 max-w-[68ch] text-lg/7 text-toned"
    >
      {{ description }}
    </p>

    <section
      v-for="section in sections"
      :key="section.label"
      class="mt-14"
    >
      <h2 class="text-xl/[26px] font-[450] tracking-[-0.015em] text-highlighted">
        {{ section.label }}
      </h2>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NuxtLink
          v-for="card in section.cards"
          :key="card.to"
          :to="card.to"
          class="group flex flex-col overflow-hidden rounded-lg border border-default bg-muted transition-[background-color,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-accented hover:bg-elevated"
        >
          <div class="h-32 p-5">
            <UIcon
              v-if="card.icon"
              :name="card.icon"
              class="size-5 text-highlighted transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:scale-110"
            />
          </div>
          <div class="flex-1 border-t border-default p-5">
            <p class="text-base/6 font-medium text-highlighted">
              {{ card.title }}
            </p>
            <p class="mt-1.5 line-clamp-3 text-sm/6 text-muted">
              {{ card.description }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
