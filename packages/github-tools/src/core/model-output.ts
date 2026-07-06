const MAX_PATCH_LENGTH = 4000
const MAX_CONTENT_LENGTH = 50000

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}\n\n[truncated: ${text.length - maxLength} more characters]`
}

type ToModelOutputOptions = {
  toolCallId: string
  input: unknown
  output: unknown
}

type ListPullRequestFilesOutput = Array<{
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  patch?: string
}>

type GetCommitOutput = {
  sha: string
  message: string
  author?: string
  authorLogin?: string
  date?: string
  url: string
  stats: { additions: number, deletions: number, total: number } | null
  files?: Array<{
    filename: string
    status: string
    additions: number
    deletions: number
    patch?: string
  }>
}

type GetFileContentOutput =
  | { type: 'directory', entries: Array<{ name: string, type: string, path: string }> }
  | { type: string, path: string }
  | { type: 'file', path: string, sha: string, size: number, content: string }

export function listPullRequestFilesToModelOutput({ output }: ToModelOutputOptions) {
  const files = output as ListPullRequestFilesOutput
  return {
    type: 'json' as const,
    value: files.map(file => ({
      ...file,
      patch: file.patch ? truncateText(file.patch, MAX_PATCH_LENGTH) : file.patch,
    })),
  }
}

export function getCommitToModelOutput({ output }: ToModelOutputOptions) {
  const commit = output as GetCommitOutput
  return {
    type: 'json' as const,
    value: {
      ...commit,
      files: commit.files?.map(file => ({
        ...file,
        patch: file.patch ? truncateText(file.patch, MAX_PATCH_LENGTH) : file.patch,
      })),
    },
  }
}

export function getFileContentToModelOutput({ output }: ToModelOutputOptions) {
  const result = output as GetFileContentOutput
  if ('content' in result && result.content.length > MAX_CONTENT_LENGTH) {
    return {
      type: 'json' as const,
      value: {
        ...result,
        content: truncateText(result.content, MAX_CONTENT_LENGTH),
      },
    }
  }
  return { type: 'json' as const, value: result }
}
