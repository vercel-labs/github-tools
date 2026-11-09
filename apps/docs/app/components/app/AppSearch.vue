<script setup lang="ts">
import type { ContentNavigationItem, PageCollections } from '@nuxt/content'

const props = defineProps<{
  navigation?: ContentNavigationItem[]
}>()

const appConfig = useAppConfig()
const { forced: forcedColorMode } = useDocusColorMode()
const { locale, isEnabled } = useDocusI18n()

const collectionName = computed(() => (isEnabled.value ? `docs_${locale.value}` : 'docs') as keyof PageCollections)
const useFts = appConfig.search.fts

const { data: files } = useFts
  ? { data: ref(null) }
  : useLazyAsyncData(`search_${collectionName.value}`, () => queryCollectionSearchSections(collectionName.value), {
      server: false,
      watch: [locale],
    })

const { search, status: searchStatus, init } = useFts
  ? useSearchCollection(collectionName, { immediate: false, ignoredTags: ['style'] })
  : { search: undefined, status: ref(undefined), init: () => {} }

if (useFts) {
  const { open } = useContentSearch()
  watch(open, (value) => {
    if (value && searchStatus.value === 'idle') {
      init()
    }
  })
}

/** The pages most readers jump to, with their own icons, instead of the section folders. */
const QUICK_LINKS = ['/start/quick-start', '/presets', '/approval', '/auth', '/integrations/eve', '/integrations/ai-sdk', '/guides', '/reference/tools']

function flatten(items: ContentNavigationItem[]): ContentNavigationItem[] {
  return items.flatMap(item => [item, ...flatten(item.children ?? [])])
}

const links = computed(() => {
  const pages = new Map(flatten(props.navigation ?? []).map(item => [item.path, item]))
  return QUICK_LINKS.flatMap((path) => {
    const page = pages.get(path)
    return page ? [{ label: page.title, icon: page.icon as string | undefined, to: path }] : []
  })
})
</script>

<template>
  <LazyUContentSearch
    :files="files"
    :search="search"
    :search-status="searchStatus"
    :links="useFts ? links : undefined"
    :navigation="navigation"
    :color-mode="!forcedColorMode"
  />
</template>
