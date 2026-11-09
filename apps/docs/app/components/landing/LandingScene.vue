<script setup lang="ts">
const SCENES = [
  { id: 'review', label: 'Review a PR' },
  { id: 'ask', label: 'Ask about a repo' },
  { id: 'linear', label: 'Answer in Linear' },
  { id: 'ci', label: 'Fix failing CI' },
  { id: 'factory', label: 'Ship from an issue' },
  { id: 'agents', label: 'Orchestrate agents' }
] as const

type SceneId = typeof SCENES[number]['id']

const active = ref<SceneId>('review')
const run = ref(0)

function select(id: SceneId) {
  active.value = id
  run.value++
}

function replay() {
  run.value++
}

const current = ref<{ hint: string } | null>(null)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      role="tablist"
      aria-label="Example job"
      class="flex flex-wrap gap-1"
    >
      <button
        v-for="scene in SCENES"
        :key="scene.id"
        type="button"
        role="tab"
        :aria-selected="active === scene.id"
        class="h-8 rounded-md px-3 text-[13px]"
        :class="active === scene.id ? 'bg-(--d-raised-strong) text-highlighted' : 'text-muted hover:text-highlighted'"
        @click="select(scene.id)"
      >
        {{ scene.label }}
      </button>
    </div>

    <div class="h-[30rem]">
      <LandingSceneReview
        v-if="active === 'review'"
        ref="current"
        :key="run"
      />
      <LandingSceneTerminal
        v-else-if="active === 'ask'"
        ref="current"
        :key="run"
      />
      <LandingSceneLinear
        v-else-if="active === 'linear'"
        ref="current"
        :key="run"
      />
      <LandingSceneCi
        v-else-if="active === 'ci'"
        ref="current"
        :key="run"
      />
      <LandingSceneFactory
        v-else-if="active === 'factory'"
        ref="current"
        :key="run"
      />
      <LandingSceneAgents
        v-else
        ref="current"
        :key="run"
      />
    </div>

    <p class="flex min-h-10 items-start gap-3 text-[13px]/5 text-muted">
      {{ current?.hint }}
      <button
        type="button"
        class="-mt-1 ms-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-muted transition-colors hover:bg-(--d-raised) hover:text-highlighted"
        @click="replay"
      >
        <UIcon
          name="i-lucide-rotate-ccw"
          class="size-3.5"
        />
        Replay
      </button>
    </p>
  </div>
</template>
