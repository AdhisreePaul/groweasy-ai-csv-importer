import { z } from "zod";
import { CRM_STATUSES, DATA_SOURCES } from "./constants.js";

export const crmStatusSchema = z.enum(CRM_STATUSES);

export const dataSourceSchema = z.enum(DATA_SOURCES);

export const crmLeadSchema = z.object({
  created_at: z.string(),
  name: z.string(),
  email: z.string(),
  country_code: z.string(),
  mobile_without_country_code: z.string(),
  company: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  lead_owner: z.string(),
  crm_status: crmStatusSchema,
  crm_note: z.string(),
  data_source: dataSourceSchema,
  possession_time: z.string(),
  description: z.string()
});

export const importedRecordSchema = crmLeadSchema.extend({
  source_row: z.number().int().positive()
});

export const skippedRecordSchema = z.object({
  source_row: z.number().int().positive(),
  reason: z.string(),
  raw_record: z.record(z.unknown()).optional()
});

export const importErrorSchema = z.object({
  source_row: z.number().int().positive().optional(),
  code: z.string(),
  message: z.string()
});

export const importSummarySchema = z.object({
  total_rows: z.number().int().nonnegative(),
  processed_rows: z.number().int().nonnegative(),
  imported_count: z.number().int().nonnegative(),
  skipped_count: z.number().int().nonnegative(),
  error_count: z.number().int().nonnegative()
});

export const importResponseSchema = z.object({
  import_id: z.string(),
  total_imported: z.number().int().nonnegative(),
  total_skipped: z.number().int().nonnegative(),
  summary: importSummarySchema,
  imported_records: z.array(importedRecordSchema),
  skipped_records: z.array(skippedRecordSchema),
  errors: z.array(importErrorSchema)
}).superRefine((value, context) => {
  if (value.total_imported !== value.imported_records.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "total_imported must match imported_records length",
      path: ["total_imported"]
    });
  }

  if (value.total_skipped !== value.skipped_records.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "total_skipped must match skipped_records length",
      path: ["total_skipped"]
    });
  }

  if (value.summary.imported_count !== value.imported_records.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "summary.imported_count must match imported_records length",
      path: ["summary", "imported_count"]
    });
  }

  if (value.summary.skipped_count !== value.skipped_records.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "summary.skipped_count must match skipped_records length",
      path: ["summary", "skipped_count"]
    });
  }
});
