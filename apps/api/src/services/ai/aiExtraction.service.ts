import {
  crmLeadSchema,
  importResponseSchema,
  type DataSource,
  type ImportResponse,
  type ImportedRecord,
  type SkippedRecord
} from "@groweasy/shared";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import { AppError } from "../../errors/AppError.js";
import { postProcessImportedRecords } from "../import/postProcessImportedRecords.js";
import { addSkippedRecord } from "../import/skippedRecords.js";
import { chunk, retry } from "./batch.js";
import { parseAiJsonResponse, parseStrictJson } from "./aiJson.js";
import type {
  AiBatchRequest,
  AiInputRecord,
  AiProvider
} from "./aiProvider.interface.js";
import { buildAiExtractionPrompt } from "./aiPrompt.builder.js";
import { OpenAiProvider } from "./openaiProvider.js";

export { parseAiJsonResponse, parseStrictJson };

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
    const batches = chunk(input.records, input.batchSize ?? this.batchSize);

    for (const [index, batch] of batches.entries()) {
      const batchRequest = createBatchRequest(
        index,
        batch,
        input.defaultDataSource
      );

      try {
        const batchResponse = await this.extractBatch(batchRequest);
        importedRecords.push(...mapImportedRecords(batchResponse));
        addBatchSkippedRecords(
          skippedRecords,
          skippedSourceRows,
          batchResponse
        );
      } catch (error) {
        if (!input.continueOnBatchFailure) {
          throw error;
        }

        failedBatches += 1;
        addFailedBatchSkippedRecords(
          skippedRecords,
          skippedSourceRows,
          batch,
          error
        );
      }
    }

    const postProcessed = postProcessImportedRecords(
      importedRecords,
      skippedRecords,
      input.records,
      input.defaultDataSource
    );

    return {
      ...importResponseSchema.parse(
        buildImportResponse(input, postProcessed, failedBatches)
      ),
      batch_summary: {
        total_batches: batches.length,
        failed_batches: failedBatches
      }
    };
  }

  private async extractBatch(request: AiBatchRequest): Promise<AiBatchResponse> {
    const prompt = buildAiExtractionPrompt(request.batch_id ?? "batch-1", request);

    return retry(
      this.retryLimit + 1,
      async () => {
        const rawResponse = await this.provider.extractBatch(request, prompt);
        const parsed = parseAiJsonResponse(rawResponse);
        const result = aiBatchResponseSchema.safeParse(parsed);

        if (!result.success) {
          throw new AppError({
            code: "AI_OUTPUT_INVALID",
            message: "AI output did not match the required batch schema.",
            statusCode: 502
          });
        }

        validateContactableImportedRecords(result.data.importedRecords);
        return result.data;
      },
      normalizeAiBatchError
    );
  }
}

export function createAiProvider(env: Env): AiProvider {
  return new OpenAiProvider({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL
  });
}

export function createAiExtractionService(env: Env): AiExtractionService {
  return new AiExtractionService(
    createAiProvider(env),
    env.BATCH_SIZE,
    env.AI_MAX_RETRIES
  );
}

function createBatchRequest(
  index: number,
  records: AiInputRecord[],
  defaultDataSource: DataSource | undefined
): AiBatchRequest {
  const request: AiBatchRequest = {
    batch_id: `batch-${index + 1}`,
    records
  };

  if (defaultDataSource) {
    request.default_data_source = defaultDataSource;
  }

  return request;
}

function mapImportedRecords(batchResponse: AiBatchResponse): ImportedRecord[] {
  return batchResponse.importedRecords.map(({ rowIndex, ...record }) => ({
    source_row: rowIndex,
    ...record
  }));
}

function addBatchSkippedRecords(
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

function addFailedBatchSkippedRecords(
  skippedRecords: SkippedRecord[],
  skippedSourceRows: Set<number>,
  batch: AiInputRecord[],
  error: unknown
): void {
  const message =
    error instanceof AppError ? error.message : "AI batch failed after retry.";

  for (const record of batch) {
    addSkippedRecord(skippedRecords, skippedSourceRows, {
      source_row: record.source_row,
      reason: `AI batch failed after retry: ${message}`,
      raw_record: record.raw_record
    });
  }
}

function buildImportResponse(
  input: ExtractLeadsInput,
  postProcessed: {
    importedRecords: ImportedRecord[];
    skippedRecords: SkippedRecord[];
  },
  failedBatches: number
): ImportResponse {
  return {
    import_id: input.importId ?? crypto.randomUUID(),
    total_imported: postProcessed.importedRecords.length,
    total_skipped: postProcessed.skippedRecords.length,
    summary: {
      total_rows: input.records.length,
      processed_rows: input.records.length,
      imported_count: postProcessed.importedRecords.length,
      skipped_count: postProcessed.skippedRecords.length,
      error_count: failedBatches
    },
    imported_records: postProcessed.importedRecords,
    skipped_records: postProcessed.skippedRecords,
    errors: []
  };
}

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

function normalizeAiBatchError(error: unknown): AppError {
  return error instanceof AppError
    ? error
    : new AppError({
        code: "AI_OUTPUT_INVALID",
        message: "AI output could not be processed.",
        statusCode: 502
      });
}
