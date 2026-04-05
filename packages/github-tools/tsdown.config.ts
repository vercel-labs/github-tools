import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    workflow: 'src/workflow.ts',
  },
  format: 'esm',
  dts: true,
  clean: true,
  fixedExtension: true,
  external: [
    'ai',
    'zod',
    'workflow',
    '@workflow/ai',
  ],
})
