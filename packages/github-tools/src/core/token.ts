export function resolveGithubToken(token?: string): string {
  const resolvedToken = token || process.env.GITHUB_TOKEN
  if (!resolvedToken) {
    throw new Error('GitHub token is required. Pass it as `token` or set the GITHUB_TOKEN environment variable.')
  }
  return resolvedToken
}
