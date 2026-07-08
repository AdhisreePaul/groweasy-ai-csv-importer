export const MAX_CSV_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_PREVIEW_ROWS = 100;

export interface CsvPreviewRow {
  rowNumber: number;
  values: string[];
}

export interface CsvPreview {
  headers: string[];
  rows: CsvPreviewRow[];
  totalRows: number;
  previewRows: CsvPreviewRow[];
  truncated: boolean;
}

export function validateCsvFile(file: File): string | null {
  const fileName = file.name.toLowerCase();
  const validExtension = fileName.endsWith(".csv");
  const validMimeTypes = new Set([
    "",
    "application/csv",
    "application/vnd.ms-excel",
    "text/csv",
    "text/plain"
  ]);

  if (!validExtension && !validMimeTypes.has(file.type)) {
    return "Choose a valid CSV file. Supported files usually end with .csv.";
  }

  if (file.size === 0) {
    return "This CSV is empty. Choose a file with headers and at least one row.";
  }

  if (file.size > MAX_CSV_SIZE_BYTES) {
    return "This CSV is larger than 5 MB. Choose a smaller export for preview.";
  }

  return null;
}

export function parseCsvPreview(text: string): CsvPreview {
  const normalizedText = text.replace(/^\uFEFF/, "");
  const parsedRows = trimTrailingEmptyRows(parseCsvRows(normalizedText));
  const nonEmptyRows = parsedRows.filter((row) => hasAnyCellValue(row));

  if (nonEmptyRows.length === 0) {
    throw new Error(
      "This CSV is empty. Choose a file with headers and at least one row."
    );
  }

  const headerIndex = parsedRows.findIndex((row) => hasAnyCellValue(row));
  const headers = parsedRows[headerIndex]?.map(cleanPreviewCell) ?? [];

  if (headers.length === 0 || headers.every((header) => header === "")) {
    throw new Error("This CSV needs a header row before it can be previewed.");
  }

  const sourceRows = parsedRows.slice(headerIndex + 1);
  const maxColumnCount = Math.max(
    headers.length,
    ...sourceRows.map((row) => row.length)
  );
  const normalizedHeaders = Array.from({ length: maxColumnCount }, (_, index) =>
    headers[index] && headers[index].trim().length > 0
      ? headers[index]
      : `Column ${index + 1}`
  );

  const rows = sourceRows.map((row, index) => ({
    rowNumber: headerIndex + index + 2,
    values: normalizeRow(row, maxColumnCount)
  }));

  if (rows.length === 0 || rows.every((row) => !hasAnyCellValue(row.values))) {
    throw new Error("This CSV has headers but no data rows to preview.");
  }

  return {
    headers: normalizedHeaders,
    rows,
    totalRows: rows.length,
    previewRows: rows.slice(0, MAX_PREVIEW_ROWS),
    truncated: rows.length > MAX_PREVIEW_ROWS
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const current = text[index];
    const next = text[index + 1];

    if (current === '"') {
      if (insideQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (current === "," && !insideQuotes) {
      row.push(cleanPreviewCell(cell));
      cell = "";
      continue;
    }

    if ((current === "\n" || current === "\r") && !insideQuotes) {
      row.push(cleanPreviewCell(cell));
      rows.push(row);
      row = [];
      cell = "";

      if (current === "\r" && next === "\n") {
        index += 1;
      }
      continue;
    }

    cell += current;
  }

  if (insideQuotes) {
    throw new Error(
      "This CSV has an unfinished quoted value. Check the file and try again."
    );
  }

  row.push(cleanPreviewCell(cell));
  rows.push(row);

  return rows;
}

function cleanPreviewCell(value: string): string {
  return value.replace(/\uFEFF/g, "").replace(/\s+/g, " ").trim();
}

function hasAnyCellValue(row: string[]): boolean {
  return row.some((cell) => cell.trim().length > 0);
}

function normalizeRow(row: string[], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, index) => row[index] ?? "");
}

function trimTrailingEmptyRows(rows: string[][]): string[][] {
  const nextRows = [...rows];

  while (
    nextRows.length > 0 &&
    nextRows[nextRows.length - 1]?.every((cell) => cell.trim() === "")
  ) {
    nextRows.pop();
  }

  return nextRows;
}
