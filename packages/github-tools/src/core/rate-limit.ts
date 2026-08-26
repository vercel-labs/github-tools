/**
 * GitHub REST/GraphQL rate-limit snapshot from the last request in a tool call.
 * Present on object-shaped execute results; stripped before the model sees the output.
 */
export type GithubRateLimit = {
  remaining: number
  limit: number
  reset: number
  resource?: string
  retryAfter?: number
}

const snapshots = new WeakMap<object, GithubRateLimit>()

function headerValue(headers: Record<string, unknown> | undefined, name: string): string | undefined {
  if (!headers) return undefined
  const value = headers[name] ?? headers[name.toLowerCase()]
  if (value == null) return undefined
  return String(value)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype
}

function isRateLimit(value: unknown): value is GithubRateLimit {
  return isPlainObject(value) && typeof value.remaining === 'number' && typeof value.limit === 'number' && typeof value.reset === 'number'
}

/** Parse GitHub `x-ratelimit-*` / `retry-after` headers. Returns undefined when the trio is missing. */
export function parseGithubRateLimit(headers: Record<string, unknown> | undefined): GithubRateLimit | undefined {
  const remaining = Number(headerValue(headers, 'x-ratelimit-remaining'))
  const limit = Number(headerValue(headers, 'x-ratelimit-limit'))
  const reset = Number(headerValue(headers, 'x-ratelimit-reset'))
  if (!Number.isFinite(remaining) || !Number.isFinite(limit) || !Number.isFinite(reset)) {
    return undefined
  }

  const resource = headerValue(headers, 'x-ratelimit-resource')
  const retryAfter = Number(headerValue(headers, 'retry-after'))

  return {
    remaining,
    limit,
    reset,
    ...resource ? { resource } : {},
    ...Number.isFinite(retryAfter) ? { retryAfter } : {},
  }
}

export function recordGithubRateLimit(owner: object, headers: Record<string, unknown> | undefined): void {
  const rateLimit = parseGithubRateLimit(headers)
  if (rateLimit) snapshots.set(owner, rateLimit)
}

export function peekGithubRateLimit(owner: object): GithubRateLimit | undefined {
  return snapshots.get(owner)
}

export function stripRateLimit<T>(output: T): T {
  if (!isPlainObject(output) || !('rateLimit' in output)) {
    return output
  }
  const rest = { ...output }
  delete rest.rateLimit
  return rest as T
}

function attachRateLimit<T>(result: T, rateLimit: GithubRateLimit | undefined): T {
  if (!rateLimit || !isPlainObject(result)) return result
  return { ...result, rateLimit } as T
}

export function finishGithubResult<T>(owner: object, result: T): T {
  return attachRateLimit(result, snapshots.get(owner))
}

function pickRateLimitDeep(value: unknown): GithubRateLimit | undefined {
  let found: GithubRateLimit | undefined
  if (isPlainObject(value)) {
    if (isRateLimit(value.rateLimit)) found = value.rateLimit
    for (const child of Object.values(value)) {
      const nested = pickRateLimitDeep(child)
      if (nested) found = nested
    }
  }
  return found
}

function stripRateLimitDeep<T>(value: T): T {
  if (Array.isArray(value)) return value
  if (!isPlainObject(value)) return value
  const next = stripRateLimit({ ...value })
  return Object.fromEntries(
    Object.entries(next).map(([key, child]) => [key, stripRateLimit(child)]),
  ) as T
}

/** Lift a nested child's `rateLimit` onto a composed object and strip it from children. */
export function withComposedRateLimit<T extends Record<string, unknown>>(result: T): T {
  return attachRateLimit(stripRateLimitDeep(result), pickRateLimitDeep(result))
}

function errorStatus(error: unknown): number | undefined {
  if (error == null || typeof error !== 'object' || !('status' in error)) return undefined
  const status = (error as { status?: unknown }).status
  return typeof status === 'number' ? status : undefined
}

export function formatRateLimitSuffix(rateLimit: GithubRateLimit): string {
  const resource = rateLimit.resource ? ` ${rateLimit.resource}` : ''
  const retry = rateLimit.retryAfter != null ? `, retry after ${rateLimit.retryAfter}s` : ''
  return `GitHub rate limit${resource}: ${rateLimit.remaining}/${rateLimit.limit} remaining, resets at ${rateLimit.reset}${retry}`
}

export function enrichGithubRateLimitError(error: unknown, rateLimit: GithubRateLimit | undefined): unknown {
  const status = errorStatus(error)
  if (!rateLimit || (status !== 403 && status !== 429) || !(error instanceof Error)) {
    return error
  }
  const suffix = formatRateLimitSuffix(rateLimit)
  if (!error.message.includes(suffix)) {
    error.message = `${error.message} (${suffix})`
  }
  return error
}
