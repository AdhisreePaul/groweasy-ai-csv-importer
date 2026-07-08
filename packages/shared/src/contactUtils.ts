export interface NormalizedPhone {
  country_code: string;
  mobile_without_country_code: string;
  raw: string;
}

const emailPattern =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const phoneCandidatePattern =
  /(?:\+?\d[\d\s().-]{5,}\d|\(\+?\d{1,4}\)\s*\d[\d\s().-]{4,}\d)/g;

export function extractEmails(text: unknown): string[] {
  const value = toText(text);
  const matches = value.match(emailPattern);

  return matches?.map((email) => stripTrailingPunctuation(email)) ?? [];
}

export function extractPhoneCandidates(text: unknown): string[] {
  const value = toText(text);
  const matches = value.match(phoneCandidatePattern) ?? [];

  return matches
    .map((candidate) => stripTrailingPunctuation(candidate).trim())
    .filter((candidate) => countDigits(candidate) >= 7);
}

export function normalizeIndianPhone(phone: unknown): NormalizedPhone {
  const raw = cleanCellValue(phone);

  if (!raw) {
    return emptyPhone(raw);
  }

  const digits = raw.replace(/\D/g, "");

  if (digits.length === 10 && isLikelyIndianMobile(digits)) {
    return {
      country_code: "",
      mobile_without_country_code: digits,
      raw
    };
  }

  if (
    digits.length === 12 &&
    digits.startsWith("91") &&
    isLikelyIndianMobile(digits.slice(2))
  ) {
    return {
      country_code: "+91",
      mobile_without_country_code: digits.slice(2),
      raw
    };
  }

  if (
    digits.length === 11 &&
    digits.startsWith("0") &&
    isLikelyIndianMobile(digits.slice(1))
  ) {
    return {
      country_code: "+91",
      mobile_without_country_code: digits.slice(1),
      raw
    };
  }

  return {
    country_code: raw.trim().startsWith("+") ? `+${extractLeadingCountryCode(digits)}` : "",
    mobile_without_country_code: digits.length >= 7 && digits.length <= 15 ? digits : "",
    raw
  };
}

export function normalizeDate(value: unknown): string {
  const text = cleanCellValue(value);

  if (!text) {
    return "";
  }

  const parsedDate = parseDateValue(text);

  if (!parsedDate) {
    return "";
  }

  return parsedDate.toISOString();
}

export function appendToNote(existingNote: unknown, addition: unknown): string {
  const existing = cleanCellValue(existingNote);
  const next = cleanCellValue(addition);

  if (!existing) {
    return next;
  }

  if (!next) {
    return existing;
  }

  if (existing.includes(next)) {
    return existing;
  }

  const separator = /[.!?]$/.test(existing) ? " " : ". ";
  return `${existing}${separator}${next}`;
}

export function cleanCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/^\uFEFF/, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasContactInfo(record: Record<string, unknown>): boolean {
  const text = Object.values(record).map(cleanCellValue).join(" ");
  const emails = extractEmails(text);

  if (emails.length > 0) {
    return true;
  }

  return extractPhoneCandidates(text).some((candidate) => {
    const normalized = normalizeIndianPhone(candidate);
    return normalized.mobile_without_country_code.length > 0;
  });
}

function parseDateValue(value: string): Date | null {
  const isoDateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoDateOnlyMatch) {
    const date = new Date(
      Date.UTC(
        Number(isoDateOnlyMatch[1]),
        Number(isoDateOnlyMatch[2]) - 1,
        Number(isoDateOnlyMatch[3])
      )
    );

    return isValidDateParts(
      date,
      Number(isoDateOnlyMatch[1]),
      Number(isoDateOnlyMatch[2]),
      Number(isoDateOnlyMatch[3])
    )
      ? date
      : null;
  }

  const slashOrDashMatch = value.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/
  );

  if (!slashOrDashMatch) {
    const nativeDate = new Date(value);
    return isValidDate(nativeDate) ? nativeDate : null;
  }

  const first = Number(slashOrDashMatch[1]);
  const second = Number(slashOrDashMatch[2]);
  const year = normalizeYear(Number(slashOrDashMatch[3]));

  if (first > 31 || second > 31) {
    return null;
  }

  const day = first > 12 ? first : second > 12 ? second : first;
  const month = first > 12 ? second : second > 12 ? first : second;
  const date = new Date(Date.UTC(year, month - 1, day));

  if (!isValidDateParts(date, year, month, day)) {
    return null;
  }

  return date;
}

function normalizeYear(year: number): number {
  if (year < 100) {
    return year >= 70 ? 1900 + year : 2000 + year;
  }

  return year;
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

function isValidDateParts(
  value: Date,
  year: number,
  month: number,
  day: number
): boolean {
  return (
    isValidDate(value) &&
    value.getUTCFullYear() === year &&
    value.getUTCMonth() === month - 1 &&
    value.getUTCDate() === day
  );
}

function emptyPhone(raw: string): NormalizedPhone {
  return {
    country_code: "",
    mobile_without_country_code: "",
    raw
  };
}

function isLikelyIndianMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value);
}

function extractLeadingCountryCode(digits: string): string {
  if (digits.length <= 10) {
    return "";
  }

  return digits.slice(0, digits.length - 10);
}

function countDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

function stripTrailingPunctuation(value: string): string {
  return value.replace(/[),.;:]+$/g, "");
}

function toText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}
