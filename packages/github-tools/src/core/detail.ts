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

// A rendered page hides these, but a model reads them, so they are a common place to hide instructions.
// Code shows `<!--` as written, so a code span or block is matched first and kept.
const CODE_OR_HTML_COMMENT = /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]+`)|<!--[\s\S]*?(?:-->|$)/g
// Zero-width space and word joiners, BOM, and bidirectional controls. The zero-width joiner and
// non-joiner stay, since emoji sequences and scripts such as Persian and Hindi need them.
const INVISIBLE_CHARACTERS = /[\u200B\u2060-\u2064\uFEFF\u202A-\u202E\u2066-\u2069]/gu
// Tag characters, except in a subdivision flag emoji: a black flag followed by tags.
const TAG_CHARACTERS = /(\u{1F3F4}[\u{E0020}-\u{E007E}]+\u{E007F})|[\u{E0000}-\u{E007F}]/gu

/** Remove HTML comments outside code, and invisible Unicode characters (zero-width, bidirectional controls, tags), from Markdown text. */
export function stripHiddenContent(text: string): string {
  return text
    .replace(CODE_OR_HTML_COMMENT, (_, code: string | undefined) => code ?? '')
    .replace(INVISIBLE_CHARACTERS, '')
    .replace(TAG_CHARACTERS, (_, flag: string | undefined) => flag ?? '')
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
