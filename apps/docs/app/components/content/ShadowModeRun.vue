<script setup lang="ts">
type Call = {
  tool: string
  write: boolean
  input: string
  ran: string
  would: string
  /** What approval decides under `requireApproval: 'auto'`. */
  approval?: 'auto' | 'ask'
}

const CALLS: Call[] = [
  { tool: 'getIssueContext', write: false, input: '#412', ran: '413 on every upload above 2 GB', would: '413 on every upload above 2 GB' },
  { tool: 'searchIssues', write: false, input: '"413 upload"', ran: '#398 reports the same error', would: '#398 reports the same error' },
  { tool: 'addLabels', write: true, input: '#412 bug, duplicate', ran: 'Labeled', would: 'Would add bug, duplicate', approval: 'auto' },
  { tool: 'addIssueComment', write: true, input: '#412', ran: 'Commented', would: 'Would comment "Duplicate of #398"', approval: 'auto' },
  { tool: 'closeIssue', write: true, input: '#412 as duplicate', ran: 'Waiting for a person', would: 'Would close #412', approval: 'ask' }
]

const mode = ref<'true' | 'false'>('true')
const dry = computed(() => mode.value === 'true')

const { root, finished, still } = useFigure({ steps: [], reset: () => {}, settle: () => {}, autoplay: false })
</script>

<template>
  <DocsFigure
    ref="root"
    caption="Shadow mode runs the same agent on real data. Flip dryRun: reads reach GitHub either way, but with it on, every write becomes a record of what would have happened and the issue stays untouched."
    :finished
    :still
  >
    <template #controls>
      <FigureTabs
        v-model="mode"
        label="dryRun"
        :options="[{ value: 'true', label: 'true' }, { value: 'false', label: 'false' }]"
        show-label
        mono
      />
    </template>

    <div class="@container">
      <div class="grid gap-4 px-4 py-6 sm:px-8 sm:py-8 @min-[44rem]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section
        aria-label="The issue on GitHub"
        class="rounded-lg border border-(--d-line) bg-(--d-raised)"
      >
        <header class="flex items-center gap-2 border-b border-(--d-line) px-3 py-2.5 text-[12.5px] text-muted">
          <UIcon
            name="i-simple-icons-github"
            class="size-3.5 text-highlighted"
          />
          On GitHub
        </header>
        <div class="px-3 py-3">
          <p class="text-[14px] text-highlighted">
            Uploads over 2 GB fail <span class="text-dimmed">#412</span>
          </p>
          <p class="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span class="inline-flex h-6 items-center gap-1 rounded-full bg-(--d-raised-strong) px-2 text-[12px] text-highlighted">
              <UIcon
                name="i-lucide-circle-dot"
                class="size-3.5"
              />
              Open
            </span>
            <template v-if="!dry">
              <span class="rounded-full border border-(--d-line-strong) px-2 text-[12px]/5 text-toned">bug</span>
              <span class="rounded-full border border-(--d-line-strong) px-2 text-[12px]/5 text-toned">duplicate</span>
            </template>
          </p>
          <ol class="mt-3 flex flex-col gap-2 border-s border-(--d-line) ps-3 text-[12.5px]/5">
            <li class="text-muted">
              <span class="text-toned">leo</span> opened this issue
            </li>
            <li
              v-if="!dry"
              class="text-muted"
            >
              <span class="text-toned">triage-agent</span> added bug, duplicate
            </li>
            <li
              v-if="!dry"
              class="text-muted"
            >
              <span class="text-toned">triage-agent</span> commented: Duplicate of #398
            </li>
          </ol>
          <p class="mt-3 text-[12.5px] text-dimmed">
            {{ dry ? 'Nothing changed. The agent only read this issue.' : 'Two writes landed. Closing waits for a person.' }}
          </p>
        </div>
      </section>

      <section
        aria-label="The agent's tool calls"
        class="rounded-lg border border-(--d-line) bg-(--d-raised)"
      >
        <header class="flex items-center justify-between gap-2 border-b border-(--d-line) px-3 py-2.5 text-[12.5px] text-muted">
          <span>Tool calls</span>
          <code class="font-mono text-[12px]">requireApproval: 'auto'</code>
        </header>
        <ol class="divide-y divide-(--d-line)">
          <li
            v-for="call in CALLS"
            :key="call.tool"
            class="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2.5 px-3 py-2"
          >
            <span
              class="mt-0.5 h-5 rounded-sm text-center font-mono text-[12px]/5"
              :class="!call.write ? 'text-dimmed' : dry ? 'border border-(--d-line-strong) text-toned' : 'bg-(--d-raised-strong) text-highlighted'"
            >{{ !call.write ? 'read' : dry ? 'record' : 'write' }}</span>
            <div class="min-w-0">
              <p class="flex min-w-0 items-baseline gap-2">
                <code class="shrink-0 font-mono text-[12.5px] text-highlighted">{{ call.tool }}</code>
                <span class="truncate font-mono text-[12px] text-dimmed">{{ call.input }}</span>
              </p>
              <p class="text-[12.5px] text-toned">
                {{ dry ? call.would : call.ran }}
              </p>
              <p
                v-if="call.approval && dry"
                class="text-[12px] text-dimmed"
              >
                approval: {{ call.approval === 'auto' ? 'would run without asking' : 'would ask a person' }}
              </p>
            </div>
          </li>
        </ol>
        <p class="border-t border-(--d-line) px-3 py-2.5 text-[12.5px]/5 text-highlighted">
          {{ dry ? '2 reads sent to GitHub. 3 writes recorded, 0 sent. A person would have been asked once.' : '2 reads, 2 writes sent to GitHub. 1 write waits for approval.' }}
        </p>
      </section>
      </div>
    </div>
  </DocsFigure>
</template>
