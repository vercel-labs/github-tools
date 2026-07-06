<script setup lang="ts">
const appConfig = useAppConfig()
</script>

<template>
  <div class="border-t border-default">
    <UContainer class="px-0!">
      <footer>
        <div class="grid gap-8 border-b border-default px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 md:px-8">
          <div>
            <AppHeaderLogo class="h-6 text-highlighted" />

            <p class="mt-3 max-w-xs text-sm text-toned">
              {{ appConfig.description }}
            </p>
          </div>

          <div
            v-for="section in appConfig.footer?.sections"
            :key="section.title"
          >
            <h3 class="text-xs font-semibold uppercase tracking-wider text-highlighted">
              {{ section.title }}
            </h3>
            <ul class="mt-3 space-y-1">
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

        <div class="flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between md:px-8">
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
              variant="ghost"
              color="neutral"
              size="sm"
              aria-label="GitHub"
            />
            <UButton
              to="https://www.npmjs.com/package/@github-tools/sdk"
              external
              icon="i-simple-icons-npm"
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
