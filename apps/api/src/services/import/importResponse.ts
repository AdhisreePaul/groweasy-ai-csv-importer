import { importResponseSchema, type ImportResponse } from "@groweasy/shared";
import { AppError } from "../../errors/AppError.js";
import type { ExtractLeadsInput } from "../ai/aiExtraction.service.js";

export interface ProcessedImportRecords {
  importedRecords: ImportResponse["imported_records"];
  skippedRecords: ImportResponse["skipped_records"];
}

export function buildValidatedImportResponse(
  input: ExtractLeadsInput,
  records: ProcessedImportRecords
): ImportResponse {
  const result = importResponseSchema.safeParse({
    import_id: input.importId ?? crypto.randomUUID(),
    total_imported: records.importedRecords.length,
    total_skipped: records.skippedRecords.length,
    summary: {
      total_rows: input.records.length,
      processed_rows: input.records.length,
      imported_count: records.importedRecords.length,
      skipped_count: records.skippedRecords.length,
      error_count: 0
    },
    imported_records: records.importedRecords,
    skipped_records: records.skippedRecords,
    errors: []
  });

  if (!result.success) {
    throw new AppError({
      code: "IMPORT_RESPONSE_INVALID",
      message: "Final import response failed validation.",
      statusCode: 502
    });
  }

  return result.data;
}
