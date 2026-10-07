import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    tanstack: 'src/tanstack/index.ts',
    'tanstack/interrupts': 'src/tanstack/interrupts.ts',
    workflow: 'src/workflow.ts',
    eve: 'src/eve.ts',
    'eve-runtime': 'src/eve-runtime.ts',
    connect: 'src/connect/index.ts',
    'connect/eve': 'src/connect/eve.ts',
  },
  format: 'esm',
  dts: true,
  clean: true,
  fixedExtension: true,
  external: [
    'ai',
    '@tanstack/ai',
    '@tanstack/ai-vercel-gateway',
    '@ai-sdk/provider',
    '@ai-sdk/provider-utils',
    'zod',
    'workflow',
    '@workflow/ai',
    '@ai-sdk/workflow',
    'eve',
    'eve/tools',
    'eve/tools/approval',
    '@vercel/connect',
  ],
})
