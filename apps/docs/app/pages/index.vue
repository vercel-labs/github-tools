<script setup lang="ts">
const { seo } = useAppConfig()

const ogImageUrl = 'https://github-tools.com/og.png'

useSeoMeta({
  title: 'GitHub Tools',
  titleTemplate: '%s',
  description: seo.description,
  ogType: 'website',
  ogUrl: 'https://github-tools.com',
  ogTitle: 'GitHub Tools',
  ogDescription: seo.description,
  ogImage: ogImageUrl,
  ogImageWidth: 2400,
  ogImageHeight: 1256,
  twitterTitle: 'GitHub Tools',
  twitterDescription: seo.description,
  twitterImage: ogImageUrl,
  twitterCard: 'summary_large_image',
})

const layers = [
  {
    title: 'Tools',
    description: '42 AI-callable GitHub operations — repositories, branches, pull requests, issues, commits, search, gists, and workflows.',
    to: '/api/tools-catalog',
    icon: 'i-custom:sdk',
  },
  {
    title: 'Presets',
    description: 'Curated tool subsets for focused workflows. Create specialized agents with separation of concerns.',
    to: '/guide/presets',
    icon: 'i-lucide-layers',
  },
  {
    title: 'Agents',
    description: 'Pre-configured agents with tools, presets, and system instructions ready to use.',
    to: '/guide/examples',
    icon: 'i-custom:bot',
  },
]

const guides = [
  {
    title: 'Quick Start',
    description: 'Use GitHub tools in your first AI SDK call.',
    to: '/guide/quick-start',
    icon: 'i-lucide-play',
  },
  {
    title: 'Control Write Safety',
    description: 'Gate dangerous operations with approval policies.',
    to: '/guide/approval-control',
    icon: 'i-custom:shield',
  },
  {
    title: 'Configure Token Scopes',
    description: 'Map GitHub token permissions to each preset.',
    to: '/guide/token-permissions',
    icon: 'i-lucide-key-round',
  },
  {
    title: 'Examples',
    description: 'Complete scripts you can copy and adapt.',
    to: '/guide/examples',
    icon: 'i-custom:terminal',
  },
]

const quickAccess = [
  {
    title: 'Installation',
    to: '/getting-started/installation',
    icon: 'i-lucide-download',
  },
  {
    title: 'Tools Catalog',
    to: '/api/tools-catalog',
    icon: 'i-lucide-list-tree',
  },
  {
    title: 'API Reference',
    to: '/api/reference',
    icon: 'i-lucide-braces',
  },
  {
    title: 'Examples',
    to: '/guide/examples',
    icon: 'i-lucide-code',
  },
]
</script>

<template>
  <NuxtLayout name="docs">
    <section class="space-y-12 pt-8 pb-12 sm:pt-10">
      <header class="space-y-3">
        <h1 class="max-w-4xl text-3xl/9 font-semibold tracking-tight sm:text-4xl/10">GitHub Tools Documentation</h1>
        <p class="max-w-4xl text-base/7 text-toned sm:text-lg/8">
          AI-callable GitHub tools for <code class="text-sm">generateText</code>, <code class="text-sm">streamText</code>, and agent loops.
        </p>
      </header>

      <section class="space-y-4">
        <h2 class="text-xl/8 font-semibold tracking-tight sm:text-2xl/8">Three layers, one SDK</h2>
        <div class="grid gap-4 lg:grid-cols-3">
          <NuxtLink
            v-for="item in layers"
            :key="item.title"
            :to="item.to"
            class="group flex min-h-48 flex-col justify-between rounded-xl border border-default/60 bg-elevated/30 p-5 transition hover:-translate-y-0.5 hover:border-default hover:bg-elevated/80"
          >
            <UIcon :name="item.icon" class="size-5 text-toned transition group-hover:text-highlighted" />
            <div class="space-y-2">
              <p class="text-base/7 font-semibold">{{ item.title }}</p>
              <p class="text-sm/6 text-toned">{{ item.description }}</p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-xl/8 font-semibold tracking-tight sm:text-2xl/8">Guides</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="guide in guides"
            :key="guide.title"
            :to="guide.to"
            class="group rounded-xl border border-default/60 bg-default/30 p-5 transition hover:border-default hover:bg-elevated/70"
          >
            <UIcon :name="guide.icon" class="size-4 text-toned transition group-hover:text-highlighted" />
            <p class="mt-3 text-sm/6 font-medium">{{ guide.title }}</p>
            <p class="mt-1 text-sm/6 text-toned">{{ guide.description }}</p>
          </NuxtLink>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="text-xl/8 font-semibold tracking-tight sm:text-2xl/8">Quick access</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink
            v-for="item in quickAccess"
            :key="item.title"
            :to="item.to"
            class="group flex items-center gap-3 rounded-xl border border-default/60 bg-default/30 p-4 transition hover:border-default hover:bg-elevated/70"
          >
            <UIcon :name="item.icon" class="size-4 text-toned transition group-hover:text-highlighted" />
            <span class="text-sm/6 font-medium">{{ item.title }}</span>
          </NuxtLink>
        </div>
      </section>
    </section>
  </NuxtLayout>
</template>
