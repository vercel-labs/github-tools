<script setup lang="ts">
type Mode = 'write' | 'read'

interface Node {
  title: string
  sub: string
  /** Dashed box the node sits in: a process boundary. */
  group?: string
  approval?: boolean
}

interface Lane {
  name: string
  nodes: Node[]
  /** Label of the connector after each node but the last. */
  edges: string[]
}

const LANES: Lane[] = [
  {
    name: 'GitHub tools',
    nodes: [
      { title: 'Model', sub: 'calls a tool by name' },
      { title: 'Your agent code', sub: 'AI SDK, eve, TanStack AI, Workflow', group: 'Your process', approval: true },
      { title: 'GitHub tools', sub: 'typed tool, Zod input', group: 'Your process' },
      { title: 'GitHub API', sub: 'api.github.com' }
    ],
    edges: ['tool call', 'function call', 'HTTPS, with your token']
  },
  {
    name: 'GitHub MCP server',
    nodes: [
      { title: 'Model', sub: 'calls a tool by name' },
      { title: 'MCP host', sub: 'VS Code, Cursor, Claude Desktop', group: 'Host process', approval: true },
      { title: 'MCP client', sub: 'lists and calls the server\'s tools', group: 'Host process' },
      { title: 'GitHub MCP server', sub: 'remote, or Docker or a Go binary', group: 'Separate process or remote' },
      { title: 'GitHub API', sub: 'api.github.com' }
    ],
    edges: ['tool call', 'inside the host', 'MCP, over HTTP or stdio', 'HTTPS']
  }
]

const CALLS: Record<Mode, string> = {
  write: 'addLabels({ issueNumber: 12, labels: [\'bug\'] })',
  read: 'getIssue({ issueNumber: 12 })'
}

const mode = ref<Mode>('write')
// Per lane: nodes reached, the edge being travelled (-1 for none), and whether approval is settled.
const reached = ref([0, 0])
const moving = ref([-1, -1])
const runs = ref([0, 0])
const decided = ref([false, false])
const hops = ref([0, 0])

function patch(r: Ref<number[]>, lane: number, value: number) {
  r.value = r.value.map((v, i) => (i === lane ? value : v))
}

const EDGE_MS = 650

function laneSteps(lane: number, only?: Mode) {
  const l = LANES[lane]!
  const guard = (fn: () => void) => () => {
    if (!only || mode.value === only) fn()
  }
  const out: { at: number, run: () => void }[] = [{ at: 300, run: guard(() => patch(reached, lane, 1)) }]
  let t = 600
  l.nodes.slice(1).forEach((node, i) => {
    out.push({ at: t, run: guard(() => {
      patch(moving, lane, i)
      patch(runs, lane, runs.value[lane]! + 1)
    }) })
    t += EDGE_MS
    out.push({ at: t, run: guard(() => {
      patch(moving, lane, -1)
      patch(reached, lane, i + 2)
      patch(hops, lane, i + 1)
    }) })
    if (node.approval) {
      // In your code a write waits for a person and a read runs; in the MCP lane the host's setting decides.
      t += lane === 1 ? 900 : only === 'write' ? 1900 : 350
      out.push({ at: t, run: guard(() => {
        decided.value = decided.value.map((d, j) => (j === lane ? true : d))
      }) })
    }
    t += 150
  })
  return out
}

const { root, finished, still, replay } = useFigure({
  steps: [...laneSteps(0, 'write'), ...laneSteps(0, 'read'), ...laneSteps(1)],
  reset: () => {
    reached.value = [0, 0]
    moving.value = [-1, -1]
    decided.value = [false, false]
    hops.value = [0, 0]
  },
  settle: () => {
    reached.value = LANES.map(l => l.nodes.length)
    moving.value = [-1, -1]
    decided.value = [true, true]
    hops.value = LANES.map(l => l.edges.length)
  }
})

function pick(m: Mode) {
  mode.value = m
  replay()
}

