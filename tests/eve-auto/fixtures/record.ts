const records = { connectScopes: [] as string[], approvalEvaluations: 0 }

/** Requests and evaluation calls made in this process. */
export function recorded() {
  return records
}
