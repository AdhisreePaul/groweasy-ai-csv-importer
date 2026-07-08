import { describe, expect, it } from "vitest";
import {
  AiExtractionService,
  createAiProvider,
  parseAiJsonResponse
} from "./aiExtraction.service.js";
import type { AiBatchRequest, AiProvider } from "./aiProvider.interface.js";
import { MockAiProvider } from "./mockAiProvider.js";

describe("AiExtractionService with mock provider", () => {
  it("returns valid CRM records and skipped records from messy rows", async () => {
    const service = new AiExtractionService(new MockAiProvider(), 2);

    const result = await service.extractLeads({
      importId: "test-import",
      defaultDataSource: "leads_on_demand",
      records: [
        {
          source_row: 2,
          raw_record: {
            "Client Full Name": "Priya Sharma",
            "Phone / WhatsApp": "+91 98765 43210 / 99887 76655",
            "Email IDs": "priya@example.com; priya.work@example.com",
            "Project Interested": "Sarjapur Plots",
            "Current Location": "Bengaluru, Karnataka",
            "Sales Person": "Amit",
            "Lead Notes": "Interested in site visit next week"
          }
        },
        {
          source_row: 3,
          raw_record: {
            Lead: "Unknown",
            Project: "Varah Swamy",
            Notes: "Asked for callback but gave no contact details"
          }
        }
      ]
    });

    expect(result.total_imported).toBe(1);
    expect(result.total_skipped).toBe(1);
    expect(result.imported_records[0]).toMatchObject({
      source_row: 2,
      name: "Priya Sharma",
      email: "priya@example.com",
      country_code: "+91",
      mobile_without_country_code: "9876543210",
      city: "Bengaluru",
      state: "Karnataka",
      lead_owner: "Amit",
      crm_status: "GOOD_LEAD_FOLLOW_UP",
      data_source: "sarjapur_plots"
    });
    expect(result.imported_records[0]?.crm_note).toContain(
      "Additional emails: priya.work@example.com"
    );
    expect(result.imported_records[0]?.crm_note).toContain(
      "Additional mobiles: 9988776655"
    );
    expect(result.skipped_records[0]).toMatchObject({
      source_row: 3,
      reason: "Missing both email and mobile number"
    });
  });

  it("prefers explicit +91 mobile candidates over landline-looking values", async () => {
    const service = new AiExtractionService(new MockAiProvider(), 2);

    const result = await service.extractLeads({
      records: [
        {
          source_row: 8,
          raw_record: {
            Customer: "Ananya Rao",
            "WhatsApp/Mobile": "080-12345678, +91 90000 11122",
            mail: "ananya@example.com"
          }
        }
      ]
    });

    expect(result.imported_records[0]).toMatchObject({
      source_row: 8,
      country_code: "+91",
      mobile_without_country_code: "9000011122"
    });
    expect(result.imported_records[0]?.crm_note).toContain("8012345678");
  });

  it("imports rows with only email, only mobile, both contacts, and skips neither", async () => {
    const service = new AiExtractionService(new MockAiProvider(), 10);

    const result = await service.extractLeads({
      records: [
        {
          source_row: 2,
          raw_record: {
            Name: "Email Only",
            Email: "email.only@example.com"
          }
        },
        {
          source_row: 3,
          raw_record: {
            Name: "Mobile Only",
            Mobile: "9876543210"
          }
        },
        {
          source_row: 4,
          raw_record: {
            Name: "Both Contacts",
            Email: "both@example.com",
            Phone: "+91 98765 43210"
          }
        },
        {
          source_row: 5,
          raw_record: {
            Name: "No Contact",
            Notes: "No email or mobile shared"
          }
        }
      ]
    });

    expect(result.total_imported).toBe(3);
    expect(result.total_skipped).toBe(1);
    expect(result.imported_records.map((record) => record.source_row)).toEqual([
      2,
      3,
      4
    ]);
    expect(result.imported_records[0]).toMatchObject({
      email: "email.only@example.com",
      mobile_without_country_code: ""
    });
    expect(result.imported_records[1]).toMatchObject({
      email: "",
      mobile_without_country_code: "9876543210"
    });
    expect(result.skipped_records[0]).toMatchObject({
      source_row: 5,
      reason: "Missing both email and mobile number",
      raw_record: {
        Name: "No Contact",
        Notes: "No email or mobile shared"
      }
    });
  });

  it("normalizes country_code 91 and +91 mobile values", async () => {
    const service = new AiExtractionService(new MockAiProvider(), 10);

    const result = await service.extractLeads({
      records: [
        {
          source_row: 2,
          raw_record: {
            Name: "Separate Code",
            "Country Code": "91",
            Mobile: "9876543210"
          }
        },
        {
          source_row: 3,
          raw_record: {
            Name: "Inline Code",
            Phone: "+91 9876543210"
          }
        }
      ]
    });

    expect(result.total_imported).toBe(2);
    expect(result.imported_records[0]).toMatchObject({
      country_code: "+91",
      mobile_without_country_code: "9876543210"
    });
    expect(result.imported_records[1]).toMatchObject({
      country_code: "+91",
      mobile_without_country_code: "9876543210"
    });
  });

  it("handles headers with spaces, underscores, and case variations", async () => {
    const service = new AiExtractionService(new MockAiProvider(), 10);

    const result = await service.extractLeads({
      records: [
        {
          source_row: 2,
          raw_record: {
            "Lead Name": "Header Variant",
            "Email Address": "variant@example.com",
            COUNTRY_CODE: "91",
            contact_number: "98765 43210"
          }
        },
        {
          source_row: 3,
          raw_record: {
            "Lead Name": "Mail Id",
            mail_id: "mailid@example.com",
            WhatsApp: "+91-90000-11122"
          }
        }
      ]
    });

    expect(result.total_imported).toBe(2);
    expect(result.imported_records[0]).toMatchObject({
      email: "variant@example.com",
      country_code: "+91",
      mobile_without_country_code: "9876543210"
    });
    expect(result.imported_records[1]).toMatchObject({
      email: "mailid@example.com",
      country_code: "+91",
      mobile_without_country_code: "9000011122"
    });
  });

  it("recovers contact details when AI skips a contactable row", async () => {
    const provider = new StaticProvider(
      JSON.stringify({
        importedRecords: [],
        skippedRecords: [
          { rowIndex: 2, reason: "Missing both email and mobile number" }
        ]
      })
    );
    const service = new AiExtractionService(provider, 25, 0);

    const result = await service.extractLeads({
      records: [
        {
          source_row: 2,
          raw_record: {
            Name: "Recovered Lead",
            "Email Address": "recovered@example.com"
          }
        }
      ]
    });

    expect(result.total_imported).toBe(1);
    expect(result.total_skipped).toBe(0);
    expect(result.imported_records[0]).toMatchObject({
      source_row: 2,
      email: "recovered@example.com"
    });
  });

  it("batches records before sending them to the provider", async () => {
    const provider = new CountingProvider();
    const service = new AiExtractionService(provider, 2);

    await service.extractLeads({
      importId: "batch-test",
      records: [
        contactableRecord(2),
        contactableRecord(3),
        contactableRecord(4)
      ]
    });

    expect(provider.batchSizes).toEqual([2, 1]);
  });

  it("throws a controlled error for non-JSON provider output", async () => {
    const service = new AiExtractionService(
      new StaticProvider("```json\n{\"importedRecords\":[]}\n```")
    );

    await expect(
      service.extractLeads({
        records: [contactableRecord(2)]
      })
    ).rejects.toMatchObject({
      code: "AI_OUTPUT_INVALID"
    });
  });

  it("throws a controlled error for schema-invalid provider output", async () => {
    const service = new AiExtractionService(
      new StaticProvider(
        JSON.stringify({ importedRecords: [{ rowIndex: 2 }], skippedRecords: [] })
      )
    );

    await expect(
      service.extractLeads({
        records: [contactableRecord(2)]
      })
    ).rejects.toMatchObject({
      code: "AI_OUTPUT_INVALID"
    });
  });

  it("repairs trailing commas only when the response is otherwise strict JSON", () => {
    expect(
      parseAiJsonResponse('{"importedRecords":[],"skippedRecords":[],}')
    ).toEqual({
      importedRecords: [],
      skippedRecords: []
    });
  });

  it("retries once when the first provider output is schema-invalid", async () => {
    const service = new AiExtractionService(
      new SequenceProvider([
        JSON.stringify({ importedRecords: [{ rowIndex: 2 }], skippedRecords: [] }),
        validProviderResponse(2)
      ])
    );

    const result = await service.extractLeads({
      records: [contactableRecord(2)]
    });

    expect(result.total_imported).toBe(1);
    expect(result.imported_records[0]?.source_row).toBe(2);
  });

  it("retries once when the first provider output is not strict JSON", async () => {
    const service = new AiExtractionService(
      new SequenceProvider([
        "Here is the JSON: {\"importedRecords\":[],\"skippedRecords\":[]}",
        validProviderResponse(2)
      ])
    );

    const result = await service.extractLeads({
      records: [contactableRecord(2)]
    });

    expect(result.total_imported).toBe(1);
  });

  it("continues after a failed batch and marks affected rows skipped", async () => {
    const service = new AiExtractionService(new StaticProvider("not json"), 1, 0);

    const result = await service.extractLeads({
      records: [contactableRecord(2), contactableRecord(3)],
      continueOnBatchFailure: true
    });

    expect(result.batch_summary).toEqual({
      total_batches: 2,
      failed_batches: 2
    });
    expect(result.total_imported).toBe(0);
    expect(result.total_skipped).toBe(2);
    expect(result.skipped_records.map((record) => record.source_row)).toEqual([
      2,
      3
    ]);
  });

  it("avoids duplicate skipped records when AI returns the same row twice", async () => {
    const provider = new StaticProvider(
      JSON.stringify({
        importedRecords: [],
        skippedRecords: [
          { rowIndex: 2, reason: "Missing both email and mobile number" },
          { rowIndex: 2, reason: "Missing both email and mobile number" }
        ]
      })
    );
    const service = new AiExtractionService(provider, 25, 0);

    const result = await service.extractLeads({
      records: [
        {
          source_row: 2,
          raw_record: {
            Name: "No Contact",
            Notes: "Missing contact details"
          }
        }
      ]
    });

    expect(result.total_skipped).toBe(1);
    expect(result.skipped_records).toHaveLength(1);
  });

  it("selects mock provider from env", () => {
    const provider = createAiProvider({
      NODE_ENV: "test",
      PORT: 4000,
      CORS_ORIGIN: "http://localhost:3000",
      JSON_BODY_LIMIT: "1mb",
      LOG_REQUESTS: false,
      MAX_CSV_FILE_SIZE_BYTES: 1024,
      AI_PROVIDER: "mock",
      AI_BATCH_SIZE: 25,
      AI_BATCH_RETRY_LIMIT: 1,
      AI_API_KEY: undefined
    });

    expect(provider.name).toBe("mock");
  });

  it("real provider placeholder fails in a controlled way", async () => {
    const provider = createAiProvider({
      NODE_ENV: "test",
      PORT: 4000,
      CORS_ORIGIN: "http://localhost:3000",
      JSON_BODY_LIMIT: "1mb",
      LOG_REQUESTS: false,
      MAX_CSV_FILE_SIZE_BYTES: 1024,
      AI_PROVIDER: "openai",
      AI_BATCH_SIZE: 25,
      AI_BATCH_RETRY_LIMIT: 1,
      AI_API_KEY: undefined
    });

    await expect(
      provider.extractBatch(
        { records: [] },
        { system: "system", user: "user" }
      )
    ).rejects.toMatchObject({
      code: "AI_PROVIDER_NOT_CONFIGURED"
    });
  });
});

