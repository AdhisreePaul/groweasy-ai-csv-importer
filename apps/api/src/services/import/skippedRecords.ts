import type { SkippedRecord } from "@groweasy/shared";

export function addSkippedRecord(
  skippedRecords: SkippedRecord[],
  skippedSourceRows: Set<number>,
  record: SkippedRecord
): void {
  if (skippedSourceRows.has(record.source_row)) {
    return;
  }

  skippedSourceRows.add(record.source_row);
  skippedRecords.push(record);
}

export function dedupeSkippedRecords<T extends { source_row: number }>(
  records: T[]
): T[] {
  const seen = new Set<number>();
  const deduped: T[] = [];

  for (const record of records) {
    if (seen.has(record.source_row)) {
      continue;
    }

    seen.add(record.source_row);
    deduped.push(record);
  }

  return deduped.sort((left, right) => left.source_row - right.source_row);
}
