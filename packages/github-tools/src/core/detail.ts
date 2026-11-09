import { z } from 'zod'

export const SUMMARY_BODY_LENGTH = 500

/**
 * Controls how much text is returned for bodies/notes.
 * - `summary` — truncate long bodies (~500 chars) to save tokens (default)
 * - `full` — return the complete body
 */
export const detailSchema = z
  .enum(['summary', 'full'])
  .optional()
  .default('summary')
  .describe('summary truncates long bodies (~500 chars) to save tokens; full returns the complete body')

export type DetailLevel = 'summary' | 'full'

// A rendered page hides both, but a model reads them, so they are a common place to hide instructions.
const HTML_COMMENT = /<!--[\s\S]*?(?:-->|$)/g
const INVISIBLE_CHARACTERS = /[\u200B-\u200D\u2060-\u2064\uFEFF\u202A-\u202E\u2066-\u2069\u{E0000}-\u{E007F}]/gu

/** Remove HTML comments and invisible Unicode characters (zero-width, bidirectional controls, tags) from Markdown text. */
export function stripHiddenContent(text: string): string {
  return text.replace(HTML_COMMENT, '').replace(INVISIBLE_CHARACTERS, '')
}

/**
 * Remove hidden content from a body/notes string, then truncate it when `detail` is `summary`.
 * Returns null/undefined unchanged.
 */
export function applyDetailBody(
  body: string | null | undefined,
  detail: DetailLevel,
  maxLength = SUMMARY_BODY_LENGTH,
): string | null | undefined {
  if (body == null) return body
  const visible = stripHiddenContent(body)
  if (detail === 'full' || visible.length <= maxLength) return visible
  return `${visible.slice(0, maxLength)}\n\n[truncated: ${visible.length - maxLength} more characters]`
}
