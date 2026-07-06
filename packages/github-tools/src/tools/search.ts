import { tool } from 'ai'
import {
  searchCodeInputSchema,
  searchCodeDescription,
  searchCodeCore,
  searchRepositoriesInputSchema,
  searchRepositoriesDescription,
  searchRepositoriesCore,
} from '../core/search'

async function searchCodeStep(args: Parameters<typeof searchCodeCore>[0]) {
  "use step"
  return searchCodeCore(args)
}

export const searchCode = (token: string) =>
  tool({
    description: searchCodeDescription,
    inputSchema: searchCodeInputSchema,
    execute: async args => searchCodeStep({ token, ...args }),
  })

async function searchRepositoriesStep(args: Parameters<typeof searchRepositoriesCore>[0]) {
  "use step"
  return searchRepositoriesCore(args)
}

export const searchRepositories = (token: string) =>
  tool({
    description: searchRepositoriesDescription,
    inputSchema: searchRepositoriesInputSchema,
    execute: async args => searchRepositoriesStep({ token, ...args }),
  })
