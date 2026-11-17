const calls: string[] = []

/** Records a GitHub API request as `METHOD path token`. */
export function recordGithubCall(call: string) {
  calls.push(call)
}

/** GitHub API requests made in this process, oldest first. */
export function githubCalls(): string[] {
  return calls
}

const writes: string[] = []

/** Records the text a write sent to GitHub: a pull request body or a commit message. */
export function recordGithubWrite(text: string) {
  writes.push(text)
}

/** Texts sent to GitHub in this process, oldest first. */
export function githubWrites(): string[] {
  return writes
}
