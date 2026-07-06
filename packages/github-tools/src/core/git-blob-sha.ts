import { sha1Hex } from './sha1'

/** Compute the git blob SHA (SHA-1 of "blob {size}\\0{content}") for a given string. */
export function gitBlobSha(content: string): string {
  const contentBytes = new TextEncoder().encode(content)
  const header = new TextEncoder().encode(`blob ${contentBytes.length}\0`)
  const payload = new Uint8Array(header.length + contentBytes.length)
  payload.set(header)
  payload.set(contentBytes, header.length)
  return sha1Hex(payload)
}
