<script setup lang="ts">
const route = useRoute()
const appConfig = useAppConfig()
</script>

<template>
  <div
    v-if="route.meta.layout !== 'docs'"
    class="border-t border-default"
  >
    <UContainer class="[--ui-container:72rem]">
      <footer class="py-12 sm:py-16">
        <div class="mb-10 max-w-sm">
          <AppHeaderLogo class="h-6 text-highlighted" />
          <p class="mt-3 text-sm/6 text-toned">
            {{ appConfig.description }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5">
          <div
            v-for="section in appConfig.footer?.sections"
            :key="section.title"
          >
            <h3 class="vercel-section-label">
              {{ section.title }}
            </h3>
            <ul class="mt-4 space-y-2">
              <li
                v-for="link in section.links"
                :key="link.to"
              >
                <UButton
                  :label="link.label"
                  :to="link.to"
                  :external="link.to.startsWith('https://')"
                  variant="link"
                  color="neutral"
                  size="sm"
                  class="px-0 text-toned hover:text-highlighted"
                />
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-12 flex flex-col gap-4 border-t border-default pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted">
            Copyright
            <a
              href="https://vercel.com"
              target="_blank"
              class="text-toned hover:text-highlighted"
              rel="noopener"
            >Vercel</a>
            {{ new Date().getFullYear() }}. Released under the
            <a
              href="https://github.com/vercel-labs/github-tools/blob/main/LICENSE"
              target="_blank"
              class="text-toned hover:text-highlighted"
              rel="noopener"
            >MIT License</a>.
          </p>
          <div class="flex items-center gap-2 [&_button]:text-highlighted">
            <UColorModeButton size="sm" />
            <UButton
              to="https://github.com/vercel-labs/github-tools"
              external
              icon="i-simple-icons-github"
              class="text-highlighted"
              variant="ghost"
              color="neutral"
              size="sm"
              aria-label="GitHub"
            />
            <UButton
              to="https://www.npmjs.com/package/@github-tools/sdk"
              external
              icon="i-simple-icons-npm"
              class="text-highlighted"
              variant="ghost"
              color="neutral"
              size="sm"
              aria-label="npm"
            />
          </div>
        </div>
      </footer>
    </UContainer>
  </div>
</template>
