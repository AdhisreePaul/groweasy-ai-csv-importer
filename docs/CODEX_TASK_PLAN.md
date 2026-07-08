# Codex Task Plan

## Current Milestone: Documentation Setup

Status: planned documentation only.

Deliverables:

- `AGENTS.md`
- `docs/PROJECT_BRIEF.md`
- `docs/API_CONTRACT.md`
- `docs/AI_EXTRACTION_SPEC.md`
- `docs/EDGE_CASES.md`
- `docs/CODEX_TASK_PLAN.md`

No application code should be written in this milestone.

## Build Plan

### 1. Confirm Project Skeleton

- Keep the monorepo structure:
  - `apps/web`
  - `apps/api`
  - `packages/shared`
  - `docs`
  - `samples`
- Use Next.js with TypeScript in `apps/web`.
- Use Node.js, Express, and TypeScript in `apps/api`.
- Choose package manager and workspace tooling.
- Add root TypeScript, lint, format, and test configuration.

### 2. Create Shared Types

- Define CRM lead type.
- Define allowed `crm_status` enum.
- Define allowed `data_source` enum.
- Define import API response types.
- Define skipped record and error types.
- Add runtime validation schemas.

### 3. Build Frontend Preview Flow

- Add CSV file picker.
- Build the UI as a responsive Next.js experience for desktop and mobile.
- Parse CSV client-side for raw preview only.
- Display headers and sample rows.
- Show file metadata and row count.
- Disable import until a valid preview exists.
- Ensure preview does not call backend AI import.
- Add **Confirm Import** action.

### 4. Build Backend Import Endpoint

- Add `POST /api/import/csv`.
- Implement the endpoint in the Node/Express API app.
- Accept `multipart/form-data`.
- Validate file presence, type, size, and readability.
- Parse CSV server-side.
- Preserve source row numbers.
- Return clear parse errors.

### 5. Add AI Extraction Layer

- Convert parsed rows into AI batch payloads.
- Add strict JSON-only prompt.
- Include required fields and allowed enum values.
- Call AI only from the confirmed backend import endpoint.
- Handle AI request failures and retries.
- Parse and validate AI response JSON.

### 6. Add Deterministic Normalization

- Detect emails and mobile numbers from raw rows.
- Enforce first email and first mobile rules.
- Move extra emails and mobiles into `crm_note`.
- Skip records with neither email nor mobile.
- Normalize `crm_status` to allowed values and `data_source` to an allowed value or empty string.
- Fill safe missing text fields with empty strings.
- Keep source row traceability.

### 7. Return Structured Results

- Return `summary.totalImported`.
- Return `summary.totalSkipped`.
- Return normalized CRM leads in `importedRecords`.
- Return skipped records with reasons in `skippedRecords`.
- Return row-level errors.
- Keep response stateless and self-contained.

### 8. Add Samples

- Add clean sample CSV.
- Add messy column sample CSV.
- Add multiple emails and mobiles sample CSV.
- Add missing contact sample CSV.
- Add quoted commas and multiline notes sample CSV.

### 9. Add Tests

- Test shared schemas and enums.
- Test CSV parsing behavior.
- Test no-AI preview contract at frontend boundary.
- Test import endpoint validation.
- Test skip rule for missing contact details.
- Test multiple email and mobile handling.
- Test invalid AI output handling.
- Test allowed enum enforcement.
- Test that `summary.totalImported` matches `importedRecords.length`.
- Test that `summary.totalSkipped` matches `skippedRecords.length`.

### 10. Polish For Assignment Review

- Add README setup instructions.
- Add `.env.example` values for AI provider configuration.
- Add clear run commands.
- Add screenshots or short demo notes if useful.
- Confirm no database dependency exists.
- Confirm TypeScript is used throughout.
- Confirm AI is only called after **Confirm Import**.

## Suggested Implementation Order

1. Root workspace and tooling.
2. Shared package types and schemas.
3. API CSV parser and validation without AI.
4. Frontend upload and raw preview.
5. Frontend confirm import call.
6. AI extraction service.
7. Backend normalization and response assembly.
8. End-to-end manual tests with sample CSVs.
9. Automated tests.
10. README and final cleanup.

## Acceptance Checklist

- User can upload any valid CSV.
- User sees raw CSV preview before import.
- Preview does not call AI.
- Backend import starts only after **Confirm Import**.
- Backend parses CSV.
- Backend sends records to AI in batches.
- Backend maps messy data into GrowEasy CRM fields.
- Backend skips records with neither email nor mobile.
- Backend handles multiple emails and mobiles correctly.
- API returns structured JSON.
- API returns `importedRecords`, `skippedRecords`, `summary.totalImported`, and `summary.totalSkipped`.
- App remains stateless.
- No database is introduced.
- TypeScript is used everywhere.
- Monorepo structure is preserved.
