import { crmLeadSchema, type ImportedRecord, type SkippedRecord } from "@groweasy/shared";
import { z } from "zod";
import { AppError } from "../../errors/AppError.js";
import { addSkippedRecord } from "../import/skippedRecords.js";

export const aiBatchResponseSchema = z
  .object({
    importedRecords: z.array(
      crmLeadSchema.extend({
        rowIndex: z.number().int().positive()
      })
    ),
    skippedRecords: z.array(
      z.object({
        rowIndex: z.number().int().positive(),
        reason: z.string(),
        raw_record: z.record(z.unknown()).optional()
      })
    )
  })
  .strict();

export type AiBatchResponse = z.infer<typeof aiBatchResponseSchema>;

export function mapImportedRecords(batchResponse: AiBatchResponse): ImportedRecord[] {
  return batchResponse.importedRecords.map(({ rowIndex, ...record }) => ({
    source_row: rowIndex,
    ...record
  }));
}

export function addBatchSkippedRecords(
  skippedRecords: SkippedRecord[],
  skippedSourceRows: Set<number>,
  batchResponse: AiBatchResponse
): void {
  for (const record of batchResponse.skippedRecords) {
    addSkippedRecord(skippedRecords, skippedSourceRows, {
      source_row: record.rowIndex,
      reason: record.reason,
      ...(record.raw_record ? { raw_record: record.raw_record } : {})
    });
  }
}

export function validateContactableImportedRecords(
  records: AiBatchResponse["importedRecords"]
): void {
  const invalidRecord = records.find(
    (record) => !record.email && !record.mobile_without_country_code
  );

  if (!invalidRecord) {
    return;
  }

  throw new AppError({
    code: "AI_OUTPUT_INVALID",
    message: `AI output included rowIndex ${invalidRecord.rowIndex} without email or mobile.`,
    statusCode: 502
  });
}
