import type { CRM_STATUSES, DATA_SOURCES } from "./constants.js";

export type CrmStatus = (typeof CRM_STATUSES)[number];

export type AllowedDataSource = (typeof DATA_SOURCES)[number];

export type DataSource = AllowedDataSource | "";

export interface CrmLead {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus;
  crm_note: string;
  data_source: DataSource;
  possession_time: string;
  description: string;
}

export interface ImportedRecord extends CrmLead {
  source_row: number;
}

export interface SkippedRecord {
  source_row: number;
  reason: string;
  raw_record?: Record<string, unknown> | undefined;
}

export interface ImportError {
  source_row?: number | undefined;
  code: string;
  message: string;
}

export interface ImportSummary {
  total_rows: number;
  processed_rows: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
}

export interface ImportResponse {
  import_id: string;
  total_imported: number;
  total_skipped: number;
  summary: ImportSummary;
  imported_records: ImportedRecord[];
  skipped_records: SkippedRecord[];
  errors: ImportError[];
}
