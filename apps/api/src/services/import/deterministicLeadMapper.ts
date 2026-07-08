import {
  appendToNote,
  cleanCellValue,
  extractContactDetailsFromRecord,
  importedRecordSchema,
  normalizeDate,
  normalizeHeaderKey,
  type DataSource,
  type ImportedRecord
} from "@groweasy/shared";
import { inferDataSource, inferStatus } from "./inference.js";

export function buildDeterministicRecordFromRaw(
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

  const rawNote = findRawValue(rawRecord, noteAliases);

  if (rawNote) {
    crmNote = appendToNote(crmNote, rawNote);
  }

  return importedRecordSchema.parse({
    source_row: sourceRow,
    created_at: findDateValue(rawRecord),
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
    lead_owner: findRawValue(rawRecord, ownerAliases),
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

export function findRawValue(
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

export function findDateValue(record: Record<string, unknown>): string {
  return normalizeDate(
    findRawValue(record, [
      "created_at",
      "created",
      "created_on",
      "created_date",
      "date_created",
      "date",
      "timestamp",
      "submitted_at",
      "submitted_on"
    ])
  );
}

export const ownerAliases = [
  "lead_owner",
  "owner",
  "sales_person",
  "salesperson",
  "assigned_to"
] as const;

export const noteAliases = [
  "crm_note",
  "remarks",
  "remark",
  "comment",
  "comments",
  "notes",
  "lead_notes",
  "requirement",
  "requirements"
] as const;

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
