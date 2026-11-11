const records: unknown[] = []

/** Records the `audit` function of the dry-run mount received in this process. */
export function auditRecords() {
  return records
}

export function audit(record: unknown) {
  records.push(record)
}
