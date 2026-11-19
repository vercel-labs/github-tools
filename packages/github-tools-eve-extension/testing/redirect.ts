import { getEnvironmentData, threadId } from 'node:worker_threads'
import { CONNECT_URL_ENV, GITHUB_URL_ENV, PROBE_KEY, REDIRECT_MARKER } from './env.js'

// Loaded with `NODE_OPTIONS=--import`, which `emulateGithub` sets before the agent starts. It
// sends the agent's requests to api.github.com and to Vercel Connect to the local emulators, and
// holds no state. It does nothing outside `eve dev` and `eve eval`, which set `EVE_DEV=1`.
const github = process.env[GITHUB_URL_ENV]
const connect = process.env[CONNECT_URL_ENV]
const state = globalThis as typeof globalThis & { [REDIRECT_MARKER]?: true }

function emulatorFor(url: URL): string | undefined {
  if (url.hostname === 'api.github.com') return github
  // `@vercel/connect` calls api.vercel.com, or api-<region>.vercel.com when it knows the region.
  if (/^api(?:-[a-z0-9]+)?\.vercel\.com$/u.test(url.hostname) && url.pathname.startsWith('/v1/connect/')) return connect
  return undefined
}

if (process.env.EVE_DEV === '1' && github && connect && !state[REDIRECT_MARKER]) {
  const original = globalThis.fetch
  state[REDIRECT_MARKER] = true
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    const emulator = emulatorFor(url)
    if (!emulator) return original(input, init)
    const target = `${emulator}${url.pathname}${url.search}`
    return original(input instanceof Request ? new Request(target, input) : target, init)
  }

  // Tells `emulateGithub`, in the same process, that this thread has the redirect.
  const probe = getEnvironmentData(PROBE_KEY)
  if (probe instanceof SharedArrayBuffer) {
    const slots = new Int32Array(probe)
    const slot = Atomics.add(slots, 0, 1) + 1
    if (slot < slots.length) Atomics.store(slots, slot, threadId)
  }

  console.error(`[github-tools] emulating GitHub in process ${process.pid}, thread ${threadId}: api.github.com -> ${github}, Vercel Connect -> ${connect}`)
}
