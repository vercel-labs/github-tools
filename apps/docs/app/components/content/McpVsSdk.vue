<script setup lang="ts">
type Mode = 'write' | 'read'

interface Node {
  icon: string
  title: string
  sub: Record<Mode, string>
  /** Waiting on a person in this mode. */
  warn?: Record<Mode, boolean>
  ok?: boolean
}

interface Block {
  /** The process the nodes run in, drawn as a dashed box. */
  group?: string
  nodes: Node[]
  /** Tags on the connectors between the nodes of a group. */
  inner?: string[]
}

interface Lane {
  name: string
  hops: number
  blocks: Block[]
  /** Tags on the connectors between blocks. */
  edges: string[]
}

function both(v: string): Record<Mode, string> {
  return { write: v, read: v }
}

const API: Node = { icon: 'i-simple-icons-github', title: 'GitHub API', sub: both('api.github.com'), ok: true }

const LANES: Lane[] = [
  {
    name: 'GitHub tools',
    hops: 3,
    blocks: [
      { nodes: [{ icon: 'i-lucide-cpu', title: 'Model', sub: { write: 'addLabels({ issueNumber: 12, … })', read: 'getIssue({ issueNumber: 12 })' } }] },
      {
        group: 'your process',
        nodes: [
          { icon: 'i-lucide-hand', title: 'Your agent code', sub: { write: 'asks a person first', read: 'a read runs at once' }, warn: { write: true, read: false } },
          { icon: 'i-lucide-wrench', title: 'GitHub tools', sub: both('typed tool, Zod input') }
        ],
        inner: ['function call']
      },
      { nodes: [API] }
    ],
    edges: ['tool call', 'HTTPS']
  },
  {
    name: 'GitHub MCP server',
    hops: 4,
    blocks: [
      { nodes: [{ icon: 'i-lucide-cpu', title: 'Model', sub: both('a tool from the issues toolset') }] },
      {
        group: 'host process',
        nodes: [
          { icon: 'i-lucide-hand', title: 'MCP host', sub: both('its settings decide'), warn: { write: true, read: true } },
          { icon: 'i-lucide-plug', title: 'MCP client', sub: both('lists and calls tools') }
        ],
        inner: ['inside the host']
      },
      { group: 'separate process or remote', nodes: [{ icon: 'i-lucide-server', title: 'GitHub MCP server', sub: both('remote, Docker or Go binary') }] },
      { nodes: [API] }
    ],
    edges: ['tool call', 'MCP, HTTP or stdio', 'HTTPS']
  }
]

const PROMPTS: Record<Mode, string> = {
  write: 'Add the bug label to issue 12.',
  read: 'What is issue 12 about?'
}

const MODES = ['write', 'read'] as const
const OPTIONS = [{ value: 'write' as const, label: 'A write' }, { value: 'read' as const, label: 'A read' }]

const mode = ref<Mode>('write')

const { root, still } = useFigure({ steps: [], reset: () => {}, settle: () => {}, autoplay: false })

function swap(m: Mode) {
  return mode.value === m ? 'visible opacity-100' : 'invisible opacity-0'
}
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Who decides approval. With GitHub tools the call stays in your process and your code asks a person; with the MCP server it crosses to a separate server and the MCP host decides."
    finished
    :still
  >
    <template #controls>
      <FigureTabs
        v-model="mode"
        label="Call"
        :options="OPTIONS"
        show-label
      />
      <p class="flex min-w-0 items-baseline gap-2.5 text-[13px]/5">
        <span class="d-label shrink-0">You</span>
        <span class="d-stack">
          <span
            v-for="m in MODES"
            :key="m"
            class="text-highlighted"
            :class="swap(m)"
            :aria-hidden="mode !== m"
          >{{ PROMPTS[m] }}</span>
        </span>
      </p>
    </template>

    <div class="@container px-4 py-8 sm:px-8 sm:py-10">
      <div class="mx-auto grid max-w-3xl items-start gap-x-8 gap-y-10 @lg:grid-cols-2">
        <section
          v-for="lane in LANES"
          :key="lane.name"
          class="flex min-w-0 flex-col items-center"
          :aria-label="lane.name"
        >
          <p class="mb-3 flex w-full items-baseline justify-between gap-3">
            <span class="text-[13px] font-medium text-highlighted">{{ lane.name }}</span>
            <span class="text-[12px] text-muted tabular-nums">{{ lane.hops }} hops</span>
          </p>

          <template
            v-for="(block, bi) in lane.blocks"
            :key="bi"
          >
            <div
              v-if="bi > 0"
              class="wire"
            >
              <span class="tag">{{ lane.edges[bi - 1] }}</span>
            </div>

            <div
              class="flex w-full flex-col items-center"
              :class="block.group ? 'group-box' : ''"
            >
              <span
                v-if="block.group"
                class="group-label"
              >{{ block.group }}</span>
              <template
                v-for="(node, ni) in block.nodes"
                :key="node.title"
              >
                <div
                  v-if="ni > 0"
                  class="wire"
                >
                  <span class="tag">{{ block.inner?.[ni - 1] }}</span>
                </div>
                <div
                  class="node"
                  :class="node.warn?.[mode] ? 'node-warn' : ''"
                >
                  <span class="tile">
                    <UIcon
                      :name="node.icon"
                      class="size-4"
                      :class="node.warn?.[mode] ? 'text-(--d-warn)' : 'text-toned'"
                    />
                  </span>
                  <span class="flex min-w-0 flex-col">
                    <span class="flex items-center gap-2 text-[13px]/5 font-medium text-highlighted">
                      {{ node.title }}
                      <span
                        v-if="node.ok"
                        class="font-mono text-[12px] font-normal text-(--d-ok)"
                      >200</span>
                    </span>
                    <span class="d-stack">
                      <span
                        v-for="m in MODES"
                        :key="m"
                        class="font-mono text-[12px]/4 [overflow-wrap:anywhere]"
                        :class="[swap(m), node.warn?.[m] ? 'text-(--d-warn)' : 'text-muted']"
                        :aria-hidden="mode !== m"
                      >{{ node.sub[m] }}</span>
                    </span>
                  </span>
                </div>
              </template>
            </div>
          </template>
        </section>
      </div>
    </div>
  </DocsFigure>
</template>

<style scoped>
.wire {
  position: relative;
  display: grid;
  place-items: center;
  height: 2.5rem;
  width: 100%;
}

.wire::before {
  content: '';
  position: absolute;
  inset-block: 0;
  left: 50%;
  border-left: 1px dashed var(--d-line-strong);
}

.tag {
  position: relative;
  border-radius: 4px;
  padding: 0 0.375rem;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  color: var(--ui-text-toned);
  background: var(--ui-bg);
  box-shadow: inset 0 0 0 1px var(--d-line-strong);
}

.group-box {
  position: relative;
  border-radius: 10px;
  border: 1px dashed var(--d-line-strong);
  padding: 1.5rem 0.5rem 0.5rem;
}

.group-label {
  position: absolute;
  top: 0.25rem;
  left: 0.625rem;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 18px;
  color: var(--ui-text-dimmed);
}

.node {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  border-radius: 8px;
  border: 1px solid var(--d-line-strong);
  background: var(--d-raised);
  padding: 0.5rem 0.75rem 0.5rem 0.5rem;
}

.node-warn {
  border-color: color-mix(in oklab, var(--d-warn) 50%, transparent);
  background: var(--d-warn-bg);
}

.tile {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  border: 1px solid var(--d-line);
  background: var(--ui-bg);
}
</style>
