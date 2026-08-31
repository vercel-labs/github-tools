const MAX_PATCH_LENGTH = 4000
const MAX_CONTENT_LENGTH = 20000
const MAX_MODEL_TREE_ENTRIES = 200
const MAX_MODEL_DIFF_FILES = 80

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}\n\n[truncated: ${text.length - maxLength} more characters]`
}

function truncatePatchFields<T extends { patch?: string }>(files: T[]): T[] {
  return files.map(file => ({
    ...file,
    patch: file.patch ? truncateText(file.patch, MAX_PATCH_LENGTH) : file.patch,
  }))
}

function capDiffFiles<T extends { patch?: string }>(files: T[] | undefined) {
  if (!files) return { files, filesOmitted: 0 }
  const truncated = truncatePatchFields(files)
  if (truncated.length <= MAX_MODEL_DIFF_FILES) return { files: truncated, filesOmitted: 0 }
  return {
    files: truncated.slice(0, MAX_MODEL_DIFF_FILES),
    filesOmitted: truncated.length - MAX_MODEL_DIFF_FILES,
  }
}

type ToModelOutputOptions = {
  toolCallId: string
  input: unknown
  output: unknown
}

type ListPullRequestFile = {
  filename: string
  status: string
  additions: number
  deletions: number
  changes: number
  patch?: string
}

type ListPullRequestFilesOutput = {
  items: ListPullRequestFile[]
  hasMore: boolean
  page: number
  perPage: number
  nextPage?: number
}

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
  | {
      type: 'file'
      path: string
      sha: string
      size: number
      content: string
      totalLines?: number
      startLine?: number
      endLine?: number
      truncated?: boolean
    }

export function listPullRequestFilesToModelOutput({ output }: ToModelOutputOptions) {
  const result = output as ListPullRequestFilesOutput
  return {
    type: 'json' as const,
    value: {
      ...result,
      items: truncatePatchFields(result.items),
    },
  }
}

export function getCommitToModelOutput({ output }: ToModelOutputOptions) {
  const commit = output as GetCommitOutput
  const { files, filesOmitted } = capDiffFiles(commit.files)
  return {
    type: 'json' as const,
    value: {
      ...commit,
      files,
      ...filesOmitted > 0 ? { filesOmitted } : {},
    },
  }
}

type CompareCommitsOutput = {
  status: string
  aheadBy: number
  behindBy: number
  totalCommits: number
  url: string
  commits: Array<{ sha: string, message: string, author?: string, authorLogin?: string }>
  files?: Array<{
    filename: string
    status: string
    additions: number
    deletions: number
    patch?: string
  }>
}

export function compareCommitsToModelOutput({ output }: ToModelOutputOptions) {
  const comparison = output as CompareCommitsOutput
  const { files, filesOmitted } = capDiffFiles(comparison.files)
  return {
    type: 'json' as const,
    value: {
      ...comparison,
      files,
      ...filesOmitted > 0 ? { filesOmitted } : {},
    },
  }
}

export function getFileContentToModelOutput({ output }: ToModelOutputOptions) {
  const result = output as GetFileContentOutput
  if (result.type === 'directory' && 'entries' in result && result.entries.length > MAX_MODEL_TREE_ENTRIES) {
    return {
      type: 'json' as const,
      value: {
        ...result,
        truncated: true,
        entries: result.entries.slice(0, MAX_MODEL_TREE_ENTRIES),
        entriesOmitted: result.entries.length - MAX_MODEL_TREE_ENTRIES,
      },
    }
  }
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

type GetRepositoryTreeOutput = {
  sha: string
  truncated: boolean
  path?: string
  entries: Array<{ path?: string, type?: string, size?: number, sha?: string }>
}

export function getRepositoryTreeToModelOutput({ output }: ToModelOutputOptions) {
  const result = output as GetRepositoryTreeOutput
  if (result.entries.length <= MAX_MODEL_TREE_ENTRIES) {
    return { type: 'json' as const, value: result }
  }
  return {
    type: 'json' as const,
    value: {
      ...result,
      truncated: true,
      entries: result.entries.slice(0, MAX_MODEL_TREE_ENTRIES),
      entriesOmitted: result.entries.length - MAX_MODEL_TREE_ENTRIES,
    },
  }
}

type GetPullRequestContextOutput = {
  pullRequest: {
    number: number
    title: string
    body: string | null
    state: string
    url: string
    author?: string
    branch: string
    headSha: string
    base: string
    draft?: boolean
    merged: boolean
    mergeable: boolean | null
    additions: number
    deletions: number
    changedFiles: number
    createdAt: string
    updatedAt: string
    mergedAt: string | null
  }
  files?: ListPullRequestFile[]
  filesHasMore?: boolean
  reviews?: Array<{
    id: number
    state: string
    body: string
    author?: string
    url: string
    submittedAt?: string | null
  }>
  checks?: {
    checkRuns: {
      totalCount: number
      checkRuns: Array<{
        id: number
        name: string
        status: string
        conclusion: string | null
        url: string | null
        startedAt: string | null
        completedAt: string | null
      }>
    }
    combinedStatus: {
      state: string
      totalCount: number
      statuses: Array<{
        context: string
        state: string
        description: string | null
        url: string | null
      }>
    }
  }
}

export function getPullRequestContextToModelOutput({ output }: ToModelOutputOptions) {
  const result = output as GetPullRequestContextOutput
  const { files, filesOmitted } = capDiffFiles(result.files)
  return {
    type: 'json' as const,
    value: {
      ...result,
      files,
      ...filesOmitted > 0 ? { filesOmitted } : {},
    },
  }
}
