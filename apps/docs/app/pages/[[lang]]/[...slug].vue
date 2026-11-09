<script setup lang="ts">
import { kebabCase } from 'scule'
import type { ContentNavigationItem, Collections, DocsCollectionItem } from '@nuxt/content'
import { findPageHeadline } from '@nuxt/content/utils'

definePageMeta({
  layout: 'docs',
})

const route = useRoute()
const { locale, isEnabled, t } = useDocusI18n()
const { isOpen } = useAssistant()
const appConfig = useAppConfig()
const navigation = inject<Ref<ContentNavigationItem[]>>('navigation')
const collectionName = computed(() => isEnabled.value ? `docs_${locale.value}` : 'docs')

const [{ data: page }, { data: surround }] = await Promise.all([
  useAsyncData(kebabCase(route.path), () => queryCollection(collectionName.value as keyof Collections).path(route.path).first() as Promise<DocsCollectionItem>),
  useAsyncData(`${kebabCase(route.path)}-surround`, () => {
    return queryCollectionItemSurroundings(collectionName.value as keyof Collections, route.path, {
      fields: ['description'],
    })
  }),
])

if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const title = page.value.seo?.title || page.value.title
const description = page.value.seo?.description || page.value.description

const headline = ref(findPageHeadline(navigation?.value, page.value?.path))
const breadcrumbs = computed(() => docsBreadcrumbs(page.value?.path || '', page.value?.title || ''))

const body = computed(() => page.value?.body as Parameters<typeof faqFromBody>[0])
const faq = computed(() => faqFromBody(body.value))
const minutes = computed(() => readingMinutes(body.value))
const level = computed(() => (page.value?.meta as { level?: 'beginner' | 'advanced' } | undefined)?.level)

useHead({
  script: computed(() => faq.value.length
    ? [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          'mainEntity': faq.value.map(entry => ({
            '@type': 'Question',
            'name': entry.question,
            'acceptedAnswer': { '@type': 'Answer', 'text': entry.answer }
          }))
        })
      }]
    : [])
})

useSeo({
  title,
  description,
  type: 'article',
  modifiedAt: (page.value as unknown as Record<string, unknown>).modifiedAt as string | undefined,
  breadcrumbs,
})
useSeoMeta({
  twitterTitle: title,
  twitterDescription: description,
  ogImageAlt: title,
  twitterImageAlt: title,
})
const vercel = { '@type': 'Organization', '@id': 'https://vercel.com/#organization', 'name': 'Vercel', 'url': 'https://vercel.com' }
useSchemaOrg([
  defineArticle({
    author: vercel,
    publisher: vercel,
    inLanguage: 'en',
    timeRequired: `PT${minutes.value}M`,
    proficiencyLevel: level.value === 'advanced' ? 'Expert' : 'Beginner',
  }),
])
watch(() => navigation?.value, () => {
  headline.value = findPageHeadline(navigation?.value, page.value?.path) || headline.value
})

defineOgImage('Docs', {
  headline: headline.value,
  title: formatOgTitle(title),
  description: formatOgDescription(title, description),
})

const github = computed(() => appConfig.github ? appConfig.github : null)

const editLink = computed(() => {
  if (!github.value) {
    return
  }

  return [
    github.value.url,
    'edit',
    github.value.branch,
    github.value.rootDir,
    'content',
    `${page.value?.stem}.${page.value?.extension}`,
  ].filter(Boolean).join('/')
})

function pageLinkProps(link: NonNullable<DocsCollectionItem['links']>[number]) {
  return {
    ...link,
    color: link.color ?? 'neutral',
    variant: link.variant ?? 'outline',
  }
}

</script>

<template>
  <UPage
    v-if="page"
    :ui="isOpen ? { center: 'lg:col-span-10' } : undefined"
  >
    <UPageHeader
      :title="page.title"
      :description="page.description"
      :headline="headline"
      :ui="{
        wrapper: 'flex-row items-center flex-wrap justify-between',
      }"
    >
      <template #links>
        <UButton
          v-for="(link, index) in (page as DocsCollectionItem).links"
          :key="index"
          size="sm"
          v-bind="pageLinkProps(link)"
        />

        <DocsPageHeaderLinks />
      </template>
    </UPageHeader>

    <UPageBody>
      <p class="not-prose -mt-4 mb-8 flex items-center gap-3 text-[13px] text-muted">
        <span
          v-if="level"
          class="inline-flex items-center gap-1.5"
        >
          <span
            class="size-1.5 rounded-full"
            :class="level === 'beginner' ? 'bg-(--d-signal)' : 'bg-(--d-warn)'"
          />
          {{ level === 'beginner' ? 'Beginner' : 'Advanced' }}
        </span>
        <span>{{ minutes }} min read</span>
      </p>

      <ContentRenderer
        v-if="page"
        :value="page"
      />

      <USeparator v-if="github">
        <div
          class="flex items-center gap-2 text-sm text-muted"
        >
          <UButton
            variant="link"
            color="neutral"
            :to="editLink"
            target="_blank"
            icon="i-lucide-pen"
            :ui="{ leadingIcon: 'size-4' }"
          >
            {{ t('docs.edit') }}
          </UButton>
          <template v-if="github?.url">
            <span>{{ t('common.or') }}</span>
            <UButton
              variant="link"
              color="neutral"
              :to="`${github.url}/issues/new/choose`"
              target="_blank"
              icon="i-lucide-alert-circle"
              :ui="{ leadingIcon: 'size-4' }"
            >
              {{ t('docs.report') }}
            </UButton>
          </template>
        </div>
      </USeparator>
      <UContentSurround :surround="surround" />
    </UPageBody>

    <template
      v-if="!isOpen"
      #right
    >
      <DocsAsideRight
        :page="page"
      />
    </template>
  </UPage>
</template>
