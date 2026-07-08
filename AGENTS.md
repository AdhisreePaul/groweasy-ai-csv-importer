# GrowEasy AI CSV Importer - Agent Instructions

## Project Purpose

This repository is for the GrowEasy Software Developer Intern assignment. Build a production-ready, stateless CSV importer that lets a user upload any valid CSV, preview the raw CSV in the browser, and only send the file to the backend after the user clicks **Confirm Import**.

The backend must parse the confirmed CSV, process rows with an AI model in batches, map messy lead data into the GrowEasy CRM format, skip invalid records, and return structured JSON.

## Non-Negotiable Rules

- Use TypeScript everywhere.
- Keep the app stateless.
- Do not add a database unless a later requirement explicitly needs persistence.
- Do not call AI during CSV preview.
- Call AI only after the user clicks **Confirm Import**.
- The frontend preview must show raw CSV data before import.
- The backend owns CSV parsing, validation, batching, AI extraction, and final normalization.
- Skip records that contain neither an email nor a mobile number.
- If multiple emails exist, use the first email as `email` and include the rest in `crm_note`.
- If multiple mobile numbers exist, use the first mobile number as `mobile_without_country_code` and include the rest in `crm_note`.
- Return structured JSON from the import endpoint.

## Required Monorepo Structure

Use this structure:

```text
apps/
  web/
  api/
packages/
  shared/
docs/
samples/
```

Expected ownership:

- `apps/web`: frontend CSV upload, raw preview, confirm import flow, result display.
- `apps/api`: backend import endpoint, CSV parsing, AI batching, validation, response assembly.
- `packages/shared`: shared TypeScript types, enums, validation schemas, constants.
- `docs`: project brief, API contract, AI extraction rules, edge cases, task plan.
- `samples`: sample CSV files for manual testing.

## Required CRM Fields

Every valid imported lead must be normalized to this shape:

- `created_at`
- `name`
- `email`
- `country_code`
- `mobile_without_country_code`
- `company`
- `city`
- `state`
- `country`
- `lead_owner`
- `crm_status`
- `crm_note`
- `data_source`
- `possession_time`
- `description`

Allowed `crm_status` values:

- `GOOD_LEAD_FOLLOW_UP`
- `DID_NOT_CONNECT`
- `BAD_LEAD`
- `SALE_DONE`

Allowed `data_source` values:

- `leads_on_demand`
- `meridian_tower`
- `eden_park`
- `varah_swamy`
- `sarjapur_plots`

## Implementation Guidance

- Prefer small, explicit modules over large catch-all files.
- Put shared enums and response types in `packages/shared`.
- Use schema validation for API inputs and outputs.
- Treat AI output as untrusted and validate it before returning it.
- Keep AI prompts deterministic, strict, and JSON-focused.
- Batch records before sending to AI to reduce token pressure and improve reliability.
- Preserve row numbers so skipped and failed records can be traced back to the source CSV.
- Make error responses clear enough for a user or reviewer to understand what went wrong.
- Add tests around validation, CSV parsing behavior, AI output normalization, and key edge cases when implementation begins.

## Documentation Map

- `docs/PROJECT_BRIEF.md`: assignment summary, goals, architecture, constraints.
- `docs/API_CONTRACT.md`: import API request and response contract.
- `docs/AI_EXTRACTION_SPEC.md`: AI batching, prompt rules, output schema, validation rules.
- `docs/EDGE_CASES.md`: messy CSV and lead normalization edge cases.
- `docs/CODEX_TASK_PLAN.md`: step-by-step build plan.

## Current Scope

The project now includes the implemented monorepo, frontend preview/import flow, backend CSV and AI mock pipeline, tests, samples, Docker setup, and final documentation. Future agents should preserve the non-negotiable rules above and make targeted changes only.
