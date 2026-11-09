// Credential formats with a fixed prefix or shape, so a match is unlikely to be ordinary text.
const SECRET_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['a GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{82,})/],
  ['a private key', /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/],
  ['an AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['a Slack token', /\bxox[abposr]-[A-Za-z0-9-]{10,}/],
  ['a Stripe secret key', /\b[rs]k_live_[A-Za-z0-9]{20,}/],
  ['a Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['an Anthropic API key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['an OpenAI API key', /\bsk-[A-Za-z0-9_-]{20,}T3BlbkFJ[A-Za-z0-9_-]{20,}/],
  ['an npm token', /\bnpm_[A-Za-z0-9]{36}\b/],
]

/** The kind of credential found in any string of `value`, such as "a GitHub token", or `undefined`. */
export function findSecret(value: unknown): string | undefined {
  if (typeof value === 'string') return SECRET_PATTERNS.find(([, pattern]) => pattern.test(value))?.[0]
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findSecret(item)
      if (found) return found
    }
    return undefined
  }
  // Keys count too: a gist's filename is a key of `files`.
  if (value !== null && typeof value === 'object') return findSecret([...Object.keys(value), ...Object.values(value)])
  return undefined
}