class StaticProvider implements AiProvider {
  readonly name = "static";

  constructor(private readonly response: string) {}

  async extractBatch(_request: AiBatchRequest): Promise<string> {
    return this.response;
  }
}

class CountingProvider implements AiProvider {
  readonly name = "counting";
  readonly batchSizes: number[] = [];

  async extractBatch(request: AiBatchRequest): Promise<string> {
    this.batchSizes.push(request.records.length);

    return JSON.stringify({
      importedRecords: request.records.map((record) => ({
        rowIndex: record.source_row,
        created_at: "2026-07-07T00:00:00.000Z",
        name: "Test Lead",
        email: "lead@example.com",
        country_code: "+91",
        mobile_without_country_code: "9876543210",
        company: "",
        city: "",
        state: "",
        country: "India",
        lead_owner: "Unassigned",
        crm_status: "GOOD_LEAD_FOLLOW_UP",
        crm_note: "",
        data_source: "leads_on_demand",
        possession_time: "",
        description: "Test lead"
      })),
      skippedRecords: []
    });
  }
}

class SequenceProvider implements AiProvider {
  readonly name = "sequence";
  private index = 0;

  constructor(private readonly responses: string[]) {}

  async extractBatch(_request: AiBatchRequest): Promise<string> {
    const response =
      this.responses[Math.min(this.index, this.responses.length - 1)] ??
      validProviderResponse(2);
    this.index += 1;
    return response;
  }
}

function validProviderResponse(rowIndex: number): string {
  return JSON.stringify({
    importedRecords: [
      {
        rowIndex,
      created_at: "2026-07-07T00:00:00.000Z",
      name: "Test Lead",
      email: "lead@example.com",
      country_code: "+91",
      mobile_without_country_code: "9876543210",
      company: "",
      city: "",
      state: "",
      country: "India",
      lead_owner: "Unassigned",
      crm_status: "GOOD_LEAD_FOLLOW_UP",
      crm_note: "",
      data_source: "leads_on_demand",
      possession_time: "",
        description: "Test lead"
      }
    ],
    skippedRecords: []
  });
}

function contactableRecord(sourceRow: number) {
  return {
    source_row: sourceRow,
    raw_record: {
      Name: "Test Lead",
      Email: "lead@example.com",
      Phone: "+91 98765 43210"
    }
  };
}
