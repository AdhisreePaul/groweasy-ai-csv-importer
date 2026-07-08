import { describe, expect, it } from "vitest";
import { isImportApiResponse } from "./importApi";

const importedRecord = {
  source_row: 2,
  created_at: "2026-07-07T16:30:00.000Z",
  name: "Priya Sharma",
  email: "priya@example.com",
  country_code: "+91",
  mobile_without_country_code: "9876543210",
  company: "GrowEasy",
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  lead_owner: "Unassigned",
  crm_status: "GOOD_LEAD_FOLLOW_UP",
  crm_note: "",
  data_source: "leads_on_demand",
  possession_time: "",
  description: "Interested in property details."
};

describe("isImportApiResponse", () => {
  it("accepts the documented import response shape", () => {
    expect(
      isImportApiResponse({
        success: true,
        summary: {
          totalRows: 1,
          totalImported: 1,
          totalSkipped: 0,
          totalBatches: 1,
          failedBatches: 0
        },
        importedRecords: [importedRecord],
        skippedRecords: []
      })
    ).toBe(true);
  });

  it("accepts blank optional CRM extraction values", () => {
    expect(
      isImportApiResponse({
        success: true,
        summary: {
          totalRows: 1,
          totalImported: 1,
          totalSkipped: 0,
          totalBatches: 1,
          failedBatches: 0
        },
        importedRecords: [
          {
            ...importedRecord,
            created_at: "",
            lead_owner: "",
            data_source: ""
          }
        ],
        skippedRecords: []
      })
    ).toBe(true);
  });

  it("rejects missing summary fields", () => {
    expect(
      isImportApiResponse({
        success: true,
        summary: {
          totalRows: 1,
          totalImported: 1,
          totalSkipped: 0
        },
        importedRecords: [importedRecord],
        skippedRecords: []
      })
    ).toBe(false);
  });

  it("rejects inconsistent response totals", () => {
    expect(
      isImportApiResponse({
        success: true,
        summary: {
          totalRows: 1,
          totalImported: 2,
          totalSkipped: 0,
          totalBatches: 1,
          failedBatches: 0
        },
        importedRecords: [importedRecord],
        skippedRecords: []
      })
    ).toBe(false);
  });

  it("rejects malformed imported records", () => {
    expect(
      isImportApiResponse({
        success: true,
        summary: {
          totalRows: 1,
          totalImported: 1,
          totalSkipped: 0,
          totalBatches: 1,
          failedBatches: 0
        },
        importedRecords: [{ ...importedRecord, source_row: 0 }],
        skippedRecords: []
      })
    ).toBe(false);
  });

  it("rejects unsupported CRM enum values", () => {
    expect(
      isImportApiResponse({
        success: true,
        summary: {
          totalRows: 1,
          totalImported: 1,
          totalSkipped: 0,
          totalBatches: 1,
          failedBatches: 0
        },
        importedRecords: [{ ...importedRecord, crm_status: "MAYBE_LEAD" }],
        skippedRecords: []
      })
    ).toBe(false);
  });
});
