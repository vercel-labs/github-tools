// `@emulators/core` reads files next to itself when it loads. eve bundles what an eval imports
// from a package linked in a workspace, and a bundled copy would look for those files beside the
// bundle. A specifier the bundler can't follow leaves both packages for Node to load.
const load = <T>(name: string): Promise<T> => import(name)

const core = await load<typeof import('@emulators/core')>('@emulators/core')
const github = await load<typeof import('@emulators/github')>('@emulators/github')

export const { ApiError, Hono, createServer, serve } = core
export const { createAppKeyResolver, getGitHubStore, githubPlugin, prepareSeed, seedFromConfig } = github
