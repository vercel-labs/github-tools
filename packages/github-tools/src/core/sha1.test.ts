import { describe, expect, it } from 'vitest'
import { gitBlobSha } from './git-blob-sha'
import { sha1Hex } from './sha1'

describe('sha1Hex', () => {
  it('matches known SHA-1 digests', () => {
    const abc = new TextEncoder().encode('abc')
    expect(sha1Hex(abc)).toBe('a9993e364706816aba3e25717850c26c9cd0d89d')
  })
})

describe('gitBlobSha', () => {
  it('matches git blob object hashes', () => {
    expect(gitBlobSha('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a')
  })
})
