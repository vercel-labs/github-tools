<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

const route = useRoute()
const appConfig = useAppConfig()
const navigation = inject<Ref<ContentNavigationItem[] | null | undefined>>('navigation')

function flatten(items: ContentNavigationItem[]): ContentNavigationItem[] {
  return items.flatMap(item => [item, ...flatten(item.children ?? [])])
}

const pages = computed(() => new Map(flatten(navigation?.value ?? []).map(item => [item.path, item])))

const groups = computed(() => docsSidebar.map(group => ({
  label: group.label,
  items: group.items.flatMap((item) => {
    const page = pages.value.get(item.path)
    if (!page) return []
    return [{ to: item.path, title: item.title ?? page.title, icon: page.icon as string | undefined }]
  })
})))

const links = [
  { label: 'GitHub', icon: 'i-simple-icons-github', to: appConfig.github?.url },
  { label: 'npm', icon: 'i-simple-icons-npm', to: 'https://www.npmjs.com/package/@github-tools/sdk' },
  { label: 'Releases', icon: 'i-nucleo-tag', to: 'https://github.com/vercel-labs/github-tools/releases' }
]
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-default px-4">
      <NuxtLink
        to="/docs"
        class="flex items-center gap-2.5 text-highlighted"
      >
        <AppHeaderLogo
          icon-only
          class="size-5"
        />
        <span class="h-4 w-px bg-accented" />
        <span class="text-[15px] font-medium">Docs</span>
      </NuxtLink>

      <UContentSearchButton
        :collapsed="true"
        variant="ghost"
        color="neutral"
        size="sm"
      />
    </div>

    <nav class="min-h-0 flex-1 overflow-y-auto px-3 py-4">
      <div
        v-for="group in groups"
        :key="group.label"
        class="mb-6 last:mb-0"
      >
        <p class="mb-1 px-2 text-[13px] font-medium text-muted">
          {{ group.label }}
        </p>
        <ul>
          <li
            v-for="item in group.items"
            :key="item.to"
          >
            <NuxtLink
              :to="item.to"
              :aria-current="route.path === item.to ? 'page' : undefined"
              class="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm"
              :class="route.path === item.to ? 'bg-accented text-highlighted' : 'text-toned hover:bg-elevated hover:text-highlighted'"
            >
              <UIcon
                v-if="item.icon"
                :name="item.icon"
                class="size-4 shrink-0"
              />
              <span class="truncate">{{ item.title }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </nav>

    <div class="shrink-0 border-t border-default p-3">
      <NuxtLink
        v-for="link in links"
        :key="link.label"
        :to="link.to"
        target="_blank"
        class="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-toned transition-colors hover:bg-elevated hover:text-highlighted"
      >
        <UIcon
          :name="link.icon"
          class="size-4 shrink-0"
        />
        {{ link.label }}
      </NuxtLink>
    </div>
  </div>
</template>

