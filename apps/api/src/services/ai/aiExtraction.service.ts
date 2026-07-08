import {
  appendToNote,
  cleanCellValue,
  crmLeadSchema,
  DATA_SOURCES,
  extractContactDetailsFromRecord,
  importResponseSchema,
  importedRecordSchema,
  normalizeHeaderKey,
  normalizePhoneWithCountryCode,
  type CrmStatus,
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
      input.records,
      input.defaultDataSource
    );

    const response: ImportResponse = {
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
  aiSkippedRecords: SkippedRecord[],
  sourceRecords: AiInputRecord[],
  defaultDataSource?: DataSource
): { importedRecords: ImportedRecord[]; skippedRecords: SkippedRecord[] } {
  const rawBySourceRow = new Map(
    sourceRecords.map((record) => [record.source_row, record.raw_record])
  );
  const importedBySourceRow = new Map<number, ImportedRecord>();
  const skippedBySourceRow = new Map<number, SkippedRecord>();

  for (const record of aiSkippedRecords) {
    const skippedRecord: SkippedRecord = {
      source_row: record.source_row,
      reason: record.reason || "Missing both email and mobile number",
      raw_record: record.raw_record ?? rawBySourceRow.get(record.source_row)
    };

    skippedBySourceRow.set(record.source_row, skippedRecord);
  }

  for (const record of records) {
    const repairedRecord = repairImportedRecord(
      record,
      rawBySourceRow.get(record.source_row)
    );
    const parsed = importedRecordSchema.safeParse(repairedRecord);

    if (!parsed.success) {
      skippedBySourceRow.set(record.source_row, {
        source_row: record.source_row,
        reason: "Imported record failed final schema validation",
        raw_record: rawBySourceRow.get(record.source_row)
      });
      continue;
    }

    if (!parsed.data.email && !parsed.data.mobile_without_country_code) {
      skippedBySourceRow.set(record.source_row, {
        source_row: record.source_row,
        reason: "Missing both email and mobile number",
        raw_record: rawBySourceRow.get(record.source_row)
      });
      continue;
    }

    importedBySourceRow.set(record.source_row, parsed.data);
    skippedBySourceRow.delete(record.source_row);
  }

  for (const sourceRecord of sourceRecords) {
    if (importedBySourceRow.has(sourceRecord.source_row)) {
      continue;
    }

    const existingSkip = skippedBySourceRow.get(sourceRecord.source_row);

    if (existingSkip?.reason.startsWith("AI batch failed after retry")) {
      continue;
    }

    const fallbackRecord = buildDeterministicRecordFromRaw(
      sourceRecord.source_row,
      sourceRecord.raw_record,
      defaultDataSource
    );

    if (fallbackRecord) {
      importedBySourceRow.set(sourceRecord.source_row, fallbackRecord);
      skippedBySourceRow.delete(sourceRecord.source_row);
      continue;
    }

    skippedBySourceRow.set(sourceRecord.source_row, {
      source_row: sourceRecord.source_row,
      reason: "Missing both email and mobile number",
      raw_record: sourceRecord.raw_record
    });
  }

  const importedRecords = [...importedBySourceRow.values()].sort(
    (left, right) => left.source_row - right.source_row
  );
  const skippedRecords = [...skippedBySourceRow.values()]
    .filter((record) => !importedBySourceRow.has(record.source_row))
    .sort((left, right) => left.source_row - right.source_row);

  return { importedRecords, skippedRecords };
}

function repairImportedRecord(
  record: ImportedRecord,
  rawRecord: Record<string, unknown> | undefined
): ImportedRecord {
  const contactDetails = rawRecord
    ? extractContactDetailsFromRecord(rawRecord)
    : null;
  const aiPhone = normalizePhoneWithCountryCode(
    record.mobile_without_country_code,
    record.country_code
  );
  const primaryPhone =
    contactDetails?.primaryPhone ??
    (aiPhone.mobile_without_country_code ? aiPhone : null);
  let crmNote = cleanCellValue(record.crm_note);

  if (contactDetails?.additionalEmails.length) {
    crmNote = appendToNote(
      crmNote,
      `Additional emails: ${contactDetails.additionalEmails.join(", ")}.`
    );
  }

  if (contactDetails?.additionalPhones.length) {
    crmNote = appendToNote(
      crmNote,
      `Additional mobiles: ${contactDetails.additionalPhones
        .map((phone) => phone.mobile_without_country_code)
        .join(", ")}.`
    );
  }

  return {
    ...record,
    email: contactDetails?.primaryEmail || cleanCellValue(record.email),
    country_code: primaryPhone?.country_code ?? cleanCellValue(record.country_code),
    mobile_without_country_code:
      primaryPhone?.mobile_without_country_code ??
      cleanCellValue(record.mobile_without_country_code),
    country:
      cleanCellValue(record.country) ||
      (primaryPhone?.country_code === "+91" ? "India" : ""),
    crm_note: crmNote
  };
}

