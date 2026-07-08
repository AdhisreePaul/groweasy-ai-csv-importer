import { describe, expect, it } from "vitest";
import { AppError } from "../errors/AppError.js";
import { parseCsvText } from "./csvParser.service.js";

describe("parseCsvText", () => {
  it("parses quoted commas and preserves source rows", () => {
    const result = parseCsvText(
      "Name,Notes\nPriya,\"Interested in 2BHK, near metro\"\nRavi,Booked"
    );

    expect(result).toMatchObject({
      totalRows: 2,
      headers: ["Name", "Notes"]
    });
    expect(result.rows[0]).toEqual({
      sourceRow: 2,
      record: {
        Name: "Priya",
        Notes: "Interested in 2BHK, near metro"
      }
    });
  });

  it("strips BOM and trims header whitespace", () => {
    const result = parseCsvText("\uFEFF Name , Email \nAsha,asha@example.com");

    expect(result.headers).toEqual(["Name", "Email"]);
    expect(result.rows[0]?.record).toEqual({
      Name: "Asha",
      Email: "asha@example.com"
    });
  });

  it("skips empty rows while keeping original row numbers", () => {
    const result = parseCsvText("Name,Email\n\nPriya,priya@example.com\n , ");

    expect(result.totalRows).toBe(1);
    expect(result.rows[0]?.sourceRow).toBe(3);
    expect(result.skippedEmptyRows).toEqual([2, 4]);
  });

  it("adds safe names for duplicate and blank headers", () => {
    const result = parseCsvText("Name,Name,\nPriya,Sharma,Extra");

    expect(result.headers).toEqual(["Name", "Name__2", "column_3"]);
    expect(result.rows[0]?.record).toEqual({
      Name: "Priya",
      Name__2: "Sharma",
      column_3: "Extra"
    });
  });

  it("fails clearly for unclosed quoted fields", () => {
    expect(() => parseCsvText("Name,Notes\nPriya,\"unfinished")).toThrow(
      AppError
    );
  });
});
