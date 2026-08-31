import { describe, expect, it } from 'vitest'
import { fetchAllPages, hasMoreByTotal, pagedList } from './pagination'

describe('fetchAllPages', () => {
  it('returns one page and hasMore when the page is full', async () => {
    const result = await fetchAllPages(async () => [1, 2, 3], 3)
    expect(result).toEqual({ items: [1, 2, 3], hasMore: true })
  })

  it('returns hasMore false when the page is short', async () => {
    const result = await fetchAllPages(async () => [1, 2], 3)
    expect(result).toEqual({ items: [1, 2], hasMore: false })
  })

  it('combines pages and stops on a short page', async () => {
    const pages = [[1, 2], [3]]
    const result = await fetchAllPages(async page => pages[page - 1] ?? [], 2, 5)
    expect(result).toEqual({ items: [1, 2, 3], hasMore: false })
  })

  it('sets hasMore when maxPages is exhausted on full pages', async () => {
    const result = await fetchAllPages(async page => [page, page], 2, 2)
    expect(result).toEqual({ items: [1, 1, 2, 2], hasMore: true })
  })

  it('starts at startPage', async () => {
    const seen: number[] = []
    await fetchAllPages(async page => {
      seen.push(page)
      return [page]
    }, 10, 1, 4)
    expect(seen).toEqual([4])
  })
})

describe('pagedList', () => {
  it('packs items with pagination fields', () => {
    expect(pagedList(['a'], 30, 2, true)).toEqual({
      items: ['a'],
      hasMore: true,
      page: 2,
      perPage: 30,
      nextPage: 3,
    })
  })

  it('omits nextPage when hasMore is false', () => {
    expect(pagedList(['a'], 30, 1, false)).toEqual({
      items: ['a'],
      hasMore: false,
      page: 1,
      perPage: 30,
    })
  })

  it('sets nextPage past combined pages', () => {
    expect(pagedList([1, 2, 3, 4], 2, 1, true).nextPage).toBe(3)
  })
})

describe('hasMoreByTotal', () => {
  it('is false on the last short page', () => {
    expect(hasMoreByTotal(4, 30, 10, 100)).toBe(false)
  })

  it('is true when combined pages still leave remainder', () => {
    expect(hasMoreByTotal(1, 30, 60, 100)).toBe(true)
  })
})
