import {
  crmLeadSchema,
  importResponseSchema,
  importedRecordSchema,
  type DataSource,
  type ImportResponse,
  type ImportedRecord,
  type SkippedRecord
} from "@groweasy/shared";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import { AppError } from "../../errors/AppError.js";
import type {
  AiBatchRequest,
  AiInputRecord,
  AiProvider
} from "./aiProvider.interface.js";
import { buildAiExtractionPrompt } from "./aiPrompt.builder.js";
import { MockAiProvider } from "./mockAiProvider.js";
import { RealAiProviderPlaceholder } from "./realAiProvider.placeholder.js";

export interface ExtractLeadsInput {
  records: AiInputRecord[];
  defaultDataSource?: DataSource;
  importId?: string;
  batchSize?: number;
  continueOnBatchFailure?: boolean;
}

export interface AiExtractionResult extends ImportResponse {
  batch_summary: {
    total_batches: number;
    failed_batches: number;
  };
}

const aiBatchResponseSchema = z
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

type AiBatchResponse = z.infer<typeof aiBatchResponseSchema>;

export class AiExtractionService {
  private readonly provider: AiProvider;
  private readonly batchSize: number;
  private readonly retryLimit: number;

  constructor(provider: AiProvider, batchSize = 25, retryLimit = 1) {
    this.provider = provider;
    this.batchSize = batchSize;
    this.retryLimit = retryLimit;
  }

  async extractLeads(input: ExtractLeadsInput): Promise<AiExtractionResult> {
    const importedRecords: ImportedRecord[] = [];
    const skippedRecords: SkippedRecord[] = [];
    const skippedSourceRows = new Set<number>();
    let failedBatches = 0;
    const batchSize = input.batchSize ?? this.batchSize;
    const batches = chunk(input.records, batchSize);

    for (const [index, batch] of batches.entries()) {
      const batchRequest: AiBatchRequest = {
        batch_id: `batch-${index + 1}`,
        records: batch
      };

      if (input.defaultDataSource) {
        batchRequest.default_data_source = input.defaultDataSource;
      }

      let batchResponse: AiBatchResponse;

      try {
        batchResponse = await this.extractBatch(batchRequest);
      } catch (error) {
        if (!input.continueOnBatchFailure) {
          throw error;
        }

        failedBatches += 1;
        const message =
          error instanceof AppError
            ? error.message
            : "AI batch failed after retry.";

        for (const record of batch) {
          addSkippedRecord(skippedRecords, skippedSourceRows, {
            source_row: record.source_row,
            reason: `AI batch failed after retry: ${message}`,
            raw_record: record.raw_record
          });
        }

        continue;
      }

      importedRecords.push(
        ...batchResponse.importedRecords.map(({ rowIndex, ...record }) => ({
          source_row: rowIndex,
          ...record
        }))
      );
      for (const record of batchResponse.skippedRecords) {
        const skippedRecord: SkippedRecord = {
          source_row: record.rowIndex,
          reason: record.reason
        };

        if (record.raw_record) {
          skippedRecord.raw_record = record.raw_record;
        }

        addSkippedRecord(skippedRecords, skippedSourceRows, skippedRecord);
      }
    }

    const postProcessed = postProcessImportedRecords(
      importedRecords,
      skippedRecords,
      skippedSourceRows
    );

    const response: ImportResponse = {
      import_id: input.importId ?? crypto.randomUUID(),
      total_imported: postProcessed.length,
      total_skipped: skippedRecords.length,
      summary: {
        total_rows: input.records.length,
        processed_rows: input.records.length,
        imported_count: postProcessed.length,
        skipped_count: skippedRecords.length,
        error_count: failedBatches
      },
      imported_records: postProcessed,
      skipped_records: skippedRecords,
      errors: []
    };

    return {
      ...importResponseSchema.parse(response),
      batch_summary: {
        total_batches: batches.length,
        failed_batches: failedBatches
      }
    };
  }

