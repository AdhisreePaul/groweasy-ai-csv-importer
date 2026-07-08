import {
  appendToNote,
  cleanCellValue,
  extractContactDetailsFromRecord,
  importedRecordSchema,
  normalizeDate,
  normalizePhoneWithCountryCode,
  type DataSource,
  type ImportedRecord,
  type SkippedRecord
} from "@groweasy/shared";
import type { AiInputRecord } from "../ai/aiProvider.interface.js";
import {
  buildDeterministicRecordFromRaw,
  findDateValue,
  findRawValue,
  noteAliases,
  ownerAliases
} from "./deterministicLeadMapper.js";
import { inferDataSource } from "./inference.js";

export function postProcessImportedRecords(
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
    skippedBySourceRow.set(record.source_row, {
      source_row: record.source_row,
      reason: record.reason || "Missing both email and mobile number",
      raw_record: record.raw_record ?? rawBySourceRow.get(record.source_row)
    });
  }

  for (const record of records) {
    const rawRecord = rawBySourceRow.get(record.source_row);
    const repairedRecord = repairImportedRecord(
      record,
      rawRecord,
      defaultDataSource
    );
    const parsed = importedRecordSchema.safeParse(repairedRecord);

    if (!parsed.success) {
      skippedBySourceRow.set(record.source_row, {
        source_row: record.source_row,
        reason: "Imported record failed final schema validation",
        raw_record: rawRecord
      });
      continue;
    }

    if (!parsed.data.email && !parsed.data.mobile_without_country_code) {
      skippedBySourceRow.set(record.source_row, {
        source_row: record.source_row,
        reason: "Missing both email and mobile number",
        raw_record: rawRecord
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
  rawRecord: Record<string, unknown> | undefined,
  defaultDataSource?: DataSource
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
  const joinedRawText = rawRecord
    ? Object.values(rawRecord).map(cleanCellValue).join(" ")
    : "";
  const rawCreatedAt = rawRecord ? findDateValue(rawRecord) : "";
  const rawLeadOwner = rawRecord ? findRawValue(rawRecord, ownerAliases) : "";
  const rawNote = rawRecord ? findRawValue(rawRecord, noteAliases) : "";
  const inferredDataSource = rawRecord
    ? inferDataSource(joinedRawText, defaultDataSource)
    : "";

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

  if (rawNote) {
    crmNote = appendToNote(crmNote, rawNote);
  }

  return {
    ...record,
    created_at: rawRecord ? rawCreatedAt : normalizeDate(record.created_at),
    email: contactDetails?.primaryEmail || cleanCellValue(record.email),
    country_code: primaryPhone?.country_code ?? cleanCellValue(record.country_code),
    mobile_without_country_code:
      primaryPhone?.mobile_without_country_code ??
      cleanCellValue(record.mobile_without_country_code),
    country:
      cleanCellValue(record.country) ||
      (primaryPhone?.country_code === "+91" ? "India" : ""),
    lead_owner: rawRecord ? rawLeadOwner : stripInventedFallback(record.lead_owner),
    crm_note: crmNote,
    data_source: inferredDataSource
  };
}

function stripInventedFallback(value: string): string {
  const cleaned = cleanCellValue(value);
  return cleaned.toLowerCase() === "unassigned" ? "" : cleaned;
}
