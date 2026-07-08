import { describe, expect, it } from "vitest";
import {
  appendToNote,
  cleanCellValue,
  extractContactDetailsFromRecord,
  extractEmails,
  extractPhoneCandidates,
  hasContactInfo,
  normalizeDate,
  normalizeHeaderKey,
  normalizePhoneWithCountryCode,
  normalizeIndianPhone
} from "./contactUtils";

describe("extractEmails", () => {
  it("returns multiple emails in order", () => {
    expect(
      extractEmails(
        "Primary priya@example.com; backup: priya.work@example.co.in and owner+lead@groweasy.ai."
      )
    ).toEqual([
      "priya@example.com",
      "priya.work@example.co.in",
      "owner+lead@groweasy.ai"
    ]);
  });

  it("returns an empty array for invalid or missing values", () => {
    expect(extractEmails("not-an-email@ nope")).toEqual([]);
    expect(extractEmails(undefined)).toEqual([]);
  });
});

describe("extractPhoneCandidates", () => {
  it("returns multiple phone-like values in order", () => {
    expect(
      extractPhoneCandidates(
        "Call +91 98765 43210 / 99887-76655 or office (080) 12345678"
      )
    ).toEqual(["+91 98765 43210", "99887-76655", "(080) 12345678"]);
  });

  it("ignores short numeric fragments", () => {
    expect(extractPhoneCandidates("Budget 80L, visit at 5pm")).toEqual([]);
  });
});

describe("normalizeIndianPhone", () => {
  it("handles +91 formats with spaces, hyphens, and parentheses", () => {
    expect(normalizeIndianPhone("+91 98765 43210")).toMatchObject({
      country_code: "+91",
      mobile_without_country_code: "9876543210"
    });
    expect(normalizeIndianPhone("(+91) 98765-43210")).toMatchObject({
      country_code: "+91",
      mobile_without_country_code: "9876543210"
    });
  });

  it("handles 91 and leading-zero Indian mobile formats", () => {
    expect(normalizeIndianPhone("91-90000-11122")).toMatchObject({
      country_code: "+91",
      mobile_without_country_code: "9000011122"
    });
    expect(normalizeIndianPhone("09000011122")).toMatchObject({
      country_code: "+91",
      mobile_without_country_code: "9000011122"
    });
  });

  it("keeps non-Indian phone-like values usable without throwing", () => {
    expect(normalizeIndianPhone("+1 (415) 555-0134")).toEqual({
      country_code: "+1",
      mobile_without_country_code: "14155550134",
      raw: "+1 (415) 555-0134"
    });
  });

  it("returns empty fields for invalid or missing values", () => {
    expect(normalizeIndianPhone("abc")).toEqual({
      country_code: "",
      mobile_without_country_code: "",
      raw: "abc"
    });
    expect(normalizeIndianPhone(undefined)).toEqual({
      country_code: "",
      mobile_without_country_code: "",
      raw: ""
    });
  });
});

describe("header-aware contact extraction", () => {
  it("normalizes common header variations", () => {
    expect(normalizeHeaderKey("\uFEFF Email Address ")).toBe("email_address");
    expect(normalizeHeaderKey("Country Code")).toBe("country_code");
    expect(normalizeHeaderKey("Phone / WhatsApp")).toBe("phone_whatsapp");
  });

  it("extracts email and mobile from case and spacing variants", () => {
    const details = extractContactDetailsFromRecord({
      " Email Address ": "first@example.com; second@example.com",
      "Country Code": "91",
      "Mobile Number": "98765 43210"
    });

    expect(details.primaryEmail).toBe("first@example.com");
    expect(details.additionalEmails).toEqual(["second@example.com"]);
    expect(details.primaryPhone).toMatchObject({
      country_code: "+91",
      mobile_without_country_code: "9876543210"
    });
  });

  it("extracts mobile-only rows with WhatsApp headers", () => {
    const details = extractContactDetailsFromRecord({
      "Lead Name": "Phone Only",
      WhatsApp: "+91 9876543210"
    });

    expect(details.primaryEmail).toBe("");
    expect(details.primaryPhone).toMatchObject({
      country_code: "+91",
      mobile_without_country_code: "9876543210"
    });
  });
});

describe("normalizePhoneWithCountryCode", () => {
  it("applies a separate country code to a 10-digit mobile", () => {
    expect(normalizePhoneWithCountryCode("9876543210", "91")).toMatchObject({
      country_code: "+91",
      mobile_without_country_code: "9876543210"
    });
  });

  it("keeps explicit +91 values split into country code and mobile", () => {
    expect(normalizePhoneWithCountryCode("+91 9876543210", "91")).toMatchObject({
      country_code: "+91",
      mobile_without_country_code: "9876543210"
    });
  });
});

describe("normalizeDate", () => {
  it("returns ISO strings for date-compatible values", () => {
    expect(normalizeDate("2026-07-07")).toBe("2026-07-07T00:00:00.000Z");
    expect(normalizeDate("07/07/2026")).toBe("2026-07-07T00:00:00.000Z");
  });

  it("returns an empty string for invalid or missing values", () => {
    expect(normalizeDate("not a date")).toBe("");
    expect(normalizeDate("31/02/2026")).toBe("");
    expect(normalizeDate(null)).toBe("");
  });
});

describe("note and cell helpers", () => {
  it("cleans cell line breaks and whitespace", () => {
    expect(cleanCellValue("  Interested\r\nnext\tweek  ")).toBe(
      "Interested next week"
    );
  });

  it("safely appends notes without line breaks", () => {
    expect(appendToNote("Existing note", "Additional mobiles: 9988776655\n")).toBe(
      "Existing note. Additional mobiles: 9988776655"
    );
    expect(appendToNote("", " New detail ")).toBe("New detail");
    expect(appendToNote("Already added.", "")).toBe("Already added.");
  });
});

describe("hasContactInfo", () => {
  it("returns true when any record value contains email or mobile", () => {
    expect(
      hasContactInfo({
        Name: "Priya",
        Notes: "Email priya@example.com"
      })
    ).toBe(true);
    expect(
      hasContactInfo({
        Name: "Ananya",
        Phone: "+91 90000 11122"
      })
    ).toBe(true);
  });

  it("returns false when contact details are missing or invalid", () => {
    expect(
      hasContactInfo({
        Name: "Unknown",
        Notes: "Asked for callback but gave no contact"
      })
    ).toBe(false);
  });
});