  private async extractBatch(request: AiBatchRequest): Promise<AiBatchResponse> {
    const prompt = buildAiExtractionPrompt(request.batch_id ?? "batch-1", request);
    let lastError: AppError | undefined;

    for (let attempt = 1; attempt <= this.retryLimit + 1; attempt += 1) {
      try {
        const rawResponse = await this.provider.extractBatch(request, prompt);
        const parsed = parseAiJsonResponse(rawResponse);
        const result = aiBatchResponseSchema.safeParse(parsed);

        if (!result.success) {
          lastError = new AppError({
            code: "AI_OUTPUT_INVALID",
            message: "AI output did not match the required batch schema.",
            statusCode: 502
          });
          continue;
        }

        validateContactableImportedRecords(result.data.importedRecords);

        return result.data;
      } catch (error) {
        lastError =
          error instanceof AppError
            ? error
            : new AppError({
                code: "AI_OUTPUT_INVALID",
                message: "AI output could not be processed.",
                statusCode: 502
              });
        continue;
      }
    }

    throw (
      lastError ??
      new AppError({
        code: "AI_OUTPUT_INVALID",
        message: "AI output could not be validated after retry.",
        statusCode: 502
      })
    );
  }
}

export function createAiProvider(env: Env): AiProvider {
  if (env.AI_PROVIDER === "mock") {
    return new MockAiProvider();
  }

  return new RealAiProviderPlaceholder(env.AI_PROVIDER, env.AI_API_KEY);
}

export function createAiExtractionService(env: Env): AiExtractionService {
  return new AiExtractionService(
    createAiProvider(env),
    env.AI_BATCH_SIZE,
    env.AI_BATCH_RETRY_LIMIT
  );
}

export function parseAiJsonResponse(value: string): unknown {
  const trimmed = value.trim();

  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    throw new AppError({
      code: "AI_OUTPUT_INVALID",
      message: "AI output must be a strict JSON object with no surrounding prose.",
      statusCode: 502
    });
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const repaired = repairJsonIfSafe(trimmed);

    if (repaired) {
      try {
        return JSON.parse(repaired) as unknown;
      } catch {
        // Fall through to the controlled parse error below.
      }
    }

    throw new AppError({
      code: "AI_OUTPUT_INVALID",
      message: "AI output could not be parsed as JSON.",
      statusCode: 502
    });
  }
}

export const parseStrictJson = parseAiJsonResponse;

function validateContactableImportedRecords(
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

function repairJsonIfSafe(value: string): string | null {
  const withoutTrailingCommas = value.replace(/,\s*([}\]])/g, "$1");

  if (withoutTrailingCommas !== value) {
    return withoutTrailingCommas;
  }

  return null;
}

function postProcessImportedRecords(
  records: ImportedRecord[],
  skippedRecords: SkippedRecord[],
  skippedSourceRows: Set<number>
): ImportedRecord[] {
  const importedBySourceRow = new Map<number, ImportedRecord>();

  for (const record of records) {
    const parsed = importedRecordSchema.safeParse(record);

    if (!parsed.success) {
      addSkippedRecord(skippedRecords, skippedSourceRows, {
        source_row: record.source_row,
        reason: "Imported record failed final schema validation"
      });
      continue;
    }

    if (!record.email && !record.mobile_without_country_code) {
      addSkippedRecord(skippedRecords, skippedSourceRows, {
        source_row: record.source_row,
        reason: "Missing both email and mobile number"
      });
      continue;
    }

    if (!skippedSourceRows.has(record.source_row)) {
      importedBySourceRow.set(record.source_row, parsed.data);
    }
  }

  return [...importedBySourceRow.values()].sort(
    (left, right) => left.source_row - right.source_row
  );
}

function addSkippedRecord(
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

function chunk<T>(items: T[], size: number): T[][] {
  const safeSize = Math.max(1, size);
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += safeSize) {
    batches.push(items.slice(index, index + safeSize));
  }

  return batches;
}
