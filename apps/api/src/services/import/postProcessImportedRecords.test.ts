import { describe, expect, it } from "vitest";
import type { ImportedRecord, SkippedRecord } from "@groweasy/shared";
import type { AiInputRecord } from "../ai/aiProvider.interface.js";
import { postProcessImportedRecords } from "./postProcessImportedRecords.js";

describe("postProcessImportedRecords", () => {
  it("repairs AI contact misses from raw rows and removes invented defaults", () => {
    const aiRecords: ImportedRecord[] = [
      {
        source_row: 2,
        created_at: "2026-07-07T00:00:00.000Z",
        name: "Recovered Lead",
        email: "",
        country_code: "",
        mobile_without_country_code: "",
        company: "",
        city: "",
        state: "",
        country: "",
        lead_owner: "Unassigned",
        crm_status: "GOOD_LEAD_FOLLOW_UP",
        crm_note: "",
        data_source: "leads_on_demand",
        possession_time: "",
        description: ""
      }
    ];
    const sourceRecords: AiInputRecord[] = [
      {
        source_row: 2,
        raw_record: {
          Name: "Recovered Lead",
          Email: "recovered@example.com",
          Remarks: "Needs callback"
        }
      }
    ];

    const result = postProcessImportedRecords(aiRecords, [], sourceRecords);

    expect(result.skippedRecords).toEqual([]);
    expect(result.importedRecords[0]).toMatchObject({
      source_row: 2,
      created_at: "",
      email: "recovered@example.com",
      lead_owner: "",
      data_source: "",
      crm_note: "Needs callback"
    });
  });

  it("keeps failed-batch skipped records skipped instead of deterministic fallback", () => {
    const sourceRecords: AiInputRecord[] = [
      {
        source_row: 2,
        raw_record: {
          Email: "lead@example.com"
        }
      }
    ];
    const skippedRecords: SkippedRecord[] = [
      {
        source_row: 2,
        reason: "AI batch failed after retry: provider unavailable",
        raw_record: sourceRecords[0]?.raw_record
      }
    ];

    const result = postProcessImportedRecords([], skippedRecords, sourceRecords);

    expect(result.importedRecords).toEqual([]);
    expect(result.skippedRecords).toEqual(skippedRecords);
  });
});
