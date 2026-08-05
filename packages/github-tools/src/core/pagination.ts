import { z } from 'zod'

export const maxPagesSchema = z.number().int().positive().max(20).optional()
  .describe('Automatically fetch and combine up to this many pages on top of perPage. Omit to fetch a single page.')

/**
 * Fetches a single page (`startPage`, default 1) by default. When `maxPages`
 * is set, fetches pages sequentially starting at `startPage` and stops early
 * once a page returns fewer than `perPage` items (the last page).
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<T[]>,
  perPage: number,
  maxPages?: number,
  startPage = 1,
): Promise<T[]> {
  if (!maxPages || maxPages <= 1) return fetchPage(startPage)

  const results: T[] = []
  for (let i = 0; i < maxPages; i++) {
    const items = await fetchPage(startPage + i)
    results.push(...items)
    if (items.length < perPage) break
  }
  return results
}
