import { describe, expect, it } from "vitest";
import { MAX_PREVIEW_ROWS, parseCsvPreview } from "./csvPreview";

describe("parseCsvPreview", () => {
  it("parses headers and rows", () => {
    const preview = parseCsvPreview("name,email\nAsha,asha@example.com");

    expect(preview.headers).toEqual(["name", "email"]);
    expect(preview.totalRows).toBe(1);
    expect(preview.previewRows[0]).toEqual({
      rowNumber: 2,
      values: ["Asha", "asha@example.com"]
    });
  });

  it("handles quoted commas and escaped quotes", () => {
    const preview = parseCsvPreview(
      'name,notes\n"Asha Rao","Asked for ""Meridian, Tower"" pricing"'
    );

    expect(preview.previewRows[0]?.values).toEqual([
      "Asha Rao",
      'Asked for "Meridian, Tower" pricing'
    ]);
  });

  it("handles BOM and CRLF line endings", () => {
    const preview = parseCsvPreview(
      "\uFEFFname,email\r\nRavi,ravi@example.com\r\n"
    );

    expect(preview.headers).toEqual(["name", "email"]);
    expect(preview.totalRows).toBe(1);
  });

  it("limits preview rows without losing total row count", () => {
    const rows = Array.from(
      { length: MAX_PREVIEW_ROWS + 2 },
      (_, index) => `Lead ${index + 1},lead${index + 1}@example.com`
    );
    const preview = parseCsvPreview(`name,email\n${rows.join("\n")}`);

    expect(preview.totalRows).toBe(MAX_PREVIEW_ROWS + 2);
    expect(preview.previewRows).toHaveLength(MAX_PREVIEW_ROWS);
    expect(preview.truncated).toBe(true);
  });

  it("rejects files with headers but no data rows", () => {
    expect(() => parseCsvPreview("name,email\n")).toThrow(
      "This CSV has headers but no data rows to preview."
    );
  });

  it("rejects unfinished quoted values", () => {
    expect(() => parseCsvPreview('name,notes\nAsha,"Interested')).toThrow(
      "This CSV has an unfinished quoted value. Check the file and try again."
    );
  });
});
