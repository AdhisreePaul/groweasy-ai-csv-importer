import {
  CRM_STATUSES,
  DATA_SOURCES,
  type ImportedRecord,
  type SkippedRecord
} from "@groweasy/shared";

export interface ImportSummary {
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  totalBatches: number;
  failedBatches: number;
}

export interface ImportApiResponse {
  success: true;
  summary: ImportSummary;
  importedRecords: ImportedRecord[];
  skippedRecords: SkippedRecord[];
}

export class ImportRequestError extends Error {
  code: string;
  status?: number;

  constructor({
    code,
    message,
    status
  }: {
    code: string;
    message: string;
    status?: number;
  }) {
    super(message);
    this.name = "ImportRequestError";
    this.code = code;

    if (status !== undefined) {
      this.status = status;
    }
  }
}

export async function importCsvFile(file: File): Promise<ImportApiResponse> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new ImportRequestError({
      code: "API_URL_MISSING",
      message:
        "Backend URL is not configured. Set NEXT_PUBLIC_API_BASE_URL and restart the web app."
    });
  }

  const formData = new FormData();
  formData.append("file", file);

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/api/import/csv`, {
      body: formData,
      method: "POST"
    });
  } catch {
    throw new ImportRequestError({
      code: "NETWORK_ERROR",
      message:
        "Could not reach the backend. Check that the API server is running and try again."
    });
  }

  const responseBody = await readJsonBody(response);

  if (!response.ok) {
    throw new ImportRequestError({
      code: getErrorCode(responseBody),
      message: getErrorMessage(
        responseBody,
        "Import failed. Check the CSV and retry."
      ),
      status: response.status
    });
  }

  if (!isImportApiResponse(responseBody)) {
    throw new ImportRequestError({
      code: "INVALID_RESPONSE",
      message:
        "The backend returned an unexpected response. Please retry the import."
    });
  }

  return responseBody;
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getErrorCode(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.error)) {
    return "UNKNOWN_ERROR";
  }

  return typeof value.error.code === "string"
    ? value.error.code
    : "UNKNOWN_ERROR";
}

function getErrorMessage(value: unknown, fallback: string): string {
  if (!isRecord(value) || !isRecord(value.error)) {
    return fallback;
  }

  return typeof value.error.message === "string"
    ? value.error.message
    : fallback;
}

export function isImportApiResponse(value: unknown): value is ImportApiResponse {
  if (!isRecord(value) || value.success !== true) {
    return false;
  }

  if (
    !isSummary(value.summary) ||
    !Array.isArray(value.importedRecords) ||
    !Array.isArray(value.skippedRecords)
  ) {
    return false;
  }

  return (
    value.summary.totalImported === value.importedRecords.length &&
    value.summary.totalSkipped === value.skippedRecords.length &&
    value.importedRecords.every(isImportedRecord) &&
    value.skippedRecords.every(isSkippedRecord)
  );
}

function isSummary(value: unknown): value is ImportSummary {
  return (
    isRecord(value) &&
    isNonnegativeNumber(value.totalRows) &&
    isNonnegativeNumber(value.totalImported) &&
    isNonnegativeNumber(value.totalSkipped) &&
    isNonnegativeNumber(value.totalBatches) &&
    isNonnegativeNumber(value.failedBatches)
  );
}

function isImportedRecord(value: unknown): value is ImportedRecord {
  return (
    isRecord(value) &&
    isPositiveNumber(value.source_row) &&
    typeof value.created_at === "string" &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.country_code === "string" &&
    typeof value.mobile_without_country_code === "string" &&
    typeof value.company === "string" &&
    typeof value.city === "string" &&
    typeof value.state === "string" &&
    typeof value.country === "string" &&
    typeof value.lead_owner === "string" &&
    isAllowedValue(value.crm_status, CRM_STATUSES) &&
    typeof value.crm_note === "string" &&
    (value.data_source === "" || isAllowedValue(value.data_source, DATA_SOURCES)) &&
    typeof value.possession_time === "string" &&
    typeof value.description === "string"
  );
}

function isSkippedRecord(value: unknown): value is SkippedRecord {
  return (
    isRecord(value) &&
    isPositiveNumber(value.source_row) &&
    typeof value.reason === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonnegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isAllowedValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[]
): value is T {
  return typeof value === "string" && allowedValues.includes(value as T);
}