function approvalText(lane: number) {
  if (lane === 1) return decided.value[1] ? 'Decided by the host' : 'Approval: the host decides'
  if (mode.value === 'read') return 'Read, runs without asking'
  return decided.value[0] ? 'Approved by a person' : 'Write, waiting for a person'
}

function waiting(lane: number) {
  return lane === 0 && mode.value === 'write' && reached.value[0]! >= 2 && !decided.value[0]
}

type Box = 'none' | 'start' | 'mid' | 'end' | 'only'

/** Nodes and connectors in order; a connector between two nodes of one group sits inside its box. */
function rows(lane: Lane) {
  const out: { kind: 'node' | 'edge', i: number, box: Box }[] = []
  lane.nodes.forEach((node, i) => {
    out.push({ kind: 'node', i, box: groupPos(lane, i) })
    if (i < lane.edges.length) {
      const inside = node.group !== undefined && lane.nodes[i + 1]?.group === node.group
      out.push({ kind: 'edge', i, box: inside ? 'mid' : 'none' })
    }
  })
  return out
}

function groupPos(lane: Lane, i: number): Box {
  const g = lane.nodes[i]!.group
  if (!g) return 'none'
  const prev = lane.nodes[i - 1]?.group === g
  const next = lane.nodes[i + 1]?.group === g
  if (prev && next) return 'mid'
  if (prev) return 'end'
  if (next) return 'start'
  return 'only'
}
</script>

