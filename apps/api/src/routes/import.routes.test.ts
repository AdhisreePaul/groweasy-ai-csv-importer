import { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { loadEnv } from "../config/env.js";

describe("POST /api/import/csv", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const env = loadEnv({
      NODE_ENV: "test",
      PORT: "4000",
      CORS_ORIGIN: "http://localhost:3000",
      JSON_BODY_LIMIT: "1mb",
      LOG_REQUESTS: "false",
      MAX_CSV_FILE_SIZE_BYTES: "1024"
    });

    await new Promise<void>((resolve) => {
      server = createApp(env).listen(0, "127.0.0.1", () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  it("accepts a valid CSV and returns the final import response", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(
        [[
          "Name,Email,Phone,Project,Notes",
          "Priya,priya@example.com,+91 98765 43210,Sarjapur Plots,\"Interested, ready for callback\""
        ].join("\n")],
        {
          type: "text/csv"
        }
      ),
      "leads.csv"
    );

    const response = await fetch(`${baseUrl}/api/import/csv`, {
      method: "POST",
      body: formData
    });
    const body = (await response.json()) as {
      success: boolean;
      summary: {
        totalRows: number;
        totalImported: number;
        totalSkipped: number;
        totalBatches: number;
        failedBatches: number;
      };
      importedRecords: Array<{
        source_row: number;
        email: string;
        mobile_without_country_code: string;
      }>;
      skippedRecords: unknown[];
    };

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      summary: {
        totalRows: 1,
        totalImported: 1,
        totalSkipped: 0,
        totalBatches: 1,
        failedBatches: 0
      }
    });
    expect(body.importedRecords[0]).toMatchObject({
      source_row: 2,
      email: "priya@example.com",
      mobile_without_country_code: "9876543210"
    });
    expect(body.skippedRecords).toEqual([]);
  });

  it("skips rows with no email or mobile", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["Name,Notes\nUnknown,No contact details"], {
        type: "text/csv"
      }),
      "missing-contact.csv"
    );

    const response = await fetch(`${baseUrl}/api/import/csv`, {
      method: "POST",
      body: formData
    });
    const body = (await response.json()) as {
      summary: { totalImported: number; totalSkipped: number };
      skippedRecords: Array<{ source_row: number; reason: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.summary.totalImported).toBe(0);
    expect(body.summary.totalSkipped).toBe(1);
    expect(body.skippedRecords[0]).toMatchObject({
      source_row: 2,
      reason: "Missing both email and mobile number"
    });
  });

  it("imports rows with email-only or mobile-only contact variations", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(
        [[
          "Lead Name,Email Address,Country Code,Mobile Number,Notes",
          "Email Only,email.only@example.com,,,Interested",
          "Mobile Only,,91,9876543210,Asked for callback",
          "No Contact,,,,No contact shared"
        ].join("\n")],
        {
          type: "text/csv"
        }
      ),
      "contact-variations.csv"
    );

    const response = await fetch(`${baseUrl}/api/import/csv`, {
      method: "POST",
      body: formData
    });
    const body = (await response.json()) as {
      summary: { totalRows: number; totalImported: number; totalSkipped: number };
      importedRecords: Array<{
        source_row: number;
        email: string;
        country_code: string;
        mobile_without_country_code: string;
      }>;
      skippedRecords: Array<{
        source_row: number;
        reason: string;
        raw_record?: Record<string, unknown>;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      totalRows: 3,
      totalImported: 2,
      totalSkipped: 1
    });
    expect(body.importedRecords[0]).toMatchObject({
      source_row: 2,
      email: "email.only@example.com",
      mobile_without_country_code: ""
    });
    expect(body.importedRecords[1]).toMatchObject({
      source_row: 3,
      email: "",
      country_code: "+91",
      mobile_without_country_code: "9876543210"
    });
    expect(body.skippedRecords[0]).toMatchObject({
      source_row: 4,
      reason: "Missing both email and mobile number",
      raw_record: {
        "Lead Name": "No Contact",
        Notes: "No contact shared"
      }
    });
  });

  it("returns a clear error when the file is missing", async () => {
    const response = await fetch(`${baseUrl}/api/import/csv`, {
      method: "POST",
      body: new FormData()
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_FILE");
  });

  it("returns a clear error for invalid file types", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["not,csv"], {
        type: "application/json"
      }),
      "payload.json"
    );

    const response = await fetch(`${baseUrl}/api/import/csv`, {
      method: "POST",
      body: formData
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_FILE");
  });

  it("returns a clear error for empty CSV files", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["   "], {
        type: "text/csv"
      }),
      "empty.csv"
    );

    const response = await fetch(`${baseUrl}/api/import/csv`, {
      method: "POST",
      body: formData
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("EMPTY_CSV");
  });

  it("returns a clear error when the CSV exceeds the file size limit", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([`Name,Email\n${"A".repeat(1200)},lead@example.com`], {
        type: "text/csv"
      }),
      "large.csv"
    );

    const response = await fetch(`${baseUrl}/api/import/csv`, {
      method: "POST",
      body: formData
    });
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("FILE_TOO_LARGE");
  });
});
