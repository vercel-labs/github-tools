import { z } from 'zod'

export const pageSchema = z.number().int().positive().optional().default(1)
  .describe('1-based page. When hasMore is true, call again with nextPage (or page + 1). Do not repeat the same page.')

export const maxPagesSchema = z.number().int().positive().max(20).optional()
  .describe('Fetch and combine up to this many pages in one call (max 20). Prefer this over many page=N calls. Omit to fetch a single page. If hasMore, the next start page is nextPage, not page + 1.')

export type PagingFields = {
  hasMore: boolean
  page: number
  perPage: number
  nextPage?: number
}

export type PagedList<T> = { items: T[] } & PagingFields

export function pagingFields(page: number, perPage: number, itemCount: number, hasMore: boolean): PagingFields {
  return {
    hasMore,
    page,
    perPage,
    ...hasMore ? { nextPage: page + Math.max(1, Math.ceil(itemCount / perPage)) } : {},
  }
}

/** True when the returned window does not yet cover `totalCount`. */
export function hasMoreByTotal(page: number, perPage: number, itemCount: number, totalCount: number): boolean {
  return (page - 1) * perPage + itemCount < totalCount
}

export function pagedList<T>(items: T[], perPage: number, page: number, hasMore: boolean): PagedList<T> {
  return { items, ...pagingFields(page, perPage, items.length, hasMore) }
}

/**
 * Fetches a single page (`startPage`, default 1) by default. When `maxPages`
 * is set, fetches pages sequentially starting at `startPage` and stops early
 * once a page returns fewer than `perPage` items (the last page).
 * `hasMore` is true when the last fetched page was full.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<T[]>,
  perPage: number,
  maxPages?: number,
  startPage = 1,
): Promise<{ items: T[], hasMore: boolean }> {
  if (!maxPages || maxPages <= 1) {
    const items = await fetchPage(startPage)
    return { items, hasMore: items.length >= perPage }
  }

  const items: T[] = []
  let hasMore = false
  for (let i = 0; i < maxPages; i++) {
    const pageItems = await fetchPage(startPage + i)
    items.push(...pageItems)
    if (pageItems.length < perPage) {
      hasMore = false
      break
    }
    hasMore = true
  }
  return { items, hasMore }
}
