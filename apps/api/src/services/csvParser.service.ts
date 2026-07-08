import { AppError } from "../errors/AppError.js";

export interface ParsedCsvRow {
  sourceRow: number;
  record: Record<string, string>;
}

export interface ParsedCsv {
  totalRows: number;
  headers: string[];
  rows: ParsedCsvRow[];
  skippedEmptyRows: number[];
}

interface ParsedCsvLine {
  sourceRow: number;
  fields: string[];
}

export function parseCsvBuffer(buffer: Buffer): ParsedCsv {
  return parseCsvText(buffer.toString("utf8"));
}

export function parseCsvText(input: string): ParsedCsv {
  const text = stripLeadingBom(input);

  if (text.trim().length === 0) {
    throw new AppError({
      code: "EMPTY_CSV",
      message: "The uploaded CSV is empty.",
      statusCode: 400
    });
  }

  const parsedLines = parseCsvLines(text);
  const nonEmptyLines = parsedLines.filter((line) => !isEmptyFieldSet(line.fields));

  if (nonEmptyLines.length === 0) {
    throw new AppError({
      code: "EMPTY_CSV",
      message: "The uploaded CSV does not contain headers.",
      statusCode: 400
    });
  }

  const [headerLine, ...dataLines] = nonEmptyLines;

  if (!headerLine) {
    throw new AppError({
      code: "EMPTY_CSV",
      message: "The uploaded CSV does not contain headers.",
      statusCode: 400
    });
  }

  const maxFieldCount = Math.max(
    headerLine.fields.length,
    ...dataLines.map((line) => line.fields.length)
  );
  const headers = buildHeaders(headerLine.fields, maxFieldCount);

  if (headers.length === 0) {
    throw new AppError({
      code: "EMPTY_CSV",
      message: "The uploaded CSV does not contain usable headers.",
      statusCode: 400
    });
  }

  const skippedEmptyRows = parsedLines
    .slice(1)
    .filter((line) => isEmptyFieldSet(line.fields))
    .map((line) => line.sourceRow);

  const rows = dataLines
    .filter((line) => !isEmptyFieldSet(line.fields))
    .map((line) => ({
      sourceRow: line.sourceRow,
      record: toRecord(headers, line.fields)
    }));

  return {
    totalRows: rows.length,
    headers,
    rows,
    skippedEmptyRows
  };
}

function parseCsvLines(text: string): ParsedCsvLine[] {
  const lines: ParsedCsvLine[] = [];
  let fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let sourceRow = 1;
  let physicalRow = 1;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === "\"") {
        if (next === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
        continue;
      }

      if (isNewline(char)) {
        field += "\n";
        if (char === "\r" && next === "\n") {
          index += 1;
        }
        physicalRow += 1;
        continue;
      }

      field += char;
      continue;
    }

    if (char === "\"" && field.length === 0) {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      fields.push(field);
      field = "";
      continue;
    }

    if (isNewline(char)) {
      fields.push(field);
      lines.push({ sourceRow, fields });
      fields = [];
      field = "";

      if (char === "\r" && next === "\n") {
        index += 1;
      }

      physicalRow += 1;
      sourceRow = physicalRow;
      continue;
    }

    field += char;
  }

  if (inQuotes) {
    throw new AppError({
      code: "CSV_PARSE_ERROR",
      message: "The uploaded CSV has an unclosed quoted field.",
      statusCode: 400
    });
  }

  if (field.length > 0 || fields.length > 0) {
    fields.push(field);
    lines.push({ sourceRow, fields });
  }

  return lines;
}

function buildHeaders(rawHeaders: string[], fieldCount: number): string[] {
  const counts = new Map<string, number>();
  const headers: string[] = [];

  for (let index = 0; index < fieldCount; index += 1) {
    const rawHeader = rawHeaders[index] ?? "";
    const baseHeader = stripLeadingBom(rawHeader).trim() || `column_${index + 1}`;
    const count = counts.get(baseHeader) ?? 0;
    counts.set(baseHeader, count + 1);
    headers.push(count === 0 ? baseHeader : `${baseHeader}__${count + 1}`);
  }

  return headers;
}

function toRecord(headers: string[], fields: string[]): Record<string, string> {
  return headers.reduce<Record<string, string>>((record, header, index) => {
    record[header] = fields[index] ?? "";
    return record;
  }, {});
}

function stripLeadingBom(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

function isNewline(char: string | undefined): boolean {
  return char === "\n" || char === "\r";
}

function isEmptyFieldSet(fields: string[]): boolean {
  return fields.every((field) => field.trim().length === 0);
}
