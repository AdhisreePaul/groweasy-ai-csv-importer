import { describe, expect, it } from "vitest";
import { CRM_FIELDS } from "./constants";
import {
  crmLeadSchema,
  dataSourceSchema,
  importResponseSchema,
  importedRecordSchema,
  skippedRecordSchema
} from "./schemas";

const validLead = {
  created_at: "2026-07-07T00:00:00.000Z",
  name: "Priya Demo",
  email: "priya.demo@example.com",
  country_code: "+91",
  mobile_without_country_code: "9876543210",
  company: "Demo Realty",
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  lead_owner: "Unassigned",
  crm_status: "GOOD_LEAD_FOLLOW_UP",
  crm_note: "Additional emails: priya.alt@example.com.",
  data_source: "leads_on_demand",
  possession_time: "",
  description: "Interested in a site visit."
};

describe("CRM schemas", () => {
  it("accepts a lead with exactly the required CRM fields", () => {
    const parsed = crmLeadSchema.parse(validLead);

    expect(Object.keys(parsed)).toEqual([...CRM_FIELDS]);
  });

  it("rejects unsupported CRM status and data source values", () => {
    expect(
      crmLeadSchema.safeParse({
        ...validLead,
        crm_status: "CALL_BACK_LATER"
      }).success
    ).toBe(false);

    expect(dataSourceSchema.safeParse("facebook_ads").success).toBe(false);
  });

  it("requires positive source row values for imported and skipped records", () => {
    expect(
      importedRecordSchema.safeParse({ ...validLead, source_row: 2 }).success
    ).toBe(true);
    expect(
      importedRecordSchema.safeParse({ ...validLead, source_row: 0 }).success
    ).toBe(false);
    expect(
      skippedRecordSchema.safeParse({
        source_row: 3,
        reason: "Missing both email and mobile number",
        raw_record: { Name: "Unknown" }
      }).success
    ).toBe(true);
  });
});

describe("importResponseSchema", () => {
  it("accepts a valid normalized import response", () => {
    expect(importResponseSchema.safeParse(validImportResponse()).success).toBe(
      true
    );
  });

  it("rejects responses where summary counts drift from arrays", () => {
    const response = validImportResponse();

    expect(
      importResponseSchema.safeParse({
        ...response,
        total_imported: 2
      }).success
    ).toBe(false);

    expect(
      importResponseSchema.safeParse({
        ...response,
        summary: {
          ...response.summary,
          skipped_count: 3
        }
      }).success
    ).toBe(false);
  });
});

function validImportResponse() {
  return {
    import_id: "import-test",
    total_imported: 1,
    total_skipped: 1,
    summary: {
      total_rows: 2,
      processed_rows: 2,
      imported_count: 1,
      skipped_count: 1,
      error_count: 0
    },
    imported_records: [{ ...validLead, source_row: 2 }],
    skipped_records: [
      {
        source_row: 3,
        reason: "Missing both email and mobile number",
        raw_record: { Name: "No Contact" }
      }
    ],
    errors: []
  };
}
