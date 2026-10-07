import { defineInterrupt } from '@tanstack/ai'
import { z } from 'zod'

/** Register on the server and client when using GitHub automatic approval. */
export const githubToolApproval = defineInterrupt({
  id: 'github-tools.approval',
  payloadSchema: z.object({
    toolCallId: z.string().describe('The proposed tool call identifier.'),
    toolName: z.string().describe('The GitHub tool to execute.'),
    input: z.record(z.string(), z.unknown()).describe('The resolved tool input to approve.'),
  }),
  responseSchema: z.object({
    approved: z.boolean().describe('Whether to execute this exact tool call.'),
  }),
})
