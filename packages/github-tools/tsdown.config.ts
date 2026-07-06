import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    workflow: 'src/workflow.ts',
    eve: 'src/eve.ts',
  },
  format: 'esm',
  dts: true,
  clean: true,
  fixedExtension: true,
  external: [
    'ai',
    '@ai-sdk/provider',
    '@ai-sdk/provider-utils',
    'zod',
    'workflow',
    '@workflow/ai',
    '@ai-sdk/workflow',
    'eve',
    'eve/tools',
    'eve/tools/approval',
  ],
})
