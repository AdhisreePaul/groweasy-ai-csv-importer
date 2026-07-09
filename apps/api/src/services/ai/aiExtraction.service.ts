import {
  type DataSource,
  type ImportResponse,
  type ImportedRecord,
  type SkippedRecord
} from "@groweasy/shared";
import type { Env } from "../../config/env.js";
import { AppError } from "../../errors/AppError.js";
import { buildValidatedImportResponse } from "../import/importResponse.js";
import { postProcessImportedRecords } from "../import/postProcessImportedRecords.js";
import {
  addBatchSkippedRecords,
  aiBatchResponseSchema,
  mapImportedRecords,
  validateContactableImportedRecords,
  type AiBatchResponse
} from "./aiBatchResponse.js";
import { chunk, retry } from "./batch.js";
import { parseAiJsonResponse, parseStrictJson } from "./aiJson.js";
import type { AiBatchRequest, AiInputRecord, AiProvider } from "./aiProvider.interface.js";
import { buildAiExtractionPrompt } from "./aiPrompt.builder.js";
import { createAiProvider } from "./providerFactory.js";

export { parseAiJsonResponse, parseStrictJson };

export interface ExtractLeadsInput {
  records: AiInputRecord[];
  defaultDataSource?: DataSource;
  importId?: string;
  batchSize?: number;
}

export interface AiExtractionResult extends ImportResponse {
  batch_summary: {
    total_batches: number;
    failed_batches: number;
  };
}

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
    const batches = chunk(input.records, input.batchSize ?? this.batchSize);
    const aiOutput = await this.extractBatches(batches, input.defaultDataSource);

    const postProcessed = postProcessImportedRecords(
      aiOutput.importedRecords,
      aiOutput.skippedRecords,
      input.records,
      input.defaultDataSource
    );

    return {
      ...buildValidatedImportResponse(input, postProcessed),
      batch_summary: {
        total_batches: batches.length,
        failed_batches: aiOutput.failedBatches
      }
    };
  }

  private async extractBatches(
    batches: AiInputRecord[][],
    defaultDataSource: DataSource | undefined
  ): Promise<{
    importedRecords: ImportedRecord[];
    skippedRecords: SkippedRecord[];
    failedBatches: number;
  }> {
    const importedRecords: ImportedRecord[] = [];
    const skippedRecords: SkippedRecord[] = [];
    const skippedSourceRows = new Set<number>();

    for (const [index, batch] of batches.entries()) {
      const batchResponse = await this.extractBatch(
        createBatchRequest(index, batch, defaultDataSource)
      );

      importedRecords.push(...mapImportedRecords(batchResponse));
      addBatchSkippedRecords(skippedRecords, skippedSourceRows, batchResponse);
    }

    return {
      importedRecords,
      skippedRecords,
      failedBatches: 0
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

export function createAiExtractionService(env: Env): AiExtractionService {
  return new AiExtractionService(createAiProvider(env), env.BATCH_SIZE, env.AI_MAX_RETRIES);
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

function normalizeAiBatchError(error: unknown): AppError {
  return error instanceof AppError
    ? error
    : new AppError({
        code: "AI_OUTPUT_INVALID",
        message: "AI output could not be processed.",
        statusCode: 502
      });
}
