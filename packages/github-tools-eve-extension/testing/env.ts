/** Set by `emulateGithub` before the agent starts, and read by the redirect and the agent-side helpers. */
export const GITHUB_URL_ENV = 'GITHUB_TOOLS_EMULATE_GITHUB'
export const CONNECT_URL_ENV = 'GITHUB_TOOLS_EMULATE_CONNECT'

/** Set on `globalThis` by the redirect once it wraps `fetch`. */
export const REDIRECT_MARKER = Symbol.for('github-tools.emulate.redirect')

/**
 * `worker_threads` environment data key for a shared buffer. Slot 0 counts the threads of the
 * `eve eval` process the redirect loaded in, and the slots after it hold their thread IDs.
 */
export const PROBE_KEY = 'github-tools.emulate.probe'
