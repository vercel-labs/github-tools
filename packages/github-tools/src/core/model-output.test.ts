import { describe, expect, it } from 'vitest'
import {
  getCommitToModelOutput,
  getFileContentToModelOutput,
  getRepositoryTreeToModelOutput,
  listPullRequestFilesToModelOutput,
} from './model-output'

const options = { toolCallId: 'call', input: {} }

describe('listPullRequestFilesToModelOutput', () => {
  it('keeps paging fields and truncates patches', () => {
    const patch = 'x'.repeat(5000)
    const result = listPullRequestFilesToModelOutput({
      ...options,
      output: {
        items: [{ filename: 'a.ts', status: 'modified', additions: 1, deletions: 0, changes: 1, patch }],
        hasMore: true,
        page: 1,
        perPage: 30,
        nextPage: 2,
      },
    })
    const value = result.value as { items: Array<{ patch: string }>, hasMore: boolean, nextPage?: number }
    expect(value.hasMore).toBe(true)
    expect(value.nextPage).toBe(2)
    expect(value.items[0]!.patch.length).toBeLessThan(patch.length)
    expect(value.items[0]!.patch).toContain('[truncated:')
  })
})

describe('getRepositoryTreeToModelOutput', () => {
  it('caps entries and sets truncated', () => {
    const entries = Array.from({ length: 250 }, (_, i) => ({ path: `f${i}.ts`, type: 'blob' }))
    const result = getRepositoryTreeToModelOutput({
      ...options,
      output: { sha: 'abc', truncated: false, entries },
    })
    const value = result.value as { entries: unknown[], truncated: boolean, entriesOmitted: number }
    expect(value.entries).toHaveLength(200)
    expect(value.truncated).toBe(true)
    expect(value.entriesOmitted).toBe(50)
  })
})

describe('getFileContentToModelOutput', () => {
  it('caps directory listings', () => {
    const entries = Array.from({ length: 250 }, (_, i) => ({ name: `f${i}`, type: 'file', path: `f${i}` }))
    const result = getFileContentToModelOutput({
      ...options,
      output: { type: 'directory', entries },
    })
    const value = result.value as { entries: unknown[], truncated: boolean, entriesOmitted: number }
    expect(value.entries).toHaveLength(200)
    expect(value.truncated).toBe(true)
    expect(value.entriesOmitted).toBe(50)
  })
})

describe('getCommitToModelOutput', () => {
  it('caps files and reports filesOmitted', () => {
    const files = Array.from({ length: 90 }, (_, i) => ({
      filename: `f${i}.ts`,
      status: 'modified',
      additions: 1,
      deletions: 0,
    }))
    const result = getCommitToModelOutput({
      ...options,
      output: { sha: 'abc', message: 'm', url: 'https://example.com', stats: null, files },
    })
    const value = result.value as { files: unknown[], filesOmitted: number }
    expect(value.files).toHaveLength(80)
    expect(value.filesOmitted).toBe(10)
  })
})
