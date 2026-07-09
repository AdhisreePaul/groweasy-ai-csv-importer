import {
  dataSourceSchema,
  type DataSource,
  type ImportedRecord,
  type SkippedRecord
} from "@groweasy/shared";
import type { AiExtractionService } from "../ai/aiExtraction.service.js";
import { parseCsvBuffer } from "../csvParser.service.js";
import { AppError } from "../../errors/AppError.js";
import { dedupeSkippedRecords } from "./skippedRecords.js";

export interface ImportCsvFileInput {
  aiExtractionService: AiExtractionService;
  fileBuffer: Buffer;
  dataSource?: unknown;
}

export interface ImportCsvApiResponse {
  success: true;
  summary: {
    totalRows: number;
    totalImported: number;
    totalSkipped: number;
    totalBatches: number;
    failedBatches: number;
  };
  importedRecords: ImportedRecord[];
  skippedRecords: SkippedRecord[];
}

export async function importCsvFile({
  aiExtractionService,
  fileBuffer,
  dataSource
}: ImportCsvFileInput): Promise<ImportCsvApiResponse> {
  const parsed = parseCsvBuffer(fileBuffer);
  const defaultDataSource = parseDefaultDataSource(dataSource);
  const extractionInput = {
    records: parsed.rows.map((row) => ({
      source_row: row.sourceRow,
      raw_record: row.record
    }))
  };

  const extraction = await aiExtractionService.extractLeads(
    defaultDataSource ? { ...extractionInput, defaultDataSource } : extractionInput
  );
  const skippedRecords = dedupeSkippedRecords([
    ...toEmptyRowSkippedRecords(parsed.skippedEmptyRows),
    ...extraction.skipped_records
  ]);

  return {
    success: true,
    summary: {
      totalRows: parsed.totalRows + parsed.skippedEmptyRows.length,
      totalImported: extraction.imported_records.length,
      totalSkipped: skippedRecords.length,
      totalBatches: extraction.batch_summary.total_batches,
      failedBatches: extraction.batch_summary.failed_batches
    },
    importedRecords: extraction.imported_records,
    skippedRecords
  };
}

function parseDefaultDataSource(value: unknown): DataSource | undefined {
  const result = dataSourceSchema.optional().safeParse(normalizeOptionalString(value));

  if (!result.success) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      message: "`data_source` must be one of the allowed values.",
      statusCode: 400
    });
  }

  return result.data;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toEmptyRowSkippedRecords(sourceRows: number[]): SkippedRecord[] {
  return sourceRows.map((sourceRow) => ({
    source_row: sourceRow,
    reason: "Empty row"
  }));
}
