import {
  appendToNote,
  cleanCellValue,
  DATA_SOURCES,
  extractEmails,
  extractPhoneCandidates,
  normalizeIndianPhone,
  type CrmStatus,
  type DataSource,
  type ImportedRecord,
  type SkippedRecord
} from "@groweasy/shared";
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
  defaultDataSource?: string
): ImportedRecord | null {
  const joinedText = Object.values(rawRecord).map(cleanCellValue).join(" ");
  const emails = extractEmails(joinedText);
  const phoneCandidates = extractPhoneCandidates(joinedText);
  const normalizedPhones = phoneCandidates
    .map(normalizeIndianPhone)
    .filter((phone) => phone.mobile_without_country_code.length > 0);
  const primaryPhone =
    normalizedPhones.find((phone) => hasExplicitIndianPrefix(phone.raw)) ??
    normalizedPhones[0];
  const additionalPhones = normalizedPhones.filter(
    (phone) => phone !== primaryPhone
  );

  if (emails.length === 0 && !primaryPhone) {
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
  const primaryEmail = emails[0] ?? "";
  let crmNote = "";

  if (emails.length > 1) {
    crmNote = appendToNote(
      crmNote,
      `Additional emails: ${emails.slice(1).join(", ")}.`
    );
  }

  if (additionalPhones.length > 0) {
    crmNote = appendToNote(
      crmNote,
      `Additional mobiles: ${additionalPhones
        .map((phone) => phone.mobile_without_country_code)
        .join(", ")}.`
    );
  }

  const unusedPhoneCandidates = phoneCandidates.filter((candidate) => {
    const normalized = normalizeIndianPhone(candidate);
    return normalized.mobile_without_country_code.length === 0;
  });

  if (unusedPhoneCandidates.length > 0) {
    crmNote = appendToNote(
      crmNote,
      `Additional phone values not used as primary mobile: ${unusedPhoneCandidates.join(", ")}.`
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

  return {
    source_row: sourceRow,
    created_at: new Date().toISOString(),
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
    country_code: primaryPhone?.country_code ?? "",
    mobile_without_country_code: primaryPhone?.mobile_without_country_code ?? "",
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
    country: country || (primaryPhone?.country_code === "+91" ? "India" : ""),
    lead_owner:
      findValue(rawRecord, [
        "lead owner",
        "owner",
        "sales person",
        "salesperson",
        "assigned to"
      ]) || "Unassigned",
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

    if (
      normalizedHints.some(
        (hint) => normalizedKey === hint || normalizedKey.includes(hint)
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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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

function inferDataSource(text: string, defaultDataSource?: string): DataSource {
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

  if (isAllowedDataSource(defaultDataSource)) {
    return defaultDataSource;
  }

  return "leads_on_demand";
}

function isAllowedDataSource(value: string | undefined): value is DataSource {
  return DATA_SOURCES.includes(value as DataSource);
}

function hasExplicitIndianPrefix(value: string): boolean {
  return /^\s*(?:\+91|\(\+91\)|91[\s().-])/.test(value);
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