function buildDeterministicRecordFromRaw(
  sourceRow: number,
  rawRecord: Record<string, unknown>,
  defaultDataSource?: DataSource
): ImportedRecord | null {
  const contactDetails = extractContactDetailsFromRecord(rawRecord);

  if (!contactDetails.primaryEmail && !contactDetails.primaryPhone) {
    return null;
  }

  const [city, stateFromLocation] = parseLocation(
    findRawValue(rawRecord, ["city", "current_location", "location", "place"])
  );
  const joinedText = Object.values(rawRecord).map(cleanCellValue).join(" ");
  let crmNote = "";

  if (contactDetails.additionalEmails.length) {
    crmNote = appendToNote(
      crmNote,
      `Additional emails: ${contactDetails.additionalEmails.join(", ")}.`
    );
  }

  if (contactDetails.additionalPhones.length) {
    crmNote = appendToNote(
      crmNote,
      `Additional mobiles: ${contactDetails.additionalPhones
        .map((phone) => phone.mobile_without_country_code)
        .join(", ")}.`
    );
  }

  return importedRecordSchema.parse({
    source_row: sourceRow,
    created_at: new Date().toISOString(),
    name: findRawValue(rawRecord, [
      "name",
      "full_name",
      "client_name",
      "buyer_name",
      "customer",
      "lead"
    ]),
    email: contactDetails.primaryEmail,
    country_code: contactDetails.primaryPhone?.country_code ?? "",
    mobile_without_country_code:
      contactDetails.primaryPhone?.mobile_without_country_code ?? "",
    company: findRawValue(rawRecord, [
      "company",
      "organization",
      "organisation",
      "business",
      "firm",
      "builder"
    ]),
    city,
    state: findRawValue(rawRecord, ["state"]) || stateFromLocation,
    country:
      findRawValue(rawRecord, ["country"]) ||
      (contactDetails.primaryPhone?.country_code === "+91" ? "India" : ""),
    lead_owner:
      findRawValue(rawRecord, [
        "lead_owner",
        "owner",
        "sales_person",
        "salesperson",
        "assigned_to"
      ]) || "Unassigned",
    crm_status: inferStatus(joinedText),
    crm_note: crmNote,
    data_source: inferDataSource(joinedText, defaultDataSource),
    possession_time: findRawValue(rawRecord, [
      "possession",
      "possession_time",
      "move_in",
      "timeline"
    ]),
    description: buildDescription(rawRecord)
  });
}

function findRawValue(
  record: Record<string, unknown>,
  aliases: readonly string[]
): string {
  const normalizedAliases = aliases.map(normalizeHeaderKey);

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeHeaderKey(key);

    if (normalizedAliases.some((alias) => normalizedKey === alias)) {
      const cleaned = cleanCellValue(value);

      if (cleaned) {
        return cleaned;
      }
    }
  }

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeHeaderKey(key);

    if (
      normalizedAliases.some(
        (alias) =>
          alias.length > 4 &&
          (normalizedKey.startsWith(`${alias}_`) ||
            normalizedKey.endsWith(`_${alias}`))
      )
    ) {
      const cleaned = cleanCellValue(value);

      if (cleaned) {
        return cleaned;
      }
    }
  }

  return "";
}

function parseLocation(value: string): [string, string] {
  const cleaned = cleanCellValue(value);

  if (!cleaned) {
    return ["", ""];
  }

  if (cleaned.includes(",")) {
    const [city = "", state = ""] = cleaned.split(",").map(cleanCellValue);
    return [city, state];
  }

  return [cleaned, ""];
}

function buildDescription(record: Record<string, unknown>): string {
  return (
    findRawValue(record, [
      "description",
      "remarks",
      "remark",
      "comment",
      "comments",
      "notes",
      "lead_notes",
      "requirement",
      "requirements"
    ]) ||
    Object.entries(record)
      .map(([key, value]) => {
        const cleaned = cleanCellValue(value);
        return cleaned ? `${key}: ${cleaned}` : "";
      })
      .filter(Boolean)
      .join("; ")
  );
}

function inferStatus(text: string): CrmStatus {
  const lowerText = text.toLowerCase();

  if (/\b(sold|booked|closed|converted|sale done)\b/.test(lowerText)) {
    return "SALE_DONE";
  }

  if (
    /\b(did not connect|could not connect|unreachable|not picking|no answer)\b/.test(
      lowerText
    )
  ) {
    return "DID_NOT_CONNECT";
  }

  if (/\b(fake|spam|duplicate|invalid|not interested|bad lead)\b/.test(lowerText)) {
    return "BAD_LEAD";
  }

  return "GOOD_LEAD_FOLLOW_UP";
}

function inferDataSource(text: string, defaultDataSource?: DataSource): DataSource {
  const lowerText = text.toLowerCase();

  if (lowerText.includes("meridian tower")) {
    return "meridian_tower";
  }

  if (lowerText.includes("eden park")) {
    return "eden_park";
  }

  if (lowerText.includes("varah swamy") || lowerText.includes("varahswamy")) {
    return "varah_swamy";
  }

  if (lowerText.includes("sarjapur plot")) {
    return "sarjapur_plots";
  }

  if (lowerText.includes("leads on demand")) {
    return "leads_on_demand";
  }

  if (defaultDataSource && DATA_SOURCES.includes(defaultDataSource)) {
    return defaultDataSource;
  }

  return "leads_on_demand";
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
