const calls: string[] = []

/** Records a GitHub API request as `METHOD path token`. */
export function recordGithubCall(call: string) {
  calls.push(call)
}

/** GitHub API requests made in this process, oldest first. */
export function githubCalls(): string[] {
  return calls
}
