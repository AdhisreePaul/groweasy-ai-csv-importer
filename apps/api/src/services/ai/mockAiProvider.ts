import {
  appendToNote,
  cleanCellValue,
  extractContactDetailsFromRecord,
  normalizeHeaderKey,
  normalizeDate,
  type DataSource,
  type ImportedRecord,
  type SkippedRecord
} from "@groweasy/shared";
import { inferDataSource, inferStatus } from "../import/inference.js";
import type { AiBatchRequest, AiProvider } from "./aiProvider.interface.js";

export class MockAiProvider implements AiProvider {
  readonly name = "mock";

  async extractBatch(request: AiBatchRequest): Promise<string> {
    const records: ImportedRecord[] = [];
    const skipped_records: SkippedRecord[] = [];

    for (const inputRecord of request.records) {
      const normalized = normalizeMockRecord(
        inputRecord.source_row,
        inputRecord.raw_record,
        request.default_data_source
      );

      if (normalized) {
        records.push(normalized);
      } else {
        skipped_records.push({
          source_row: inputRecord.source_row,
          reason: "Missing both email and mobile number",
          raw_record: inputRecord.raw_record
        });
      }
    }

    return JSON.stringify({
      importedRecords: records.map((record) => ({
        rowIndex: record.source_row,
        created_at: record.created_at,
        name: record.name,
        email: record.email,
        country_code: record.country_code,
        mobile_without_country_code: record.mobile_without_country_code,
        company: record.company,
        city: record.city,
        state: record.state,
        country: record.country,
        lead_owner: record.lead_owner,
        crm_status: record.crm_status,
        crm_note: record.crm_note,
        data_source: record.data_source,
        possession_time: record.possession_time,
        description: record.description
      })),
      skippedRecords: skipped_records.map((record) => ({
        rowIndex: record.source_row,
        reason: record.reason,
        raw_record: record.raw_record
      }))
    });
  }
}

function normalizeMockRecord(
  sourceRow: number,
  rawRecord: Record<string, unknown>,
  defaultDataSource?: DataSource
): ImportedRecord | null {
  const joinedText = Object.values(rawRecord).map(cleanCellValue).join(" ");
  const contactDetails = extractContactDetailsFromRecord(rawRecord);

  if (!contactDetails.primaryEmail && !contactDetails.primaryPhone) {
    return null;
  }

  const [city, stateFromLocation] = parseLocation(findValue(rawRecord, [
    "city",
    "current location",
    "location",
    "place",
    "address"
  ]));
  const explicitState = findValue(rawRecord, ["state"]);
  const country = findValue(rawRecord, ["country"]);
  const primaryEmail = contactDetails.primaryEmail;
  let crmNote = "";

  if (contactDetails.additionalEmails.length > 0) {
    crmNote = appendToNote(
      crmNote,
      `Additional emails: ${contactDetails.additionalEmails.join(", ")}.`
    );
  }

  if (contactDetails.additionalPhones.length > 0) {
    crmNote = appendToNote(
      crmNote,
      `Additional mobiles: ${contactDetails.additionalPhones
        .map((phone) => phone.mobile_without_country_code)
        .join(", ")}.`
    );
  }

  if (contactDetails.unusedPhoneCandidates.length > 0) {
    crmNote = appendToNote(
      crmNote,
      `Additional phone values not used as primary mobile: ${contactDetails.unusedPhoneCandidates.join(", ")}.`
    );
  }

  const description =
    findValue(rawRecord, [
      "description",
      "remarks",
      "remark",
      "comment",
      "comments",
      "notes",
      "lead notes",
      "requirement",
      "requirements"
    ]) || buildFallbackDescription(rawRecord);
  const noteValue = findValue(rawRecord, [
    "crm_note",
    "remarks",
    "remark",
    "comment",
    "comments",
    "notes",
    "lead notes",
    "requirement",
    "requirements"
  ]);

  if (noteValue) {
    crmNote = appendToNote(crmNote, noteValue);
  }

  return {
    source_row: sourceRow,
    created_at: findDateValue(rawRecord),
    name: findValue(rawRecord, [
      "name",
      "full name",
      "client name",
      "client full name",
      "buyer name",
      "customer",
      "lead"
    ]),
    email: primaryEmail,
    country_code: contactDetails.primaryPhone?.country_code ?? "",
    mobile_without_country_code:
      contactDetails.primaryPhone?.mobile_without_country_code ?? "",
    company: findValue(rawRecord, [
      "company",
      "organization",
      "organisation",
      "business",
      "firm",
      "builder"
    ]),
    city,
    state: explicitState || stateFromLocation,
    country:
      country || (contactDetails.primaryPhone?.country_code === "+91" ? "India" : ""),
    lead_owner: findValue(rawRecord, [
      "lead owner",
      "owner",
      "sales person",
      "salesperson",
      "assigned to"
    ]),
    crm_status: inferStatus(joinedText),
    crm_note: crmNote,
    data_source: inferDataSource(joinedText, defaultDataSource),
    possession_time: findValue(rawRecord, [
      "possession",
      "possession time",
      "move-in",
      "move in",
      "timeline"
    ]),
    description
  };
}

function findValue(record: Record<string, unknown>, headerHints: string[]): string {
  const normalizedHints = headerHints.map(normalizeHeader);
  const entries = Object.entries(record);

  for (const [key, value] of entries) {
    const normalizedKey = normalizeHeader(key);

    if (normalizedHints.some((hint) => normalizedKey === hint)) {
      const cleaned = cleanCellValue(value);

      if (cleaned) {
        return cleaned;
      }
    }
  }

  for (const [key, value] of entries) {
    const normalizedKey = normalizeHeader(key);

    if (
      normalizedHints.some(
        (hint) =>
          hint.length > 4 &&
          (normalizedKey.startsWith(`${hint} `) ||
            normalizedKey.endsWith(` ${hint}`))
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

function normalizeHeader(value: string): string {
  return normalizeHeaderKey(value).replace(/_/g, " ");
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

  const parts = cleaned.split(" ").filter(Boolean);

  if (parts.length >= 2) {
    return [parts.slice(0, -1).join(" "), parts[parts.length - 1] ?? ""];
  }

  return [cleaned, ""];
}

function findDateValue(record: Record<string, unknown>): string {
  const rawDate = findValue(record, [
    "created_at",
    "created",
    "created on",
    "created date",
    "date created",
    "date",
    "timestamp",
    "submitted at",
    "submitted on"
  ]);

  return normalizeDate(rawDate);
}

function buildFallbackDescription(record: Record<string, unknown>): string {
  return Object.entries(record)
    .map(([key, value]) => {
      const cleanedValue = cleanCellValue(value);
      return cleanedValue ? `${key}: ${cleanedValue}` : "";
    })
    .filter(Boolean)
    .join("; ");
}