<template>
  <DocsFigure
    ref="root"
    caption="With GitHub tools, the call stays in your process and your code decides approval; with the MCP server, it crosses to a separate server and the MCP host decides."
    :finished
    :still
    @replay="replay"
  >
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-(--d-line) px-4 py-2.5 sm:px-6">
      <p class="text-[12.5px] text-muted">
        You: <span class="text-highlighted">{{ mode === 'write' ? 'Add the bug label to issue 12.' : 'What is issue 12 about?' }}</span>
      </p>
      <div
        class="flex gap-1 transition-opacity duration-300"
        :class="finished ? 'opacity-100' : 'pointer-events-none opacity-0'"
      >
        <button
          v-for="m in (['write', 'read'] as const)"
          :key="m"
          type="button"
          :tabindex="finished ? 0 : -1"
          :aria-pressed="mode === m"
          class="rounded-md px-2 py-0.5 text-[12px] ring-1 transition-[color,background-color,box-shadow,transform] duration-150 ring-inset focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--d-signal) active:scale-[0.97]"
          :class="mode === m ? 'bg-(--d-raised-strong) text-highlighted ring-(--d-line-strong)' : 'text-muted ring-transparent hover:text-highlighted'"
          @click="pick(m)"
        >
          {{ m === 'write' ? 'A write' : 'A read' }}
        </button>
      </div>
    </div>

    <div class="grid sm:grid-cols-2">
      <section
        v-for="(lane, li) in LANES"
        :key="lane.name"
        class="flex flex-col p-4 sm:p-5"
        :class="li === 0 ? 'border-b border-(--d-line) sm:border-r sm:border-b-0' : ''"
      >
        <header class="mb-3 flex items-baseline justify-between gap-3">
          <h4 class="text-[13px] text-highlighted">
            {{ lane.name }}
          </h4>
          <span class="inline-flex items-baseline gap-1.5 text-[12px] text-dimmed">
            Hops
            <span class="font-mono text-[15px] text-highlighted tabular-nums">{{ hops[li] }}</span>
          </span>
        </header>

        <ol class="flex flex-col">
          <li
            v-for="row in rows(lane)"
            :key="`${row.kind}-${row.i}`"
            class="relative border-dashed border-(--d-line-strong)"
            :class="{
              'mt-1 rounded-t-lg border-x border-t px-2 pt-6': row.box === 'start',
              'border-x px-2': row.box === 'mid',
              'mb-1 rounded-b-lg border-x border-b px-2 pb-2': row.box === 'end',
              'my-1 rounded-lg border px-2 pt-6 pb-2': row.box === 'only'
            }"
          >
            <template v-if="row.kind === 'node'">
              <span
                v-if="row.box === 'start' || row.box === 'only'"
                class="absolute top-1.5 left-2.5 text-[11px] text-dimmed"
              >{{ lane.nodes[row.i]!.group }}</span>
              <div
                class="d-step flex flex-col gap-1 rounded-lg border bg-(--d-raised) px-3 py-2 transition-[border-color,box-shadow] duration-300"
                :data-on="reached[li]! > row.i"
                :class="waiting(li) && lane.nodes[row.i]!.approval ? 'border-(--d-warn)/60' : reached[li] === row.i + 1 && moving[li] === -1 && !finished ? 'border-(--d-signal)' : 'border-(--d-line-strong)'"
              >
                <div class="flex items-baseline justify-between gap-2">
                  <span class="text-[12.5px] text-highlighted">{{ lane.nodes[row.i]!.title }}</span>
                  <span
                    v-if="row.i === lane.nodes.length - 1 && reached[li] === lane.nodes.length"
                    class="font-mono text-[11.5px] text-muted"
                  >200</span>
                </div>
                <span class="text-[11.5px]/4 text-dimmed">{{ lane.nodes[row.i]!.sub }}</span>
                <code
                  v-if="row.i === 0 && li === 0"
                  class="mt-0.5 font-mono text-[11.5px]/4 [overflow-wrap:anywhere] text-muted"
                >{{ CALLS[mode] }}</code>
                <span
                  v-else-if="row.i === 0"
                  class="mt-0.5 text-[11.5px]/4 text-muted"
                >From the issues toolset</span>
                <span
                  v-if="lane.nodes[row.i]!.approval"
                  class="mt-1 inline-flex items-center gap-1.5 self-start rounded-md border px-1.5 py-0.5 text-[11.5px] transition-colors duration-300"
                  :class="waiting(li) ? 'border-(--d-warn)/50 text-toned' : 'border-(--d-line-strong) text-muted'"
                >
                  <UIcon
                    :name="waiting(li) ? 'i-lucide-hand' : 'i-lucide-shield-check'"
                    class="size-3.5"
                    :class="waiting(li) ? 'text-(--d-warn)' : 'text-highlighted'"
                  />
                  {{ approvalText(li) }}
                </span>
              </div>
            </template>

            <div
              v-else
              class="relative flex h-9 items-center ps-4"
              :class="row.box === 'mid' ? 'ms-3' : 'ms-5'"
            >
              <span
                class="absolute inset-y-0 left-0 w-px transition-colors duration-300"
                :class="moving[li] === row.i ? 'bg-(--d-signal)' : 'bg-(--d-line-strong)'"
              />
              <span
                v-if="moving[li] === row.i"
                :key="runs[li]"
                class="hop-dot"
                aria-hidden="true"
              />
              <span
                class="text-[11.5px] transition-colors duration-300"
                :class="moving[li] === row.i ? 'text-highlighted' : 'text-dimmed'"
              >{{ lane.edges[row.i] }}</span>
            </div>
          </li>
        </ol>
      </section>
    </div>
  </DocsFigure>
</template>

<style scoped>
.hop-dot {
  position: absolute;
  inset-block: 0;
  left: 0;
  width: 0;
  animation: hop-run 650ms cubic-bezier(0.45, 0, 0.55, 1) forwards;
}

.hop-dot::after {
  content: '';
  position: absolute;
  bottom: -3.5px;
  left: -3px;
  width: 7px;
  height: 7px;
  border-radius: 9999px;
  background: var(--d-signal);
  box-shadow: 0 0 0 3px var(--d-raised);
}

@keyframes hop-run {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }

  15% {
    opacity: 1;
  }

  85% {
    opacity: 1;
  }

  to {
    transform: translateY(0);
    opacity: 0;
  }
}
</style>
